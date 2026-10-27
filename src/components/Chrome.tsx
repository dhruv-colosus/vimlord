import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Icon, type IconName } from './icons'
import { Kbd, ProgressBar, tints } from './ui'
import { chapters, lessons } from '../lib/lessons'
import { lessonStars, levelInfo, liveStreak, useProgress } from '../lib/progress'

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5c93" />
          <stop offset="100%" stopColor="#c43cf0" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5c.9 4.9 3.2 8.6 9.9 10.5-6.7 1.9-9 5.6-9.9 10.5-.9-4.9-3.2-8.6-9.9-10.5C8.8 10.1 11.1 6.4 12 1.5Z"
        fill="url(#brand)"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Shell: persistent course sidebar on desktop, a drawer on smaller screens.

const DrawerContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
})

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => setOpen(false), [path])

  return (
    <DrawerContext.Provider value={{ open, setOpen }}>
      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh border-r border-line bg-card lg:block">
          <Sidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Course">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="slide-in absolute inset-y-0 left-0 w-[380px] max-w-[90vw] bg-card shadow-float">
            <Sidebar />
          </div>
        </div>
      )}
      <TabBar />
    </DrawerContext.Provider>
  )
}

export function MenuButton() {
  const { setOpen } = useContext(DrawerContext)
  return (
    <button
      type="button"
      aria-label="Open course"
      onClick={() => setOpen(true)}
      className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-card shadow-card transition hover:scale-[1.04] lg:hidden"
    >
      <Icon name="menu" size={20} />
    </button>
  )
}

const nav: { to: '/' | '/arcade' | '/keys'; label: string; icon: IconName }[] = [
  { to: '/', label: 'Learn', icon: 'grid' },
  { to: '/arcade', label: 'Arcade', icon: 'gamepad' },
  { to: '/keys', label: 'Keys', icon: 'keyboard' },
]

function Sidebar() {
  const p = useProgress()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const activeId = path.startsWith('/lesson/') ? decodeURIComponent(path.split('/')[2] ?? '') : null
  const nextId = lessons.find((l) => !p.lessons[l.id])?.id
  const scroller = useRef<HTMLDivElement>(null)
  const lvl = levelInfo(p.xp)
  const streak = liveStreak(p)
  const done = lessons.filter((l) => p.lessons[l.id]).length

  // Keep the lesson being played in view.
  useEffect(() => {
    const box = scroller.current
    const el = box?.querySelector<HTMLElement>(`[data-lesson="${activeId ?? nextId}"]`)
    if (!box || !el) return
    const top = el.offsetTop - box.offsetTop
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTo({ top: Math.max(0, top - 96), behavior: 'smooth' })
  }, [activeId, nextId])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full bg-card-2">
              <BrandMark size={20} />
            </span>
            <span className="text-[19px] font-semibold tracking-tight">Vimlord</span>
          </Link>
          <span
            title={`${streak}-day streak`}
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold tabular ${
              streak ? 'bg-pink-soft text-pink' : 'bg-card-2 text-muted'
            }`}
          >
            <Icon name="fire" size={15} /> {streak}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-card-2 p-2.5 pr-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#d4f05a] to-[#8fd13a] text-[16px] font-bold text-[#24360a]">
            {lvl.level}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold">{lvl.title}</span>
              <span className="text-[12px] text-muted tabular">{p.xp.toLocaleString()} XP</span>
            </div>
            <ProgressBar value={lvl.pct} tint="green" />
          </div>
        </div>

        <nav className="grid grid-cols-3 gap-1 rounded-full bg-card-2 p-1">
          {nav.map((n) => {
            const active = n.to === '/' ? path === '/' : path.startsWith(n.to)
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-medium transition ${
                  active ? 'bg-card text-blue shadow-card' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon name={n.icon} size={16} />
                {n.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-baseline justify-between border-t border-line px-6 pb-2 pt-4">
        <span className="label-mono !text-[11px]">Course</span>
        <span className="font-mono text-[11px] text-muted tabular">
          {done}/{lessons.length}
        </span>
      </div>

      <div ref={scroller} className="thin-scroll relative flex-1 overflow-y-auto overscroll-contain px-3 pb-8">
        {chapters.map((c) => (
          <section key={c.id} className="mt-3">
            <h3 className="sticky top-0 z-10 flex items-center gap-2 bg-card/95 px-3 py-2 backdrop-blur">
              <span className={`${tints[c.tint].text} font-mono text-[12px] font-semibold`}>0{c.id}</span>
              <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{c.title}</span>
            </h3>
            <ul className="flex flex-col gap-1">
              {lessons
                .filter((l) => l.chapter === c.id)
                .map((l) => {
                  const active = l.id === activeId
                  const complete = !!p.lessons[l.id]
                  const { got, max } = lessonStars(p, l.id)
                  return (
                    <li key={l.id} data-lesson={l.id}>
                      <Link
                        to="/lesson/$lessonId"
                        params={{ lessonId: l.id }}
                        className={`block rounded-2xl p-3 transition ${
                          active ? `${tints[c.tint].soft}` : 'hover:bg-card-2'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-tight">
                            {l.title}
                          </span>
                          {complete ? (
                            <span className="grid size-5 place-items-center rounded-full bg-green text-white" title={`${got}/${max} stars`}>
                              <Icon name="check" size={12} />
                            </span>
                          ) : l.id === nextId ? (
                            <span className="rounded-full bg-blue px-2 py-0.5 text-[11px] font-semibold text-white">Next</span>
                          ) : null}
                        </div>
                        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                          {l.keys.map((k) => (
                            <div key={k.keys} className="contents">
                              <dt className="flex flex-wrap gap-1 text-[17px]">
                                {k.keys.split(' ').map((part) => (
                                  <Kbd key={part}>{part}</Kbd>
                                ))}
                              </dt>
                              <dd className="truncate text-[14px] text-ink-2">{k.desc}</dd>
                            </div>
                          ))}
                        </dl>
                      </Link>
                    </li>
                  )
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function Header({ title }: { title: string }) {
  const p = useProgress()
  const lvl = levelInfo(p.xp)
  const streak = liveStreak(p)
  return (
    <header className="flex items-center gap-3">
      <MenuButton />
      <h1 className="hidden text-[28px] font-semibold tracking-tight lg:block">{title}</h1>
      <div
        title={`${streak}-day streak`}
        className="flex h-12 items-center gap-1.5 rounded-full border border-line bg-card px-4 shadow-card lg:hidden"
      >
        <Icon name="fire" size={20} className={streak ? 'text-pink' : 'text-muted'} />
        <span className="font-semibold tabular">{streak}</span>
      </div>
      <div className="ml-auto flex h-14 min-w-0 items-center gap-3 rounded-full border border-line bg-card py-1.5 pl-1.5 pr-5 shadow-card lg:hidden">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d4f05a] to-[#8fd13a] text-lg font-bold text-[#24360a]">
          {lvl.level}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[16px] font-semibold">{lvl.title}</span>
          <span className="text-[12px] text-muted tabular">{p.xp.toLocaleString()} XP</span>
        </span>
      </div>
    </header>
  )
}

function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  if (path.startsWith('/lesson')) return null
  return (
    <nav className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 lg:hidden">
      <div className="flex gap-1 rounded-full border border-line bg-[var(--glass)] p-1.5 shadow-float backdrop-blur-xl">
        {nav.map((n) => {
          const active = n.to === '/' ? path === '/' : path.startsWith(n.to)
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex w-24 flex-col items-center gap-1 rounded-full px-4 py-2.5 text-[13px] font-medium transition sm:w-28 ${
                active ? 'bg-card-2 text-blue' : 'text-ink hover:text-ink-2'
              }`}
            >
              <Icon name={n.icon} size={22} />
              {n.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
