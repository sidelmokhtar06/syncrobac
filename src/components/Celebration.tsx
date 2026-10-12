import { AnimatePresence, m } from 'motion/react'
import { Check, Minus, RotateCcw, Target } from 'lucide-react'
import { setChapter, statusOf, useAllChapters, useChapterStates } from '../lib/curriculum'
import { cn } from '../lib/cn'
import { db, subjectsFor, useSettings, type Confidence } from '../lib/db'
import { useT, type TKey } from '../lib/i18n'
import type { FinishedSession } from '../lib/timer'
import { Mascot } from './Mascot'
import { Burst, EASE } from './motion'
import { Button } from './ui'

const CHOICES: { value: Confidence; key: TKey; Icon: typeof Check; tone: string }[] = [
  { value: 'strong', key: 'checkUnderstood', Icon: Check, tone: 'border-success/50 text-success' },
  { value: 'ok', key: 'checkSoSo', Icon: Minus, tone: 'border-line-strong text-ink-2' },
  { value: 'weak', key: 'checkReview', Icon: RotateCcw, tone: 'border-warning/50 text-warning' },
]

/**
 * End of a focus session: a short celebration, the goal the student set, and a one-tap
 * check-in. The answer is stored on the session and becomes the chapter's confidence,
 * which the daily missions use to bring weak chapters back.
 */
export function Celebration({ session, onClose }: { session: FinishedSession | null; onClose: () => void }) {
  const s = useSettings()
  const { t, lang } = useT()
  const all = useAllChapters(s)
  const states = useChapterStates()

  const subject = session?.subjectId ? subjectsFor(s).find((x) => x.id === session.subjectId) : undefined
  const chapter = session?.subjectId && session.chapterId ? all.get(session.subjectId)?.find((c) => c.id === session.chapterId) : undefined
  const topic = chapter ? chapter.title[lang] : subject?.[lang]

  const answer = async (value: Confidence) => {
    if (!session) return
    await db.sessions.update(session.sessionId, { result: value })
    if (session.subjectId && session.chapterId) {
      const st = statusOf(states, session.subjectId, session.chapterId)
      await setChapter(session.subjectId, session.chapterId, { confidence: value, status: st === 'todo' ? 'learning' : st })
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {session && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={t('sessionDone')}
          className="fixed inset-0 z-50 grid place-items-center bg-bg/90 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <m.div
            className="relative flex w-full max-w-sm flex-col items-center gap-4 text-center"
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="relative mb-1">
              <Mascot size={130} cheer />
              <Burst fire={1} count={14} radius={100} />
            </div>
            <h2 className="text-2xl">{t('sessionDone')}</h2>

            {session.goal && (
              <p className="flex items-start gap-2 rounded-xl bg-raised px-4 py-3 text-start text-sm text-ink-2">
                <Target size={16} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  <span className="text-ink-3">{t('sessionGoal')} · </span>
                  {session.goal}
                </span>
              </p>
            )}

            {topic ? (
              <div className="w-full">
                <p className="mb-3 text-ink-2">
                  {t('checkQuestion')} <span className="font-medium text-ink">{topic}</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CHOICES.map(({ value, key, Icon, tone }, i) => (
                    <m.button
                      key={value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.3, ease: EASE }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => answer(value)}
                      className={cn('flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-surface px-2 text-sm font-medium', tone)}
                    >
                      <Icon size={20} />
                      {t(key)}
                    </m.button>
                  ))}
                </div>
                <Button variant="ghost" block className="mt-2" onClick={onClose}>
                  {t('skip')}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-ink-2">{t('sessionDoneSub')}</p>
                <Button size="lg" block className="mt-2" onClick={onClose}>
                  {t('continueBtn')}
                </Button>
              </>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
