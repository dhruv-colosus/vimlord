import type { ReactNode } from 'react'
import { keyLabel, lineEnd, lineStart, rowCol, type Mode } from '../lib/vim/engine'
import type { RunState } from '../lib/challenge'

const modeStyle: Record<Mode, { label: string; cls: string; cursor: string }> = {
  normal: { label: 'Normal', cls: 'bg-blue-soft text-blue', cursor: 'bg-blue' },
  insert: { label: 'Insert', cls: 'bg-green-soft text-green', cursor: 'bg-green' },
  visual: { label: 'Visual', cls: 'bg-purple-soft text-purple', cursor: 'bg-purple' },
  'visual-line': { label: 'Visual line', cls: 'bg-purple-soft text-purple', cursor: 'bg-purple' },
  search: { label: 'Search', cls: 'bg-teal-soft text-teal', cursor: 'bg-teal' },
}

export function ModeBadge({ mode }: { mode: Mode }) {
  const m = modeStyle[mode]
  return (
    <span
      className={`${m.cls} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors`}
    >
      <span className={`${m.cursor} size-1.5 rounded-full`} />
      {m.label}
    </span>
  )
}

export function VimEditor({
  run,
  walls,
  overlay,
}: {
  run: RunState
  walls?: string
  overlay?: ReactNode
}) {
  const { vim, targets, collected } = run
  const t = vim.text
  const lines = t.split('\n')
  const cur = rowCol(t, vim.cursor)
  const visual = vim.mode === 'visual' || vim.mode === 'visual-line'
  let selLo = -1
  let selHi = -2
  if (visual) {
    selLo = Math.min(vim.anchor, vim.cursor)
    selHi = Math.max(vim.anchor, vim.cursor)
    if (vim.mode === 'visual-line') {
      selLo = lineStart(t, selLo)
      selHi = lineEnd(t, selHi)
    }
  }
  const matches = new Set<number>()
  if (vim.query) {
    for (let i = t.indexOf(vim.query); i !== -1; i = t.indexOf(vim.query, i + 1))
      for (let k = 0; k < vim.query.length; k++) matches.add(i + k)
  }
  const style = modeStyle[vim.mode]
  const barCursor = vim.mode === 'insert'

  let offset = 0
  const rows = lines.map((line, row) => {
    const start = offset
    offset += line.length + 1
    const cells: ReactNode[] = []
    // One extra cell so the cursor can sit at end of line / on empty lines.
    const extra = line.length === 0 || (barCursor && cur.row === row) ? 1 : 0
    for (let col = 0; col < line.length + extra; col++) {
      const off = start + col
      const ch = line[col] ?? ' '
      const isCursor = off === vim.cursor
      const isWall = !!walls && walls.includes(ch)
      const isGem = targets.includes(off) && !collected.includes(off)
      const wasGem = targets.includes(off) && collected.includes(off)
      const selected = off >= selLo && off <= selHi
      let cls = 'relative inline-block'
      let content: ReactNode = ch
      if (isWall) {
        cls += ' bg-wall text-transparent'
        content = ch
      } else if (ch === '·') {
        cls += ' text-muted/50'
      }
      if (selected) cls += ' bg-purple-soft'
      else if (matches.has(off)) cls += ' bg-amber-soft'
      if (isGem) cls += ' gem rounded-[5px] bg-green-soft text-green font-bold'
      if (wasGem && !isCursor) cls += ' text-green/60'
      if (isCursor && !barCursor) cls += ` ${style.cursor} rounded-[3px] !text-white`
      cells.push(
        <span key={col} className={cls}>
          {isCursor && barCursor && (
            <span className={`${style.cursor} blink absolute -left-px top-[0.12em] bottom-[0.12em] w-[2px] rounded-full`} />
          )}
          {content}
        </span>,
      )
    }
    const active = row === cur.row
    return (
      <div key={row} className={`flex ${active ? 'bg-card-2' : ''} rounded-lg`}>
        <span
          className={`w-10 shrink-0 select-none pr-4 text-right tabular ${active ? 'text-ink' : 'text-muted/70'}`}
        >
          {row + 1}
        </span>
        <span className="whitespace-pre">{cells}</span>
      </div>
    )
  })

  return (
    <div className="card relative overflow-hidden">
      <div className="min-h-44 overflow-x-auto px-3 py-5 sm:px-5">
        <div className="min-w-max font-mono text-[15px] leading-[1.85] sm:text-[17px]">{rows}</div>
      </div>
      <div className="flex min-h-12 items-center gap-3 border-t border-line px-5 py-2.5 text-[13px]">
        <ModeBadge mode={vim.mode} />
        {vim.mode === 'search' ? (
          <span className="font-mono text-ink">
            /{vim.searchBuffer}
            <span className="blink ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-teal" />
          </span>
        ) : vim.pending.length ? (
          <span className="font-mono text-ink-2">{vim.pending.map(keyLabel).join('')}</span>
        ) : vim.message ? (
          <span className="truncate text-muted">{vim.message}</span>
        ) : null}
        <span className="ml-auto font-mono text-muted tabular">
          {cur.row + 1}:{cur.col + 1}
        </span>
      </div>
      {overlay}
    </div>
  )
}
