import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { History as HistoryIcon, Music, Target, X } from 'lucide-react'
import { CloudRainIcon } from '../components/icons/cloud-rain'
import { CoffeeIcon } from '../components/icons/coffee'
import { PauseIcon } from '../components/icons/pause'
import { PlayIcon } from '../components/icons/play'
import { RotateCCWIcon } from '../components/icons/rotate-ccw'
import { VolumeIcon } from '../components/icons/volume'
import { EASE, Item, Stagger } from '../components/motion'
import { Anim, Button, IconButton, PageHeader, Segmented, Select, SectionTitle, Switch, inputClass } from '../components/ui'
import { cn } from '../lib/cn'
import { useAllChapters } from '../lib/curriculum'
import { subjectsFor, updateSettings, useSettings, type Settings, type TimerMode } from '../lib/db'
import { useTodaySessions } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { AVAILABLE_SOUNDS, playAmbient, stopAmbient } from '../lib/ambient'
import { useWakeLock } from '../lib/wakeLock'
import { fmt, pause, remaining, setMode, start, useNow } from '../lib/timer'

export default function Focus() {
  const s = useSettings()
  const { t, lang } = useT()
  const sessions = useTodaySessions()
  const running = s.timer.endsAt !== null
  const left = remaining(s.timer, Date.now()) // for labels only; the face ticks on its own
  const total = s.durations[s.timer.mode] * 60_000
  const isFocus = s.timer.mode === 'pomodoro' || s.timer.mode === 'custom'
  const all = useAllChapters(s)
  const chapter = s.timer.subjectId && s.timer.chapterId ? all.get(s.timer.subjectId)?.find((c) => c.id === s.timer.chapterId) : undefined

  useEffect(() => {
    if (running) playAmbient(s.sound)
    else stopAmbient()
    return stopAmbient
  }, [running, s.sound])

  // Phones dim and lock mid-session; keep the screen on while a session runs (if enabled).
  useWakeLock(running && s.keepAwake)

  const sound = (v: Settings['sound'], node: ReactNode) => ({ value: v, label: t(v), icon: node })
  // Only rain exists until audio files are added: then a simple switch is enough.
  const onlyRain = AVAILABLE_SOUNDS.length <= 2

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader
          title={t('focus')}
          subtitle={
            <>
              <span className="tnum">{sessions}</span> / {s.dailyGoal} {t('pomodoros')} · {t('today')}
            </>
          }
          action={
            <Link to="/focus/history" aria-label={t('history')} className="grid size-11 place-items-center rounded-xl border border-line-strong bg-raised text-ink-2">
              <HistoryIcon size={20} />
            </Link>
          }
        />
      </Item>

      <Item>
        <Segmented<TimerMode>
          id="mode"
          value={s.timer.mode}
          disabled={running}
          onChange={(mode) => setMode(s, mode)}
          options={[
            { value: 'pomodoro', label: `${s.durations.pomodoro} ${t('minutes')}` },
            { value: 'short', label: `${s.durations.short} ${t('minutes')}` },
            { value: 'long', label: `${s.durations.long} ${t('minutes')}` },
            { value: 'custom', label: t('custom') },
          ]}
        />
        <AnimatePresence initial={false}>
          {s.timer.mode === 'custom' && !running && (
            <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <CustomMinutes s={s} />
            </m.div>
          )}
        </AnimatePresence>
      </Item>

      <Item className="relative mx-auto size-64">
        <TimerFace s={s} total={total} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-20">
          <AnimatePresence mode="wait">
            <m.span key={s.timer.mode + running} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1 text-sm text-ink-2">
              {running ? t('sessionRunning') : t(s.timer.mode)}
            </m.span>
          </AnimatePresence>
        </div>
      </Item>

      <AnimatePresence initial={false} mode="wait">
        {isFocus && !running && (
          <m.label key="goal-input" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative block overflow-hidden">
            <Target size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={s.timer.goal ?? ''}
              maxLength={80}
              onChange={(e) => updateSettings({ timer: { ...s.timer, goal: e.target.value } })}
              placeholder={t('sessionGoalPlaceholder')}
              aria-label={t('sessionGoal')}
              className={cn(inputClass, 'h-12 w-full ps-10')}
            />
          </m.label>
        )}
        {running && s.timer.goal?.trim() && (
          <m.p key="goal-shown" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-center text-sm text-ink-2">
            <Target size={16} className="shrink-0 text-accent" />
            {s.timer.goal}
          </m.p>
        )}
      </AnimatePresence>

      <Item className="flex items-center gap-3">
        <IconButton label={t('reset')} onClick={() => setMode(s, s.timer.mode)} className="size-13">
          <Anim icon={RotateCCWIcon} size={20} play={s.timer.remainingMs} />
        </IconButton>
        <Button size="lg" className="min-w-0 flex-1" onClick={() => (running ? pause(s) : start(s))}>
          <Anim icon={running ? PauseIcon : PlayIcon} size={20} play={running} />
          {running ? t('pause') : left < total ? t('resume') : s.timer.mode === 'short' || s.timer.mode === 'long' ? t('startBreak') : t('startFocus')}
        </Button>
      </Item>

      <Item>
        <SectionTitle>{t('timerSettings')}</SectionTitle>
        <div className="card divide-y divide-line">
          <label className="flex min-h-15 items-center justify-between gap-4 px-4 py-2">
            <span className="text-sm text-ink-2">{t('focusingOn')}</span>
            <Select
              value={s.timer.subjectId ?? ''}
              onChange={(e) => updateSettings({ timer: { ...s.timer, subjectId: e.target.value || null, chapterId: null } })}
              className="w-1/2"
            >
              <option value="">{t('anySubject')}</option>
              {subjectsFor(s).map((x) => (
                <option key={x.id} value={x.id}>
                  {x[lang]} · {x.coeff}
                </option>
              ))}
            </Select>
          </label>
          {chapter && (
            <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
              <span className="min-w-0">
                <span className="block text-xs text-ink-3">{t('chapter')}</span>
                <span className="block truncate text-sm">{chapter.title[lang]}</span>
              </span>
              <button onClick={() => updateSettings({ timer: { ...s.timer, chapterId: null } })} aria-label={t('cancel')} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-3 hover:text-ink">
                <X size={18} />
              </button>
            </div>
          )}
          <div className="flex min-h-15 items-center justify-between gap-4 px-4 py-2">
            <span className="text-sm text-ink-2">{t('keepAwake')}</span>
            <Switch checked={s.keepAwake} onChange={(v) => updateSettings({ keepAwake: v })} label={t('keepAwake')} />
          </div>
          {onlyRain ? (
            <div className="flex min-h-15 items-center justify-between gap-4 px-4 py-2">
              <span className="flex items-center gap-2 text-sm text-ink-2">
                <Anim icon={CloudRainIcon} size={18} play={s.sound === 'rain'} />
                {t('rainSound')}
              </span>
              <Switch checked={s.sound === 'rain'} onChange={(v) => updateSettings({ sound: v ? 'rain' : 'none' })} label={t('rainSound')} />
            </div>
          ) : (
          <div className="px-4 py-3">
            <p className="mb-2 text-sm text-ink-2">{t('ambient')}</p>
            <Segmented<Settings['sound']>
              id="sound"
              value={s.sound}
              onChange={(v) => updateSettings({ sound: v })}
              options={[
                sound('none', <Anim icon={VolumeIcon} size={16} play={s.sound === 'none'} />),
                sound('rain', <Anim icon={CloudRainIcon} size={16} play={s.sound === 'rain'} />),
                sound('atay', <Anim icon={CoffeeIcon} size={16} play={s.sound === 'atay'} />),
                sound('lofi', <Music size={16} />),
              ].filter((o) => (AVAILABLE_SOUNDS as readonly string[]).includes(o.value))}
            />
          </div>
          )}
        </div>
      </Item>

    </Stagger>
  )
}

function CustomMinutes({ s }: { s: Settings }) {
  const { t } = useT()
  const [v, setV] = useState(s.durations.custom)
  return (
    <label className="flex min-h-12 items-center gap-4 pt-3">
      <input
        type="range" min={5} max={120} step={5} value={v}
        onChange={(e) => setV(+e.target.value)}
        onPointerUp={() => setMode(s, 'custom', v)}
        onKeyUp={() => setMode(s, 'custom', v)}
        className="h-11 flex-1 accent-accent"
      />
      <span className="tnum w-16 text-end text-sm text-ink-2">
        {v} {t('minutes')}
      </span>
    </label>
  )
}

// Ring + digits: the only part that ticks (4×/s), so the rest of the page stays still.
function TimerFace({ s, total }: { s: Settings; total: number }) {
  const now = useNow(250)
  const running = s.timer.endsAt !== null
  const left = remaining(s.timer, now)
  const r = 116
  const c = 2 * Math.PI * r
  return (
    <>
      <svg viewBox="0 0 256 256" className="size-full">
        <circle cx="128" cy="128" r={r} className="stroke-raised" strokeWidth="8" fill="none" />
        <m.circle
          cx="128" cy="128" r={r} fill="none" className="stroke-accent" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} transform="rotate(-90 128 128)"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - left / total) }}
          transition={{ duration: running ? 0.3 : 0.9, ease: running ? 'linear' : EASE }}
        />
      </svg>
      <span className="tnum absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-6xl font-medium tracking-tight" dir="ltr">
        {fmt(left)}
      </span>
    </>
  )
}
