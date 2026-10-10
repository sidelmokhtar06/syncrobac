import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { SERIES, type SerieId } from '../config/bac'
import { Wordmark } from '../components/Logo'
import { Mascot } from '../components/Mascot'
import { LanguagesIcon } from '../components/icons/languages'
import { Burst, EASE, spring } from '../components/motion'
import { Anim, Button, IconButton } from '../components/ui'
import { cn } from '../lib/cn'
import { updateSettings } from '../lib/db'
import { useT } from '../lib/i18n'

const GOALS = [2, 4, 6, 8]
const STEPS = 3

export default function Onboarding() {
  const { t, lang } = useT()
  const rtl = lang === 'ar'
  const [[step, dir], setStep] = useState<[number, number]>([0, 1])
  const [serie, setSerie] = useState<SerieId | null>(null)
  const [goal, setGoal] = useState(4)
  const [done, setDone] = useState(false)

  const go = (d: number) => setStep([step + d, d])
  const finish = () => {
    setDone(true)
    setTimeout(() => updateSettings({ serie, dailyGoal: goal }), 1400)
  }

  // Slide direction follows reading direction: "forward" goes left in FR, right in AR.
  const sx = (d: number) => d * (rtl ? -1 : 1) * 48
  const Fwd = rtl ? ArrowLeft : ArrowRight
  const Bck = rtl ? ArrowRight : ArrowLeft

  if (done) return <Ready />

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex h-12 items-center justify-between">
        {step > 0 ? (
          <IconButton label={t('back')} onClick={() => go(-1)}>
            <Bck size={20} />
          </IconButton>
        ) : (
          <Wordmark />
        )}
        <Button variant="secondary" onClick={() => updateSettings({ lang: rtl ? 'fr' : 'ar' })}>
          <Anim icon={LanguagesIcon} size={16} play={lang} />
          {rtl ? 'Français' : 'العربية'}
        </Button>
      </div>

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <m.div
            key={step}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: sx(d) }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: sx(-d) }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-1 flex-col"
          >
            {step === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
                <Mascot size={176} />
                <div>
                  <h1 className="text-[28px]">{t('hello')}</h1>
                  <p className="mx-auto mt-3 max-w-xs text-ink-2">{t('helloSub')}</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-1 flex-col gap-6 pt-8">
                <div>
                  <h1 className="text-2xl">{t('chooseSerie')}</h1>
                  <p className="mt-2 text-ink-2">{t('chooseSerieSub')}</p>
                </div>
                <div role="radiogroup" className="flex flex-col gap-3">
                  {SERIES.map((x, i) => {
                    const on = serie === x.id
                    return (
                      <m.button
                        key={x.id}
                        role="radio"
                        aria-checked={on}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * i, duration: 0.4, ease: EASE }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSerie(x.id)}
                        className={cn(
                          'flex min-h-18 items-center gap-4 rounded-2xl border px-4 text-start transition-colors',
                          on ? 'border-accent bg-accent/8' : 'border-line bg-surface',
                        )}
                      >
                        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl font-semibold transition-colors', on ? 'bg-accent text-accent-ink' : 'bg-raised text-ink-2')}>
                          {x.id}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{x[lang]}</span>
                          <span className="block truncate text-sm text-ink-2">
                            {x.subjects[0][lang]} · {x.subjects[0].coeff}
                          </span>
                        </span>
                        <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors', on ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong')}>
                          <AnimatePresence>
                            {on && (
                              <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring}>
                                <Check size={14} strokeWidth={3} />
                              </m.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </m.button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-1 flex-col gap-6 pt-8">
                <div>
                  <h1 className="text-2xl">{t('goalTitle')}</h1>
                  <p className="mt-2 text-ink-2">{t('goalSub')}</p>
                </div>
                <div role="radiogroup" className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <m.button
                      key={g}
                      role="radio"
                      aria-checked={goal === g}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setGoal(g)}
                      className="relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface"
                    >
                      {goal === g && <m.span layoutId="goal-ring" transition={spring} className="absolute -inset-px rounded-2xl border-2 border-accent bg-accent/8" />}
                      <span className="tnum relative text-3xl font-semibold">{g}</span>
                      <span className="relative text-sm text-ink-2">
                        ≈ <span className="tnum">{+((g * 25) / 60).toFixed(1)}</span> {t('hoursPerDay')}
                      </span>
                    </m.button>
                  ))}
                </div>
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <m.span
              key={i}
              animate={{ width: i === step ? 24 : 8, backgroundColor: i <= step ? '#22C1D6' : '#2f3745' }}
              transition={spring}
              className="h-2 rounded-full"
            />
          ))}
        </div>
        <Button size="lg" block disabled={step === 1 && !serie} onClick={() => (step < STEPS - 1 ? go(1) : finish())}>
          {step < STEPS - 1 ? t('next') : t('letsGo')}
          <Fwd size={20} />
        </Button>
      </div>
    </div>
  )
}

function Ready() {
  const { t } = useT()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div className="relative grid size-24 place-items-center">
        <m.span className="absolute inset-0 rounded-full bg-accent/12" initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.6, ease: EASE }} />
        <svg viewBox="0 0 52 52" className="relative size-16">
          <m.circle cx="26" cy="26" r="24" fill="none" stroke="#22C1D6" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
          <m.path d="M16 27 l7 7 l13 -15" fill="none" stroke="#22C1D6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.35 }} />
        </svg>
        <Burst fire={1} count={12} radius={72} />
      </div>
      <m.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="text-2xl">
        {t('ready')}
      </m.h1>
    </div>
  )
}
