import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Check, Copy, Heart, Wallet } from 'lucide-react'
import { Burst, EASE, Item, Stagger, spring } from '../components/motion'
import { Button, PageHeader, SectionTitle } from '../components/ui'
import { COFFEE_AMOUNTS, SUPPORT } from '../config/support'
import { cn } from '../lib/cn'
import { useSettings } from '../lib/db'
import { useT } from '../lib/i18n'

export default function Coffee() {
  const s = useSettings()
  const { t, lang } = useT()
  const [amount, setAmount] = useState(1)
  const [copied, setCopied] = useState<string | null>(null)
  const [thanks, setThanks] = useState(0)
  const wallets = SUPPORT.wallets.filter((w) => w.number.trim())

  const copy = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ''))
    } catch {
      /* clipboard can be blocked on http; the number stays visible to copy by hand */
    }
    setCopied(id)
    navigator.vibrate?.(30)
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000)
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title="اشري للمطور كافه" subtitle={lang === 'ar' ? undefined : t('coffeeFr')} />
      </Item>

      <Item className="card relative flex flex-col items-center overflow-hidden px-6 pt-8 pb-6 text-center">
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-warning/10 to-transparent" />
        <Cup fill={thanks ? 1 : 0.3 + amount * 0.15} />
        <p className="relative mt-5 text-lg font-semibold">{t('coffeeTitle')}</p>
        <p className="relative mt-2 max-w-xs text-sm text-ink-2">{t('coffeeSub')}</p>
      </Item>

      <Item>
        <SectionTitle>{t('coffeeAmount')}</SectionTitle>
        <div role="radiogroup" className="grid grid-cols-2 gap-3">
          {COFFEE_AMOUNTS.map((a, i) => (
            <m.button
              key={a.mru}
              role="radio"
              aria-checked={amount === i}
              whileTap={{ scale: 0.96 }}
              onClick={() => setAmount(i)}
              className="relative flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-surface"
            >
              {amount === i && <m.span layoutId="coffee-amount" transition={spring} className="absolute -inset-px rounded-2xl border-2 border-warning bg-warning/8" />}
              <span className="relative text-xl font-semibold">
                <span className="tnum">{a.mru}</span> <span className="text-sm font-normal text-ink-2">MRU</span>
              </span>
              <span className="relative text-xs text-ink-2">{a[lang]}</span>
            </m.button>
          ))}
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('coffeeSendTo')}</SectionTitle>
        {wallets.length === 0 ? (
          <p className="card px-4 py-6 text-center text-sm text-ink-3">{t('coffeeSoon')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {wallets.map((w, i) => (
              <m.div
                key={w.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: EASE }}
                className="card flex items-center gap-4 p-4"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-raised text-ink-2">
                  <Wallet size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-2">{w.name}</p>
                  <p className="tnum text-lg font-semibold tracking-wide" dir="ltr">
                    {w.number}
                  </p>
                  {SUPPORT.name && <p className="truncate text-xs text-ink-3">{SUPPORT.name}</p>}
                </div>
                <m.button
                  whileTap={{ scale: 0.9 }}
                  transition={spring}
                  onClick={() => copy(w.id, w.number)}
                  aria-label={`${t('copy')} ${w.name}`}
                  className={cn('flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors', copied === w.id ? 'bg-success/15 text-success' : 'border border-line-strong bg-raised text-ink')}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <m.span key={copied === w.id ? 'ok' : 'copy'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="inline-flex">
                      {copied === w.id ? <Check size={16} /> : <Copy size={16} />}
                    </m.span>
                  </AnimatePresence>
                  {copied === w.id ? t('copied') : t('copy')}
                </m.button>
              </m.div>
            ))}
          </div>
        )}
      </Item>

      <Item className="relative">
        <Button size="lg" block variant={thanks ? 'secondary' : 'primary'} onClick={() => setThanks(Date.now())} className={thanks ? '' : 'bg-warning text-bg'}>
          <Heart size={18} fill={thanks ? 'currentColor' : 'none'} />
          {thanks ? `${t('coffeeThanks')}${s.name ? (lang === 'ar' ? '، ' : ', ') + s.name : ''}` : t('coffeeSent')}
        </Button>
        <Burst fire={thanks} count={16} radius={120} />
      </Item>
    </Stagger>
  )
}

// Animated cup: the coffee level follows the chosen amount; steam drifts up.
function Cup({ fill }: { fill: number }) {
  const level = 46 - 34 * Math.min(1, fill) // y of the coffee surface inside the cup (12..46)
  return (
    <svg viewBox="0 0 120 110" className="relative h-36 w-auto overflow-visible" aria-hidden>
      <defs>
        <clipPath id="cup-inside">
          <path d="M22 10 h60 v34 a30 30 0 0 1 -30 30 a30 30 0 0 1 -30 -30 z" />
        </clipPath>
        <linearGradient id="coffee" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C7863F" />
          <stop offset="1" stopColor="#7A4A1E" />
        </linearGradient>
      </defs>
      {/* steam */}
      {[38, 52, 66].map((x, i) => (
        <m.path
          key={x}
          d={`M${x} 2 q-6 -8 0 -16 q6 -8 0 -16`}
          fill="none"
          className="stroke-ink-3"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 0.7, 0], y: [6, -10, -22] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        />
      ))}
      {/* coffee */}
      <g clipPath="url(#cup-inside)">
        <m.rect x="18" width="70" height="80" fill="url(#coffee)" initial={{ y: 80 }} animate={{ y: level }} transition={{ duration: 0.9, ease: EASE }} />
        <m.ellipse cx="52" rx="30" ry="3" fill="#E0A866" opacity="0.7" initial={{ cy: 80 }} animate={{ cy: level }} transition={{ duration: 0.9, ease: EASE }} />
      </g>
      {/* cup outline + handle + saucer */}
      <m.path
        d="M22 10 h60 v34 a30 30 0 0 1 -30 30 a30 30 0 0 1 -30 -30 z"
        fill="none" className="stroke-ink" strokeWidth="4" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE }}
      />
      <m.path
        d="M82 22 h6 a12 12 0 0 1 0 24 h-8"
        fill="none" className="stroke-ink" strokeWidth="4" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.5, ease: EASE }}
      />
      <m.path
        d="M10 88 h84" stroke="#F0A645" strokeWidth="4" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.5, ease: EASE }}
      />
    </svg>
  )
}
