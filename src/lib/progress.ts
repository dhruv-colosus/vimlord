import { useSyncExternalStore } from 'react'
import { lessons } from './lessons'

export interface Progress {
  xp: number
  lessons: Record<string, { stars: number; completedAt: number }>
  challenges: Record<string, number>
  days: Record<string, number>
  streak: { count: number; last: string | null }
  arcadeBest: number
  keystrokes: number
}

const KEY = 'modal:progress:v1'

const EMPTY: Progress = {
  xp: 0,
  lessons: {},
  challenges: {},
  days: {},
  streak: { count: 0, last: null },
  arcadeBest: 0,
  keystrokes: 0,
}

let state: Progress = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    // Storage can be unavailable (private mode); progress just won't persist.
  }
}

function save(next: Progress) {
  state = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function withXp(p: Progress, amount: number): Progress {
  if (amount <= 0) return p
  const today = dayKey()
  const yesterday = dayKey(new Date(Date.now() - 864e5))
  const streak =
    p.streak.last === today
      ? p.streak
      : { count: p.streak.last === yesterday ? p.streak.count + 1 : 1, last: today }
  return { ...p, xp: p.xp + amount, days: { ...p.days, [today]: (p.days[today] ?? 0) + amount }, streak }
}

export const progress = {
  get() {
    load()
    return state
  },
  /** Records a challenge result and returns the XP it earned. */
  completeChallenge(lessonId: string, index: number, stars: number, keystrokes: number) {
    load()
    const id = `${lessonId}:${index}`
    const prev = state.challenges[id] ?? 0
    const gained = prev === 0 ? 20 + stars * 5 : Math.max(0, stars - prev) * 5
    const next = withXp(state, gained)
    save({
      ...next,
      challenges: { ...next.challenges, [id]: Math.max(prev, stars) },
      keystrokes: next.keystrokes + keystrokes,
    })
    return gained
  },
  completeLesson(lessonId: string) {
    load()
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) return 0
    const stars = lesson.challenges.reduce((sum, _, i) => sum + (state.challenges[`${lessonId}:${i}`] ?? 0), 0)
    const first = !state.lessons[lessonId]
    const bonus = first ? 50 : 0
    const next = withXp(state, bonus)
    save({ ...next, lessons: { ...next.lessons, [lessonId]: { stars, completedAt: Date.now() } } })
    return bonus
  },
  arcadeScore(score: number, keystrokes: number) {
    load()
    const gained = Math.round(score / 20)
    const next = withXp(state, gained)
    save({ ...next, arcadeBest: Math.max(next.arcadeBest, score), keystrokes: next.keystrokes + keystrokes })
    return gained
  },
  reset() {
    save(EMPTY)
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useProgress() {
  return useSyncExternalStore(subscribe, progress.get, () => EMPTY)
}

// ---------------------------------------------------------------------------
// Derived values

const LEVELS = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600]
const TITLES = ['Novice', 'Apprentice', 'Navigator', 'Editor', 'Operator', 'Adept', 'Expert', 'Wizard', 'Sage', 'Grandmaster']

export function levelInfo(xp: number) {
  let level = 0
  while (level + 1 < LEVELS.length && xp >= LEVELS[level + 1]) level++
  const floor = LEVELS[level]
  const ceil = LEVELS[level + 1] ?? floor
  return {
    level: level + 1,
    title: TITLES[level],
    floor,
    ceil,
    pct: ceil === floor ? 1 : (xp - floor) / (ceil - floor),
  }
}

export function totalStars(p: Progress) {
  return Object.values(p.challenges).reduce((a, b) => a + b, 0)
}

export const maxStars = lessons.reduce((sum, l) => sum + l.challenges.length * 3, 0)

export function lessonStars(p: Progress, lessonId: string) {
  const l = lessons.find((x) => x.id === lessonId)
  if (!l) return { got: 0, max: 0 }
  return {
    got: l.challenges.reduce((sum, _, i) => sum + (p.challenges[`${lessonId}:${i}`] ?? 0), 0),
    max: l.challenges.length * 3,
  }
}

/** XP per day for the last `n` days, oldest first. */
export function xpSeries(p: Progress, n = 14) {
  const out: number[] = []
  for (let i = n - 1; i >= 0; i--) out.push(p.days[dayKey(new Date(Date.now() - i * 864e5))] ?? 0)
  return out
}

export function liveStreak(p: Progress) {
  const today = dayKey()
  const yesterday = dayKey(new Date(Date.now() - 864e5))
  return p.streak.last === today || p.streak.last === yesterday ? p.streak.count : 0
}
