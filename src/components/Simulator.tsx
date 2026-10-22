import { useState, useEffect, useMemo } from 'react'
import { Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MENTIONS } from '../config/bac'
import { cn } from '../lib/cn'
import { subjectsFor, useSettings, db } from '../lib/db'
import { useT } from '../lib/i18n'
import { useDebouncedSave } from '../lib/hooks'

export default function Simulator() {
  const s = useSettings()
  const { t, lang } = useT()
  const subjects = subjectsFor(s)
  // null = no grades saved yet, undefined = still loading.
  const saved = useLiveQuery(async () => (await db.simulator.get(1)) ?? null, [])
  const [grades, setGrades] = useState<Record<string, string>>({})

  // Show the saved grades once loaded, and when they change (e.g. a backup restore).
  useEffect(() => {
    if (saved !== undefined) setGrades(saved?.grades ?? {})
  }, [saved])

  // Persist edits only: writing back what was just loaded would re-trigger the query above.
  useDebouncedSave(grades, (g) => {
    if (saved !== undefined && JSON.stringify(g) !== JSON.stringify(saved?.grades ?? {})) db.simulator.put({ id: 1, grades: g, updatedAt: Date.now() })
  }, 300)

  const allSet = useMemo(() => {
    const g = { ...grades }
    for (const sub of subjects) {
      if (!(sub.id in g)) g[sub.id] = ''
    }
    return g
  }, [grades, subjects])

  const entered = subjects.filter((x) => allSet[x.id] !== undefined && allSet[x.id] !== '')
  const rest = subjects.filter((x) => !entered.includes(x))
  const points = entered.reduce((a, x) => a + Number(allSet[x.id]) * x.coeff, 0)
  const enteredCoeff = entered.reduce((a, x) => a + x.coeff, 0)
  const restCoeff = rest.reduce((a, x) => a + x.coeff, 0)
  const avg = enteredCoeff ? points / enteredCoeff : null

  // Rescue points: average needed on the remaining subjects to reach each threshold.
  const needed = (target: number) => (target * (enteredCoeff + restCoeff) - points) / restCoeff

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-2">{t('simulatorSub')}</p>
      <div className="flex flex-col gap-2">
        {subjects.map((x) => (
          <label key={x.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-raised ps-3 pe-1.5">
            <span className="min-w-0 flex-1 truncate text-sm">{x[lang]}</span>
            <span className="tnum text-xs text-ink-3">×{x.coeff}</span>
            <input
              type="number" inputMode="decimal" min={0} max={20} step={0.25} placeholder="—"
              value={allSet[x.id] ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || (+v >= 0 && +v <= 20)) setGrades((prev) => ({ ...prev, [x.id]: v }))
              }}
              className="tnum h-9 w-16 rounded-lg border border-line-strong bg-surface text-center text-sm outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </label>
        ))}
      </div>

      <div className="flex items-baseline justify-between rounded-xl border border-line px-4 py-3">
        <span className="text-sm text-ink-2">{t('average')}</span>
        <span className={cn('tnum text-2xl font-semibold', avg === null ? 'text-ink-3' : avg >= 10 ? 'text-success' : 'text-warning')}>
          {avg === null ? '—' : avg.toFixed(2)}
          <span className="text-sm font-normal text-ink-3"> /20</span>
        </span>
      </div>

      {rest.length > 0 && entered.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-ink-2">{t('needed')}</p>
          <div className="divide-y divide-line rounded-xl border border-line">
            {MENTIONS.map((mn) => {
              const n = needed(mn.min)
              return (
                <div key={mn.min} className="flex min-h-11 items-center justify-between px-4 text-sm">
                  <span>
                    {mn[lang]} <span className="tnum text-ink-3">· {mn.min}</span>
                  </span>
                  <span className={cn('tnum flex items-center gap-1', n <= 0 ? 'text-success' : n > 20 ? 'text-ink-3' : 'font-medium text-ink')}>
                    {n <= 0 && <Check size={14} />}
                    {n <= 0 ? t('secured') : n > 20 ? t('impossible') : `${n.toFixed(2)} /20`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
