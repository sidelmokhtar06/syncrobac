import { Link } from 'react-router'
import { AlertTriangle, CheckCircle2, GraduationCap } from 'lucide-react'
import { Item, Stagger } from '../components/motion'
import { Chip, PageHeader } from '../components/ui'
import { cn } from '../lib/cn'
import { buildPlan, useAllChapters, useChapterStates } from '../lib/curriculum'
import { useSettings } from '../lib/db'
import { dateLocale } from '../lib/hooks'
import { useT } from '../lib/i18n'

export default function Plan() {
  const s = useSettings()
  const { t, lang } = useT()
  const all = useAllChapters(s)
  const states = useChapterStates()
  const { weeks, pace } = buildPlan(s, all, states)
  const fmt = (d: Date) => d.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/" title={t('plan')} subtitle={t('planSub')} />
      </Item>

      <Item>
        <p className={cn('flex items-center gap-2 rounded-xl border px-4 py-3 text-sm', pace > 1.05 ? 'border-warning/40 bg-warning/8 text-warning' : 'border-success/30 bg-success/8 text-success')}>
          {pace > 1.05 ? <AlertTriangle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
          {pace > 1.05 ? t('paceBehind') : t('onTrack')}
        </p>
      </Item>

      <ol className="relative flex flex-col gap-3">
        {weeks.map((w, i) => (
          <Item key={w.start.toISOString()}>
            <li className={cn('card p-4', i === 0 && 'border-accent/60')}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {i === 0 ? t('thisWeek') : `${t('weekOf')} ${fmt(w.start)}`}
                </p>
                {i === 0 && <Chip tone="accent">{fmt(w.start)}</Chip>}
              </div>
              {w.revision ? (
                <p className="flex items-center gap-2 text-sm text-ink-2">
                  <GraduationCap size={16} className="text-accent" />
                  {t('revisionWeek')}
                </p>
              ) : w.items.length === 0 ? (
                <p className="text-sm text-ink-3">—</p>
              ) : (
                <ul className="flex flex-col">
                  {w.items.map(({ subject, chapter }) => (
                    <li key={subject.id + chapter.id}>
                      <Link to={`/subjects/${subject.id}/${chapter.id}`} className="flex min-h-11 items-center gap-3 rounded-lg py-1">
                        <span className="tnum grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-xs font-semibold text-ink-2">{subject.coeff}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{chapter.title[lang]}</span>
                          <span className="block truncate text-xs text-ink-3">{subject[lang]}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </Item>
        ))}
      </ol>
    </Stagger>
  )
}
