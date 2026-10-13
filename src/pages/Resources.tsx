import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, m } from 'motion/react'
import { ExternalLink, Plus, Share2, Trash2, Users } from 'lucide-react'
import { EASE, Item, Stagger } from '../components/motion'
import { Button, PageHeader, SectionTitle, Segmented, Select, inputClass } from '../components/ui'
import { suggestedLinks } from '../config/links'
import { cn } from '../lib/cn'
import { db, useSettings, type SavedLink } from '../lib/db'
import { useT, type TKey } from '../lib/i18n'

type Cat = 'all' | SavedLink['category']
const CATS: { value: Cat; key: TKey }[] = [
  { value: 'all', key: 'catAll' },
  { value: 'group', key: 'catGroup' },
  { value: 'site', key: 'catSite' },
  { value: 'video', key: 'catVideo' },
]

const domain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function Resources() {
  const s = useSettings()
  const { t, lang } = useT()
  const [cat, setCat] = useState<Cat>('all')
  const [adding, setAdding] = useState(false)
  const mine = useLiveQuery(() => db.links.reverse().toArray(), [], [])

  const items = [
    ...mine.map((l) => ({ ...l, mine: true, desc: l.note })),
    ...suggestedLinks(s.serie).map((l) => ({ ...l, id: undefined, mine: false, desc: l[lang] })),
  ].filter((l) => cat === 'all' || l.category === cat)

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader
          title={t('resources')}
          action={
            <Button variant={adding ? 'secondary' : 'primary'} onClick={() => setAdding(!adding)} aria-expanded={adding}>
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
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <AddLink onDone={() => setAdding(false)} />
          </m.div>
        )}
      </AnimatePresence>

      <Item>
        <SectionTitle>{t('links')}</SectionTitle>
        <Segmented<Cat> id="link-cat" value={cat} onChange={setCat} options={CATS.map((c) => ({ value: c.value, label: t(c.key) }))} />
      </Item>

      <div className="-mt-2 grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((l) => (
            <m.div key={(l.mine ? 'm' : 's') + (l.id ?? l.url)} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="card flex items-center gap-3 p-3">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-raised text-sm font-semibold text-ink-2 uppercase">
                  {l.category === 'group' ? <Users size={18} /> : domain(l.url).slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{l.title}</span>
                    <ExternalLink size={13} className="shrink-0 text-ink-3" />
                  </span>
                  {l.desc && <span className="block truncate text-sm text-ink-2">{l.desc}</span>}
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
                    {domain(l.url)} · {l.mine ? t('mine') : t('suggested')}
                  </span>
                </span>
              </a>
              {'share' in navigator && (
                <button onClick={() => navigator.share({ title: l.title, url: l.url }).catch(() => {})} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-3 hover:text-ink" aria-label={t('shareLink')}>
                  <Share2 size={18} />
                </button>
              )}
              {l.mine && (
                <button onClick={() => db.links.delete(l.id!)} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-3 hover:text-danger" aria-label={t('delete')}>
                  <Trash2 size={18} />
                </button>
              )}
            </m.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && <p className="card px-4 py-6 text-center text-sm text-ink-3">{t('noLinks')}</p>}
        <p className="text-center text-xs text-ink-3">{t('communitySoon')}</p>
      </div>

    </Stagger>
  )
}

function AddLink({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<SavedLink['category']>('group')
  const valid = /^https:\/\/[^\s.]+\.[^\s]+$/.test(url.trim())

  return (
    <form
      className="card flex flex-col gap-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || !title.trim()) return
        await db.links.add({ title: title.trim(), url: url.trim(), note: note.trim() || undefined, category, createdAt: Date.now() })
        onDone()
      }}
    >
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('linkTitle')} aria-label={t('linkTitle')} className={inputClass} />
      <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('linkUrl')} aria-label={t('linkUrl')} dir="ltr" className={cn(inputClass, url && !valid && 'border-danger')} />
      {url && !valid && <p className="-mt-1 text-xs text-danger">{t('invalidUrl')}</p>}
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('linkNote')} aria-label={t('linkNote')} className={inputClass} />
      <Select aria-label={t('linkCategory')} value={category} onChange={(e) => setCategory(e.target.value as SavedLink['category'])}>
        <option value="group">{t('catGroup')}</option>
        <option value="site">{t('catSite')}</option>
        <option value="video">{t('catVideo')}</option>
        <option value="app">{t('catApp')}</option>
      </Select>
      <Button type="submit" block disabled={!valid || !title.trim()}>
        {t('save')}
      </Button>
    </form>
  )
}
