import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { m } from 'motion/react'
import { ChevronLeft, ChevronRight, Play, Plus } from 'lucide-react'
import { SourceNote, STATUS_ORDER, StatusIcon, statusLabel } from '../components/ChapterBits'
import { TaskList } from '../components/Tasks'
import { Item, Stagger, spring } from '../components/motion'
import { Button, PageHeader, ProgressBar, SectionTitle, inputClass } from '../components/ui'
import { cn } from '../lib/cn'
import { setChapter, statusOf, subjectMastery, useChapterStates, useChapters } from '../lib/curriculum'
import { subjectColor } from '../lib/colors'
import { db, subjectsFor, useSettings } from '../lib/db'
import { useT } from '../lib/i18n'
import { start } from '../lib/timer'

export default function SubjectDetail() {
  const { subjectId = '' } = useParams()
  const s = useSettings()
  const { t, lang } = useT()
  const nav = useNavigate()
  const subject = subjectsFor(s).find((x) => x.id === subjectId)
  const { source, chapters } = useChapters(s, subjectId)
  const states = useChapterStates()
  const data = useLiveQuery(async () => {
    const [sessions, tasks] = await Promise.all([db.sessions.where('subjectId').equals(subjectId).toArray(), db.tasks.where('subjectId').equals(subjectId).toArray()])
    return { minutes: sessions.reduce((a, x) => a + x.minutes, 0), tasks }
  }, [subjectId])

  if (!subject) return <Navigate to="/subjects" replace />
  const mastery = subjectMastery(chapters, states, subjectId)
  const done = chapters.filter((c) => statusOf(states, subjectId, c.id) === 'done').length
  const subColor = subjectColor(subject)
  const rtl = lang === 'ar'
  const Chevron = rtl ? ChevronLeft : ChevronRight

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/subjects" title={subject[lang]} subtitle={`${t('coeff')} ${subject.coeff} · ${done}/${chapters.length} ${t('mastered')}`} />
      </Item>

      <Item className="card p-5">
        <div className="flex items-end justify-between gap-2 mb-4">
          <div>
            <p className="text-sm text-ink-2">{t('progress')}</p>
            <p className="tnum text-4xl font-semibold" style={{ color: subColor }}>{Math.round(mastery * 100)}%</p>
          </div>
          <div className="text-end">
            <p className="text-sm text-ink-2">{t('focusTime')}</p>
            <p className="tnum text-lg font-semibold">{((data?.minutes ?? 0) / 60).toFixed(1)} {t('hoursUnit')}</p>
          </div>
        </div>
        <ProgressBar value={mastery} color={mastery < 1 ? subColor : undefined} className="h-2" />
        <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
          <span>{done} / {chapters.length} {t('chapters').toLowerCase()}</span>
          <span>{data?.tasks.filter((x) => !x.done).length ?? 0} {t('tasks')} {t('pending')}</span>
        </div>
        <Button block className="mt-4" style={{ backgroundColor: subColor }} onClick={() => start(s, subjectId, null).then(() => nav('/focus'))}>
          <Play size={16} fill="currentColor" />
          {t('focusSubject')}
        </Button>
      </Item>

      <Item>
        <SectionTitle>{t('chapters')}</SectionTitle>
        <div className="card divide-y divide-line">
          {chapters.map((ch, i) => {
            const st = statusOf(states, subjectId, ch.id)
            const next = STATUS_ORDER[(STATUS_ORDER.indexOf(st) + 1) % 3]
            const open = data?.tasks.filter((x) => x.chapterId === ch.id && !x.done).length ?? 0
            return (
              <div key={ch.id} className="flex min-h-15 items-center">
                {/* Quick status cycle: todo → learning → done */}
                <m.button
                  whileTap={{ scale: 0.85 }}
                  transition={spring}
                  onClick={() => setChapter(subjectId, ch.id, { status: next })}
                  aria-label={`${ch.title[lang]}: ${t(statusLabel(st))}`}
                  className="grid size-12 shrink-0 place-items-center"
                >
                  <m.span key={st} initial={{ scale: 0.5, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={spring}>
                    <StatusIcon status={st} size={22} />
                  </m.span>
                </m.button>
                <Link to={`/subjects/${subjectId}/${ch.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-2 pe-3">
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[15px]', st === 'done' ? 'text-ink-2' : 'text-ink')}>
                      <span className="tnum me-1.5 text-ink-3">{i + 1}.</span>
                      {ch.title[lang]}
                    </span>
                    <span className="block text-xs text-ink-3">
                      {t(statusLabel(st))}
                      {!ch.custom && source === 'official' && ` · ${ch.weeks} ${t('weeksUnit')}`}
                      {open > 0 && ` · ${open} ${t('tasks')}`}
                    </span>
                  </span>
                  <Chevron size={18} className="shrink-0 text-ink-3" />
                </Link>
              </div>
            )
          })}
          <AddChapter subjectId={subjectId} />
        </div>
        <div className="mt-3">
          <SourceNote source={source} />
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('generalTasks')}</SectionTitle>
        <div className="card px-2 py-2">
          <TaskList tasks={data?.tasks.filter((x) => !x.chapterId) ?? []} subjectId={subjectId} />
        </div>
      </Item>
    </Stagger>
  )
}


function AddChapter({ subjectId }: { subjectId: string }) {
  const { t } = useT()
  const [title, setTitle] = useState('')
  return (
    <form
      className="flex gap-2 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        db.customChapters.add({ subjectId, title: title.trim(), createdAt: Date.now() })
        setTitle('')
      }}
    >
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('addChapter')} aria-label={t('chapterName')} className={cn(inputClass, 'min-w-0 flex-1')} />
      <button type="submit" disabled={!title.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong bg-raised text-ink disabled:opacity-40" aria-label={t('addChapter')}>
        <Plus size={20} />
      </button>
    </form>
  )
}
