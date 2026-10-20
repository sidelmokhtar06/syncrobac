import { m } from 'motion/react'
import { ExternalLink, Globe, Pencil, Share2, Smartphone, Trash2, Users, Video } from 'lucide-react'
import { Chip } from './ui'
import { db, type SavedLink } from '../lib/db'
import { useT, type TKey } from '../lib/i18n'

export interface ResourceItem {
  id?: number
  url: string
  title: string
  category: SavedLink['category']
  desc?: string
  mine?: boolean
  subjectId?: string | null
}

export const domain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const CAT_ICONS: Record<SavedLink['category'], typeof Globe> = {
  site: Globe,
  group: Users,
  video: Video,
  app: Smartphone,
}

export const CAT_LABELS: Record<SavedLink['category'], TKey> = {
  site: 'catSite',
  group: 'catGroup',
  video: 'catVideo',
  app: 'catApp',
}

export function ResourceCard({ item, onEdit }: { item: ResourceItem; onEdit?: (item: ResourceItem) => void }) {
  const { t } = useT()
  const Icon = CAT_ICONS[item.category] || Globe
  const labelKey = CAT_LABELS[item.category] || 'catSite'

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="card group flex items-center justify-between gap-3 p-3 transition-colors hover:border-line-strong hover:bg-surface/90"
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-accent transition-transform group-hover:scale-105">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-ink group-hover:text-accent">
              {item.title}
            </h3>
            <ExternalLink size={12} className="shrink-0 text-ink-3 opacity-60 group-hover:opacity-100" />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
            <span className="shrink-0">{domain(item.url)}</span>
            {item.desc && (
              <span className="hidden truncate text-ink-2/80 sm:inline max-w-xs">
                · {item.desc}
              </span>
            )}
          </div>
        </div>
      </a>

      <div className="flex shrink-0 items-center gap-1.5">
        <Chip tone="neutral" className="hidden h-6 px-2 text-[11px] font-medium sm:inline-flex">
          {t(labelKey)}
        </Chip>
        {item.mine && (
          <Chip tone="accent" className="h-6 px-2 text-[11px] font-medium">
            {t('mine')}
          </Chip>
        )}
        {'share' in navigator && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              navigator.share({ title: item.title, url: item.url }).catch(() => {})
            }}
            className="grid size-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink active:scale-95"
            aria-label={t('shareLink')}
            title={t('shareLink')}
          >
            <Share2 size={15} />
          </button>
        )}
        {item.mine && item.id && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onEdit?.(item)
              }}
              className="grid size-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink active:scale-95"
              aria-label={t('edit')}
              title={t('edit')}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                db.links.delete(item.id!)
              }}
              className="grid size-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger active:scale-95"
              aria-label={t('delete')}
              title={t('delete')}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </m.div>
  )
}
