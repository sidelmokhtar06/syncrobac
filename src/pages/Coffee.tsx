import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Copy, Heart, MessageSquareText, Share2 } from 'lucide-react'
import { Burst, EASE, Item, Stagger, spring } from '../components/motion'
import { Button, PageHeader, SectionTitle } from '../components/ui'
import { COFFEE_AMOUNTS, SUPPORT } from '../config/support'
import { cn } from '../lib/cn'
import { useSettings } from '../lib/db'
import { useT } from '../lib/i18n'
import { insightsAvailable, track } from '../lib/insights'

// Wallets sharing a number are shown once ("Bankily · Masrvi · Sedad"), with one copy button.
const accounts = () => {
  const byNumber = new Map<string, string[]>()
  for (const w of SUPPORT.wallets.filter((x) => x.number.trim())) byNumber.set(w.number, [...(byNumber.get(w.number) ?? []), w.name])
  return [...byNumber].map(([number, names]) => ({ number, names }))
}

export default function Coffee() {
  const s = useSettings()
  const { t, lang } = useT()
  const [amount, setAmount] = useState(1)
  const [copied, setCopied] = useState<string | null>(null)
  const [thanks, setThanks] = useState(0)
  const [shared, setShared] = useState(false)
  const list = accounts()
  const mru = COFFEE_AMOUNTS[amount].mru
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight

  const copy = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ''))
    } catch {
      /* clipboard can be blocked on http; the number stays visible to copy by hand */
    }
    setCopied(number)
    navigator.vibrate?.(30)
    setTimeout(() => setCopied((c) => (c === number ? null : c)), 2000)
  }

  const share = async () => {
    const url = location.origin
    const text = t('coffeeShareText')
    track('share_app')
    try {
      if (navigator.share) return await navigator.share({ title: 'SyncroBac', text, url })
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      /* share sheet closed */
    }
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title="اشري للمطور كافه" subtitle={lang === 'ar' ? undefined : t('coffeeFr')} />
      </Item>

      <Item className="card relative flex items-center gap-4 overflow-hidden p-5">
        <div aria-hidden className="absolute inset-y-0 start-0 w-40 bg-gradient-to-r from-warning/10 to-transparent rtl:bg-gradient-to-l" />
        <Cup fill={thanks ? 1 : 0.3 + amount * 0.15} />
        <div className="relative min-w-0">
          <p className="font-semibold">{t('coffeeTitle')}</p>
          <p className="mt-1 text-sm text-ink-2">{t('coffeeSub')}</p>
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('coffeeAmount')}</SectionTitle>
        <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
          {COFFEE_AMOUNTS.map((a, i) => (
            <m.button
              key={a.mru}
              role="radio"
              aria-checked={amount === i}
              whileTap={{ scale: 0.96 }}
              onClick={() => setAmount(i)}
              className="relative flex min-h-16 flex-col items-center justify-center rounded-2xl border border-line bg-surface"
            >
              {amount === i && <m.span layoutId="coffee-amount" transition={spring} className="absolute -inset-px rounded-2xl border-2 border-warning bg-warning/8" />}
              <span className="relative text-lg font-semibold">
                <span className="tnum">{a.mru}</span> <span className="text-sm font-normal text-ink-2">MRU</span>
              </span>
              <span className="relative text-xs text-ink-2">{a[lang]}</span>
            </m.button>
          ))}
        </div>
      </Item>

      <Item>
        <SectionTitle>{t('coffeeSendTo')}</SectionTitle>
        {list.length === 0 ? (
          <p className="card px-4 py-6 text-center text-sm text-ink-3">{t('coffeeSoon')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map(({ number, names }) => (
              <div key={number} className="card flex flex-col gap-4 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-2">
                      {t('coffeeSendAmount')}{' '}
                      <AnimatePresence mode="wait" initial={false}>
                        <m.span key={mru} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EASE }} className="tnum inline-block font-semibold text-warning">
                          {mru} MRU
                        </m.span>
                      </AnimatePresence>{' '}
                      {t('coffeeTo')}
                    </p>
                    <p className="tnum mt-0.5 text-2xl font-semibold tracking-wide" dir="ltr">
                      {number}
                    </p>
                    {SUPPORT.name && <p className="truncate text-xs text-ink-3">{SUPPORT.name}</p>}
                  </div>
                  <m.button
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={() => copy(number)}
                    aria-label={`${t('copy')} ${number}`}
                    className={cn('flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors', copied === number ? 'bg-success/15 text-success' : 'border border-line-strong bg-raised text-ink')}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <m.span key={copied === number ? 'ok' : 'copy'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="inline-flex">
                        {copied === number ? <Check size={16} /> : <Copy size={16} />}
                      </m.span>
                    </AnimatePresence>
                    {copied === number ? t('copied') : t('copy')}
                  </m.button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                  {t('coffeeWorksWith')}
                  {names.map((n) => (
                    <span key={n} className="rounded-full bg-raised px-2.5 py-1 font-medium text-ink-2">
                      {n}
                    </span>
                  ))}
                </div>
                <ol className="flex flex-col gap-2 border-t border-line pt-4 text-sm text-ink-2">
                  {(['coffeeStep1', 'coffeeStep2', 'coffeeStep3'] as const).map((k, i) => (
                    <li key={k} className="flex items-center gap-3">
                      <span className="tnum grid size-6 shrink-0 place-items-center rounded-full bg-warning/12 text-xs font-semibold text-warning">{i + 1}</span>
                      {t(k)}
                      {k === 'coffeeStep3' && <span className="tnum font-medium text-ink">· {mru} MRU</span>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </Item>

      <Item className="relative">
        <Button
          size="lg"
          block
          variant={thanks ? 'secondary' : 'primary'}
          onClick={() => {
            if (!thanks) track('coffee_sent') // anonymous count only (no amount, no name)
            setThanks(Date.now())
          }}
          className={thanks ? '' : 'bg-warning text-bg'}
        >
          <Heart size={18} fill={thanks ? 'currentColor' : 'none'} />
          {thanks ? `${t('coffeeThanks')}${s.name ? (lang === 'ar' ? '، ' : ', ') + s.name : ''}` : t('coffeeSent')}
        </Button>
        <Burst fire={thanks} count={16} radius={120} />
      </Item>

      <Item>
        <SectionTitle>{t('coffeeFreeTitle')}</SectionTitle>
        <div className="card divide-y divide-line">
          <button onClick={share} className="flex min-h-15 w-full items-center gap-3 px-4 py-2 text-start">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
              {shared ? <Check size={18} /> : <Share2 size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{shared ? t('linkCopied') : t('coffeeShare')}</span>
              <span className="block text-xs text-ink-3">{t('coffeeShareSub')}</span>
            </span>
            <Chevron size={18} className="text-ink-3" />
          </button>
          {insightsAvailable && (
            <Link to="/feedback" className="flex min-h-15 items-center gap-3 px-4 py-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
                <MessageSquareText size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t('feedback')}</span>
                <span className="block text-xs text-ink-3">{t('feedbackSub')}</span>
              </span>
              <Chevron size={18} className="text-ink-3" />
            </Link>
          )}
        </div>
      </Item>
    </Stagger>
  )
}

// Animated cup: the coffee level follows the chosen amount; steam drifts up.
function Cup({ fill }: { fill: number }) {
  const level = 46 - 34 * Math.min(1, fill) // y of the coffee surface inside the cup (12..46)
  return (
    <svg viewBox="0 0 120 110" className="relative h-24 w-auto overflow-visible" aria-hidden>
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
