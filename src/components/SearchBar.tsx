import { Search, X } from 'lucide-react'
import { cn } from '../lib/cn'

export function SearchBar({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div className={cn('relative flex w-full items-center', className)}>
      <Search
        size={17}
        className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-3 transition-colors"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-11 w-full rounded-xl border border-line-strong bg-raised ps-10 pe-10 text-sm text-ink placeholder:text-ink-3 outline-none transition-all focus:border-accent focus:bg-surface"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute end-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-line hover:text-ink active:scale-95"
          aria-label="Effacer"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
