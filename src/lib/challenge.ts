import { createState, feed, keyLabel, parseKeys, type VimState } from './vim/engine'
import { parseStart, type Challenge } from './lessons'

export interface RunState {
  vim: VimState
  targets: number[]
  collected: number[]
  used: string[]
  keystrokes: number
  history: string[]
  blocked: string | null
  solved: boolean
}

export function initRun(ch: Challenge): RunState {
  const { text, cursor, targets } = parseStart(ch.start)
  return {
    vim: createState(text, cursor, ch.startMode ?? 'normal'),
    targets,
    collected: [],
    used: [],
    keystrokes: 0,
    history: [],
    blocked: null,
    solved: false,
  }
}

export function stepRun(rs: RunState, ch: Challenge, key: string): RunState {
  if (rs.solved) return rs
  const { vim } = rs
  const startsCommand = vim.mode === 'normal' && vim.pending.length === 0
  if (ch.allowed && startsCommand && key !== 'Escape' && !ch.allowed.includes(key)) {
    const list = ch.allowed.filter((k) => !/^[0-9]$/.test(k)).map(keyLabel).join(' ')
    return { ...rs, blocked: `Use ${list} for this one` }
  }

  const next = feed(vim, key)
  if (ch.walls && ch.walls.includes(next.text[next.cursor] ?? '')) {
    return { ...rs, blocked: 'Bonk! That’s a wall', keystrokes: rs.keystrokes + 1, history: [...rs.history, key] }
  }

  const collected =
    rs.targets.includes(next.cursor) && !rs.collected.includes(next.cursor)
      ? [...rs.collected, next.cursor]
      : rs.collected
  const used = rs.used.includes(key) ? rs.used : [...rs.used, key]
  const out: RunState = {
    ...rs,
    vim: next,
    collected,
    used,
    keystrokes: rs.keystrokes + 1,
    history: [...rs.history, key],
    blocked: null,
  }
  out.solved = isSolved(out, ch)
  return out
}

export function isSolved(rs: RunState, ch: Challenge) {
  if (ch.mustUse && !ch.mustUse.every((k) => rs.used.includes(k))) return false
  switch (ch.goal) {
    case 'text':
      return rs.vim.text === ch.target && rs.vim.mode === 'normal'
    case 'reach':
      return rs.collected.length === rs.targets.length
    case 'mode':
      return rs.keystrokes > 0 && rs.vim.mode === ch.mode
  }
}

export function par(ch: Challenge) {
  return parseKeys(ch.solution).length
}

/** 3 stars at or under par, 2 within 50% over, otherwise 1. */
export function starsFor(keystrokes: number, p: number) {
  if (keystrokes <= p) return 3
  if (keystrokes <= Math.ceil(p * 1.5) + 1) return 2
  return 1
}
