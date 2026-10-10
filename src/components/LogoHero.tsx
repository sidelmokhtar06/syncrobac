import { m } from 'motion/react'
import { BookOpen, Flame, Timer } from 'lucide-react'
import { LogoMark, Wordmark } from './Logo'
import { EASE } from './motion'

// Welcome hero: the logo draws itself while the app's three pillars (coefficients,
// focus time, streak) drift in around it on a faint dotted grid.
const CHIPS = [
  { Icon: BookOpen, label: 'Maths · 9', pos: '-top-12 -left-14', delay: 1.5, tone: 'text-accent' },
  { Icon: Timer, label: '25:00', pos: '-top-6 -right-16', delay: 1.7, tone: 'text-ink' },
  { Icon: Flame, label: '7', pos: '-bottom-4 -left-16', delay: 1.9, tone: 'text-warning' },
]

export function LogoHero() {
  return (
    <div className="relative flex flex-col items-center">
      {/* dotted grid, radially masked */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -inset-y-24 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(#2f3745 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 65%)',
        }}
      />
      <m.div
        aria-hidden
        className="absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 1.2, ease: EASE }}
      />

      <div className="relative">
        <LogoMark animated className="h-24 w-auto" />
        {CHIPS.map(({ Icon, label, pos, delay, tone }) => (
          <m.span
            key={label}
            className={`absolute ${pos} flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface/90 px-3 text-xs font-medium whitespace-nowrap shadow-lg backdrop-blur`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            transition={{ opacity: { delay, duration: 0.4 }, scale: { delay, type: 'spring', stiffness: 400, damping: 18 }, y: { delay: delay + 0.4, duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
            dir="ltr"
          >
            <Icon size={14} className={tone} />
            <span className="tnum">{label}</span>
          </m.span>
        ))}
      </div>

      <div className="relative mt-6">
        <Wordmark animated delay={1.1} className="text-3xl" />
      </div>
    </div>
  )
}
