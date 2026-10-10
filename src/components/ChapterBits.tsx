import { CircleCheck, CircleDashed, CircleDot, Info } from 'lucide-react'
import type { Source } from '../config/programme'
import { cn } from '../lib/cn'
import type { ChapterStatus } from '../lib/db'
import { useT, type TKey } from '../lib/i18n'

const STATUS: Record<ChapterStatus, { key: TKey; Icon: typeof Info; cls: string }> = {
  todo: { key: 'statusTodo', Icon: CircleDashed, cls: 'text-ink-3' },
  learning: { key: 'statusLearning', Icon: CircleDot, cls: 'text-warning' },
  done: { key: 'statusDone', Icon: CircleCheck, cls: 'text-success' },
}

export const STATUS_ORDER: ChapterStatus[] = ['todo', 'learning', 'done']
export const statusLabel = (st: ChapterStatus): TKey => STATUS[st].key

export function StatusIcon({ status, size = 20 }: { status: ChapterStatus; size?: number }) {
  const { Icon, cls } = STATUS[status]
  return <Icon size={size} className={cn('shrink-0', cls)} aria-hidden />
}

export function SourceNote({ source }: { source: Source }) {
  const { t } = useT()
  const key: TKey = source === 'official' ? 'sourceOfficial' : source === 'draft' ? 'sourceDraft' : 'sourceGeneric'
  return (
    <p className={cn('flex items-center gap-2 text-xs', source === 'official' ? 'text-ink-3' : 'text-warning')}>
      <Info size={14} className="shrink-0" />
      {t(key)}
    </p>
  )
}
