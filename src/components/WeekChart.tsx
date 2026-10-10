import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { today, useSettings, type Session } from '../lib/db'
import { useT } from '../lib/i18n'
import { EASE } from './motion'

const H = 120 // plot height in px

// Focus minutes for the last 7 days. Single series → no legend; teal bars grow from the baseline,
// dashed line marks the daily goal, values on today + the best day, tap/hover for any bar.
export default function WeekChart({ sessions }: { sessions: Session[] }) {
  const s = useSettings()
  const { t, lang } = useT()
  const [active, setActive] = useState<number | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    const key = today(d)
    return {
      key,
      label: d.toLocaleDateString(lang === 'ar' ? 'ar' : 'fr', { weekday: 'short' }).replace('.', ''),
      minutes: sessions.filter((x) => x.date === key).reduce((a, x) => a + x.minutes, 0),
    }
  })
  const goal = s.dailyGoal * 25
  const max = Math.max(goal, ...days.map((d) => d.minutes), 1) * 1.15
  const best = days.reduce((b, d, i) => (d.minutes > days[b].minutes ? i : b), 0)

  return (
    <div>
      <div className="relative" style={{ height: H }} onPointerLeave={() => setActive(null)}>
        <div className="absolute inset-x-0 border-t border-dashed border-ink-3/50" style={{ bottom: (goal / max) * H }}>
          <span className="absolute -top-5 text-xs text-ink-3 ltr:right-0 rtl:left-0">{goal} {t('minutes')}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-line" />
        <div className="absolute inset-0 flex items-end justify-around">
          {days.map((d, i) => {
            const h = (d.minutes / max) * H
            const showLabel = active === i || (active === null && d.minutes > 0 && (i === 6 || i === best))
            return (
              <button
                key={d.key}
                className="relative flex h-full w-full items-end justify-center"
                onPointerEnter={() => setActive(i)}
                onClick={() => setActive(active === i ? null : i)}
                aria-label={`${d.label}: ${d.minutes} ${t('minutes')}`}
              >
                <m.span
                  className={`block w-6 rounded-t-[4px] ${i === 6 ? 'bg-accent' : 'bg-accent/45'} ${active === i ? 'bg-accent' : ''}`}
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(h, d.minutes ? 3 : 0) }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.06 }}
                />
                <AnimatePresence>
                  {showLabel && (
                    <m.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="tnum absolute text-xs font-medium text-ink"
                      style={{ bottom: h + 4 }}
                    >
                      {d.minutes}
                    </m.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-around text-xs text-ink-3">
        {days.map((d, i) => (
          <span key={d.key} className={`w-full text-center ${i === 6 ? 'font-medium text-ink-2' : ''}`}>{d.label}</span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>
          {days.map((d) => (
            <tr key={d.key}><td>{d.key}</td><td>{d.minutes}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
