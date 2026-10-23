import { Link } from 'react-router'
import { ExternalLink, Megaphone } from 'lucide-react'
import type { AnnouncementDef } from '../config/content'
import { dateLocale } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { cn } from '../lib/cn'

/** One admin message: title, text, date, and its link (an app page or a website). */
export function AnnouncementCard({ a, unread, className, action }: { a: AnnouncementDef; unread?: boolean; className?: string; action?: React.ReactNode }) {
  const { t, lang } = useT()
  const v = a[lang]!
  const external = a.link?.startsWith('https://')
  return (
    <article className={cn('card flex gap-3 p-4', unread && 'border-accent/40', className)}>
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <Megaphone size={18} />
        {unread && <span aria-hidden className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full border-2 border-surface bg-danger" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-3">
          {t('announcement')} · {new Date(a.startsAt).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })}
        </p>
        <h3 className="mt-0.5 font-semibold">{v.title}</h3>
        {v.body && <p className="mt-1 text-sm whitespace-pre-line text-ink-2">{v.body}</p>}
        {a.link &&
          (external ? (
            <a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent">
              {t('openLink')} <ExternalLink size={14} />
            </a>
          ) : (
            <Link to={a.link} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent">
              {t('openLink')}
            </Link>
          ))}
      </div>
      {action}
    </article>
  )
}
