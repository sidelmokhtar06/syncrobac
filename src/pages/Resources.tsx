import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, m } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { EASE, Item, Stagger } from '../components/motion'
import { ResourceCard, domain, type ResourceItem } from '../components/ResourceCard'
import { AddLinkForm } from '../components/AddLinkForm'
import { SearchBar } from '../components/SearchBar'
import { Button, Chip, PageHeader, SectionTitle } from '../components/ui'
import { suggestedLinks } from '../config/links'
import { examsFor, groupExams } from '../config/exams'
import { cn } from '../lib/cn'
import { db, subjectsFor, useSettings } from '../lib/db'
import { useT } from '../lib/i18n'

export default function Resources() {
  const s = useSettings()
  const { t, lang } = useT()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ResourceItem | null>(null)

  const subjects = useMemo(() => subjectsFor(s), [s])
  const topCoeff = Math.max(...subjects.map((s) => s.coeff), 1)
  const rtl = lang === 'ar'
  const Chevron = rtl ? ChevronLeft : ChevronRight

  const mine = useLiveQuery(
    async () => {
      const all = await db.links.toArray()
      return all.reverse()
    },
    [],
    [],
  )

  const allItems = useMemo<ResourceItem[]>(() => {
    const suggested = suggestedLinks(s.serie).map((l) => ({
      ...l,
      id: undefined,
      mine: false,
      desc: l[lang],
      subjectId: l.subject ?? null,
    }))
    const custom = (mine ?? []).map((l) => ({
      ...l,
      mine: true,
      desc: l.note,
      subjectId: l.subjectId ?? null,
    }))
    return [...custom, ...suggested]
  }, [mine, s.serie, lang])

  // General links (not tied to a single subject)
  const generalItems = useMemo(() => {
    return allItems.filter((l) => !l.subjectId)
  }, [allItems])

  // Map of count per subject
  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of allItems) {
      if (item.subjectId) {
        counts.set(item.subjectId, (counts.get(item.subjectId) ?? 0) + 1)
      }
    }
    return counts
  }, [allItems])

  // Search results across all links
  const query = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!query) return []
    return allItems.filter((l) => {
      const sub = l.subjectId ? subjects.find((x) => x.id === l.subjectId) : null
      return (
        l.title.toLowerCase().includes(query) ||
        (l.desc && l.desc.toLowerCase().includes(query)) ||
        l.url.toLowerCase().includes(query) ||
        domain(l.url).toLowerCase().includes(query) ||
        (sub && sub[lang].toLowerCase().includes(query))
      )
    })
  }, [allItems, query, subjects, lang])

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader
          title={t('resources')}
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
              onDone={() => { setAdding(false); setEditing(null) }}
              initial={editing ?? undefined}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Styled Search Bar */}
      <Item>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('searchResources')}
        />
      </Item>

      {/* If Searching, show search results */}
      {query ? (
        <Item>
          <SectionTitle
            action={
              <Chip tone="neutral" className="h-6 px-2.5 text-xs font-medium">
                {searchResults.length}
              </Chip>
            }
          >
            {t('links')}
          </SectionTitle>

          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {searchResults.map((item) => (
                <ResourceCard
                  key={(item.mine ? 'm' : 's') + (item.id ?? item.url)}
                  item={item}
                  onEdit={(i) => { setEditing(i); setAdding(true) }}
                />
              ))}
            </AnimatePresence>

            {searchResults.length === 0 && (
              <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm font-medium text-ink">{t('noSearchResults')}</p>
                <p className="text-xs text-ink-3">« {search} »</p>
                <Button variant="secondary" size="md" onClick={() => setSearch('')}>
                  {t('clearSearch')}
                </Button>
              </div>
            )}
          </div>
        </Item>
      ) : (
        <>
          {/* Section 1: By Subject */}
          <Item>
            <SectionTitle
              action={
                <Chip tone="neutral" className="h-6 px-2.5 text-xs font-medium">
                  {subjects.length} {t('subjects').toLowerCase()}
                </Chip>
              }
            >
              {t('subjectResources')}
            </SectionTitle>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {subjects.map((sub) => {
                const count = subjectCounts.get(sub.id) ?? 0
                const examCount = groupExams(examsFor(s.serie, sub.id)).length
                const major = sub.coeff >= topCoeff
                return (
                  <Link
                    key={sub.id}
                    to={`/resources/${sub.id}`}
                    className="card flex items-center justify-between p-3.5 transition-colors hover:border-line-strong hover:bg-surface/90 active:bg-raised"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'grid size-10 shrink-0 place-items-center rounded-xl font-semibold text-sm',
                          major ? 'bg-accent/12 text-accent' : 'bg-raised text-ink-2',
                        )}
                      >
                        {sub.coeff}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink">
                          {sub[lang]}
                        </h3>
                        <p className="text-xs text-ink-3">
                          {count > 0
                            ? `${count} ${count > 1 ? t('resourcesCount') : t('resourceOne')}`
                            : t('noLinks')}
                          {examCount > 0 && ` · ${examCount} ${t('examsCount')}`}
                        </p>
                      </div>
                    </div>
                    <Chevron size={18} className="shrink-0 text-ink-3" />
                  </Link>
                )
              })}
            </div>
          </Item>

          {/* Section 2: General & Community */}
          <Item>
            <SectionTitle
              action={
                <Chip tone="neutral" className="h-6 px-2.5 text-xs font-medium">
                  {generalItems.length}
                </Chip>
              }
            >
              {t('generalResources')}
            </SectionTitle>

            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                {generalItems.map((item) => (
                  <ResourceCard
                    key={(item.mine ? 'm' : 's') + (item.id ?? item.url)}
                    item={item}
                  onEdit={(i) => { setEditing(i); setAdding(true) }}
                  />
                ))}
              </AnimatePresence>

              {generalItems.length === 0 && (
                <div className="card p-6 text-center text-sm text-ink-3">
                  {t('noLinks')}
                </div>
              )}
            </div>
          </Item>
        </>
      )}

      <p className="text-center text-xs text-ink-3">{t('communitySoon')}</p>
    </Stagger>
  )
}
