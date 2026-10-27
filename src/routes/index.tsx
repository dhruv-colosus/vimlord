import { useState, type ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '../components/icons'
import { Header } from '../components/Chrome'
import {
  Chip,
  IconBubble,
  Kbd,
  LessonIcon,
  ProgressBar,
  SectionHeading,
  Segmented,
  Sparkline,
  Stars,
  tints,
} from '../components/ui'
import { chapters, lessons } from '../lib/lessons'
import {
  dayKey,
  lessonStars,
  levelInfo,
  liveStreak,
  maxStars,
  totalStars,
  useProgress,
  xpSeries,
  type Progress,
} from '../lib/progress'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const p = useProgress()
  const [chapter, setChapter] = useState<number>(0)
  const [showSummary, setShowSummary] = useState(true)
  const done = lessons.filter((l) => p.lessons[l.id]).length
  const next = lessons.find((l) => !p.lessons[l.id])

  return (
    <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
      <Header title="Learn" />

      {showSummary && (
        <section className="card rise relative mt-8 p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-card-2 py-2 pl-3 pr-4 text-[15px] font-medium text-muted">
              <Icon name="sparkles" size={18} /> Summary
            </span>
            <button
              type="button"
              aria-label="Dismiss summary"
              onClick={() => setShowSummary(false)}
              className="grid size-10 place-items-center rounded-full bg-card-2 text-muted transition hover:text-ink"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <Summary p={p} done={done} next={next} />
        </section>
      )}

      <SectionHeading left="Your progress" right={p.xp ? `Updated ${dayKey() === p.streak.last ? 'today' : 'recently'}` : 'Fresh start'} />
      <StatGrid p={p} />

      {next && <UpNext lessonId={next.id} p={p} />}

      {/* On desktop the sidebar is the course map, so the grid only shows on smaller screens. */}
      <div className="lg:hidden">
        <SectionHeading left="Course" right={`${done} of ${lessons.length} complete`} />
        <Segmented
          value={chapter}
          onChange={setChapter}
          options={[{ value: 0, label: 'All' }, ...chapters.map((c) => ({ value: c.id, label: c.title }))]}
        />
        <div className="mt-6 flex flex-col gap-10">
          {chapters
            .filter((c) => !chapter || c.id === chapter)
            .map((c) => (
              <section key={c.id}>
                <div className="mb-4 flex items-end justify-between gap-4 px-1">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">
                      <span className={`${tints[c.tint].text} mr-2 font-mono text-[15px]`}>0{c.id}</span>
                      {c.title}
                    </h2>
                    <p className="mt-0.5 text-[15px] text-muted">{c.blurb}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lessons
                    .filter((l) => l.chapter === c.id)
                    .map((l) => (
                      <LessonCard key={l.id} lessonId={l.id} p={p} upNext={next?.id === l.id} />
                    ))}
                </div>
              </section>
            ))}
        </div>
      </div>

      <SectionHeading left="Arcade" right={p.arcadeBest ? `Best ${p.arcadeBest.toLocaleString()}` : 'New'} />
      <Link
        to="/arcade"
        className="card group flex items-center gap-5 p-6 transition hover:shadow-float sm:p-7"
      >
        <IconBubble tint="pink" size="lg">
          <Icon name="gamepad" size={24} />
        </IconBubble>
        <div className="min-w-0 flex-1">
          <h3 className="text-[20px] font-semibold tracking-tight">Speed run</h3>
          <p className="text-[15px] text-muted">60 seconds. As many challenges as your fingers can handle.</p>
        </div>
        <Icon name="arrow-right" className="text-muted transition group-hover:translate-x-1 group-hover:text-ink" />
      </Link>
    </main>
  )
}

function Summary({ p, done, next }: { p: Progress; done: number; next?: (typeof lessons)[number] }) {
  const streak = liveStreak(p)
  if (!p.xp)
    return (
      <p className="mt-6 text-[21px] leading-[2.1] tracking-tight text-ink sm:text-[23px]">
        Welcome! Vim is fast because it has{' '}
        <Chip tint="purple" icon={<Icon name="zap" size={11} />}>
          modes
        </Chip>
        . You’ll learn it in{' '}
        <Chip tint="blue" icon={<Icon name="book" size={11} />}>
          {lessons.length} lessons
        </Chip>{' '}
        of tiny challenges. Start with{' '}
        <Link to="/lesson/$lessonId" params={{ lessonId: lessons[0].id }}>
          <Chip tint="green" icon={<Icon name="arrow-right" size={11} />} className="transition hover:brightness-95">
            {lessons[0].title}
          </Chip>
        </Link>
        . It takes about{' '}
        <Chip tint="teal" icon={<Icon name="fire" size={11} />}>
          3 min
        </Chip>
        .
      </p>
    )
  return (
    <p className="mt-6 text-[21px] leading-[2.1] tracking-tight text-ink sm:text-[23px]">
      You’ve earned{' '}
      <Chip tint="blue" icon={<Icon name="zap" size={11} />}>
        {p.xp.toLocaleString()} XP
      </Chip>{' '}
      and{' '}
      <Chip tint="green" icon={<Icon name="star" size={11} />}>
        {totalStars(p)} stars
      </Chip>{' '}
      across {done} {done === 1 ? 'lesson' : 'lessons'}.{' '}
      {streak > 0 && (
        <>
          You’re on a{' '}
          <Chip tint="pink" icon={<Icon name="fire" size={11} />}>
            {streak}-day
          </Chip>{' '}
          streak.{' '}
        </>
      )}
      {next ? (
        <>
          Up next is{' '}
          <Link to="/lesson/$lessonId" params={{ lessonId: next.id }}>
            <Chip tint="purple" icon={<Icon name="arrow-right" size={11} />} className="transition hover:brightness-95">
              {next.title}
            </Chip>
          </Link>
          .
        </>
      ) : (
        <>
          You’ve finished the whole course.{' '}
          <Chip tint="purple" icon={<Icon name="trophy" size={11} />}>
            Legend
          </Chip>
        </>
      )}
    </p>
  )
}

function UpNext({ lessonId, p }: { lessonId: string; p: Progress }) {
  const l = lessons.find((x) => x.id === lessonId)!
  const c = chapters.find((x) => x.id === l.chapter)!
  const { got } = lessonStars(p, l.id)
  return (
    <>
      <SectionHeading left="Up next" right={`Lesson ${lessons.indexOf(l) + 1} of ${lessons.length}`} />
      <Link
        to="/lesson/$lessonId"
        params={{ lessonId: l.id }}
        className="card group flex flex-col gap-5 p-6 transition hover:shadow-float sm:flex-row sm:items-center sm:p-7"
      >
        <IconBubble tint={c.tint} size="lg">
          <LessonIcon name={l.icon} size={24} />
        </IconBubble>
        <div className="min-w-0 flex-1">
          <h3 className="text-[22px] font-semibold tracking-tight">{l.title}</h3>
          <p className="mt-0.5 text-[15px] text-muted">
            {l.tagline} · {l.challenges.length} challenges
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {l.keys.map((k) => (
              <Kbd key={k.keys} size="sm">
                {k.keys}
              </Kbd>
            ))}
          </div>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg transition group-hover:opacity-90 sm:self-center">
          {got ? 'Continue' : 'Start lesson'} <Icon name="arrow-right" size={16} />
        </span>
      </Link>
    </>
  )
}

function StatGrid({ p }: { p: Progress }) {
  const series = xpSeries(p, 14)
  const today = series[series.length - 1]
  const lvl = levelInfo(p.xp)
  const streak = liveStreak(p)
  const stars = totalStars(p)
  const week = Array.from({ length: 7 }, (_, i) => (p.days[dayKey(new Date(Date.now() - (6 - i) * 864e5))] ?? 0) > 0)

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard tint="blue" icon={<Icon name="zap" size={20} />} label="XP" value={p.xp.toLocaleString()} badge={today ? `+${today} today` : 'New'}>
        <Sparkline data={series} color="var(--blue)" />
      </StatCard>
      <StatCard tint="green" icon={<Icon name="star" size={20} />} label="Stars" value={String(stars)} badge={`of ${maxStars}`}>
        <div className="flex h-16 items-end gap-1.5">
          {chapters.map((c) => {
            const ls = lessons.filter((l) => l.chapter === c.id)
            const got = ls.reduce((s, l) => s + lessonStars(p, l.id).got, 0)
            const max = ls.reduce((s, l) => s + lessonStars(p, l.id).max, 0)
            return (
              <div key={c.id} className="flex h-full flex-1 flex-col justify-end rounded-lg bg-card-2" title={c.title}>
                <div
                  className={`${tints[c.tint].solid} rounded-lg transition-[height] duration-700`}
                  style={{ height: `${Math.max(6, (got / max) * 100)}%`, opacity: got ? 1 : 0.25 }}
                />
              </div>
            )
          })}
        </div>
      </StatCard>
      <StatCard tint="pink" icon={<Icon name="fire" size={20} />} label="Streak" value={`${streak}d`} badge={streak ? 'Keep it up' : 'Start today'}>
        <div className="flex h-16 items-end justify-between gap-1.5">
          {week.map((on, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className={`size-full max-w-7 rounded-full ${on ? 'bg-pink' : 'bg-card-2'} aspect-square`} />
              <span className="font-mono text-[10px] text-muted">
                {'SMTWTFS'[new Date(Date.now() - (6 - i) * 864e5).getDay()]}
              </span>
            </div>
          ))}
        </div>
      </StatCard>
      <StatCard tint="purple" icon={<Icon name="trophy" size={20} />} label="Level" value={String(lvl.level)} badge={lvl.title}>
        <div className="flex h-16 flex-col justify-end gap-2">
          <ProgressBar value={lvl.pct} tint="purple" />
          <span className="text-[12px] text-muted tabular">
            {lvl.ceil > lvl.floor ? `${lvl.ceil - p.xp} XP to level ${lvl.level + 1}` : 'Max level'}
          </span>
        </div>
      </StatCard>
    </div>
  )
}

function StatCard({
  tint,
  icon,
  label,
  value,
  badge,
  children,
}: {
  tint: 'blue' | 'green' | 'pink' | 'purple'
  icon: ReactNode
  label: string
  value: string
  badge: string
  children: ReactNode
}) {
  return (
    <div className="card flex flex-col p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <IconBubble tint={tint}>{icon}</IconBubble>
        <span className="truncate text-[17px] font-medium sm:text-[19px]">{label}</span>
      </div>
      <div className="mt-5 text-[38px] font-bold leading-none tracking-[-0.03em] tabular sm:text-[46px]">{value}</div>
      <span className="mt-3 self-start rounded-full bg-card-2 px-3 py-1 text-[13px] font-medium text-muted sm:text-[15px]">
        {badge}
      </span>
      <div className="mt-6">{children}</div>
    </div>
  )
}

function LessonCard({ lessonId, p, upNext }: { lessonId: string; p: Progress; upNext: boolean }) {
  const l = lessons.find((x) => x.id === lessonId)!
  const tint = chapters.find((c) => c.id === l.chapter)!.tint
  const complete = !!p.lessons[l.id]
  const { got, max } = lessonStars(p, l.id)
  const idx = lessons.indexOf(l)

  return (
    <Link to="/lesson/$lessonId" params={{ lessonId: l.id }} className="block">
      <div
        className={`card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-float ${
          upNext ? 'ring-2 ring-blue/40' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <IconBubble tint={tint} size="lg">
            <LessonIcon name={l.icon} size={22} />
          </IconBubble>
          {complete ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[12px] font-semibold text-green">
              <Icon name="check" size={13} /> Done
            </span>
          ) : upNext ? (
            <span className="rounded-full bg-blue-soft px-2.5 py-1 text-[12px] font-semibold text-blue">Up next</span>
          ) : (
            <span className="font-mono text-[12px] text-muted">{String(idx + 1).padStart(2, '0')}</span>
          )}
        </div>
        <h3 className="mt-5 text-[19px] font-semibold tracking-tight">{l.title}</h3>
        <p className="mt-1 text-[15px] text-muted">{l.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {l.keys.slice(0, 5).map((k) => (
            <Kbd key={k.keys} size="sm">
              {k.keys}
            </Kbd>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-6">
          <span className="flex items-center gap-2 text-[13px] text-muted tabular">
            <Stars value={Math.round((got / max) * 3)} size={14} />
            {got}/{max}
          </span>
          <span className="text-[14px] font-semibold text-blue">
            {complete ? 'Replay' : got ? 'Continue' : 'Start'}
            <Icon name="arrow-right" size={15} className="ml-1 inline transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
