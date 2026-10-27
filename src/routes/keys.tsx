import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '../components/icons'
import { Header } from '../components/Chrome'
import { IconBubble, Kbd, LessonIcon, SectionHeading, tints } from '../components/ui'
import { chapters, lessons } from '../lib/lessons'
import { useProgress } from '../lib/progress'

export const Route = createFileRoute('/keys')({
  head: () => ({ meta: [{ title: 'Key reference · Vimlord' }] }),
  component: Keys,
})

function Keys() {
  const p = useProgress()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const learned = lessons.filter((l) => p.lessons[l.id]).reduce((n, l) => n + l.keys.length, 0)
  const total = lessons.reduce((n, l) => n + l.keys.length, 0)

  return (
    <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
      <Header title="Key reference" />

      <div className="mt-8 flex items-center gap-3 rounded-full border border-line bg-card px-5 shadow-card focus-within:ring-2 focus-within:ring-blue/30">
        <Icon name="search" size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search keys or actions, e.g. “delete” or “w”"
          className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
        />
      </div>

      <SectionHeading left="Key reference" right={`${learned} of ${total} learned`} />
      <div className="flex flex-col gap-10">
        {chapters.map((c) => {
          const ls = lessons
            .filter((l) => l.chapter === c.id)
            .map((l) => ({
              lesson: l,
              keys: l.keys.filter(
                (k) => !needle || k.keys.toLowerCase().includes(needle) || k.desc.toLowerCase().includes(needle),
              ),
            }))
            .filter((x) => x.keys.length)
          if (!ls.length) return null
          return (
            <section key={c.id}>
              <h2 className="mb-4 px-1 text-[22px] font-semibold tracking-tight">
                <span className={`${tints[c.tint].text} mr-2 font-mono text-[15px]`}>0{c.id}</span>
                {c.title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ls.map(({ lesson, keys }) => {
                  const done = !!p.lessons[lesson.id]
                  return (
                    <div key={lesson.id} className="card p-6">
                      <Link
                        to="/lesson/$lessonId"
                        params={{ lessonId: lesson.id }}
                        className="group flex items-center gap-3"
                      >
                        <IconBubble tint={c.tint}>
                          <LessonIcon name={lesson.icon} size={18} />
                        </IconBubble>
                        <span className="flex-1 text-[17px] font-semibold tracking-tight group-hover:text-blue">
                          {lesson.title}
                        </span>
                        {done && (
                          <span className="grid size-6 place-items-center rounded-full bg-green-soft text-green" title="Learned">
                            <Icon name="check" size={14} />
                          </span>
                        )}
                      </Link>
                      <ul className="mt-4 flex flex-col divide-y divide-line">
                        {keys.map((k) => (
                          <li key={k.keys} className="flex items-center justify-between gap-4 py-2.5">
                            <span className="flex flex-wrap gap-1">
                              {k.keys.split(' ').map((part) => (
                                <Kbd key={part}>{part}</Kbd>
                              ))}
                            </span>
                            <span className="text-right text-[14px] text-muted">{k.desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
