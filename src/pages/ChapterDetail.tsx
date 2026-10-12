import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Trash2 } from 'lucide-react'
import { StatusIcon } from '../components/ChapterBits'
import { TaskList } from '../components/Tasks'
import { ChapterMistakes } from '../components/Mistakes'
import { Item, Stagger } from '../components/motion'
import { Button, PageHeader, Segmented, SectionTitle } from '../components/ui'
import { chapterKey, setChapter, useChapters } from '../lib/curriculum'
import { db, subjectsFor, useSettings, type ChapterStatus, type Confidence } from '../lib/db'
import { useT } from '../lib/i18n'
import { start } from '../lib/timer'

export default function ChapterDetail() {
  const { subjectId = '', chapterId = '' } = useParams()
  const s = useSettings()
  const { t, lang } = useT()
  const nav = useNavigate()
  const subject = subjectsFor(s).find((x) => x.id === subjectId)
  const { source, chapters } = useChapters(s, subjectId)
  const chapter = chapters.find((c) => c.id === chapterId)
  const data = useLiveQuery(async () => {
    const [state, tasks, sessions] = await Promise.all([
      db.chapters.get(chapterKey(subjectId, chapterId)),
      db.tasks.where('chapterId').equals(chapterId).filter((x) => x.subjectId === subjectId).toArray(),
      db.sessions.where('subjectId').equals(subjectId).filter((x) => x.chapterId === chapterId).toArray(),
    ])
    return { state, tasks, minutes: sessions.reduce((a, x) => a + x.minutes, 0) }
  }, [subjectId, chapterId])

  const [notes, setNotes] = useState<string | null>(null)
  useEffect(() => {
    if (data && notes === null) setNotes(data.state?.notes ?? '')
  }, [data, notes])

  if (!subject) return <Navigate to="/subjects" replace />
  if (!chapter) return chapters.length ? <Navigate to={`/subjects/${subjectId}`} replace /> : null
  const status = data?.state?.status ?? 'todo'

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back={`/subjects/${subjectId}`} title={chapter.title[lang]} subtitle={`${subject[lang]} · ${t('coeff')} ${subject.coeff}`} />
      </Item>

      <Item className="card flex flex-col gap-4 p-5">
        <Segmented<ChapterStatus>
          id="status"
          value={status}
          onChange={(v) => setChapter(subjectId, chapterId, { status: v })}
          options={(['todo', 'learning', 'done'] as const).map((v) => ({
            value: v,
            label: t(v === 'todo' ? 'statusTodo' : v === 'learning' ? 'statusLearning' : 'statusDone'),
            icon: <StatusIcon status={v} size={16} />,
          }))}
        />
        {status !== 'todo' && (
          <div>
            <p className="mb-2 text-sm text-ink-2">{t('confidence')}</p>
            <Segmented<Confidence>
              id="confidence"
              value={data?.state?.confidence ?? 'ok'}
              onChange={(v) => setChapter(subjectId, chapterId, { confidence: v })}
              options={[
                { value: 'weak', label: t('confWeak') },
                { value: 'ok', label: t('confOk') },
                { value: 'strong', label: t('confStrong') },
              ]}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {source === 'official' && !chapter.custom && (
            <div className="rounded-xl bg-raised px-3 py-2.5">
              <p className="text-xs text-ink-3">{t('officialPace')}</p>
              <p className="tnum mt-0.5 font-medium">
                {chapter.weeks} {t('weeksUnit')}
              </p>
            </div>
          )}
          <div className="rounded-xl bg-raised px-3 py-2.5">
            <p className="text-xs text-ink-3">{t('focusTime')}</p>
            <p className="tnum mt-0.5 font-medium">
              {data?.minutes ?? 0} {t('minutes')}
            </p>
          </div>
        </div>
        <Button block onClick={() => start(s, subjectId, chapterId).then(() => nav('/focus'))}>
          <Play size={16} fill="currentColor" />
          {t('focusThis')}
        </Button>
      </Item>

      <Item>
        <SectionTitle>{t('tasksTitle')}</SectionTitle>
        <div className="card px-2 py-2">
          <TaskList tasks={data?.tasks ?? []} subjectId={subjectId} chapterId={chapterId} />
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('mistakes')}</SectionTitle>
        <ChapterMistakes subjectId={subjectId} chapterId={chapterId} />
      </Item>

      <Item>
        <SectionTitle>{t('notes')}</SectionTitle>
        <textarea
          value={notes ?? ''}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== null && setChapter(subjectId, chapterId, { notes })}
          placeholder={t('notesPlaceholder')}
          rows={5}
          className="card w-full resize-y p-4 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </Item>

      {chapter.custom && (
        <Item>
          <Button
            variant="ghost"
            block
            className="text-danger hover:text-danger"
            onClick={async () => {
              await db.customChapters.delete(Number(chapterId.replace('custom-', '')))
              await db.chapters.delete(chapterKey(subjectId, chapterId))
              nav(`/subjects/${subjectId}`, { replace: true })
            }}
          >
            <Trash2 size={16} />
            {t('deleteChapter')}
          </Button>
        </Item>
      )}
    </Stagger>
  )
}
