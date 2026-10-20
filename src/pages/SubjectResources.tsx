import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, m } from 'motion/react'
import { BookOpen, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { EASE, Item, Stagger } from '../components/motion'
import { ResourceCard, domain, type ResourceItem } from '../components/ResourceCard'
import { AddLinkForm } from '../components/AddLinkForm'
import { SearchBar } from '../components/SearchBar'
import { Button, Chip, PageHeader, SectionTitle, Segmented } from '../components/ui'
import { suggestedLinks } from '../config/links'
import { cn } from '../lib/cn'
import { db, subjectsFor, useSettings, type SavedLink } from '../lib/db'
import { useT, type TKey } from '../lib/i18n'

type Cat = 'all' | SavedLink['category']
const CATS: { value: Cat; key: TKey }[] = [
  { value: 'all', key: 'catAll' },
  { value: 'site', key: 'catSite' },
  { value: 'video', key: 'catVideo' },
  { value: 'group', key: 'catGroup' },
  { value: 'app', key: 'catApp' },
]

export default function SubjectResources() {
  const { subjectId = '' } = useParams()
  const s = useSettings()
  const { t, lang } = useT()
  const [cat, setCat] = useState<Cat>('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ResourceItem | null>(null)

  const subject = subjectsFor(s).find((x) => x.id === subjectId)
  const rtl = lang === 'ar'
  const Chevron = rtl ? ChevronLeft : ChevronRight

  const mine = useLiveQuery(
    async () => {
      const all = await db.links.toArray()
      return all.filter((l) => l.subjectId === subjectId).reverse()
    },
    [subjectId],
    [],
  )

  const rawItems = useMemo<ResourceItem[]>(() => {
    if (!subject) return []
    const suggested = suggestedLinks(s.serie)
      .filter((l) => l.subject === subjectId)
      .map((l) => ({
        ...l,
        id: undefined,
        mine: false,
        desc: l[lang],
        subjectId,
      }))

    const custom = (mine ?? []).map((l) => ({
      ...l,
      mine: true,
      desc: l.note,
      subjectId,
    }))

    return [...custom, ...suggested]
  }, [mine, s.serie, lang, subjectId, subject])

  const query = search.trim().toLowerCase()
  const items = useMemo(() => {
    return rawItems.filter((l) => {
      if (cat !== 'all' && l.category !== cat) return false
      if (!query) return true
      return (
        l.title.toLowerCase().includes(query) ||
        (l.desc && l.desc.toLowerCase().includes(query)) ||
        l.url.toLowerCase().includes(query) ||
        domain(l.url).toLowerCase().includes(query)
      )
    })
  }, [rawItems, cat, query])

  if (!subject) return <Navigate to="/resources" replace />

  return (
    <Stagger className="flex flex-col gap-6">
      {/* Page Header */}
      <Item>
        <PageHeader
          back="/resources"
          title={subject[lang]}
          subtitle={`${t('coeff')} ${subject.coeff} · ${rawItems.length} ${t('resourcesCount')}`}
          action={
            <Button
              variant={adding ? 'secondary' : 'primary'}
              onClick={() => setAdding(!adding)}
              aria-expanded={adding}
            >
              <m.span animate={{ rotate: adding ? 45 : 0 }} className="inline-flex">
                <Plus size={18} />
              </m.span>
              {adding ? t('cancel') : t('addLink')}
            </Button>
          }
        />
      </Item>

      {/* Add Link Form */}
      <AnimatePresence initial={false}>
        {adding && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <AddLinkForm
              subjectId={subjectId}
              defaultCategory="site"
              onDone={() => { setAdding(false); setEditing(null) }}
              initial={editing ?? undefined}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Curriculum Quick Bridge Card */}
      <Item>
        <Link
          to={`/subjects/${subjectId}`}
          className="card flex items-center justify-between p-3.5 transition-colors hover:border-line-strong hover:bg-surface/80 active:bg-raised"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/12 text-accent">
              <BookOpen size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{t('studySubject')}</p>
              <p className="text-xs text-ink-3">{t('seeChapters')}</p>
            </div>
          </div>
          <Chevron size={18} className="text-ink-3" />
        </Link>
      </Item>

      {/* Search Bar */}
      <Item>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('searchResources')}
        />
      </Item>

      {/* Category Tabs */}
      <Item>
        <Segmented<Cat>
          id="sub-link-cat"
          value={cat}
          onChange={setCat}
          options={CATS.map((c) => ({ value: c.value, label: t(c.key) }))}
          className="overflow-x-auto"
        />
      </Item>

      {/* Resources List */}
      <Item>
        <SectionTitle
          action={
            <Chip tone="neutral" className="h-6 px-2.5 text-xs font-medium">
              {items.length}
            </Chip>
          }
        >
          {t('resources')}
        </SectionTitle>

        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item) => (
              <ResourceCard
                key={(item.mine ? 'm' : 's') + (item.id ?? item.url)}
                item={item}
                onEdit={(i) => { setEditing(i); setAdding(true) }}
              />
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center">
              {query ? (
                <>
                  <p className="text-sm font-medium text-ink">{t('noSearchResults')}</p>
                  <p className="text-xs text-ink-3">« {search} »</p>
                  <Button variant="secondary" size="md" onClick={() => setSearch('')}>
                    {t('clearSearch')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-3">{t('noLinks')}</p>
                  {cat !== 'all' ? (
                    <Button variant="ghost" size="md" onClick={() => setCat('all')}>
                      {t('catAll')}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="md" onClick={() => setAdding(true)}>
                      <Plus size={16} />
                      {t('addLink')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Item>
    </Stagger>
  )
}
