import { m } from 'motion/react'
import { Share2, X } from 'lucide-react'
import { shareWeeklyCard } from '../lib/statusCard'
import { subjectsFor, updateSettings, useSettings } from '../lib/db'
import { useT } from '../lib/i18n'
import { useWeekStats } from '../lib/weekly'
import { CountUp, EASE } from './motion'
import { Button } from './ui'

/**
 * Last-7-days summary with a WhatsApp-status share. On the home page it appears on Sunday
 * and Monday (when there was activity) and can be dismissed for the week; on Progress it is
 * always shown.
 */
export function WeeklyRecap({ dismissible = false }: { dismissible?: boolean }) {
  const s = useSettings()
  const { t, lang } = useT()
  const w = useWeekStats()
  if (!w) return null

  const dismissKey = `recap-${w.weekKey}`
  if (dismissible) {
    const day = new Date().getDay()
    if ((day !== 0 && day !== 1) || w.sessions === 0 || s.dismissed.includes(dismissKey)) return null
  }

  const hours = (w.minutes / 60).toFixed(1)
  const top = w.topSubjectId ? subjectsFor(s).find((x) => x.id === w.topSubjectId)?.[lang] : undefined
  const stats = [
    { value: w.activeDays, label: t('activeDays') },
    { value: w.mastered, label: t('chaptersMastered') },
    { value: w.streak, label: t('daysSynced') },
  ]

  const share = () =>
    shareWeeklyCard({
      title: t('weekRecap'),
      hours,
      hoursLabel: t('focusHoursLabel'),
      stats: stats.map((x) => ({ value: String(x.value), label: x.label })),
      footnote: top,
      tagline: t('tagline'),
    })

  return (
    <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="card relative overflow-hidden p-5">
      <span aria-hidden className="absolute -top-16 -end-10 size-40 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{t('weekRecap')}</p>
          <p className="text-xs text-ink-3">{t('weekRecapSub')}</p>
        </div>
        {dismissible && (
          <button onClick={() => updateSettings({ dismissed: [...s.dismissed, dismissKey] })} aria-label={t('dismiss')} className="-me-2 -mt-2 grid size-11 place-items-center text-ink-3">
            <X size={18} />
          </button>
        )}
      </div>
      <p className="relative mt-3">
        <span className="text-4xl font-semibold">
          <CountUp to={w.minutes / 60} decimals={1} />
        </span>{' '}
        <span className="text-ink-2">{t('focusHoursLabel')}</span>
      </p>
      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        {stats.map((x) => (
          <div key={x.label} className="rounded-xl bg-raised px-2 py-3">
            <p className="tnum text-xl font-semibold">{x.value}</p>
            <p className="text-xs leading-tight text-ink-2">{x.label}</p>
          </div>
        ))}
      </div>
      {top && <p className="relative mt-3 text-sm text-ink-2">{top}</p>}
      <Button variant="secondary" block className="relative mt-4" onClick={share}>
        <Share2 size={18} />
        {t('shareWeek')}
      </Button>
    </m.div>
  )
}
