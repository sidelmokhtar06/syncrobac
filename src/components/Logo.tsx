import { m } from 'motion/react'
import { EASE } from './motion'

const LOOP = 'M60 30 C45 8 15 8 15 30 C15 52 45 52 60 30 C75 8 105 8 105 30 C105 52 75 52 60 30 Z'
const PULSE = 'M82 30 h6 l3 -8 l4 16 l3 -8 h6'

/**
 * Brand mark. `animated` draws the loop, then the pulse, then lights the core —
 * the "synchronisation" moment. Static by default for small, repeated uses.
 */
export function LogoMark({ className = 'h-8 w-auto', animated = false, delay = 0 }: { className?: string; animated?: boolean; delay?: number }) {
  const draw = (d: number, dur: number) =>
    animated ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { delay: delay + d, duration: dur, ease: EASE } } : {}
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden>
      <defs>
        <linearGradient id="sb-g" x1="0" x2="1">
          <stop offset="0" stopColor="#22C1D6" />
          <stop offset="1" stopColor="#3CCB8C" />
        </linearGradient>
      </defs>
      {animated && <path d={LOOP} fill="none" stroke="#1a1f28" strokeWidth="7" />}
      <m.path d={LOOP} fill="none" stroke="url(#sb-g)" strokeWidth="7" strokeLinecap="round" {...draw(0, 1.1)} />
      <m.path d={PULSE} fill="none" stroke="#22C1D6" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" {...draw(0.9, 0.5)} />
      <m.circle
        cx="60" cy="30" r="5" fill="#F0A645"
        style={{ originX: '60px', originY: '30px' }}
        initial={animated ? { scale: 0 } : false}
        animate={animated ? { scale: [0, 1.6, 1] } : undefined}
        transition={{ delay: delay + 1.2, duration: 0.5, ease: EASE }}
      />
    </svg>
  )
}

/** Wordmark; `animated` reveals letters one by one. Always LTR Latin. */
export function Wordmark({ animated = false, delay = 0, className = 'text-lg' }: { animated?: boolean; delay?: number; className?: string }) {
  return (
    <span className={`inline-flex overflow-hidden font-bold tracking-[0.08em] ${className}`} dir="ltr" lang="fr" aria-label="SyncroBac">
      {'SYNCROBAC'.split('').map((ch, i) => (
        <m.span
          key={i}
          aria-hidden
          className={i >= 6 ? 'text-accent' : ''}
          initial={animated ? { y: '110%', opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + i * 0.045, duration: 0.5, ease: EASE }}
        >
          {ch}
        </m.span>
      ))}
    </span>
  )
}
