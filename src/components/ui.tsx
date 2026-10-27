import { Fragment, type ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import type { Tint } from '../lib/lessons'

export const tints: Record<Tint, { soft: string; text: string; solid: string }> = {
  blue: { soft: 'bg-blue-soft', text: 'text-blue', solid: 'bg-blue' },
  green: { soft: 'bg-green-soft', text: 'text-green', solid: 'bg-green' },
  purple: { soft: 'bg-purple-soft', text: 'text-purple', solid: 'bg-purple' },
  teal: { soft: 'bg-teal-soft', text: 'text-teal', solid: 'bg-teal' },
  pink: { soft: 'bg-pink-soft', text: 'text-pink', solid: 'bg-pink' },
  amber: { soft: 'bg-amber-soft', text: 'text-amber', solid: 'bg-amber' },
}

export function LessonIcon({ name, size, className }: { name: IconName; size?: number; className?: string }) {
  return <Icon name={name} size={size} className={className} />
}

export function IconBubble({
  tint,
  size = 'md',
  children,
}: {
  tint: Tint
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}) {
  const dims = { sm: 'size-7', md: 'size-10', lg: 'size-12' }[size]
  return (
    <span className={`${dims} ${tints[tint].soft} ${tints[tint].text} grid shrink-0 place-items-center rounded-full`}>
      {children}
    </span>
  )
}

/** A tinted pill like the inline stats in the summary card. */
export function Chip({
  tint,
  icon,
  children,
  className = '',
}: {
  tint: Tint
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`${tints[tint].soft} ${tints[tint].text} inline-flex items-center gap-1.5 rounded-full py-[3px] pr-3 align-middle font-medium leading-tight ${
        icon ? 'pl-[5px]' : 'pl-3'
      } ${className}`}
    >
      {icon && (
        <span className={`${tints[tint].solid} grid size-[1.35em] place-items-center rounded-full text-white`}>
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

export function Kbd({ children, size = 'md' }: { children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const s = {
    sm: 'min-w-[1.6em] px-1.5 text-[11px] h-[1.9em]',
    md: 'min-w-[1.75em] px-1.5 text-[0.82em] h-[1.75em]',
    lg: 'min-w-10 px-2.5 text-base h-10 rounded-xl',
  }[size]
  return (
    <kbd
      className={`${s} inline-flex items-center justify-center rounded-lg border border-line bg-card font-mono font-semibold text-ink shadow-[0_1.5px_0_var(--line)] align-[0.08em]`}
    >
      {children}
    </kbd>
  )
}

/** Renders lesson copy: `{key}` → key chip, `**bold**`, and `code`. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\}|\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('{') && p.endsWith('}') && p.length > 2)
          return (
            <Fragment key={i}>
              <Kbd>{p.slice(1, -1)}</Kbd>
              {parts[i + 1]?.startsWith('{') ? <span className="inline-block w-[3px]" /> : null}
            </Fragment>
          )
        if (p.startsWith('**')) return <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
        if (p.startsWith('`'))
          return (
            <code key={i} className="rounded-md bg-card-2 px-1.5 py-0.5 font-mono text-[0.86em] text-ink">
              {p.slice(1, -1)}
            </code>
          )
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

export function SectionHeading({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 mt-12 flex items-baseline justify-between gap-4 px-1">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[24px]">{left}</h2>
      {right && <span className="shrink-0 text-[14px] font-medium text-muted tabular">{right}</span>}
    </div>
  )
}

export function Stars({ value, max = 3, size = 16 }: { value: number; max?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="star" size={size} className={i < value ? 'text-amber' : 'text-ink/10'} />
      ))}
    </span>
  )
}

export function Sparkline({ data, color = 'var(--blue)', height = 64 }: { data: number[]; color?: string; height?: number }) {
  const w = 200
  const max = Math.max(1, ...data)
  const step = w / Math.max(1, data.length - 1)
  const pts = data.map((v, i) => [i * step, height - 4 - (v / max) * (height - 12)] as const)
  // Smooth the line with simple cubic segments between points.
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
  }
  const id = `sg-${color.replace(/[^a-z]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-16 w-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function RoundButton({
  children,
  label,
  onClick,
  className = '',
}: {
  children: ReactNode
  label: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.currentTarget.blur()
        onClick?.()
      }}
      className={`grid size-12 place-items-center rounded-full border border-line bg-card text-ink shadow-card transition hover:scale-[1.04] active:scale-95 ${className}`}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-card p-1.5 shadow-card">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={(e) => {
            e.currentTarget.blur()
            onChange(o.value)
          }}
          className={`flex-1 whitespace-nowrap rounded-full px-4 py-2.5 text-[15px] font-medium transition ${
            o.value === value ? 'bg-blue-soft text-blue' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, tint = 'blue' }: { value: number; tint?: Tint }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-card-2">
      <div
        className={`${tints[tint].solid} h-full rounded-full transition-[width] duration-500`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}
