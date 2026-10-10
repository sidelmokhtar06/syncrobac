import { useEffect, useRef } from 'react'
import { AnimatePresence, animate, m, type Variants } from 'motion/react'

export const EASE = [0.16, 1, 0.3, 1] as const
export const spring = { type: 'spring', stiffness: 520, damping: 32 } as const

// Staggered reveal for screen sections: wrap a page in <Stagger>, each block in <Item>.
const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div variants={list} initial="hidden" animate="show" className={className}>
      {children}
    </m.div>
  )
}

export function Item({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div variants={item} className={className}>
      {children}
    </m.div>
  )
}

// Odometer-style digits: each character rolls when it changes.
export function Rolling({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`tnum inline-flex ${className}`} dir="ltr">
      {text.split('').map((ch, i) => (
        <span key={i} className="relative inline-block overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={ch}
              className="inline-block"
              initial={{ y: '-90%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '90%', opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {ch}
            </m.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

// Particle burst; re-fires whenever `fire` changes to a new truthy value.
const COLORS = ['#22C1D6', '#3CCB8C', '#F0A645']
export function Burst({ fire, count = 10, radius = 34 }: { fire: number; count?: number; radius?: number }) {
  if (!fire) return null
  return (
    <span key={fire} className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        return (
          <m.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: COLORS[i % 3] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * radius, y: Math.sin(a) * radius, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )
      })}
    </span>
  )
}

// Counts up from 0 to `to` on mount / change.
export function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const c = animate(0, to, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => ref.current && (ref.current.textContent = v.toFixed(decimals)),
    })
    return () => c.stop()
  }, [to, decimals])
  return <span ref={ref} className="tnum">{(0).toFixed(decimals)}</span>
}
