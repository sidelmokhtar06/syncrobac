import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, m } from 'motion/react'
import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react'
import { cn } from '../lib/cn'
import { db, type Mistake } from '../lib/db'
import { useT } from '../lib/i18n'
import { EASE, spring } from './motion'
import { Button, inputClass } from './ui'

/** Mistake notebook for one chapter: add a mistake + the right method, delete. */
export function ChapterMistakes({ subjectId, chapterId }: { subjectId: string; chapterId: string }) {
  const { t } = useT()
  const mistakes = useLiveQuery(
    () => db.mistakes.where('chapterId').equals(chapterId).filter((x) => x.subjectId === subjectId).reverse().sortBy('createdAt'),
    [subjectId, chapterId],
    [],
  )
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [fix, setFix] = useState('')

  const save = async () => {
    if (!text.trim()) return
    await db.mistakes.add({ subjectId, chapterId, text: text.trim(), fix: fix.trim() || undefined, createdAt: Date.now() })
    setText('')
    setFix('')
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {mistakes.map((x) => (
          <MistakeCard key={x.id} mistake={x} />
        ))}
      </AnimatePresence>
      {mistakes.length === 0 && !open && <p className="text-sm text-ink-3">{t('noMistakes')}</p>}

      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <m.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="flex flex-col gap-2 pt-1">
              <textarea autoFocus rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('mistakePlaceholder')} aria-label={t('mistakeText')} className={cn(inputClass, 'h-auto resize-none py-2.5')} />
              <textarea rows={2} value={fix} onChange={(e) => setFix(e.target.value)} placeholder={t('mistakeFix')} aria-label={t('mistakeFix')} className={cn(inputClass, 'h-auto resize-none py-2.5')} />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button className="flex-1" disabled={!text.trim()} onClick={save}>
                  {t('save')}
                </Button>
              </div>
            </div>
          </m.div>
        ) : (
          <m.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="secondary" block onClick={() => setOpen(true)}>
              <Plus size={18} />
              {t('addMistake')}
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MistakeCard({ mistake, caption }: { mistake: Mistake; caption?: string }) {
  const { t } = useT()
  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: -12 }}
      transition={spring}
      className="relative rounded-xl border border-line bg-raised/50 p-3 pe-12"
    >
      {caption && <p className="mb-1 text-xs text-ink-3">{caption}</p>}
      <p className="flex gap-2 text-[15px]">
        <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />
        <span>{mistake.text}</span>
      </p>
      {mistake.fix && (
        <p className="mt-2 flex gap-2 text-[15px]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
          <span>
            <span className="sr-only">{t('fixLabel')}: </span>
            {mistake.fix}
          </span>
        </p>
      )}
      <button onClick={() => db.mistakes.delete(mistake.id!)} aria-label={t('delete')} className="absolute end-1 top-1 grid size-11 place-items-center text-ink-3 hover:text-danger">
        <Trash2 size={16} />
      </button>
    </m.div>
  )
}
