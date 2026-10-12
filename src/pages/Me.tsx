import { useState } from 'react'
import { CloudCheck, CloudUpload, Download, NotebookPen, ShieldCheck } from 'lucide-react'
import { accountsAvailable, useUser } from '../lib/auth'
import { adminEntryEnabled } from '../lib/adminEntry'
import { InstallSheet } from '../components/InstallSheet'
import { useInstall } from '../lib/pwa'
import { CalendarCheckIcon } from '../components/icons/calendar-check'
import { CoffeeIcon } from '../components/icons/coffee'
import { ChartColumnIncreasingIcon } from '../components/icons/chart-column-increasing'
import { FlameIcon } from '../components/icons/flame'
import { GaugeIcon } from '../components/icons/gauge'
import { SettingsIcon } from '../components/icons/settings'
import { TimerIcon } from '../components/icons/timer'
import { Item, Stagger } from '../components/motion'
import { Link } from 'react-router'
import { Anim, Chip, ListLink, PageHeader, SectionTitle } from '../components/ui'
import { getSerie } from '../config/bac'
import { useSettings } from '../lib/db'
import { useStreakInfo } from '../lib/hooks'
import { useT } from '../lib/i18n'


// Profile hub: identity + entry points. Each tool lives on its own page.
export default function Me() {
  const s = useSettings()
  const { t, lang } = useT()
  const streak = useStreakInfo()
  const install = useInstall()
  const user = useUser()
  const [howTo, setHowTo] = useState(false)
  const serie = getSerie(s.serie!)
  const initial = (s.name || serie.id).slice(0, 1).toUpperCase()

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader title={t('profile')} />
      </Item>

      <Item className="card flex items-center gap-4 p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent/12 text-xl font-semibold text-accent">{initial}</span>
        <div className="min-w-0 flex-1">
          {s.name ? (
            <p className="truncate text-lg font-semibold">{s.name}</p>
          ) : (
            <Link to="/settings" className="block truncate text-lg font-semibold text-accent">
              {t('addName')}
            </Link>
          )}
          <p className="truncate text-sm text-ink-2">
            {t('serie')} {serie.id} · {serie[lang]}
          </p>
        </div>
        <Chip tone={streak.current ? 'warning' : 'neutral'} className="h-9 px-3 text-sm">
          <Anim icon={FlameIcon} size={18} autoplay />
          <span className="tnum">{streak.current}</span>
        </Chip>
      </Item>

      {accountsAvailable && (
        <Item>
          {user ? (
            <div className="card">
              <ListLink to="/account" icon={<CloudCheck size={18} className="text-success" />} label={t('myAccount')} hint={user.email} />
            </div>
          ) : (
            <Link to="/account" className="card flex items-center gap-4 border-accent/40 p-4 transition-colors active:bg-raised">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
                <CloudUpload size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t('saveProgress')}</span>
                <span className="block text-sm text-ink-2">{t('benefitSafe')}</span>
              </span>
            </Link>
          )}
        </Item>
      )}

      <Item>
        <Link to="/coffee" className="card relative flex items-center gap-4 overflow-hidden p-4 transition-colors active:bg-raised">
          <span aria-hidden className="absolute inset-y-0 start-0 w-1/2 bg-gradient-to-r from-warning/10 to-transparent rtl:bg-gradient-to-l" />
          <span className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-warning/12 text-warning">
            <Anim icon={CoffeeIcon} size={24} autoplay />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-semibold">
              <bdi lang="ar">اشري للمطور كافه</bdi>
            </span>
            <span className="block truncate text-sm text-ink-2">{t('coffeeRow')}</span>
          </span>
        </Link>
      </Item>

      <Item>
        <SectionTitle>{t('studyTools')}</SectionTitle>
        <div className="card divide-y divide-line">
          <ListLink to="/progress" icon={<Anim icon={ChartColumnIncreasingIcon} size={18} autoplay />} label={t('progress')} hint={`${streak.weekActive} / ${s.weeklyGoal} ${t('weekGoal')}`} />
          <ListLink to="/plan" icon={<Anim icon={CalendarCheckIcon} size={18} />} label={t('plan')} />
          <ListLink to="/simulator" icon={<Anim icon={GaugeIcon} size={18} />} label={t('simulator')} />
          <ListLink to="/mistakes" icon={<NotebookPen size={18} />} label={t('mistakes')} hint={t('mistakesSub')} />
          <ListLink to="/focus/history" icon={<Anim icon={TimerIcon} size={18} />} label={t('history')} />
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('account')}</SectionTitle>
        <div className="card divide-y divide-line">
          <ListLink to="/settings" icon={<Anim icon={SettingsIcon} size={18} />} label={t('settings')} hint={t('dataExplain')} />
          {adminEntryEnabled() && <ListLink to="/admin" icon={<ShieldCheck size={18} />} label="Administration" hint="Accès protégé · 2FA" />}
          {!install.installed && (
            <button onClick={() => (install.canPrompt ? install.prompt() : setHowTo(true))} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start transition-colors active:bg-raised">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
                <Download size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{t('installApp')}</span>
                <span className="block truncate text-xs text-ink-3">{t('installSub')}</span>
              </span>
            </button>
          )}
        </div>
      </Item>

      <InstallSheet open={howTo} onClose={() => setHowTo(false)} ios={install.ios} />
    </Stagger>
  )
}
