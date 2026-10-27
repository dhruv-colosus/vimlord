// A small, dependency-free Vim emulator. The buffer is a single string and the
// cursor is an offset into it; every key goes through `feed`, which returns a
// new state object.

export type Mode = 'normal' | 'insert' | 'visual' | 'visual-line' | 'search'

export interface Snapshot {
  text: string
  cursor: number
}

export interface Register {
  text: string
  linewise: boolean
}

export interface VimState {
  text: string
  cursor: number
  mode: Mode
  pending: string[]
  register: Register
  undo: Snapshot[]
  redo: Snapshot[]
  anchor: number
  curswant: number
  lastFind: { cmd: string; ch: string } | null
  query: string
  searchBuffer: string
  changeStart: Snapshot | null
  recording: string[] | null
  lastChange: string[] | null
  message: string | null
}

type MotionKind = 'excl' | 'incl' | 'line'
interface MotionResult {
  to: number
  kind: MotionKind
  curswant?: number
}

interface Flags {
  noUndo: boolean
  change: boolean
}

export function createState(text: string, cursor = 0, mode: Mode = 'normal'): VimState {
  return {
    text,
    cursor: mode === 'insert' ? cursor : clampNormal(text, cursor),
    mode,
    pending: [],
    register: { text: '', linewise: false },
    undo: [],
    redo: [],
    anchor: cursor,
    curswant: cursor - lineStart(text, cursor),
    lastFind: null,
    query: '',
    searchBuffer: '',
    changeStart: mode === 'insert' ? { text, cursor } : null,
    recording: null,
    lastChange: null,
    message: null,
  }
}

// ---------------------------------------------------------------------------
// Buffer helpers

const isWs = (c: string | undefined) => c === ' ' || c === '\t'

export function lineStart(t: string, o: number) {
  return o <= 0 ? 0 : t.lastIndexOf('\n', o - 1) + 1
}

export function lineEnd(t: string, o: number) {
  const i = t.indexOf('\n', o)
  return i === -1 ? t.length : i
}

export function rowCol(t: string, o: number) {
  let row = 0
  for (let i = 0; i < o && i < t.length; i++) if (t[i] === '\n') row++
  return { row, col: o - lineStart(t, o) }
}

export function lineOffset(t: string, row: number) {
  let o = 0
  for (let r = 0; r < row; r++) {
    const e = t.indexOf('\n', o)
    if (e === -1) return o
    o = e + 1
  }
  return o
}

const lineCount = (t: string) => t.split('\n').length

function firstNonBlank(t: string, o: number) {
  const ls = lineStart(t, o)
  const le = lineEnd(t, o)
  let i = ls
  while (i < le && isWs(t[i])) i++
  return i === le && le > ls ? le - 1 : i
}

export function clampNormal(t: string, o: number) {
  o = Math.max(0, Math.min(o, t.length))
  const ls = lineStart(t, o)
  const le = lineEnd(t, o)
  if (o >= le && le > ls) return le - 1
  return o
}

function cls(c: string | undefined, big: boolean) {
  if (c === undefined || c === '\n' || isWs(c)) return 0
  if (big) return 1
  return /\w/.test(c) ? 2 : 1
}

function wordFwd(t: string, o: number, big: boolean) {
  const n = t.length
  let i = o
  const c = cls(t[i], big)
  if (c !== 0) while (i < n && cls(t[i], big) === c) i++
  while (i < n && cls(t[i], big) === 0) {
    if (t[i] === '\n' && t[i + 1] === '\n') return i + 1
    i++
  }
  return i
}

function wordEnd(t: string, o: number, big: boolean) {
  const n = t.length
  let i = o + 1
  while (i < n && cls(t[i], big) === 0) i++
  if (i >= n) return o
  const c = cls(t[i], big)
  while (i + 1 < n && cls(t[i + 1], big) === c) i++
  return i
}

function wordBack(t: string, o: number, big: boolean) {
  let i = o - 1
  if (i <= 0) return 0
  while (i > 0 && cls(t[i], big) === 0) {
    if (t[i] === '\n' && t[i - 1] === '\n') return i
    i--
  }
  const c = cls(t[i], big)
  if (c === 0) return i
  while (i > 0 && cls(t[i - 1], big) === c) i--
  return i
}

function findInLine(t: string, o: number, cmd: string, ch: string, count: number, repeat: boolean) {
  const ls = lineStart(t, o)
  const le = lineEnd(t, o)
  let p = o
  if (cmd === 'f' || cmd === 't') {
    for (let k = 0; k < count; k++) {
      const from = cmd === 't' && repeat && k === 0 ? p + 2 : p + 1
      const idx = t.indexOf(ch, from)
      if (idx === -1 || idx >= le) return null
      p = idx
    }
    return { to: cmd === 'f' ? p : p - 1, kind: 'incl' as MotionKind }
  }
  for (let k = 0; k < count; k++) {
    const from = cmd === 'T' && repeat && k === 0 ? p - 2 : p - 1
    if (from < ls) return null
    const idx = t.lastIndexOf(ch, from)
    if (idx === -1 || idx < ls) return null
    p = idx
  }
  return { to: cmd === 'F' ? p : p + 1, kind: 'excl' as MotionKind }
}

const PAIRS: Record<string, [string, string]> = {
  '(': ['(', ')'],
  ')': ['(', ')'],
  b: ['(', ')'],
  '{': ['{', '}'],
  '}': ['{', '}'],
  B: ['{', '}'],
  '[': ['[', ']'],
  ']': ['[', ']'],
  '<': ['<', '>'],
  '>': ['<', '>'],
}

function matchPair(t: string, o: number) {
  const le = lineEnd(t, o)
  let i = o
  while (i < le && !'()[]{}'.includes(t[i])) i++
  if (i >= le) return null
  const [open, close] = PAIRS[t[i]]
  let d = 0
  if (t[i] === open) {
    for (let j = i; j < t.length; j++) {
      if (t[j] === open) d++
      else if (t[j] === close && --d === 0) return j
    }
  } else {
    for (let j = i; j >= 0; j--) {
      if (t[j] === close) d++
      else if (t[j] === open && --d === 0) return j
    }
  }
  return null
}

export function findMatch(t: string, q: string, from: number, dir: 1 | -1) {
  if (!q) return -1
  if (dir === 1) {
    const i = t.indexOf(q, from + 1)
    return i !== -1 ? i : t.indexOf(q)
  }
  const i = from > 0 ? t.lastIndexOf(q, from - 1) : -1
  return i !== -1 ? i : t.lastIndexOf(q)
}

// ---------------------------------------------------------------------------
// Motions

function doMotion(
  s: VimState,
  m: string,
  arg: string | undefined,
  count: number,
  hasCount: boolean,
  forOp: string | null,
): MotionResult | null {
  const t = s.text
  const o = s.cursor
  const ls = lineStart(t, o)
  const le = lineEnd(t, o)

  switch (m) {
    case 'h':
    case 'ArrowLeft':
    case 'Backspace':
      if (o === ls) return null
      return { to: Math.max(ls, o - count), kind: 'excl' }
    case 'l':
    case 'ArrowRight':
    case ' ': {
      const max = forOp ? le : Math.max(ls, le - 1)
      if (o >= max) return null
      return { to: Math.min(max, o + count), kind: 'excl' }
    }
    case 'j':
    case 'k':
    case 'ArrowDown':
    case 'ArrowUp': {
      const down = m === 'j' || m === 'ArrowDown'
      const { row } = rowCol(t, o)
      const total = lineCount(t)
      const target = down ? Math.min(total - 1, row + count) : Math.max(0, row - count)
      if (target === row) return null
      const start = lineOffset(t, target)
      const len = lineEnd(t, start) - start
      const col = Math.min(s.curswant, Math.max(0, len - 1))
      return { to: start + col, kind: 'line', curswant: s.curswant }
    }
    case '0':
    case 'Home':
      return { to: ls, kind: 'excl' }
    case '^':
      return { to: firstNonBlank(t, o), kind: 'excl' }
    case '$':
    case 'End': {
      let p = o
      for (let i = 1; i < count; i++) {
        const e = lineEnd(t, p)
        if (e >= t.length) break
        p = e + 1
      }
      const e = lineEnd(t, p)
      return { to: Math.max(lineStart(t, p), e - 1), kind: 'incl', curswant: Infinity }
    }
    case 'w':
    case 'W': {
      const big = m === 'W'
      let p = o
      let lastStart = o
      for (let i = 0; i < count; i++) {
        lastStart = p
        const np = wordFwd(t, p, big)
        if (np === p) break
        p = np
      }
      if (forOp) {
        if (p > lineEnd(t, lastStart)) p = lineEnd(t, lastStart)
        return { to: p, kind: 'excl' }
      }
      if (p >= t.length) p = t.length - 1
      if (p === o) return null
      return { to: p, kind: 'excl' }
    }
    case 'e':
    case 'E': {
      let p = o
      for (let i = 0; i < count; i++) p = wordEnd(t, p, m === 'E')
      if (p === o) return null
      return { to: p, kind: 'incl' }
    }
    case 'b':
    case 'B': {
      if (o === 0) return null
      let p = o
      for (let i = 0; i < count; i++) p = wordBack(t, p, m === 'B')
      return { to: p, kind: 'excl' }
    }
    case 'G':
    case 'gg': {
      const total = lineCount(t)
      const r = hasCount ? Math.min(count, total) - 1 : m === 'G' ? total - 1 : 0
      return { to: firstNonBlank(t, lineOffset(t, r)), kind: 'line' }
    }
    case 'f':
    case 'F':
    case 't':
    case 'T': {
      if (!arg) return null
      s.lastFind = { cmd: m, ch: arg }
      return findInLine(t, o, m, arg, count, false)
    }
    case ';':
    case ',': {
      if (!s.lastFind) return null
      let { cmd } = s.lastFind
      if (m === ',') cmd = ({ f: 'F', F: 'f', t: 'T', T: 't' } as Record<string, string>)[cmd]
      return findInLine(t, o, cmd, s.lastFind.ch, count, true)
    }
    case '}':
    case '{': {
      const lines = t.split('\n')
      let { row } = rowCol(t, o)
      for (let k = 0; k < count; k++) {
        if (m === '}') {
          let r = row + 1
          while (r < lines.length && lines[r] === '') r++
          while (r < lines.length && lines[r] !== '') r++
          if (r >= lines.length) return { to: forOp ? t.length : Math.max(0, t.length - 1), kind: 'excl' }
          row = r
        } else {
          let r = row - 1
          while (r >= 0 && lines[r] === '') r--
          while (r >= 0 && lines[r] !== '') r--
          if (r < 0) return { to: 0, kind: 'excl' }
          row = r
        }
      }
      return { to: lineOffset(t, row), kind: 'excl' }
    }
    case '%': {
      const p = matchPair(t, o)
      return p === null ? null : { to: p, kind: 'incl' }
    }
    case 'n':
    case 'N': {
      if (!s.query) {
        s.message = 'No previous search'
        return null
      }
      let p = o
      for (let k = 0; k < count; k++) {
        const i = findMatch(t, s.query, p, m === 'n' ? 1 : -1)
        if (i === -1) {
          s.message = `Pattern not found: ${s.query}`
          return null
        }
        p = i
      }
      return { to: p, kind: 'excl' }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Text objects

function textObject(t: string, o: number, ai: string, ch: string): { start: number; end: number } | null {
  const ls = lineStart(t, o)
  const le = lineEnd(t, o)

  if (ch === 'w' || ch === 'W') {
    if (ls === le) return null
    const big = ch === 'W'
    const kind = (c: string | undefined) => (isWs(c) ? 0 : cls(c, big))
    const k = kind(t[o])
    let s = o
    let e = o
    while (s > ls && kind(t[s - 1]) === k) s--
    while (e + 1 < le && kind(t[e + 1]) === k) e++
    if (ai === 'i') return { start: s, end: e + 1 }
    if (k !== 0) {
      let e2 = e
      while (e2 + 1 < le && isWs(t[e2 + 1])) e2++
      if (e2 > e) return { start: s, end: e2 + 1 }
      let s2 = s
      while (s2 > ls && isWs(t[s2 - 1])) s2--
      return { start: s2, end: e + 1 }
    }
    let e2 = e
    if (e2 + 1 < le) {
      const k2 = kind(t[e2 + 1])
      while (e2 + 1 < le && kind(t[e2 + 1]) === k2) e2++
    }
    return { start: s, end: e2 + 1 }
  }

  if (ch === '"' || ch === "'" || ch === '`') {
    const qs: number[] = []
    for (let i = ls; i < le; i++) if (t[i] === ch && t[i - 1] !== '\\') qs.push(i)
    let pair: [number, number] | null = null
    for (let j = 0; j + 1 < qs.length; j += 2) {
      if (qs[j] <= o && o <= qs[j + 1]) pair = [qs[j], qs[j + 1]]
    }
    if (!pair) {
      for (let j = 0; j + 1 < qs.length; j += 2) {
        if (qs[j] > o) {
          pair = [qs[j], qs[j + 1]]
          break
        }
      }
    }
    if (!pair) return null
    const [a, b] = pair
    if (ai === 'i') return { start: a + 1, end: b }
    let e = b + 1
    while (e < le && isWs(t[e])) e++
    return { start: a, end: e }
  }

  const pair = PAIRS[ch]
  if (pair) {
    const [open, close] = pair
    let openIdx = -1
    if (t[o] === open) openIdx = o
    else {
      let d = 0
      for (let i = o - 1; i >= 0; i--) {
        if (t[i] === close && i !== o) d++
        else if (t[i] === open) {
          if (d === 0) {
            openIdx = i
            break
          }
          d--
        }
      }
      if (t[o] === close && openIdx === -1) return null
      if (openIdx === -1) {
        const i = t.indexOf(open, o)
        if (i !== -1 && i < le) openIdx = i
      }
    }
    if (openIdx === -1) return null
    let d = 0
    let closeIdx = -1
    for (let i = openIdx; i < t.length; i++) {
      if (t[i] === open) d++
      else if (t[i] === close && --d === 0) {
        closeIdx = i
        break
      }
    }
    if (closeIdx === -1) return null
    return ai === 'i' ? { start: openIdx + 1, end: closeIdx } : { start: openIdx, end: closeIdx + 1 }
  }
  return null
}

// ---------------------------------------------------------------------------
// Operators

function opChars(s: VimState, op: string, start: number, end: number) {
  const t = s.text
  const seg = t.slice(start, end)
  if (op === 'y') {
    s.register = { text: seg, linewise: false }
    s.cursor = start
    return
  }
  if (op === '~' || op === 'u' || op === 'U') {
    const mapped =
      op === 'u'
        ? seg.toLowerCase()
        : op === 'U'
          ? seg.toUpperCase()
          : [...seg].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('')
    s.text = t.slice(0, start) + mapped + t.slice(end)
    s.cursor = start
    return
  }
  if (op === '>' || op === '<') {
    opLines(s, op, lineStart(t, start), lineEnd(t, Math.max(start, end - 1)))
    return
  }
  s.register = { text: seg, linewise: false }
  s.text = t.slice(0, start) + t.slice(end)
  s.cursor = start
  if (op === 'c') s.mode = 'insert'
}

function opLines(s: VimState, op: string, start: number, end: number) {
  const t = s.text
  const seg = t.slice(start, end)
  if (op === 'y') {
    s.register = { text: seg, linewise: true }
    return
  }
  if (op === 'd') {
    s.register = { text: seg, linewise: true }
    let a = start
    let b = end
    if (b < t.length) b++
    else if (a > 0) a--
    s.text = t.slice(0, a) + t.slice(b)
    s.cursor = firstNonBlank(s.text, a === start ? start : lineStart(s.text, a))
    return
  }
  if (op === 'c') {
    s.register = { text: seg, linewise: true }
    s.text = t.slice(0, start) + t.slice(end)
    s.cursor = start
    s.mode = 'insert'
    return
  }
  if (op === '>' || op === '<') {
    const lines = seg.split('\n').map((l) => (op === '>' ? (l ? '  ' + l : l) : l.replace(/^ {1,2}/, '')))
    s.text = t.slice(0, start) + lines.join('\n') + t.slice(end)
    s.cursor = firstNonBlank(s.text, start)
    return
  }
  opChars(s, op, start, end)
}

function applyOperator(s: VimState, op: string, a: number, b: number, kind: MotionKind) {
  const t = s.text
  let start = Math.min(a, b)
  let end = Math.max(a, b)
  if (kind === 'line') {
    opLines(s, op, lineStart(t, start), lineEnd(t, end))
    return
  }
  if (kind === 'incl') end = Math.min(end + 1, lineEnd(t, end))
  if (start === end && op !== 'c') return
  opChars(s, op, start, end)
}

// ---------------------------------------------------------------------------
// Parsing normal-mode commands

const MOTIONS = new Set([
  'h', 'j', 'k', 'l', 'w', 'b', 'e', 'W', 'B', 'E', '0', '^', '$', 'G', '{', '}', ';', ',', 'n', 'N', '%',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', ' ',
])
const ARG_MOTIONS = new Set(['f', 'F', 't', 'T'])
const COMMANDS = new Set([
  'x', 'X', 'D', 'C', 's', 'S', 'i', 'a', 'I', 'A', 'o', 'O', 'p', 'P', 'u', 'C-r', '.', 'J', '~', 'Y', 'v', 'V', '/',
])
const OPERATORS = new Set(['d', 'c', 'y', '>', '<'])
const CHANGES = new Set(['x', 'X', 'D', 'C', 's', 'S', 'i', 'a', 'I', 'A', 'o', 'O', 'p', 'P', 'J', '~', 'r'])

type Target =
  | { kind: 'motion'; motion: string; arg?: string }
  | { kind: 'line' }
  | { kind: 'obj'; ai: string; ch: string }

type Parsed =
  | { status: 'more' }
  | { status: 'bad' }
  | { status: 'ok'; count: number; hasCount: boolean; type: 'motion'; motion: string; arg?: string }
  | { status: 'ok'; count: number; hasCount: boolean; type: 'op'; op: string; target: Target }
  | { status: 'ok'; count: number; hasCount: boolean; type: 'cmd'; cmd: string; arg?: string }

function readCount(keys: string[], i: number): [string, number] {
  let c = ''
  while (i < keys.length && /^[0-9]$/.test(keys[i]) && !(keys[i] === '0' && c === '')) c += keys[i++]
  return [c, i]
}

function parseMotion(keys: string[], i: number): { status: 'more' } | { status: 'bad' } | { motion: string; arg?: string } {
  const k = keys[i]
  if (k === undefined) return { status: 'more' }
  if (MOTIONS.has(k)) return { motion: k }
  if (ARG_MOTIONS.has(k)) {
    if (i + 1 >= keys.length) return { status: 'more' }
    const a = keys[i + 1]
    return a.length === 1 ? { motion: k, arg: a } : { status: 'bad' }
  }
  if (k === 'g') {
    if (i + 1 >= keys.length) return { status: 'more' }
    return keys[i + 1] === 'g' ? { motion: 'gg' } : { status: 'bad' }
  }
  return { status: 'bad' }
}

function parseNormal(keys: string[]): Parsed {
  const [c1, i] = readCount(keys, 0)
  if (i >= keys.length) return { status: 'more' }
  const k = keys[i]
  const n1 = c1 ? parseInt(c1, 10) : 1

  if (OPERATORS.has(k)) {
    const [c2, j] = readCount(keys, i + 1)
    if (j >= keys.length) return { status: 'more' }
    const count = n1 * (c2 ? parseInt(c2, 10) : 1)
    const hasCount = !!(c1 || c2)
    const m = keys[j]
    if (m === k) return { status: 'ok', count, hasCount, type: 'op', op: k, target: { kind: 'line' } }
    if (m === 'i' || m === 'a') {
      if (j + 1 >= keys.length) return { status: 'more' }
      return { status: 'ok', count, hasCount, type: 'op', op: k, target: { kind: 'obj', ai: m, ch: keys[j + 1] } }
    }
    const mm = parseMotion(keys, j)
    if ('status' in mm) return mm
    return { status: 'ok', count, hasCount, type: 'op', op: k, target: { kind: 'motion', ...mm } }
  }
  if (k === 'r') {
    if (i + 1 >= keys.length) return { status: 'more' }
    return { status: 'ok', count: n1, hasCount: !!c1, type: 'cmd', cmd: 'r', arg: keys[i + 1] }
  }
  if (COMMANDS.has(k)) return { status: 'ok', count: n1, hasCount: !!c1, type: 'cmd', cmd: k }
  const mm = parseMotion(keys, i)
  if ('status' in mm) return mm
  return { status: 'ok', count: n1, hasCount: !!c1, type: 'motion', ...mm }
}

// ---------------------------------------------------------------------------
// Mode handlers

const VERTICAL = new Set(['j', 'k', 'ArrowUp', 'ArrowDown'])

function moveTo(s: VimState, motion: string, r: MotionResult) {
  s.cursor = clampNormal(s.text, r.to)
  if (r.curswant !== undefined) s.curswant = r.curswant
  else if (!VERTICAL.has(motion)) s.curswant = s.cursor - lineStart(s.text, s.cursor)
}

function execNormal(s: VimState, p: Extract<Parsed, { status: 'ok' }>, flags: Flags) {
  const t = s.text
  const o = s.cursor
  const ls = lineStart(t, o)
  const le = lineEnd(t, o)
  const { count } = p

  if (p.type === 'motion') {
    const r = doMotion(s, p.motion, p.arg, count, p.hasCount, null)
    if (r) moveTo(s, p.motion, r)
    return
  }

  if (p.type === 'op') {
    const { op, target } = p
    flags.change = op !== 'y'
    if (target.kind === 'line') {
      const { row } = rowCol(t, o)
      const last = Math.min(row + count - 1, lineCount(t) - 1)
      applyOperator(s, op, o, lineOffset(t, last), 'line')
      if (op === 'y') s.cursor = o
    } else if (target.kind === 'obj') {
      const r = textObject(t, o, target.ai, target.ch)
      if (!r || (r.start === r.end && op !== 'c')) return
      opChars(s, op, r.start, r.end)
    } else {
      // `cw` on a word behaves like `ce`.
      if (op === 'c' && (target.motion === 'w' || target.motion === 'W') && cls(t[o], false) !== 0) {
        const big = target.motion === 'W'
        let p2 = o
        for (let k = 0; k < count; k++) {
          const atEnd = k === 0 && cls(t[p2 + 1], big) !== cls(t[p2], big)
          p2 = atEnd ? p2 : wordEnd(t, p2, big)
        }
        applyOperator(s, op, o, p2, 'incl')
      } else {
        const r = doMotion(s, target.motion, target.arg, count, p.hasCount, op)
        if (!r) return
        applyOperator(s, op, o, r.to, r.kind)
        if (op === 'y' && r.kind === 'line') s.cursor = Math.min(o, r.to)
      }
    }
    if (s.mode !== 'insert') s.cursor = clampNormal(s.text, s.cursor)
    s.curswant = s.cursor - lineStart(s.text, s.cursor)
    return
  }

  const { cmd } = p
  flags.change = CHANGES.has(cmd)
  switch (cmd) {
    case 'x':
      if (le > ls) opChars(s, 'd', o, Math.min(le, o + count))
      else flags.change = false
      break
    case 'X':
      if (o > ls) opChars(s, 'd', Math.max(ls, o - count), o)
      else flags.change = false
      break
    case 'D':
    case 'C':
      opChars(s, cmd === 'D' ? 'd' : 'c', o, le)
      break
    case 's':
      opChars(s, 'c', o, Math.min(le, o + count))
      break
    case 'S':
      opLines(s, 'c', ls, lineEnd(t, lineOffset(t, Math.min(rowCol(t, o).row + count - 1, lineCount(t) - 1))))
      break
    case 'Y':
      opLines(s, 'y', ls, le)
      break
    case 'i':
      s.mode = 'insert'
      break
    case 'a':
      s.cursor = le > ls ? o + 1 : o
      s.mode = 'insert'
      break
    case 'I':
      s.cursor = firstNonBlank(t, o)
      if (s.cursor === le - 1 && isWs(t[s.cursor])) s.cursor = le
      s.mode = 'insert'
      break
    case 'A':
      s.cursor = le
      s.mode = 'insert'
      break
    case 'o':
      s.text = t.slice(0, le) + '\n' + t.slice(le)
      s.cursor = le + 1
      s.mode = 'insert'
      break
    case 'O':
      s.text = t.slice(0, ls) + '\n' + t.slice(ls)
      s.cursor = ls
      s.mode = 'insert'
      break
    case 'p':
    case 'P': {
      const reg = s.register
      if (!reg.text && !reg.linewise) {
        flags.change = false
        break
      }
      if (reg.linewise) {
        const block = Array(count).fill(reg.text).join('\n')
        if (cmd === 'p') {
          s.text = t.slice(0, le) + '\n' + block + t.slice(le)
          s.cursor = firstNonBlank(s.text, le + 1)
        } else {
          s.text = t.slice(0, ls) + block + '\n' + t.slice(ls)
          s.cursor = firstNonBlank(s.text, ls)
        }
      } else {
        const block = reg.text.repeat(count)
        const at = cmd === 'p' && le > ls ? o + 1 : o
        s.text = t.slice(0, at) + block + t.slice(at)
        s.cursor = clampNormal(s.text, at + block.length - 1)
      }
      break
    }
    case 'r': {
      const ch = p.arg ?? ''
      if (ch.length !== 1 || o + count > le) {
        flags.change = false
        break
      }
      s.text = t.slice(0, o) + ch.repeat(count) + t.slice(o + count)
      s.cursor = o + count - 1
      break
    }
    case '~': {
      const end = Math.min(le, o + count)
      if (end <= o) break
      opChars(s, '~', o, end)
      s.cursor = clampNormal(s.text, end)
      break
    }
    case 'J': {
      let text = t
      let at = o
      for (let k = 0; k < Math.max(1, count - 1); k++) {
        const e = lineEnd(text, at)
        if (e >= text.length) break
        let nx = e + 1
        while (nx < text.length && isWs(text[nx])) nx++
        const left = text.slice(0, e).replace(/[ \t]+$/, '')
        const joiner = text[nx] === '\n' || nx >= text.length || text[nx] === ')' ? '' : ' '
        text = left + joiner + text.slice(nx)
        at = left.length
      }
      s.text = text
      s.cursor = clampNormal(text, at)
      break
    }
    case 'u':
    case 'C-r': {
      flags.noUndo = true
      const from = cmd === 'u' ? 'undo' : 'redo'
      const to = cmd === 'u' ? 'redo' : 'undo'
      for (let k = 0; k < count; k++) {
        const stack = s[from]
        if (!stack.length) {
          s.message = cmd === 'u' ? 'Already at oldest change' : 'Already at newest change'
          break
        }
        const snap = stack[stack.length - 1]
        s[to] = [...s[to], { text: s.text, cursor: s.cursor }]
        s[from] = stack.slice(0, -1)
        s.text = snap.text
        s.cursor = clampNormal(snap.text, snap.cursor)
      }
      break
    }
    case '.': {
      flags.noUndo = true
      const keys = s.lastChange
      if (!keys) break
      let r: VimState = s
      for (let k = 0; k < count; k++) for (const key of keys) r = feed(r, key)
      Object.assign(s, r)
      break
    }
    case 'v':
    case 'V':
      s.mode = cmd === 'v' ? 'visual' : 'visual-line'
      s.anchor = o
      break
    case '/':
      s.mode = 'search'
      s.searchBuffer = ''
      break
  }
}

function normalKey(s: VimState, key: string, flags: Flags) {
  if (key === 'Escape') {
    s.pending = []
    return
  }
  const keys = [...s.pending, key]
  const p = parseNormal(keys)
  if (p.status === 'more') {
    s.pending = keys
    return
  }
  s.pending = []
  if (p.status === 'bad') return
  const before = s.text
  execNormal(s, p, flags)
  if (flags.change && (s.mode === 'insert' || s.text !== before)) {
    if (s.mode === 'insert') s.recording = keys
    else s.lastChange = keys
  }
}

function insertText(s: VimState, str: string) {
  s.text = s.text.slice(0, s.cursor) + str + s.text.slice(s.cursor)
  s.cursor += str.length
}

function insertKey(s: VimState, key: string) {
  if (s.recording) s.recording = [...s.recording, key]
  const t = s.text
  const o = s.cursor
  switch (key) {
    case 'Escape': {
      s.mode = 'normal'
      s.cursor = clampNormal(t, o > lineStart(t, o) ? o - 1 : o)
      s.curswant = s.cursor - lineStart(t, s.cursor)
      if (s.changeStart && s.changeStart.text !== s.text) {
        s.undo = [...s.undo, s.changeStart]
        s.redo = []
      }
      s.changeStart = null
      if (s.recording) s.lastChange = s.recording
      s.recording = null
      return
    }
    case 'Enter':
      insertText(s, '\n')
      return
    case 'Tab':
      insertText(s, '  ')
      return
    case 'Backspace':
      if (o > 0) {
        s.text = t.slice(0, o - 1) + t.slice(o)
        s.cursor = o - 1
      }
      return
    case 'Delete':
      if (o < t.length) s.text = t.slice(0, o) + t.slice(o + 1)
      return
    case 'ArrowLeft':
      if (o > lineStart(t, o)) s.cursor = o - 1
      return
    case 'ArrowRight':
      if (o < lineEnd(t, o)) s.cursor = o + 1
      return
    case 'ArrowUp':
    case 'ArrowDown': {
      const { row, col } = rowCol(t, o)
      const target = row + (key === 'ArrowDown' ? 1 : -1)
      if (target < 0 || target >= lineCount(t)) return
      const start = lineOffset(t, target)
      s.cursor = start + Math.min(col, lineEnd(t, start) - start)
      return
    }
  }
  if (key.length === 1) insertText(s, key)
}

function visualKey(s: VimState, key: string, flags: Flags) {
  if (key === 'Escape') {
    s.mode = 'normal'
    s.pending = []
    return
  }
  const keys = [...s.pending, key]
  const [c, i] = readCount(keys, 0)
  if (i >= keys.length) {
    s.pending = keys
    return
  }
  const k = keys[i]
  const count = c ? parseInt(c, 10) : 1
  const t = s.text
  const lo = Math.min(s.anchor, s.cursor)
  const hi = Math.max(s.anchor, s.cursor)
  s.pending = []

  if (k === 'i' || k === 'a') {
    if (i + 1 >= keys.length) {
      s.pending = keys
      return
    }
    const r = textObject(t, s.cursor, k, keys[i + 1])
    if (r && r.end > r.start) {
      s.anchor = r.start
      s.cursor = r.end - 1
    }
    return
  }

  switch (k) {
    case 'v':
    case 'V': {
      const m = k === 'v' ? 'visual' : 'visual-line'
      s.mode = s.mode === m ? 'normal' : m
      return
    }
    case 'o':
      ;[s.anchor, s.cursor] = [s.cursor, s.anchor]
      return
    case 'd':
    case 'x':
    case 'y':
    case 'c':
    case '~':
    case 'u':
    case 'U':
    case '>':
    case '<': {
      const op = k === 'x' ? 'd' : k
      flags.change = op !== 'y'
      const linewise = s.mode === 'visual-line'
      s.mode = 'normal'
      if (linewise) {
        applyOperator(s, op, lo, hi, 'line')
        if (op === 'y') s.cursor = lineStart(t, lo)
      } else {
        opChars(s, op, lo, Math.min(hi + 1, t.length))
      }
      if ((s.mode as Mode) !== 'insert') s.cursor = clampNormal(s.text, s.cursor)
      return
    }
    case 'J': {
      s.mode = 'normal'
      s.cursor = lo
      const lines = rowCol(t, hi).row - rowCol(t, lo).row + 1
      execNormal(s, { status: 'ok', count: Math.max(2, lines), hasCount: true, type: 'cmd', cmd: 'J' }, flags)
      return
    }
  }

  const mm = parseMotion(keys, i)
  if ('status' in mm) {
    if (mm.status === 'more') s.pending = keys
    return
  }
  const r = doMotion(s, mm.motion, mm.arg, count, !!c, null)
  if (r) moveTo(s, mm.motion, r)
}

function searchKey(s: VimState, key: string) {
  switch (key) {
    case 'Escape':
      s.mode = 'normal'
      s.searchBuffer = ''
      return
    case 'Enter': {
      const q = s.searchBuffer || s.query
      s.mode = 'normal'
      s.searchBuffer = ''
      if (!q) return
      s.query = q
      const i = findMatch(s.text, q, s.cursor, 1)
      if (i === -1) s.message = `Pattern not found: ${q}`
      else {
        s.cursor = clampNormal(s.text, i)
        s.curswant = s.cursor - lineStart(s.text, s.cursor)
      }
      return
    }
    case 'Backspace':
      if (!s.searchBuffer) s.mode = 'normal'
      else s.searchBuffer = s.searchBuffer.slice(0, -1)
      return
  }
  if (key.length === 1) s.searchBuffer += key
}

// ---------------------------------------------------------------------------

export function feed(prev: VimState, key: string): VimState {
  const s: VimState = { ...prev, message: null }
  const before: Snapshot = { text: prev.text, cursor: prev.cursor }
  const flags: Flags = { noUndo: false, change: false }

  switch (prev.mode) {
    case 'insert':
      insertKey(s, key)
      return s
    case 'search':
      searchKey(s, key)
      return s
    case 'visual':
    case 'visual-line':
      visualKey(s, key, flags)
      break
    default:
      normalKey(s, key, flags)
  }

  if (s.mode === 'insert') s.changeStart = before
  else if (!flags.noUndo && s.text !== prev.text) {
    s.undo = [...s.undo, before]
    s.redo = []
  }
  return s
}

/** Parse a key notation string like `ciwfoo<Esc>` into individual keys. */
export function parseKeys(notation: string): string[] {
  const names: Record<string, string> = {
    esc: 'Escape',
    cr: 'Enter',
    enter: 'Enter',
    bs: 'Backspace',
    tab: 'Tab',
    'c-r': 'C-r',
    space: ' ',
  }
  const out: string[] = []
  const re = /<([A-Za-z-]+)>|([\s\S])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(notation))) {
    if (m[1] && names[m[1].toLowerCase()]) out.push(names[m[1].toLowerCase()])
    else out.push(m[0].length === 1 ? m[0] : m[0])
  }
  return out
}

/** Map a DOM keyboard event to an engine key, or null to ignore it. */
export function eventToKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): string | null {
  if (e.metaKey || e.altKey) return null
  if (e.ctrlKey) {
    if (e.key === 'r') return 'C-r'
    if (e.key === '[' || e.key === 'c') return 'Escape'
    return null
  }
  if (e.key.length === 1) return e.key
  const named = ['Escape', 'Enter', 'Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  return named.includes(e.key) ? e.key : null
}

/** Human label for a key, used in key chips. */
export function keyLabel(key: string) {
  const labels: Record<string, string> = {
    Escape: 'Esc',
    Enter: '⏎',
    Backspace: '⌫',
    Tab: 'Tab',
    'C-r': 'Ctrl-r',
    ' ': 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
  }
  return labels[key] ?? key
}
