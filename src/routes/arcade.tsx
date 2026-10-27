import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Icon } from '../components/icons'
import { Header } from '../components/Chrome'
import { ChallengeRunner, type SolveResult } from '../components/ChallengeRunner'
import { Confetti } from '../components/Confetti'
import { Chip, IconBubble, SectionHeading } from '../components/ui'
import { lessons, type Challenge } from '../lib/lessons'
import { progress, useProgress } from '../lib/progress'

export const Route = createFileRoute('/arcade')({
  head: () => ({ meta: [{ title: 'Arcade · Vimlord' }] }),
  component: Arcade,
})

const DURATION = 60

function pool() {
  const out: { challenge: Challenge; lesson: string }[] = []
  for (const l of lessons) {
    for (const c of l.challenges) if (c.goal !== 'mode') out.push({ challenge: c, lesson: l.title })
  }
  return out
}

function shuffle<T>(xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase = 'idle' | 'playing' | 'over'

function Arcade() {
  const p = useProgress()
  const [phase, setPhase] = useState<Phase>('idle')
  const [queue, setQueue] = useState<ReturnType<typeof pool>>([])
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(1)
  const [solved, setSolved] = useState(0)
  const [left, setLeft] = useState(DURATION)
  const [flash, setFlash] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ xp: number; best: boolean } | null>(null)
  const keysRef = useRef(0)
  const endsAt = useRef(0)
  const prevBest = useRef(0)

  const start = useCallback(() => {
    setQueue(shuffle(pool()))
    setI(0)
    setScore(0)
    setCombo(1)
    setSolved(0)
    setLeft(DURATION)
    setSummary(null)
    keysRef.current = 0
    prevBest.current = progress.get().arcadeBest
    endsAt.current = Date.now() + DURATION * 1000
    setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const s = Math.max(0, (endsAt.current - Date.now()) / 1000)
      setLeft(s)
      if (s <= 0) setPhase('over')
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'over' || summary) return
    const xp = progress.arcadeScore(score, keysRef.current)
    setSummary({ xp, best: score > prevBest.current })
  }, [phase, score, summary])

  useEffect(() => {
    if (phase === 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start])

  const advance = useCallback(() => {
    setI((n) => n + 1)
  }, [])

  const onSolved = useCallback(
    (r: SolveResult) => {
      keysRef.current += r.keystrokes
      const perfect = r.stars === 3
      const gained = 100 * combo + (perfect ? 50 : 0)
      setScore((s) => s + gained)
      setSolved((n) => n + 1)
      setCombo((c) => (perfect ? Math.min(c + 1, 5) : 1))
      setFlash(`+${gained}${perfect ? ' · perfect' : ''}`)
      setTimeout(() => setFlash(null), 900)
      setTimeout(advance, 450)
    },
    [combo, advance],
  )

  const skip = () => {
    setCombo(1)
    advance()
  }

  const current = queue.length ? queue[i % queue.length] : null

  return (
    <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
      <Header title="Arcade" />

      {phase === 'idle' && (
        <section className="card rise mx-auto mt-12 max-w-2xl p-7 text-center sm:p-10">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-pink-soft text-pink">
            <Icon name="gamepad" size={36} />
          </span>
          <p className="label-mono mt-6">Arcade</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-tight">Speed run</h1>
          <p className="mx-auto mt-4 max-w-lg text-[19px] leading-[2.1] text-ink">
            Clear as many challenges as you can in{' '}
            <Chip tint="teal" icon={<Icon name="timer" size={11} />}>
              {DURATION} seconds
            </Chip>
            . Solve at par to build a{' '}
            <Chip tint="pink" icon={<Icon name="fire" size={11} />}>
              combo
            </Chip>{' '}
            up to ×5. Challenges come from all{' '}
            <Chip tint="blue" icon={<Icon name="zap" size={11} />}>
              {lessons.length} lessons
            </Chip>
            .
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] font-semibold text-bg transition hover:opacity-90"
          >
            <Icon name="play" size={16} className="fill-current" /> Start
            <span className="ml-1 rounded-md bg-bg/15 px-1.5 py-0.5 font-mono text-xs">⏎</span>
          </button>
          {p.arcadeBest > 0 && (
            <p className="mt-5 text-[14px] text-muted">
              Personal best <span className="font-semibold text-ink tabular">{p.arcadeBest.toLocaleString()}</span>
            </p>
          )}
        </section>
      )}

      {phase === 'playing' && current && (
        <>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <HudCard tint="teal" icon={<Icon name="timer" size={18} />} label="Time" value={`${Math.ceil(left)}s`} />
            <HudCard tint="blue" icon={<Icon name="zap" size={18} />} label="Score" value={score.toLocaleString()} flash={flash} />
            <HudCard tint="pink" icon={<Icon name="fire" size={18} />} label="Combo" value={`×${combo}`} />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card-2">
            <div
              className={`h-full rounded-full transition-[width] duration-100 ease-linear ${left < 10 ? 'bg-pink' : 'bg-teal'}`}
              style={{ width: `${(left / DURATION) * 100}%` }}
            />
          </div>
          <div className="mx-auto mt-6 max-w-3xl">
            <ChallengeRunner
              key={i}
              challenge={current.challenge}
              eyebrow={`#${i + 1} · ${current.lesson}`}
              onSolved={onSolved}
              onContinue={advance}
              compact
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur()
                  skip()
                }}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted transition hover:text-ink"
              >
                <Icon name="skip" size={15} /> Skip (resets combo)
              </button>
            </div>
          </div>
        </>
      )}

      {phase === 'over' && (
        <section className="card rise mx-auto mt-12 max-w-2xl p-7 text-center sm:p-10">
          {summary?.best && score > 0 && <Confetti />}
          <span className="pop-in mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#ffd25e] to-[#f59e0b] text-white shadow-float">
            <Icon name="trophy" size={36} />
          </span>
          <p className="label-mono mt-6">{summary?.best && score > 0 ? 'New personal best' : 'Time’s up'}</p>
          <h1 className="mt-2 text-[56px] font-bold leading-none tracking-[-0.03em] tabular">{score.toLocaleString()}</h1>
          <p className="mx-auto mt-6 max-w-lg text-[19px] leading-[2.1] text-ink">
            You cleared{' '}
            <Chip tint="green" icon={<Icon name="zap" size={11} />}>
              {solved} challenges
            </Chip>{' '}
            and earned{' '}
            <Chip tint="blue" icon={<Icon name="zap" size={11} />}>
              {summary?.xp ?? 0} XP
            </Chip>
            .
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[16px] font-semibold text-bg transition hover:opacity-90"
          >
            <Icon name="play" size={16} className="fill-current" /> Play again
            <span className="ml-1 rounded-md bg-bg/15 px-1.5 py-0.5 font-mono text-xs">⏎</span>
          </button>
        </section>
      )}

      {phase !== 'playing' && (
        <>
          <SectionHeading left="How scoring works" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { tint: 'blue' as const, icon: <Icon name="zap" size={20} />, title: '100 × combo', body: 'Every solve scores 100 points times your current combo.' },
              { tint: 'pink' as const, icon: <Icon name="fire" size={20} />, title: 'Perfect = +1 combo', body: 'Solve at or under par for a 50 point bonus and a bigger multiplier.' },
              { tint: 'teal' as const, icon: <Icon name="skip" size={20} />, title: 'Skips cost combo', body: 'Stuck? Skip ahead, but your multiplier drops back to ×1.' },
            ].map((c) => (
              <div key={c.title} className="card p-6">
                <IconBubble tint={c.tint}>{c.icon}</IconBubble>
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}

function HudCard({
  tint,
  icon,
  label,
  value,
  flash,
}: {
  tint: 'teal' | 'blue' | 'pink'
  icon: ReactNode
  label: string
  value: string
  flash?: string | null
}) {
  return (
    <div className="card relative flex items-center gap-3 px-4 py-4 sm:px-5">
      <IconBubble tint={tint}>{icon}</IconBubble>
      <div className="min-w-0">
        <div className="text-[12px] text-muted">{label}</div>
        <div className="text-[22px] font-bold leading-tight tracking-tight tabular sm:text-[26px]">{value}</div>
      </div>
      {flash && (
        <span className="pop-in absolute -top-3 right-3 rounded-full bg-green px-2.5 py-1 text-[12px] font-semibold text-white shadow-float">
          {flash}
        </span>
      )}
    </div>
  )
}
