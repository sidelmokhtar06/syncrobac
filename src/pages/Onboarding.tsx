import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ArrowLeft, ArrowRight, Bell, BellRing, Check, ChevronDown, Download, Share } from 'lucide-react'
import { comingSeries, getSerie, openSeries, type SerieId } from '../config/bac'
import { LogoMark, Wordmark } from '../components/Logo'
import { LogoHero } from '../components/LogoHero'
import { AccountLogin } from '../components/AccountLogin'
import { accountsAvailable } from '../lib/auth'
import { LanguagesIcon } from '../components/icons/languages'
import { Burst, EASE, spring } from '../components/motion'
import { Anim, Button, IconButton, inputClass } from '../components/ui'
import { cn } from '../lib/cn'
import { chapterKey, expectedShare, programmeFor, seenByPacing, type Chapter } from '../lib/curriculum'
import { db, updateSettings, useSettings } from '../lib/db'
import { useT } from '../lib/i18n'
import { enableNotifications, notifyPermission, notifySupported, useInstall } from '../lib/pwa'

const STEPS = ['welcome', 'name', 'serie', 'catchup', 'goal', 'ready'] as const
const GOALS = [2, 4, 6, 8]

export default function Onboarding() {
  const s = useSettings()
  const { t, lang } = useT()
  const rtl = lang === 'ar'
  const [[step, dir], setStep] = useState<[number, number]>([0, 1])
  const [name, setName] = useState('')
  const [serie, setSerie] = useState<SerieId | null>(null)
  const [goal, setGoal] = useState(4)
  const [seen, setSeen] = useState<Map<string, Set<string>>>(new Map())
  const [finishing, setFinishing] = useState(false)
  // Returning student: sign in → their synced settings (série…) arrive and the app opens directly.
  const [loginOpen, setLoginOpen] = useState(false)

  // Subjects with a real chapter list (official/draft), heaviest first — the ones worth catching up on.
  const catchup = useMemo(() => {
    if (!serie) return []
    const fake = { ...s, serie }
    return getSerie(serie)
      .subjects.map((sub) => ({ sub, ...programmeFor(fake, sub.id) }))
      .filter((x) => x.source !== 'generic' && x.chapters.length)
      .sort((a, b) => b.sub.coeff - a.sub.coeff)
  }, [serie, s])

  const prefill = () => {
    const share = expectedShare(s)
    setSeen(new Map(catchup.map((x) => [x.sub.id, seenByPacing(x.chapters, share)])))
  }
  // Re-prefill whenever the série (and so the chapter lists) changes.
  useEffect(prefill, [catchup])

  const go = (d: number) => setStep([step + d, d])
  const finish = async () => {
    setFinishing(true)
    const now = Date.now()
    await db.chapters.bulkPut(
      [...seen].flatMap(([subjectId, ids]) => [...ids].map((id) => ({ key: chapterKey(subjectId, id), subjectId, status: 'learning' as const, updatedAt: now }))),
    )
    // Let the sync sequence play, then enter the app.
    setTimeout(() => updateSettings({ serie, dailyGoal: goal, name: name.trim() }), 2900)
  }

  const sx = (d: number) => d * (rtl ? -1 : 1) * 48
  const Fwd = rtl ? ArrowLeft : ArrowRight
  const Bck = rtl ? ArrowRight : ArrowLeft
  const current = STEPS[step]
  const canNext = current !== 'serie' || !!serie

  if (finishing) return <Syncing serieLabel={serie ? `${t('serie')} ${serie}` : ''} />
  if (loginOpen)
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-8">
          <IconButton label={t('back')} onClick={() => setLoginOpen(false)}>
            <Bck size={20} />
          </IconButton>
          <div>
            <h1 className="text-2xl">{t('haveAccount')}</h1>
            <p className="mt-2 text-ink-2">{t('saveProgressSub')}</p>
          </div>
          <AccountLogin onDone={() => setLoginOpen(false)} />
        </div>
      </div>
    )

  return (
    // The document never scrolls (see index.css), so onboarding scrolls inside its own container.
    <div className="h-full overflow-y-auto overscroll-contain">
    <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex h-12 items-center justify-between">
        {step > 0 ? (
          <IconButton label={t('back')} onClick={() => go(-1)}>
            <Bck size={20} />
          </IconButton>
        ) : (
          <span />
        )}
        {/* progress: thin segmented bar */}
        {step > 0 && (
          <div className="mx-4 flex flex-1 gap-1.5" aria-hidden>
            {STEPS.slice(1).map((_, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <m.span className="block h-full bg-accent" initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.4, ease: EASE }} />
              </span>
            ))}
          </div>
        )}
        <Button variant="secondary" onClick={() => updateSettings({ lang: rtl ? 'fr' : 'ar' })}>
          <Anim icon={LanguagesIcon} size={16} play={lang} />
          {rtl ? 'FR' : 'ع'}
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
            {current === 'welcome' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-12 text-center">
                <LogoHero />
                <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.6, ease: EASE }}>
                  <h1 className="text-2xl">{t('tagline')}</h1>
                  <p className="mx-auto mt-3 max-w-xs text-ink-2">{t('welcomeSub')}</p>
                  {accountsAvailable && (
                    <Button variant="ghost" className="mt-4 text-accent" onClick={() => setLoginOpen(true)}>
                      {t('haveAccount')}
                    </Button>
                  )}
                </m.div>
              </div>
            )}

            {current === 'name' && (
              <Step title={t('nameTitle')} sub={t('nameSub')}>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 24))}
                  onKeyDown={(e) => e.key === 'Enter' && go(1)}
                  placeholder={t('namePlaceholder')}
                  aria-label={t('name')}
                  className={cn(inputClass, 'h-14 text-lg')}
                />
                <AnimatePresence>
                  {name.trim() && (
                    <m.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-ink-2">
                      {t('greetMorning')}
                      {rtl ? '، ' : ', '}
                      <span className="font-medium text-ink">{name.trim()}</span>
                    </m.p>
                  )}
                </AnimatePresence>
              </Step>
            )}

            {current === 'serie' && (
              <Step title={t('chooseSerie')} sub={t('chooseSerieSub')}>
                <div role="radiogroup" className="flex flex-col gap-3">
                  {openSeries().map((x, i) => {
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
                        className={cn('flex min-h-18 items-center gap-4 rounded-2xl border px-4 text-start transition-colors', on ? 'border-accent bg-accent/8' : 'border-line bg-surface')}
                      >
                        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl font-semibold transition-colors', on ? 'bg-accent text-accent-ink' : 'bg-raised text-ink-2')}>{x.id}</span>
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
                  {comingSeries().map((x) => (
                    <div key={x.id} aria-disabled className="flex min-h-14 items-center gap-4 rounded-2xl border border-dashed border-line px-4 text-ink-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-raised font-semibold">{x.id}</span>
                      <span className="min-w-0 flex-1 truncate">{x[lang]}</span>
                      <span className="rounded-full bg-raised px-2.5 py-1 text-xs">{t('comingSoon')}</span>
                    </div>
                  ))}
                </div>
              </Step>
            )}

            {current === 'catchup' && (
              <Step title={t('catchupTitle')} sub={t('catchupSub')}>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={prefill}>
                    {t('followOfficial')}
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => setSeen(new Map())}>
                    {t('nothingYet')}
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  {catchup.map(({ sub, chapters }, i) => (
                    <CatchupSubject
                      key={sub.id}
                      title={`${sub[lang]}`}
                      coeff={sub.coeff}
                      chapters={chapters}
                      defaultOpen={i === 0}
                      selected={seen.get(sub.id) ?? new Set()}
                      onToggle={(id) =>
                        setSeen((prev) => {
                          const next = new Map(prev)
                          const set = new Set(next.get(sub.id) ?? [])
                          if (set.has(id)) set.delete(id)
                          else set.add(id)
                          next.set(sub.id, set)
                          return next
                        })
                      }
                    />
                  ))}
                </div>
              </Step>
            )}

            {current === 'goal' && (
              <Step title={t('goalTitle')} sub={t('goalSub')}>
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
              </Step>
            )}

            {current === 'ready' && <Permissions />}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Sticky so long steps (catch-up) never hide the button. */}
      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-bg from-70% to-transparent pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Button size="lg" block disabled={!canNext} onClick={() => (step < STEPS.length - 1 ? go(1) : finish())}>
          {current === 'name' && !name.trim() ? t('skip') : step < STEPS.length - 1 ? t('next') : t('letsGo')}
          <Fwd size={20} />
        </Button>
      </div>
    </div>
    </div>
  )
}

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl">{title}</h1>
        <p className="mt-2 text-ink-2">{sub}</p>
      </div>
      {children}
    </div>
  )
}

function CatchupSubject({ title, coeff, chapters, selected, onToggle, defaultOpen }: { title: string; coeff: number; chapters: Chapter[]; selected: Set<string>; onToggle: (id: string) => void; defaultOpen: boolean }) {
  const { t, lang } = useT()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-15 w-full items-center gap-3 px-4 text-start">
        <span className="tnum grid size-9 shrink-0 place-items-center rounded-lg bg-accent/12 text-sm font-semibold text-accent">{coeff}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="tnum text-xs text-ink-3">
            {selected.size}/{chapters.length} {t('seen')}
          </span>
        </span>
        <m.span animate={{ rotate: open ? 180 : 0 }} transition={spring} className="text-ink-3">
          <ChevronDown size={20} />
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="border-t border-line px-2 py-1">
            {chapters.map((c) => {
              const on = selected.has(c.id)
              return (
                <li key={c.id}>
                  <button onClick={() => onToggle(c.id)} aria-pressed={on} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-start">
                    <span className={cn('grid size-[22px] shrink-0 place-items-center rounded-md border-2 text-accent-ink transition-colors duration-200', on ? 'border-accent bg-accent' : 'border-ink-3/70')}>
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={cn('text-[15px]', on ? 'text-ink' : 'text-ink-2')}>{c.title[lang]}</span>
                  </button>
                </li>
              )
            })}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function Permissions() {
  const { t } = useT()
  const install = useInstall()
  const [perm, setPerm] = useState(notifyPermission())
  return (
    <Step title={t('permTitle')} sub={t('permSub')}>
      <div className="flex flex-col gap-3">
        {notifySupported() && (
          <div className="card flex items-center gap-4 p-4">
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', perm === 'granted' ? 'bg-success/12 text-success' : 'bg-accent/12 text-accent')}>
              <m.span animate={perm === 'granted' ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.6 }}>
                {perm === 'granted' ? <BellRing size={22} /> : <Bell size={22} />}
              </m.span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('notifications')}</p>
              <p className="text-sm text-ink-2">{perm === 'granted' ? t('notifOn') : perm === 'denied' ? t('notifDenied') : t('notifDesc')}</p>
            </div>
            {perm === 'default' && (
              <Button
                onClick={async () => {
                  await enableNotifications()
                  setPerm(notifyPermission())
                }}
              >
                {t('activate')}
              </Button>
            )}
          </div>
        )}
        <div className="card flex items-center gap-4 p-4">
          <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', install.installed ? 'bg-success/12 text-success' : 'bg-accent/12 text-accent')}>
            {install.installed ? <Check size={22} /> : <Download size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{install.installed ? t('installedOk') : t('installApp')}</p>
            <p className="text-sm text-ink-2">{install.iosManual ? t('iosInstall') : t('installSub')}</p>
          </div>
          {install.canPrompt && <Button onClick={install.prompt}>{t('install')}</Button>}
          {install.iosManual && <Share size={20} className="shrink-0 text-ink-3" />}
        </div>
      </div>
    </Step>
  )
}

// Final beat: the app "synchronises" — each line ticks in, then we enter.
function Syncing({ serieLabel }: { serieLabel: string }) {
  const { t } = useT()
  const lines = [`${t('syncProgramme')} · ${serieLabel}`, t('syncPlan'), t('syncMissions')]
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 px-8">
      <div className="relative">
        <m.div aria-hidden animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="absolute -inset-8 rounded-full bg-accent/15 blur-2xl" />
        <LogoMark animated className="h-16 w-auto" />
        <Burst fire={1} count={14} radius={90} />
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Wordmark className="mb-2 self-center text-xl" />
        {lines.map((line, i) => (
          <m.div key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.6, duration: 0.4, ease: EASE }} className="flex items-center gap-3">
            <span className="relative grid size-6 shrink-0 place-items-center">
              <m.span className="absolute inset-0 rounded-full bg-success/15" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.75 + i * 0.6, ...spring }} />
              <svg viewBox="0 0 24 24" className="relative size-4">
                <m.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" className="stroke-success" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.85 + i * 0.6, duration: 0.3 }} />
              </svg>
            </span>
            <span className="text-sm text-ink">{line}</span>
          </m.div>
        ))}
      </div>
    </div>
  )
}
