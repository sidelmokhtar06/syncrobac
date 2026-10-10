import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ListTodo, Play, RotateCcw, Snowflake, Sparkles } from 'lucide-react'
import { FlameIcon } from '../components/icons/flame'
import { GraduationCapIcon } from '../components/icons/graduation-cap'
import { Burst, EASE, Item, Rolling, Stagger, spring } from '../components/motion'
import { Anim, Chip, PageHeader, ProgressBar, SectionTitle } from '../components/ui'
import { cn } from '../lib/cn'
import { ensureMissions, toggleMission, useAllChapters, useMissions } from '../lib/curriculum'
import { subjectsFor, useSettings, type Mission } from '../lib/db'
import { dateLocale, useStreakInfo, useToday } from '../lib/hooks'
import { useT, type TKey } from '../lib/i18n'
import { fmt, remaining, start, useNow } from '../lib/timer'

const KIND: Record<Mission['kind'], { key: TKey; Icon: typeof Play }> = {
  start: { key: 'kindStart', Icon: BookOpen },
  review: { key: 'kindReview', Icon: RotateCcw },
  task: { key: 'kindTask', Icon: ListTodo },
  recall: { key: 'kindRecall', Icon: Sparkles },
}

export default function Dashboard() {
  const s = useSettings()
  const { t, lang } = useT()
  const nav = useNavigate()
  const now = useNow()
  const streak = useStreakInfo()
  const today = useToday()
  const all = useAllChapters(s)
  const missions = useMissions()

  useEffect(() => {
    if (all.size) ensureMissions(s, all)
  }, [all, s])

  const bac = new Date(s.bacDate).getTime()
  const left = Math.max(0, bac - now)
  const days = Math.floor(left / 86_400_000)
  const hms = new Date(left).toISOString().slice(11, 19)
  const yearStart = new Date(new Date(s.bacDate).getFullYear() - 1, 9, 1).getTime()
  const elapsed = Math.min(1, Math.max(0, (now - yearStart) / (bac - yearStart)))

  const subjects = new Map(subjectsFor(s).map((x) => [x.id, x]))
  const running = s.timer.endsAt !== null
  const hour = new Date(now).getHours()
  const greet = hour < 17 ? t('greetMorning') : t('greetEvening')
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight
  const items = missions?.items ?? []
  const doneCount = items.filter((x) => x.done).length

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader
          title={s.name ? `${greet}${lang === 'ar' ? '،' : ','} ${s.name}` : greet}
          subtitle={new Date(now).toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
          action={
            <Link to="/progress" aria-label={t('progress')}>
              <Chip tone={streak.current ? 'warning' : 'neutral'} className="h-9 px-3 text-sm">
                <Anim icon={FlameIcon} size={18} autoplay play={streak.current} />
                <span className="tnum">{streak.current}</span>
              </Chip>
            </Link>
          }
        />
      </Item>

      <Item className="card p-5">
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent/12 text-accent">
            <Anim icon={GraduationCapIcon} size={18} autoplay />
          </span>
          {t('bacIn')}
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="flex items-baseline gap-2">
            <span className="tnum text-5xl font-semibold tracking-tight">{days}</span>
            <span className="text-lg text-ink-2">{t('days')}</span>
          </p>
          <Rolling text={hms} className="pb-1.5 text-base text-ink-2" />
        </div>
        <ProgressBar value={elapsed} className="mt-5" />
        <p className="mt-2 text-xs text-ink-3">
          <span className="tnum">{Math.round(elapsed * 100)}%</span> {t('yearElapsed')}
        </p>
      </Item>

      {running && (
        <Item>
          <Link to="/focus" className="card flex items-center gap-3 border-accent/50 p-4">
            <span className="relative grid size-10 place-items-center rounded-xl bg-accent/12 text-accent">
              <m.span className="absolute inset-0 rounded-xl border border-accent" animate={{ scale: [1, 1.2], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
              <Play size={16} fill="currentColor" />
            </span>
            <span className="flex-1 text-sm text-ink-2">{t('sessionRunning')}</span>
            <span className="tnum text-xl font-semibold" dir="ltr">{fmt(remaining(s.timer, now))}</span>
            <Arrow size={18} className="text-ink-3" />
          </Link>
        </Item>
      )}

      <Item>
        <SectionTitle
          action={
            <Link to="/plan" className="flex min-h-11 items-center text-sm font-medium text-accent">
              {t('seePlan')}
            </Link>
          }
        >
          {t('missions')} <span className="tnum text-ink-3">· {doneCount}/{items.length}</span>
        </SectionTitle>
        <div className="card divide-y divide-line">
          {items.map((mi, i) => (
            <MissionRow
              key={mi.subjectId + mi.chapterId}
              mission={mi}
              subjectName={subjects.get(mi.subjectId)?.[lang] ?? ''}
              chapterName={all.get(mi.subjectId)?.find((c) => c.id === mi.chapterId)?.title[lang] ?? ''}
              onToggle={() => toggleMission(i)}
              onStart={() => start(s, mi.subjectId, mi.chapterId).then(() => nav('/focus'))}
              to={`/subjects/${mi.subjectId}/${mi.chapterId}`}
            />
          ))}
          <AnimatePresence>
            {items.length > 0 && doneCount === items.length && (
              <m.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 py-3 text-sm text-success">
                {t('allDone')}
              </m.p>
            )}
          </AnimatePresence>
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('today')}</SectionTitle>
        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <p>
              <span className="tnum text-2xl font-semibold">{today.sessions}</span>
              <span className="text-ink-2"> / {s.dailyGoal} {t('pomodoros')}</span>
            </p>
            <p className="text-sm text-ink-2">
              <span className="tnum">{today.minutes}</span> {t('focusMinutes')}
            </p>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {Array.from({ length: s.dailyGoal }, (_, i) => (
              <span key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                <m.span className="block h-full bg-accent" initial={{ width: 0 }} animate={{ width: i < today.sessions ? '100%' : '0%' }} transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: EASE }} />
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-2">
              <span className="tnum font-medium text-ink">{streak.weekActive}</span> / {s.weeklyGoal} {t('weekGoal')}
            </span>
            <span className={cn('flex items-center gap-1.5 text-xs', streak.freezeAvailable ? 'text-accent' : 'text-ink-3')}>
              <Snowflake size={14} />
              {streak.freezeAvailable ? t('freezeReady') : t('freezeUsed')}
            </span>
          </div>
        </div>
      </Item>
    </Stagger>
  )
}

function MissionRow({ mission, subjectName, chapterName, onToggle, onStart, to }: { mission: Mission; subjectName: string; chapterName: string; onToggle: () => void; onStart: () => void; to: string }) {
  const { t } = useT()
  const { key, Icon } = KIND[mission.kind]
  const [fire, setFire] = useState(0)
  return (
    <div className="flex min-h-16 items-center gap-1 pe-2">
      <button onClick={() => {
          if (!mission.done) setFire(Date.now())
          onToggle()
        }} aria-pressed={mission.done} aria-label={chapterName} className="relative grid size-12 shrink-0 place-items-center">
        <m.span
          animate={{ backgroundColor: mission.done ? '#3CCB8C' : 'rgba(0,0,0,0)', borderColor: mission.done ? '#3CCB8C' : '#4A5363' }}
          className="grid size-6 place-items-center rounded-full border-2 text-bg"
        >
          {mission.done && (
            <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
              <Check size={14} strokeWidth={3} />
            </m.span>
          )}
        </m.span>
        <Burst fire={fire} count={8} radius={22} />
      </button>
      <Link to={to} className="min-w-0 flex-1 py-2">
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          <Icon size={13} />
          {t(key)} · {subjectName}
        </span>
        <span className={cn('block truncate text-[15px]', mission.done ? 'text-ink-3 line-through' : 'text-ink')}>{chapterName}</span>
      </Link>
      {!mission.done && (
        <m.button whileTap={{ scale: 0.9 }} transition={spring} onClick={onStart} aria-label={t('startFocus')} className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
          <Play size={16} fill="currentColor" />
        </m.button>
      )}
    </div>
  )
}
