import { useEffect, useRef, type ComponentType, type ReactNode, type Ref } from 'react'
import { m, type HTMLMotionProps } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { EASE, spring } from './motion'

// ── Buttons ─────────────────────────────────────────────────────────────
// Heights: md 44px (minimum touch target), lg 52px (one primary action per screen).

type ButtonProps = HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  block?: boolean
}

export function Button({ variant = 'primary', size = 'md', block, className, children, type = 'button', ...p }: ButtonProps) {
  return (
    <m.button
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40',
        size === 'lg' ? 'h-13 px-6 text-base' : 'h-11 px-4 text-sm',
        variant === 'primary' && 'bg-accent text-accent-ink hover:brightness-110',
        variant === 'secondary' && 'border border-line-strong bg-raised text-ink hover:bg-line',
        variant === 'ghost' && 'text-ink-2 hover:bg-raised hover:text-ink',
        block && 'w-full',
        className,
      )}
      {...p}
    >
      {children}
    </m.button>
  )
}

export function IconButton({ label, className, children, ...p }: HTMLMotionProps<'button'> & { label: string }) {
  return (
    <m.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={spring}
      className={cn('grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong bg-raised text-ink-2 transition-colors hover:text-ink', className)}
      {...p}
    >
      {children}
    </m.button>
  )
}

// ── Segmented control ───────────────────────────────────────────────────

export function Segmented<T extends string>({
  value, options, onChange, id, disabled, iconOnly,
}: {
  value: T
  options: { value: T; label: string; icon?: ReactNode; dot?: string }[]
  onChange: (v: T) => void
  id: string // unique layoutId for the sliding thumb
  disabled?: boolean
  iconOnly?: boolean // compact: icons only, the label stays as the accessible name + tooltip
}) {
  return (
    <div role="radiogroup" className={cn('flex rounded-xl bg-raised p-1', disabled && 'opacity-50')}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            aria-label={iconOnly ? o.label : undefined}
            title={iconOnly ? o.label : undefined}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn('relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm transition-colors', on ? 'text-ink' : 'text-ink-2')}
          >
            {on && <m.span layoutId={id} transition={spring} className="absolute inset-0 rounded-lg border border-line-strong bg-surface" />}
            <span className="relative flex items-center gap-1.5 whitespace-nowrap">
              {o.dot && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: o.dot }} />}
              {o.icon}
              {!iconOnly && o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Form controls ───────────────────────────────────────────────────────

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <select
        className="h-11 w-full appearance-none rounded-xl border border-line-strong bg-raised ps-3 pe-9 text-sm text-ink outline-none focus:border-accent"
        {...p}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-3" />
    </span>
  )
}

export const inputClass =
  'h-11 rounded-xl border border-line-strong bg-raised px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent'

// ── Layout ──────────────────────────────────────────────────────────────

// `back` = parent route: detail pages get a back button (history back if we came from inside the app).
export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: string }) {
  const nav = useNavigate()
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const Back = rtl ? ArrowRight : ArrowLeft
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 pb-2">
      {back && (
        <IconButton label="back" onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav(back))} className="-ms-1 border-transparent bg-transparent">
          <Back size={22} />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        {/* Taller line box: `truncate` clips overflow, which would cut Arabic dots below the baseline. */}
        <h1 className="truncate pb-0.5 text-2xl leading-[1.45]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-medium text-ink-2">{children}</h2>
      {action}
    </div>
  )
}

export function Chip({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warning' | 'success'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-raised text-ink-2',
        tone === 'accent' && 'bg-accent/12 text-accent',
        tone === 'warning' && 'bg-warning/12 text-warning',
        tone === 'success' && 'bg-success/12 text-success',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ProgressBar({ value, className, tone = 'accent', color }: { value: number; className?: string; tone?: 'accent' | 'success'; color?: string }) {
  return (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-raised', className)}>
      <m.span
        className={cn('block h-full rounded-full', color ? '' : tone === 'accent' ? 'bg-accent' : 'bg-success')}
        style={color ? { backgroundColor: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.8, ease: EASE }}
      />
    </span>
  )
}

// ── Animated icons (lucide-animated) ────────────────────────────────────
// They animate on hover by default; phones have no hover, so we trigger them on
// meaningful events instead: mount (`autoplay`) and whenever `play` changes.

type AnimHandle = { startAnimation: () => void; stopAnimation: () => void }
type AnimIconComponent = ComponentType<{ ref?: Ref<AnimHandle>; size?: number; className?: string; 'aria-hidden'?: boolean }>

export function Anim({ icon: Icon, size = 20, play, autoplay, className }: { icon: AnimIconComponent; size?: number; play?: unknown; autoplay?: boolean; className?: string }) {
  const ref = useRef<AnimHandle>(null)
  const first = useRef(true)
  useEffect(() => {
    const skip = first.current && !autoplay
    first.current = false
    if (skip || play === false) return
    const id = setTimeout(() => ref.current?.startAnimation(), 150)
    return () => clearTimeout(id)
  }, [play, autoplay])
  return <Icon ref={ref} size={size} className={cn('inline-flex shrink-0', className)} aria-hidden />
}

// Row that navigates somewhere (hub pages, settings lists). Min 56px.
export function ListLink({ to, icon, label, hint, trailing }: { to: string; icon: ReactNode; label: string; hint?: ReactNode; trailing?: ReactNode }) {
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const Chevron = rtl ? ChevronLeft : ChevronRight
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors active:bg-raised">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-raised text-ink-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block truncate text-xs text-ink-3">{hint}</span>}
      </span>
      {trailing}
      <Chevron size={18} className="shrink-0 text-ink-3" />
    </Link>
  )
}

// On/off switch with a 44px hit area.
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="grid h-11 w-14 shrink-0 place-items-center"
    >
      <span className={cn('relative block h-7 w-12 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line-strong')}>
        <m.span
          className="absolute start-1 top-1 block size-5 rounded-full bg-white shadow"
          initial={false}
          animate={{ x: checked ? (document.documentElement.dir === 'rtl' ? -20 : 20) : 0 }}
          transition={spring}
        />
      </span>
    </button>
  )
}
