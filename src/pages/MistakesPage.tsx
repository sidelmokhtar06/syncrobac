import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { NotebookPen } from 'lucide-react'
import { MistakeCard } from '../components/Mistakes'
import { Item, Stagger } from '../components/motion'
import { PageHeader, SectionTitle } from '../components/ui'
import { useAllChapters } from '../lib/curriculum'
import { db, subjectsFor, useSettings } from '../lib/db'
import { useT } from '../lib/i18n'

// Every mistake, grouped by subject (heaviest coefficient first): the sheet to reread before the BAC.
export default function MistakesPage() {
  const s = useSettings()
  const { t, lang } = useT()
  const all = useAllChapters(s)
  const mistakes = useLiveQuery(() => db.mistakes.orderBy('createdAt').reverse().toArray(), [], [])
  const groups = subjectsFor(s)
    .map((sub) => ({ sub, items: mistakes.filter((x) => x.subjectId === sub.id) }))
    .filter((g) => g.items.length)

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title={t('mistakes')} subtitle={t('mistakesSub')} />
      </Item>

      {groups.length === 0 && (
        <Item className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-raised text-ink-2">
            <NotebookPen size={24} />
          </span>
          <p className="max-w-xs text-sm text-ink-2">{t('noMistakes')}</p>
        </Item>
      )}

      {groups.map(({ sub, items }) => (
        <Item key={sub.id}>
          <SectionTitle action={<span className="tnum text-sm text-ink-3">{items.length}</span>}>{sub[lang]}</SectionTitle>
          <div className="flex flex-col gap-3">
            {items.map((x) => {
              const chapter = all.get(x.subjectId)?.find((c) => c.id === x.chapterId)
              return (
                <div key={x.id}>
                  {chapter && (
                    <Link to={`/subjects/${x.subjectId}/${x.chapterId}`} className="mb-1 inline-flex min-h-8 items-center text-xs text-accent">
                      {chapter.title[lang]}
                    </Link>
                  )}
                  <MistakeCard mistake={x} />
                </div>
              )
            })}
          </div>
        </Item>
      ))}
    </Stagger>
  )
}
