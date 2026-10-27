import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { Icon } from '../components/icons'
import { MenuButton } from '../components/Chrome'
import { ChallengeRunner, type SolveResult } from '../components/ChallengeRunner'
import { Confetti } from '../components/Confetti'
import { Chip, IconBubble, Kbd, LessonIcon, Rich, Stars, tints } from '../components/ui'
import { chapters, lessonById, lessonIndex, lessons } from '../lib/lessons'
import { lessonStars, progress, useProgress } from '../lib/progress'

export const Route = createFileRoute('/lesson/$lessonId')({
  loader: ({ params }) => {
    const lesson = lessonById(params.lessonId)
    if (!lesson) throw notFound()
    return { title: lesson.title }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? 'Lesson'} · Vimlord` }] }),
  component: LessonPage,
})

interface Result extends SolveResult {
  xp: number
}

function LessonPage() {
  const { lessonId } = Route.useParams()
  const lesson = lessonById(lessonId)!
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<(Result | undefined)[]>([])
  const [finished, setFinished] = useState<{ bonus: number } | null>(null)
  const [briefing, setBriefing] = useState(true)
  const chapter = chapters.find((c) => c.id === lesson.chapter)!
  const nextLesson = lessons[lessonIndex(lessonId) + 1]

  useEffect(() => {
    setIndex(0)
    setResults([])
    setFinished(null)
  }, [lessonId])

  const challenge = lesson.challenges[index]

  const onSolved = useCallback(
    (r: SolveResult) => {
      const xp = progress.completeChallenge(lesson.id, index, r.stars, r.keystrokes)
      setResults((rs) => {
        const out = [...rs]
        out[index] = { ...r, xp }
        return out
      })
      return xp
    },
    [lesson.id, index],
  )

  const onContinue = useCallback(() => {
    if (index + 1 < lesson.challenges.length) setIndex(index + 1)
    else setFinished({ bonus: progress.completeLesson(lesson.id) })
  }, [index, lesson])

  // Enter on the completion screen moves on to the next lesson.
  useEffect(() => {
    if (!finished) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (nextLesson) navigate({ to: '/lesson/$lessonId', params: { lessonId: nextLesson.id } })
      else navigate({ to: '/' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finished, nextLesson, navigate])

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <header className="flex items-center gap-3">
        <MenuButton />
        <div className="flex min-w-0 items-center gap-3">
          <IconBubble tint={chapter.tint} size="lg">
            <LessonIcon name={lesson.icon} size={22} />
          </IconBubble>
          <div className="min-w-0">
            <p className="label-mono !text-[11px]">
              Lesson {lessonIndex(lesson.id) + 1} · {chapter.title}
            </p>
            <h1 className="truncate text-[22px] font-semibold tracking-tight sm:text-[26px]">{lesson.title}</h1>
          </div>
        </div>
        <div className="ml-auto hidden items-center gap-1 rounded-full border border-line bg-card p-1.5 shadow-card sm:flex">
          {lesson.challenges.map((c, i) => {
            const r = results[i]
            return (
              <button
                key={i}
                type="button"
                title={c.title}
                disabled={!!finished}
                onClick={(e) => {
                  e.currentTarget.blur()
                  setIndex(i)
                }}
                className={`grid h-9 min-w-9 place-items-center rounded-full px-2 font-mono text-[13px] font-semibold transition ${
                  i === index && !finished ? 'bg-blue-soft text-blue' : r ? 'text-green' : 'text-muted'
                } disabled:cursor-default`}
              >
                {r ? <Icon name="star" size={15} /> : i + 1}
              </button>
            )
          })}
        </div>
      </header>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card-2 sm:hidden">
        <div
          className={`${tints[chapter.tint].solid} h-full rounded-full transition-[width] duration-500`}
          style={{ width: `${((finished ? lesson.challenges.length : index) / lesson.challenges.length) * 100}%` }}
        />
      </div>

      {finished ? (
        <LessonComplete
          lessonId={lesson.id}
          results={results}
          bonus={finished.bonus}
          onReplay={() => {
            setIndex(0)
            setResults([])
            setFinished(null)
          }}
        />
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <section className="card px-6 py-5">
            <button
              type="button"
              aria-expanded={briefing}
              onClick={(e) => {
                e.currentTarget.blur()
                setBriefing((b) => !b)
              }}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-card-2 py-1.5 pl-2.5 pr-3.5 text-[14px] font-medium text-muted">
                <Icon name="book" size={16} /> Briefing
              </span>
              {!briefing && <span className="truncate text-[15px] text-muted">{lesson.tagline}</span>}
              <span className="ml-auto text-[13px] font-medium text-blue">{briefing ? 'Hide' : 'Show'}</span>
            </button>
            {briefing && (
              <div className={`mt-4 grid gap-x-8 gap-y-4 ${lesson.briefing.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {lesson.briefing.map((b) => (
                  <div key={b.title}>
                    <h3 className="text-[15px] font-semibold tracking-tight">{b.title}</h3>
                    <p className="mt-1 text-[14.5px] leading-[1.7] text-ink-2">
                      <Rich text={b.body} />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          <ChallengeRunner
            key={`${lesson.id}:${index}`}
            challenge={challenge}
            eyebrow={`Challenge ${index + 1} of ${lesson.challenges.length}`}
            onSolved={onSolved}
            onContinue={onContinue}
            continueLabel={index + 1 < lesson.challenges.length ? 'Next challenge' : 'Finish lesson'}
          />
          <p className="px-2 text-[13px] leading-relaxed text-muted">
            Lost? <Kbd size="sm">Esc</Kbd> always gets you back to Normal mode. Every key from every lesson is in the
            sidebar.
          </p>
        </div>
      )}
    </main>
  )
}

function LessonComplete({
  lessonId,
  results,
  bonus,
  onReplay,
}: {
  lessonId: string
  results: (Result | undefined)[]
  bonus: number
  onReplay: () => void
}) {
  const lesson = lessonById(lessonId)!
  const p = useProgress()
  const nextLesson = lessons[lessonIndex(lessonId) + 1]
  const earned = results.reduce((s, r) => s + (r?.xp ?? 0), 0) + bonus
  const stars = results.reduce((s, r) => s + (r?.stars ?? 0), 0)
  const max = lesson.challenges.length * 3
  const keys = results.reduce((s, r) => s + (r?.keystrokes ?? 0), 0)
  const best = lessonStars(p, lessonId)

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <Confetti />
      <section className="card rise p-7 text-center sm:p-10">
        <span className="pop-in mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#ffd25e] to-[#f59e0b] text-white shadow-float">
          <Icon name="trophy" size={36} />
        </span>
        <p className="label-mono mt-6">Lesson complete</p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-tight">{lesson.title}</h1>
        <div className="mt-4 flex justify-center">
          <Stars value={Math.round((stars / max) * 3)} size={30} />
        </div>
        <p className="mx-auto mt-6 max-w-lg text-[19px] leading-[2.1] text-ink">
          You earned{' '}
          <Chip tint="blue" icon={<Icon name="zap" size={11} />}>
            {earned} XP
          </Chip>{' '}
          and{' '}
          <Chip tint="green" icon={<Icon name="star" size={11} />}>
            {stars}/{max} stars
          </Chip>{' '}
          in{' '}
          <Chip tint="purple" icon={<Icon name="keyboard" size={11} />}>
            {keys} keystrokes
          </Chip>
          .{bonus > 0 && ' That includes a 50 XP first-clear bonus.'}
          {best.got > stars && ` Your best is still ${best.got}/${best.max}.`}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-5 py-3 font-semibold text-ink-2 shadow-card transition hover:text-ink"
          >
            <Icon name="restart" size={16} /> Replay for stars
          </button>
          {nextLesson ? (
            <Link
              to="/lesson/$lessonId"
              params={{ lessonId: nextLesson.id }}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-bg transition hover:opacity-90"
            >
              Next: {nextLesson.title} <Icon name="arrow-right" size={16} />
              <span className="ml-1 rounded-md bg-bg/15 px-1.5 py-0.5 font-mono text-xs">⏎</span>
            </Link>
          ) : (
            <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-bg">
              Back to dashboard <Icon name="arrow-right" size={16} />
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
