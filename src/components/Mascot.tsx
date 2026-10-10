import { m } from 'motion/react'

// "Synci": the infinity logo as a character — each loop is an eye.
export function Mascot({ size = 180, cheer = false }: { size?: number; cheer?: boolean }) {
  const loop = 'M60 35 C45 13 15 13 15 35 C15 57 45 57 60 35 C75 13 105 13 105 35 C105 57 75 57 60 35 Z'
  return (
    <m.svg
      viewBox="0 0 120 80"
      width={size}
      height={(size * 80) / 120}
      className="overflow-visible drop-shadow-[0_0_18px_rgba(34,193,214,0.45)]"
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="mascot-g" x1="0" x2="1">
          <stop offset="0" stopColor="#22C1D6" />
          <stop offset="1" stopColor="#3CCB8C" />
        </linearGradient>
      </defs>
      <m.path
        d={loop} fill="none" stroke="url(#mascot-g)" strokeWidth="8" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }}
      />
      {[33, 87].map((cx) =>
        cheer ? (
          <path key={cx} d={`M${cx - 7} 38 Q${cx} 28 ${cx + 7} 38`} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          <m.g
            key={cx}
            style={{ originX: `${cx}px`, originY: '35px' }}
            animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
            transition={{ duration: 4, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
          >
            <circle cx={cx} cy="35" r="8" fill="#fff" />
            <m.circle
              cy="35" r="4" fill="#0A0D12"
              animate={{ cx: [cx - 2, cx + 2, cx + 2, cx - 2] }}
              transition={{ duration: 5, times: [0, 0.2, 0.6, 0.8], repeat: Infinity, ease: 'easeInOut' }}
            />
          </m.g>
        ),
      )}
      <circle cx="22" cy="44" r="3" fill="#F0A645" opacity="0.55" />
      <circle cx="98" cy="44" r="3" fill="#F0A645" opacity="0.55" />
      <m.path
        d="M53 58 Q60 65 67 58" fill="none" stroke="#3CCB8C" strokeWidth="3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.4 }}
      />
      <m.circle
        cx="60" cy="35" r="4.5" fill="#F0A645"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </m.svg>
  )
}
