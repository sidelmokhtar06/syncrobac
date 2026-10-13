import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Bug, CircleCheck, Lightbulb, MessageCircle, Send, BookOpen } from 'lucide-react'
import { EASE, Item, Stagger } from '../components/motion'
import { Button, PageHeader, Segmented, inputClass } from '../components/ui'
import { cn } from '../lib/cn'
import { useT, type TKey } from '../lib/i18n'
import { sendFeedback, track, type FeedbackKind } from '../lib/insights'

const KINDS: { value: FeedbackKind; label: TKey; placeholder: TKey; Icon: typeof Bug }[] = [
  { value: 'idea', label: 'fbIdea', placeholder: 'fbPlaceholderIdea', Icon: Lightbulb },
  { value: 'bug', label: 'fbBug', placeholder: 'fbPlaceholderBug', Icon: Bug },
  { value: 'content', label: 'fbContent', placeholder: 'fbPlaceholderContent', Icon: BookOpen },
  { value: 'other', label: 'fbOther', placeholder: 'fbPlaceholderOther', Icon: MessageCircle },
]

export default function Feedback() {
  const { t } = useT()
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [state, setState] = useState<'edit' | 'sending' | 'sent' | 'failed'>('edit')
  const current = KINDS.find((k) => k.value === kind)!

  const submit = async () => {
    setState('sending')
    try {
      await sendFeedback(kind, message, contact)
      track('feedback')
      setState('sent')
      setMessage('')
    } catch {
      setState('failed')
    }
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title={t('feedback')} subtitle={t('feedbackSub')} />
      </Item>

      <AnimatePresence mode="wait" initial={false}>
        {state === 'sent' ? (
          <m.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }} className="card flex flex-col items-center gap-3 p-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-success/12 text-success">
              <CircleCheck size={28} />
            </span>
            <p className="text-lg font-semibold">{t('fbSent')}</p>
            <p className="text-sm text-ink-2">{t('fbSentSub')}</p>
            <Button variant="secondary" onClick={() => setState('edit')}>
              {t('fbAnother')}
            </Button>
          </m.div>
        ) : (
          <m.form
            key="form"
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (message.trim().length >= 3) submit()
            }}
          >
            <p className="text-sm text-ink-2">{t('feedbackIntro')}</p>
            <Segmented<FeedbackKind>
              id="fb-kind"
              value={kind}
              onChange={setKind}
              options={KINDS.map((k) => ({ value: k.value, label: t(k.label), icon: <k.Icon size={14} /> }))}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-3">{t('fbMessage')}</span>
              <textarea
                required
                rows={6}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(current.placeholder)}
                className={cn(inputClass, 'h-auto min-h-36 resize-y py-3 leading-relaxed')}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-3">{t('fbContact')}</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} autoComplete="email" dir="auto" className={inputClass} />
            </label>
            {state === 'failed' && (
              <p role="alert" className="text-sm text-danger">
                {t('fbFailed')}
              </p>
            )}
            <Button type="submit" size="lg" block disabled={state === 'sending' || message.trim().length < 3}>
              <Send size={18} className="rtl:-scale-x-100" />
              {t('fbSend')}
            </Button>
          </m.form>
        )}
      </AnimatePresence>
    </Stagger>
  )
}
