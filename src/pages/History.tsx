import { useLiveQuery } from 'dexie-react-hooks'
import { TimerIcon } from '../components/icons/timer'
import { Item, Stagger } from '../components/motion'
import { Anim, PageHeader, SectionTitle } from '../components/ui'
import { programmeFor } from '../lib/curriculum'
import { db, subjectsFor, useSettings } from '../lib/db'
import { dateLocale } from '../lib/hooks'
import { useT } from '../lib/i18n'

export default function History() {
  const s = useSettings()
  const { t, lang } = useT()
  const sessions = useLiveQuery(() => db.sessions.reverse().toArray(), [], [])
  const custom = useLiveQuery(() => db.customChapters.toArray(), [], [])
  const subjects = new Map(subjectsFor(s).map((x) => [x.id, x]))

  const chapterName = (subjectId: string | null, chapterId?: string | null) => {
    if (!subjectId || !chapterId) return null
    if (chapterId.startsWith('custom-')) return custom.find((c) => `custom-${c.id}` === chapterId)?.title ?? null
    return programmeFor(s, subjectId).chapters.find((c) => c.id === chapterId)?.title[lang] ?? null
  }

  const groups = sessions.reduce<Map<string, typeof sessions>>((m, x) => m.set(x.date, [...(m.get(x.date) ?? []), x]), new Map())

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/focus" title={t('history')} />
      </Item>

      {sessions.length === 0 && (
        <Item className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-raised text-ink-2">
            <Anim icon={TimerIcon} size={24} autoplay />
          </span>
          <p className="text-ink-2">{t('noSessions')}</p>
        </Item>
      )}

      {[...groups].map(([date, list]) => (
        <Item key={date}>
          <SectionTitle action={<span className="tnum text-sm text-ink-3">{list.reduce((a, x) => a + x.minutes, 0)} {t('minutes')}</span>}>
            {new Date(date + 'T12:00:00').toLocaleDateString(dateLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
          </SectionTitle>
          <div className="card divide-y divide-line">
            {list.map((x) => {
              const sub = x.subjectId ? subjects.get(x.subjectId) : undefined
              const ch = chapterName(x.subjectId, x.chapterId)
              return (
                <div key={x.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{sub ? sub[lang] : t('anySubject')}</span>
                    {ch && <span className="block truncate text-xs text-ink-3">{ch}</span>}
                  </span>
                  {x.at && <span className="tnum text-xs text-ink-3">{new Date(x.at).toLocaleTimeString(dateLocale(lang), { hour: '2-digit', minute: '2-digit' })}</span>}
                  <span className="tnum w-14 text-end text-sm font-medium">{x.minutes} {t('minutes')}</span>
                </div>
              )
            })}
          </div>
        </Item>
      ))}
    </Stagger>
  )
}
