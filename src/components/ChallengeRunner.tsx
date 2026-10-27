import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import type { Challenge } from '../lib/lessons'
import { initRun, par, starsFor, stepRun, type RunState } from '../lib/challenge'
import { eventToKey, keyLabel, parseKeys } from '../lib/vim/engine'
import { VimEditor } from './VimEditor'
import { Chip, Kbd, Rich, Stars } from './ui'

export interface SolveResult {
  keystrokes: number
  stars: number
  par: number
}

interface Props {
  challenge: Challenge
  /** Small label above the title, e.g. "Challenge 2 of 5". */
  eyebrow: ReactNode
  onSolved: (r: SolveResult) => void | number
  onContinue: () => void
  continueLabel?: string
  /** Arcade mode skips the success card and continues automatically. */
  compact?: boolean
}

function isTyping(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

export function ChallengeRunner({ challenge, eyebrow, onSolved, onContinue, continueLabel = 'Continue', compact }: Props) {
  const [run, setRun] = useState<RunState>(() => initRun(challenge))
  const [demo, setDemo] = useState(false)
  const [hint, setHint] = useState(false)
  const [result, setResult] = useState<(SolveResult & { xp: number }) | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const demoRef = useRef(false)
  const p = par(challenge)

  // Reset whenever the challenge changes.
  useEffect(() => {
    setRun(initRun(challenge))
    setResult(null)
    setHint(false)
    setDemo(false)
    demoRef.current = false
  }, [challenge])

  // Keys arrive faster than React re-renders, so the handler works off refs
  // and resolves a solve synchronously.
  const runRef = useRef(run)
  runRef.current = run
  const resultRef = useRef(result)
  resultRef.current = result
  const latest = useRef({ onSolved, onContinue })
  latest.current = { onSolved, onContinue }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || demoRef.current) return
      const key = eventToKey(e)
      if (!key) return
      e.preventDefault()
      if (resultRef.current) {
        if (key === 'Enter' && !compact) latest.current.onContinue()
        return
      }
      const next = stepRun(runRef.current, challenge, key)
      runRef.current = next
      setRun(next)
      if (next.blocked) setShakeKey((k) => k + 1)
      if (next.solved) {
        const r = { keystrokes: next.keystrokes, stars: starsFor(next.keystrokes, p), par: p }
        const xp = latest.current.onSolved(r)
        const res = { ...r, xp: typeof xp === 'number' ? xp : 0 }
        resultRef.current = res
        setResult(res)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [challenge, compact, p])

  const restart = () => {
    if (demoRef.current) return
    setRun(initRun(challenge))
  }

  const playDemo = async () => {
    if (demoRef.current || result) return
    demoRef.current = true
    setDemo(true)
    let rs = initRun(challenge)
    setRun(rs)
    await wait(500)
    for (const key of parseKeys(challenge.solution)) {
      if (!demoRef.current) return
      rs = stepRun(rs, challenge, key)
      setRun(rs)
      await wait(key.length === 1 && rs.vim.mode === 'insert' ? 140 : 420)
    }
    await wait(1100)
    if (!demoRef.current) return
    setRun(initRun(challenge))
    demoRef.current = false
    setDemo(false)
  }

  const liveStars = starsFor(run.keystrokes, p)
  const recent = run.history.slice(-16)

  const overlay = result && !compact && (
    <div className="absolute inset-0 grid place-items-center bg-card/85 p-4 backdrop-blur-md">
      <div className="rise flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-4">
          <span className="tick-badge pop-in relative grid size-16 shrink-0 place-items-center rounded-full bg-green text-white">
            <svg viewBox="0 0 24 24" width={36} height={36} fill="none" aria-hidden>
              <path className="tick-draw" d="M5.1 13.25l3.95 3.5 9.85-10.05" pathLength={1} stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex flex-col items-start gap-1">
            <h3 className="text-[22px] font-semibold leading-tight tracking-tight">
              {result.stars === 3 ? 'Flawless' : result.stars === 2 ? 'Nice work' : 'Solved'}
            </h3>
            <span className="pop-in" style={{ animationDelay: '120ms' }}>
              <Stars value={result.stars} size={20} />
            </span>
          </div>
        </div>
        <p className="flex flex-wrap items-center justify-center gap-2 text-[14px] text-muted">
          {result.keystrokes} keystrokes · par {result.par}
          {result.xp > 0 && (
            <Chip tint="blue" icon={<Icon name="zap" size={10} />} className="text-[14px]">
              +{result.xp} XP
            </Chip>
          )}
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-bg transition hover:opacity-90 active:scale-[0.98]"
        >
          {continueLabel} <Icon name="arrow-right" size={16} />
          <span className="ml-1 rounded-md bg-bg/15 px-1.5 py-0.5 font-mono text-xs">⏎</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="label-mono">{eyebrow}</span>
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <span className="tabular">
              {run.keystrokes}/{p}
            </span>
            <Stars value={run.solved ? starsFor(run.keystrokes, p) : liveStars} size={14} />
          </span>
        </div>
        <h2 className="mt-3 text-[26px] font-semibold tracking-tight">{challenge.title}</h2>
        <p className="mt-2 text-[18px] leading-[1.75] text-ink-2">
          <Rich text={challenge.prompt} />
        </p>
        {hint && challenge.hint && (
          <p className="rise mt-4 flex gap-2 rounded-2xl bg-amber-soft px-4 py-3 text-[15px] leading-relaxed text-ink-2">
            <Icon name="bulb" size={18} className="mt-0.5 shrink-0 text-amber" />
            <span>
              <Rich text={challenge.hint} />
            </span>
          </p>
        )}
      </div>

      <div key={shakeKey} className={run.blocked ? 'shake' : ''}>
        <VimEditor run={run} walls={challenge.walls} overlay={overlay} />
      </div>

      <GoalStrip challenge={challenge} run={run} demo={demo} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="no-scrollbar flex min-h-10 flex-1 items-center gap-1.5 overflow-x-auto">
          {recent.length === 0 ? (
            <span className="text-[14px] text-muted">{demo ? 'Watch closely…' : 'Your keystrokes show up here'}</span>
          ) : (
            recent.map((k, i) => (
              <span key={run.history.length - recent.length + i} className="pop-in">
                <Kbd size="sm">{keyLabel(k)}</Kbd>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          {challenge.hint && !compact && (
            <ToolButton onClick={() => setHint((h) => !h)} icon={<Icon name="bulb" size={16} />}>
              Hint
            </ToolButton>
          )}
          {!compact && (
            <ToolButton onClick={playDemo} icon={<Icon name="eye" size={16} />} disabled={demo || !!result}>
              Show me
            </ToolButton>
          )}
          <ToolButton onClick={restart} icon={<Icon name="restart" size={16} />} disabled={demo || !!result}>
            Restart
          </ToolButton>
        </div>
      </div>
    </div>
  )
}

function GoalStrip({ challenge, run, demo }: { challenge: Challenge; run: RunState; demo: boolean }) {
  if (run.blocked)
    return (
      <div className="rise flex items-center gap-2 rounded-2xl bg-amber-soft px-4 py-3 text-[15px] text-amber">
        <Icon name="zap" size={16} /> {run.blocked}
      </div>
    )
  if (demo)
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-purple-soft px-4 py-3 text-[15px] text-purple">
        <Icon name="eye" size={16} /> Demo playing. Try it yourself next.
      </div>
    )
  if (challenge.goal === 'reach')
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-[15px] text-ink-2 shadow-card">
        <Chip tint="green" icon={<Icon name="gem" size={10} />}>
          {run.collected.length}/{run.targets.length}
        </Chip>
        {run.collected.length === run.targets.length ? 'All gems collected' : 'Land on every gem'}
      </div>
    )
  if (challenge.goal === 'mode')
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-[15px] text-ink-2 shadow-card">
        <Chip tint="blue" icon={<Icon name="target" size={10} />}>
          Goal
        </Chip>
        Get to <strong className="font-semibold capitalize text-ink">{challenge.mode}</strong> mode
      </div>
    )
  const matches = run.vim.text === challenge.target
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center sm:gap-4">
      <Chip tint={matches ? 'green' : 'teal'} icon={matches ? <Icon name="check" size={10} /> : <Icon name="target" size={10} />}>
        Target
      </Chip>
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[14px] leading-relaxed text-ink">{challenge.target}</pre>
      {matches && run.vim.mode !== 'normal' && (
        <span className="text-[14px] text-green">
          Matches. Press <Kbd>Esc</Kbd> to finish.
        </span>
      )}
      {challenge.mustUse && !matches && (
        <span className="text-[13px] text-muted">
          Use {challenge.mustUse.map((k) => (
            <span key={k} className="mr-1">
              <Kbd size="sm">{keyLabel(k)}</Kbd>
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

function ToolButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: ReactNode
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.currentTarget.blur()
        onClick()
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[14px] font-medium text-ink-2 shadow-card transition hover:text-ink disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  )
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
