import { useLiveQuery } from 'dexie-react-hooks'
import { m } from 'motion/react'
import { CalendarDays, CalendarRange, Flame, Snowflake, Trophy } from 'lucide-react'
import WeekChart from '../components/WeekChart'
import { FlameIcon } from '../components/icons/flame'
import { CountUp, EASE, Item, Stagger, spring } from '../components/motion'
import { Anim, Chip, PageHeader, SectionTitle } from '../components/ui'
import { cn } from '../lib/cn'
import { db, subjectsFor, today, useSettings, type Lang } from '../lib/db'
import { subjectColor } from '../lib/colors'
import { dateLocale } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { bestStreak, streakInfo } from '../lib/streak'

export default function Progress() {
  const s = useSettings()
  const { t, lang } = useT()
  const data = useLiveQuery(async () => {
    const [sessions, days, chapters] = await Promise.all([db.sessions.toArray(), db.days.toArray(), db.chapters.toArray()])
    return { sessions, days: days.map((d) => d.date), chapters }
  })
  if (!data) return null

  const streak = streakInfo(data.days)
  const minutes = data.sessions.reduce((a, x) => a + x.minutes, 0)
  const best = Math.max(bestStreak(data.days), streak.current)
  // Records: minutes per day and per Monday-starting week.
  const minutesPerDay = data.sessions.reduce<Record<string, number>>((a, x) => ({ ...a, [x.date]: (a[x.date] ?? 0) + x.minutes }), {})
  const minutesPerWeek = Object.entries(minutesPerDay).reduce<Record<string, number>>((a, [date, min]) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const k = today(d)
    return { ...a, [k]: (a[k] ?? 0) + min }
  }, {})
  const subjects = subjectsFor(s)
  const bySubject = subjects
    .map((sub) => ({ sub, min: data.sessions.filter((x) => x.subjectId === sub.id).reduce((a, x) => a + x.minutes, 0) }))
    .filter((x) => x.min > 0)
    .sort((a, b) => b.min - a.min)
  const maxMin = Math.max(1, ...bySubject.map((x) => x.min))
  const records = [
    { key: 'bestDay' as const, Icon: CalendarDays, value: Math.max(0, ...Object.values(minutesPerDay)), unit: t('minutes') },
    { key: 'bestWeek' as const, Icon: CalendarRange, value: Math.max(0, ...Object.values(minutesPerWeek)), unit: t('minutes') },
    { key: 'longestStreak' as const, Icon: Flame, value: best, unit: t('days') },
    { key: 'totalMastered' as const, Icon: Trophy, value: data.chapters.filter((c) => c.status === 'done').length, unit: '' },
  ]

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title={t('progress')} />
      </Item>

      <Item className="card p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-warning/12 text-warning">
            <Anim icon={FlameIcon} size={24} autoplay />
          </span>
          <div className="min-w-0 flex-1">
            <p className="tnum text-2xl font-semibold">{streak.current}</p>
            <p className="text-sm text-ink-2">{t('daysSynced')}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-2">
            <span className="tnum font-medium text-ink">{streak.weekActive}</span> / {s.weeklyGoal} {t('weekGoal')}
          </span>
          <Chip tone={streak.freezeAvailable ? 'accent' : 'neutral'}>
            <Snowflake size={13} />
            {streak.freezeAvailable ? t('freezeReady') : streak.freezeNextMonday ? `${t('freezeNext')} ${new Date(streak.freezeNextMonday + 'T12:00:00').toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })}` : t('freezeUsed')}
          </Chip>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {Array.from({ length: s.weeklyGoal }, (_, i) => (
            <span key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
              <m.span className="block h-full bg-warning" initial={{ width: 0 }} animate={{ width: i < streak.weekActive ? '100%' : '0%' }} transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: EASE }} />
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">{t('freezeExplain')}</p>
      </Item>

      <Item className="card grid grid-cols-3 divide-x divide-line rtl:divide-x-reverse">
        <Stat label={t('totalFocus')} value={<CountUp to={minutes / 60} decimals={1} />} />
        <Stat label={t('sessions')} value={<CountUp to={data.sessions.length} />} />
        <Stat label={t('bestStreak')} value={<CountUp to={best} />} />
      </Item>

      <Item>
        <SectionTitle>{t('weekFocus')}</SectionTitle>
        <div className="card p-4">
          <WeekChart sessions={data.sessions} />
        </div>
      </Item>

      {bySubject.length > 0 && (
        <Item>
          <SectionTitle>{t('timePerSubject')}</SectionTitle>
          <div className="card flex flex-col gap-3 p-4">
            {bySubject.map(({ sub, min }, i) => {
              const subCol = subjectColor(sub)
              return (
                <div key={sub.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{sub[lang]}</span>
                    <span className="tnum text-ink-2">{min} {t('minutes')}</span>
                  </div>
                  <span className="block h-2 overflow-hidden rounded-full bg-raised">
                    <m.span className="block h-full rounded-full" style={{ backgroundColor: subCol }} initial={{ width: 0 }} animate={{ width: `${(min / maxMin) * 100}%` }} transition={{ delay: 0.1 + i * 0.05, duration: 0.7, ease: EASE }} />
                  </span>
                </div>
              )
            })}
          </div>
        </Item>
      )}

      <Item>
        <SectionTitle>{t('streakHistory')}</SectionTitle>
        <div className="card p-4">
          <Calendar active={new Set(data.days)} frozen={streak.frozen} />
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('records')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {records.map(({ key, Icon, value, unit }, i) => (
            <m.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 + i * 0.06 }}
              className="card flex flex-col gap-2 p-4"
            >
              <span className={cn('grid size-9 place-items-center rounded-lg', value ? 'bg-accent/12 text-accent' : 'bg-raised text-ink-3')}>
                <Icon size={18} />
              </span>
              <p className="text-2xl font-semibold">
                <CountUp to={value} /> <span className="text-sm font-normal text-ink-2">{unit}</span>
              </p>
              <p className="text-xs text-ink-2">{t(key)}</p>
            </m.div>
          ))}
        </div>
      </Item>
    </Stagger>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-2 py-4 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-ink-2">{label}</p>
    </div>
  )
}

// Last 5 weeks, Monday-first. Frozen days (saved by the weekly joker) show a snowflake.
function Calendar({ active, frozen }: { active: Set<string>; frozen: Set<string> }) {
  const { lang } = useT()
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 28)
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const heads: Record<Lang, string[]> = { fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], ar: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'] }
  return (
    <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
      {heads[lang].map((h, i) => (
        <span key={i} className="pb-1 text-xs text-ink-3">{h}</span>
      ))}
      {cells.map((d, i) => {
        const key = today(d)
        const on = active.has(key)
        const ice = frozen.has(key)
        return (
          <m.span
            key={key}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 + i * 0.01, duration: 0.25 }}
            className={cn(
              'tnum grid aspect-square place-items-center rounded-lg',
              on ? 'bg-accent font-medium text-accent-ink' : ice ? 'bg-accent/12 text-accent' : d > end ? 'text-ink-3/40' : 'text-ink-2',
              key === today() && !on && 'ring-1 ring-accent ring-inset',
            )}
          >
            {ice ? <Snowflake size={14} aria-label="freeze" /> : d.getDate()}
          </m.span>
        )
      })}
    </div>
  )
}
