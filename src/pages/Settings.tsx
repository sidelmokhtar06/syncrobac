import { useRef, useState, type ReactNode } from 'react'
import { BellRing, Download, Trash2, Upload } from 'lucide-react'
import { enableNotifications, notifyPermission, notifySupported } from '../lib/pwa'
import { LanguagesIcon } from '../components/icons/languages'
import { Item, Stagger } from '../components/motion'
import { Anim, Button, Chip, PageHeader, SectionTitle, Segmented, Select, inputClass } from '../components/ui'
import { SERIES, getSerie } from '../config/bac'
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
  const serie = getSerie(s.serie!)

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
          <Row label={t('serie')}>
            <Select aria-label={t('serie')} value={s.serie!} onChange={(e) => updateSettings({ serie: e.target.value as typeof s.serie })} className="w-44">
              {SERIES.map((x) => (
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
              onChange={(e) => e.target.value && updateSettings({ bacDate: `${e.target.value}T08:00:00Z` })}
              className={cn(inputClass, 'w-44')}
            />
          </Row>
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('editCoeffs')}</SectionTitle>
        <div className="card grid grid-cols-2 gap-2 p-4">
          {serie.subjects.map((x) => (
            <label key={x.id} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-raised ps-3 pe-1.5">
              <span className="truncate text-sm">{x[lang]}</span>
              <input
                type="number" min={1} max={12} inputMode="numeric"
                value={s.coeffOverrides[x.id] ?? x.coeff}
                onChange={(e) => +e.target.value > 0 && updateSettings({ coeffOverrides: { ...s.coeffOverrides, [x.id]: +e.target.value } })}
                className="tnum h-9 w-12 rounded-lg border border-line-strong bg-surface text-center text-sm outline-none focus:border-accent"
              />
            </label>
          ))}
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
