import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { History as HistoryIcon, Music, Share2, X } from 'lucide-react'
import { CloudRainIcon } from '../components/icons/cloud-rain'
import { CoffeeIcon } from '../components/icons/coffee'
import { PauseIcon } from '../components/icons/pause'
import { PlayIcon } from '../components/icons/play'
import { RotateCCWIcon } from '../components/icons/rotate-ccw'
import { VolumeIcon } from '../components/icons/volume'
import { EASE, Item, Stagger } from '../components/motion'
import { Anim, Button, IconButton, PageHeader, Segmented, Select, SectionTitle } from '../components/ui'
import { useAllChapters } from '../lib/curriculum'
import { subjectsFor, updateSettings, useSettings, type Settings, type TimerMode } from '../lib/db'
import { useStreak, useTodaySessions } from '../lib/hooks'
import { quoted, useT } from '../lib/i18n'
import { playAmbient, stopAmbient } from '../lib/ambient'
import { shareStatusCard } from '../lib/statusCard'
import { fmt, pause, remaining, setMode, start, useNow } from '../lib/timer'

const QUOTES = {
  fr: ['Révise malin, réussis vite.', 'Chaque heure compte.', 'Aligne ton énergie.', 'Ne t’arrête pas, synchronise.', 'Le BAC se gagne aujourd’hui.'],
  ar: ['راجع بذكاء، انجح بسرعة.', 'كل ساعة لها قيمتها.', 'نظّم طاقتك.', 'لا تتوقف، زامِن.', 'الباكالوريا تُكسب اليوم.'],
}

export default function Focus() {
  const s = useSettings()
  const { t, lang } = useT()
  const now = useNow(250)
  const streak = useStreak()
  const sessions = useTodaySessions()
  const running = s.timer.endsAt !== null
  const left = remaining(s.timer, now)
  const total = s.durations[s.timer.mode] * 60_000
  const [qi, setQi] = useState(() => Math.floor(Date.now() / 86_400_000) % QUOTES.fr.length)
  const quote = QUOTES[lang][qi]
  const all = useAllChapters(s)
  const chapter = s.timer.subjectId && s.timer.chapterId ? all.get(s.timer.subjectId)?.find((c) => c.id === s.timer.chapterId) : undefined

  useEffect(() => {
    if (running) playAmbient(s.sound)
    else stopAmbient()
    return stopAmbient
  }, [running, s.sound])

  useEffect(() => {
    const id = setInterval(() => setQi((i) => (i + 1) % QUOTES.fr.length), 8000)
    return () => clearInterval(id)
  }, [])

  const sound = (v: Settings['sound'], node: ReactNode) => ({ value: v, label: t(v), icon: node })
  const r = 116
  const c = 2 * Math.PI * r

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
        <svg viewBox="0 0 256 256" className="size-full">
          <circle cx="128" cy="128" r={r} stroke="#1a1f28" strokeWidth="8" fill="none" />
          <m.circle
            cx="128" cy="128" r={r} fill="none" stroke="#22C1D6" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} transform="rotate(-90 128 128)"
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - left / total) }}
            transition={{ duration: running ? 0.3 : 0.9, ease: running ? 'linear' : EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-6xl font-medium tracking-tight" dir="ltr">{fmt(left)}</span>
          <AnimatePresence mode="wait">
            <m.span key={s.timer.mode + running} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1 text-sm text-ink-2">
              {running ? t('sessionRunning') : t(s.timer.mode)}
            </m.span>
          </AnimatePresence>
        </div>
      </Item>

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
              ]}
            />
          </div>
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('quoteOfDay')}</SectionTitle>
        <div className="card p-5">
          <div className="grid min-h-16 items-center">
            <AnimatePresence mode="wait">
              <m.p
                key={qi + lang}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-lg font-medium"
              >
                {quoted(quote, lang)}
              </m.p>
            </AnimatePresence>
          </div>
          <Button
            variant="secondary"
            block
            className="mt-4"
            onClick={() => shareStatusCard({ quote: quoted(quote, lang), streak, streakLabel: t('daysSynced'), tagline: t('tagline') })}
          >
            <Share2 size={18} />
            {t('shareCard')}
          </Button>
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
