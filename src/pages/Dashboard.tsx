import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, m, useScroll, useTransform } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, Check, CloudUpload, Download, ListTodo, Play, RotateCcw, Snowflake, Sparkles, X } from 'lucide-react'
import { LogoMark, Wordmark } from '../components/Logo'
import { Mascot } from '../components/Mascot'
import { InstallSheet } from '../components/InstallSheet'
import { WeeklyRecap } from '../components/WeeklyRecap'
import { FlameIcon } from '../components/icons/flame'
import { GraduationCapIcon } from '../components/icons/graduation-cap'
import { Burst, CountUp, EASE, Item, Rolling, Stagger, spring } from '../components/motion'
import { Anim, Button, Chip, SectionTitle } from '../components/ui'
import { cn } from '../lib/cn'
import { ensureMissions, expectedShare, toggleMission, useAllChapters, useChapterStates, useMissions, weightedMastery } from '../lib/curriculum'
import { subjectsFor, updateSettings, useSettings, type Mission } from '../lib/db'
import { dateLocale, useStreakInfo, useToday } from '../lib/hooks'
import { useT, type TKey } from '../lib/i18n'
import { fmt, remaining, start, useNow } from '../lib/timer'
import { useInstall } from '../lib/pwa'
import { accountsAvailable, useUser } from '../lib/auth'
import { useScrollContainer } from '../lib/scroll'

// Must match <main>'s padding-top in App.tsx.
const TOP_PAD = 'max(0.75rem, env(safe-area-inset-top))'

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
  const streak = useStreakInfo()
  const today = useToday()
  const all = useAllChapters(s)
  const missions = useMissions()
  const states = useChapterStates()
  const install = useInstall()

  // Header turns into a frosted bar once the page scrolls.
  const { scrollY } = useScroll({ container: useScrollContainer() })
  const barOpacity = useTransform(scrollY, [0, 48], [0, 1])

  useEffect(() => {
    if (all.size) ensureMissions(s, all)
  }, [all, s])

  // The SyncroBac idea in one card: where the official pacing says you should be vs where you are.
  const expected = expectedShare(s)
  const mastery = weightedMastery(s, all, states)
  const gap = mastery - expected
  const syncState = gap >= 0.05 ? 'ahead' : gap <= -0.05 ? 'behind' : 'inSync'
  const showInstall = !install.installed && !s.dismissed.includes('install')
  const user = useUser()
  // Suggest an account once the student has something worth saving.
  const showAccountNudge = accountsAvailable && !user && streak.weekActive >= 2 && !s.dismissed.includes('account-nudge')
  const [howTo, setHowTo] = useState(false)

  const subjects = new Map(subjectsFor(s).map((x) => [x.id, x]))
  const running = s.timer.endsAt !== null
  const now = Date.now()
  const hour = new Date(now).getHours()
  const greet = hour < 17 ? t('greetMorning') : t('greetEvening')
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight
  const items = missions?.items ?? []
  const doneCount = items.filter((x) => x.done).length

  return (
    <Stagger className="flex flex-col gap-6">
      {/* Sticky bar spans <main>'s top padding (safe area included) so nothing peeks above it. */}
      <m.div
        style={{ top: `calc(-1 * ${TOP_PAD})`, marginTop: `calc(-1 * ${TOP_PAD})`, paddingTop: TOP_PAD }}
        className="sticky z-30 -mx-5 flex items-center justify-between px-5 pb-2 md:static md:mx-0 md:mt-0! md:px-0 md:pt-0!"
      >
        {/* Theme-aware background that fades in with scroll */}
        <m.span aria-hidden style={{ opacity: barOpacity }} className="absolute inset-0 -z-10 border-b border-line bg-bg md:hidden" />
        <div className="flex items-center gap-2 md:invisible">
          <LogoMark animated className="h-7 w-auto" />
          <Wordmark animated delay={0.4} className="text-base" />
        </div>
        <Link to="/progress" aria-label={t('progress')}>
          <Chip tone={streak.current ? 'warning' : 'neutral'} className="h-9 px-3 text-sm">
            <Anim icon={FlameIcon} size={18} autoplay play={streak.current} />
            <span className="tnum">{streak.current}</span>
          </Chip>
        </Link>
      </m.div>

      <Item className="-mt-2">
        <h1 className="text-2xl">{s.name ? `${greet}${lang === 'ar' ? '،' : ','} ${s.name}` : greet}</h1>
        <p className="mt-0.5 text-sm text-ink-2">{new Date(now).toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </Item>

      <Item className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm text-ink-2">
            <span className="grid size-8 place-items-center rounded-lg bg-accent/12 text-accent">
              <Anim icon={GraduationCapIcon} size={18} autoplay />
            </span>
            {t('bacIn')}
          </span>
          <Chip tone={syncState === 'behind' ? 'warning' : 'success'}>{t(syncState)}</Chip>
        </div>
        <Countdown bacDate={s.bacDate} daysLabel={t('days')} />
        <div className="mt-5 flex flex-col gap-3">
          <SyncBar label={t('timeElapsed')} value={expected} tone="bg-ink-3" />
          <SyncBar label={t('programmeCovered')} value={mastery} tone="bg-accent" delay={0.25} />
        </div>
      </Item>

      <AnimatePresence>
        {showInstall && (
          <m.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: -24 }} transition={{ duration: 0.35, ease: EASE }} className="card flex items-center gap-3 p-4">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
              <m.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                <Download size={20} />
              </m.span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('installTitle')}</p>
              <p className="text-xs text-ink-2">{t('installSub')}</p>
            </div>
            <Button onClick={() => (install.canPrompt ? install.prompt() : setHowTo(true))}>{t('installBtn')}</Button>
            <button onClick={() => updateSettings({ dismissed: [...s.dismissed, 'install'] })} aria-label={t('dismiss')} className="-me-2 grid size-11 shrink-0 place-items-center text-ink-3">
              <X size={18} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAccountNudge && (
          <m.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: -24 }} transition={{ duration: 0.35, ease: EASE }} className="card flex items-center gap-3 border-accent/40 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
              <CloudUpload size={20} />
            </span>
            <Link to="/account" className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('saveProgress')}</span>
              <span className="block text-xs text-ink-2">{t('benefitSafe')}</span>
            </Link>
            <button onClick={() => updateSettings({ dismissed: [...s.dismissed, 'account-nudge'] })} aria-label={t('dismiss')} className="-me-2 grid size-11 shrink-0 place-items-center text-ink-3">
              <X size={18} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <WeeklyRecap dismissible />

      {running && (
        <Item>
          <Link to="/focus" className="card flex items-center gap-3 border-accent/50 p-4">
            <span className="relative grid size-10 place-items-center rounded-xl bg-accent/12 text-accent">
              <m.span className="absolute inset-0 rounded-xl border border-accent" animate={{ scale: [1, 1.2], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
              <Play size={16} fill="currentColor" />
            </span>
            <span className="flex-1 text-sm text-ink-2">{t('sessionRunning')}</span>
            <RunningTime />
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
          {t('missions')} {missions && <span className="tnum text-ink-3">· {doneCount}/{items.length}</span>}
        </SectionTitle>
        <div className="card divide-y divide-line">
          {/* Skeleton while today's missions are being generated (first open of the day) */}
          {!missions &&
            [0, 1, 2].map((i) => (
              <div key={i} className="flex min-h-16 items-center gap-3 px-3" aria-hidden>
                <span className="size-6 shrink-0 rounded-full bg-raised" />
                <span className="flex-1 space-y-2">
                  <m.span className="block h-2.5 w-24 rounded-full bg-raised" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }} />
                  <m.span className="block h-3 w-44 rounded-full bg-raised" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 + 0.1 }} />
                </span>
              </div>
            ))}
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
              <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4, ease: EASE }} className="flex items-center gap-3 overflow-hidden px-4 py-3">
                <span className="relative shrink-0">
                  <Mascot size={56} cheer />
                  <Burst fire={1} count={10} radius={44} />
                </span>
                <p className="text-sm text-success">{t('allDone')}</p>
              </m.div>
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
              {streak.freezeAvailable ? t('freezeReady') : streak.freezeNextMonday ? `${t('freezeNext')} ${new Date(streak.freezeNextMonday + 'T12:00:00').toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })}` : t('freezeUsed')}
            </span>
          </div>
        </div>
      </Item>
      <InstallSheet open={howTo} onClose={() => setHowTo(false)} ios={install.ios} />
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
        <span className={cn('grid size-6 place-items-center rounded-full border-2 text-bg transition-colors duration-200', mission.done ? 'border-success bg-success' : 'border-ink-3/70')}>
          {mission.done && (
            <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
              <Check size={14} strokeWidth={3} />
            </m.span>
          )}
        </span>
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

function SyncBar({ label, value, tone, delay = 0 }: { label: string; value: number; tone: string; delay?: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className="tnum font-medium text-ink">{Math.round(value * 100)}%</span>
      </div>
      <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
        <m.span
          className={cn('block h-full rounded-full', tone)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(value * 100)}%` }}
          transition={{ delay: 0.3 + delay, duration: 1, ease: EASE }}
        />
      </span>
    </div>
  )
}

// Ticking parts live in their own components so only they re-render every second.
function Countdown({ bacDate, daysLabel }: { bacDate: string; daysLabel: string }) {
  const now = useNow()
  const left = Math.max(0, new Date(bacDate).getTime() - now)
  return (
    <div className="mt-3 flex items-end justify-between gap-4">
      <p className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold tracking-tight">
          <CountUp to={Math.floor(left / 86_400_000)} />
        </span>
        <span className="text-lg text-ink-2">{daysLabel}</span>
      </p>
      <Rolling text={new Date(left).toISOString().slice(11, 19)} className="pb-1.5 text-base text-ink-2" />
    </div>
  )
}

function RunningTime() {
  const s = useSettings()
  const now = useNow()
  return (
    <span className="tnum text-xl font-semibold" dir="ltr">
      {fmt(remaining(s.timer, now))}
    </span>
  )
}
