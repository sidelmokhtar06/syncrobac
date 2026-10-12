import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { enableAdminEntry } from '../lib/adminEntry'
import { BellRing, Download, Monitor, Moon, Sun, Trash2, Upload } from 'lucide-react'
import { enableNotifications, notifyPermission, notifySupported } from '../lib/pwa'
import { LanguagesIcon } from '../components/icons/languages'
import { Item, Stagger } from '../components/motion'
import { Anim, Button, Chip, PageHeader, SectionTitle, Segmented, Select, inputClass } from '../components/ui'
import { listSeries } from '../config/bac'
import { cn } from '../lib/cn'
import { db, today, updateSettings, useSettings, type Lang } from '../lib/db'
import { useT } from '../lib/i18n'

export default function Settings() {
  const s = useSettings()
  const { t, lang } = useT()
  const [name, setName] = useState(s.name)
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState(notifyPermission())
  const file = useRef<HTMLInputElement>(null)
  const nav = useNavigate()
  // Tap the version 7 times to reveal the admin entry on this device (Android "developer mode" style).
  const [taps, setTaps] = useState(0)
  const tapVersion = () => {
    const n = taps + 1
    setTaps(n)
    if (n >= 7) {
      enableAdminEntry()
      nav('/admin')
    }
  }

  const exportData = async () => {
    const dump = Object.fromEntries(await Promise.all(db.tables.map(async (tb) => [tb.name, await tb.toArray()])))
    const blob = new Blob([JSON.stringify({ app: 'syncrobac', version: 2, exportedAt: Date.now(), data: dump })], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `syncrobac-${today()}.json`
    a.click()
  }

  const importData = async (f: File) => {
    try {
      const json = JSON.parse(await f.text())
      if (json.app !== 'syncrobac') throw new Error('bad file')
      await db.transaction('rw', db.tables, async () => {
        for (const tb of db.tables) {
          await tb.clear()
          if (json.data[tb.name]) await tb.bulkPut(json.data[tb.name])
        }
      })
      setMsg(t('imported'))
    } catch {
      setMsg(t('importFailed'))
    }
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title={t('settings')} />
      </Item>

      <Item>
        <SectionTitle>{t('account')}</SectionTitle>
        <div className="card divide-y divide-line">
          <Row label={t('name')}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => updateSettings({ name: name.trim() })}
              placeholder={t('namePlaceholder')}
              aria-label={t('name')}
              className={cn(inputClass, 'w-44')}
            />
          </Row>
          <Row label={t('language')} icon={<Anim icon={LanguagesIcon} size={18} play={s.lang} />}>
            <div className="w-40">
              <Segmented<Lang> id="lang" value={s.lang} onChange={(v) => updateSettings({ lang: v })} options={[{ value: 'fr', label: 'FR' }, { value: 'ar', label: 'ع' }]} />
            </div>
          </Row>
          <Row label={t('theme')}>
            <div className="w-56">
              <Segmented<'system' | 'light' | 'dark'>
                id="theme"
                value={s.theme}
                onChange={(v) => updateSettings({ theme: v })}
                options={[
                  { value: 'system', label: t('themeAuto'), icon: <Monitor size={14} /> },
                  { value: 'light', label: t('themeLight'), icon: <Sun size={14} /> },
                  { value: 'dark', label: t('themeDark'), icon: <Moon size={14} /> },
                ]}
              />
            </div>
          </Row>
          <Row label={t('serie')}>
            <Select aria-label={t('serie')} value={s.serie!} onChange={(e) => updateSettings({ serie: e.target.value as typeof s.serie })} className="w-44">
              {listSeries().map((x) => (
                <option key={x.id} value={x.id}>
                  {x.id} · {x[lang]}
                </option>
              ))}
            </Select>
          </Row>
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('preferences')}</SectionTitle>
        <div className="card divide-y divide-line">
          <Row label={t('dailyGoal')}>
            <Select aria-label={t('dailyGoal')} value={s.dailyGoal} onChange={(e) => updateSettings({ dailyGoal: +e.target.value })} className="w-44">
              {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} {t('pomodoros')}
                </option>
              ))}
            </Select>
          </Row>
          <Row label={t('weeklyGoal')}>
            <Select aria-label={t('weeklyGoal')} value={s.weeklyGoal} onChange={(e) => updateSettings({ weeklyGoal: +e.target.value })} className="w-44">
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {t('daysPerWeek')}
                </option>
              ))}
            </Select>
          </Row>
          {notifySupported() && (
            <Row label={t('notifications')}>
              {perm === 'granted' ? (
                <Chip tone="success">
                  <BellRing size={13} />
                  {t('notifOn')}
                </Chip>
              ) : perm === 'denied' ? (
                <span className="max-w-44 text-end text-xs text-ink-3">{t('notifDenied')}</span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await enableNotifications()
                    setPerm(notifyPermission())
                  }}
                >
                  {t('activate')}
                </Button>
              )}
            </Row>
          )}
          <Row label={t('bacDate')}>
            <input
              type="date"
              aria-label={t('bacDate')}
              value={s.bacDate.slice(0, 10)}
              onChange={(e) => e.target.value && updateSettings({ bacDate: `${e.target.value}T08:00:00Z`, bacCustom: true })}
              className={cn(inputClass, 'w-44')}
            />
          </Row>
        </div>
      </Item>


      <Item>
        <SectionTitle>{t('data')}</SectionTitle>
        <div className="card flex flex-col gap-3 p-4">
          <p className="text-sm text-ink-2">{t('dataExplain')}</p>
          <Button variant="secondary" block onClick={exportData}>
            <Download size={18} />
            {t('exportData')}
          </Button>
          <Button variant="secondary" block onClick={() => file.current?.click()}>
            <Upload size={18} />
            {t('importData')}
          </Button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          {msg && <p role="status" className="text-center text-sm text-success">{msg}</p>}
          <Button
            variant="ghost"
            block
            className="text-danger hover:text-danger"
            onClick={async () => {
              if (!confirm(t('resetConfirm'))) return
              await db.delete()
              location.replace('/')
            }}
          >
            <Trash2 size={18} />
            {t('resetAll')}
          </Button>
        </div>
      </Item>
      <Item>
        <button onClick={tapVersion} className="flex min-h-11 w-full items-center justify-center text-xs text-ink-3 select-none" aria-label={`SyncroBac ${__APP_VERSION__}`}>
          SyncroBac · version {__APP_VERSION__} · {__BUILD_DATE__}
          {taps >= 3 && taps < 7 && <span className="ms-2 text-ink-2">({7 - taps})</span>}
        </button>
      </Item>
    </Stagger>
  )
}

function Row({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex min-h-15 items-center justify-between gap-4 px-4 py-2">
      <span className="flex items-center gap-2 text-sm text-ink-2">
        {icon}
        {label}
      </span>
      {children}
    </div>
  )
}
