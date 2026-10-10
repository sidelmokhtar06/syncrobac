export function LogoMark({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden>
      <defs>
        <linearGradient id="sb-g" x1="0" x2="1">
          <stop offset="0" stopColor="#22C1D6" />
          <stop offset="1" stopColor="#3CCB8C" />
        </linearGradient>
      </defs>
      <path
        d="M60 30 C45 8 15 8 15 30 C15 52 45 52 60 30 C75 8 105 8 105 30 C105 52 75 52 60 30 Z"
        fill="none"
        stroke="url(#sb-g)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M82 30 h6 l3 -8 l4 16 l3 -8 h6" fill="none" stroke="#22C1D6" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="30" r="5" fill="#F0A645" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="text-lg font-bold tracking-[0.08em]" dir="ltr" lang="fr">
      SYNCRO<span className="text-teal">BAC</span>
    </span>
  )
}
