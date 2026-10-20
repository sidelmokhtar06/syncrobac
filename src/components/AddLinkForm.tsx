import { useMemo, useState } from 'react'
import { m } from 'motion/react'
import { AnimatePresence } from 'motion/react'
import { cn } from '../lib/cn'
import { EASE } from './motion'
import { Button, Chip, inputClass, Select } from './ui'
import { subjectsFor, useSettings, type SavedLink } from '../lib/db'
import { db } from '../lib/db'
import { useT } from '../lib/i18n'

const URL_RE = /^https:\/\/[^\s.]+\.[^\s]+$/

export interface AddLinkFormProps {
  /** Preset subject id; hides the subject selector when set. */
  subjectId?: string
  /** Default category value. */
  defaultCategory?: SavedLink['category']
  /** Called after a successful save. */
  onDone: () => void
  /** Existing link being edited (if provided, form edits instead of adds). */
  initial?: ResourceItem
}

export interface ResourceItem {
  id?: number
  url: string
  title: string
  category: SavedLink['category']
  desc?: string
  mine?: boolean
  subjectId?: string | null
}

export function AddLinkForm({ subjectId, defaultCategory = 'group', onDone, initial }: AddLinkFormProps) {
  const s = useSettings()
  const { t, lang } = useT()
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [note, setNote] = useState(initial?.desc ?? '')
  const [category, setCategory] = useState<SavedLink['category']>(initial?.category ?? defaultCategory)
  const [linkSubjectId, setLinkSubjectId] = useState(initial?.subjectId ?? (subjectId ?? ''))
  const valid = URL_RE.test(url.trim())

  const showSubjectSelect = subjectId === undefined && s.serie !== null
  const subjects = useMemo(() => subjectsFor(s), [s])

  const submitUrl = url.trim()
  const submitTitle = title.trim()
  const submitNote = note.trim() || undefined
  const submitSubject = linkSubjectId || undefined

  return (
    <form
      className="card flex flex-col gap-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || !submitTitle) return
        if (isEdit && initial?.id) {
          await db.links.update(initial.id, {
            title: submitTitle,
            url: submitUrl,
            note: submitNote,
            category,
            subjectId: submitSubject,
          })
        } else {
          await db.links.add({
            title: submitTitle,
            url: submitUrl,
            note: submitNote,
            category,
            subjectId: submitSubject,
            createdAt: Date.now(),
          })
        }
        onDone()
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('linkTitle')}
        aria-label={t('linkTitle')}
        className={cn(inputClass, 'w-full')}
      />
      <input
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t('linkUrl')}
        aria-label={t('linkUrl')}
        dir="ltr"
        className={cn(inputClass, 'w-full', url && !valid && 'border-danger')}
      />
      {url && !valid && <p className="-mt-1 text-xs text-danger">{t('invalidUrl')}</p>}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('linkNote')}
        aria-label={t('linkNote')}
        className={cn(inputClass, 'w-full')}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          aria-label={t('linkCategory')}
          value={category}
          onChange={(e) => setCategory(e.target.value as SavedLink['category'])}
          className="w-full"
        >
          <option value="group">{t('catGroup')}</option>
          <option value="site">{t('catSite')}</option>
          <option value="video">{t('catVideo')}</option>
          <option value="app">{t('catApp')}</option>
        </Select>

        {showSubjectSelect && (
          <Select
            aria-label={t('subjectLabel')}
            value={linkSubjectId}
            onChange={(e) => setLinkSubjectId(e.target.value)}
            className="w-full"
          >
            <option value="">{t('general')}</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub[lang]}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Button type="submit" block disabled={!valid || !title.trim()}>
        {t('save')}
      </Button>
    </form>
  )
}
