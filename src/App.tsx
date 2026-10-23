import { Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AnimatePresence, MotionConfig, m } from 'motion/react'
import { Check, RefreshCw, AlertCircle } from 'lucide-react'
import { LayoutGridIcon } from './components/icons/layout-grid'
import { CheckCheckIcon } from './components/icons/check-check'
import { TimerIcon } from './components/icons/timer'
import { BookTextIcon } from './components/icons/book-text'
import { UserIcon } from './components/icons/user'
import { Anim } from './components/ui'
import { LogoMark, Wordmark } from './components/Logo'
import { SettingsContext, useSettings, useSettingsQuery } from './lib/db'
import { useT, type TKey } from './lib/i18n'
import { complete, useNow, type FinishedSession } from './lib/timer'
import { notify } from './lib/pwa'
import { ScrollContainer } from './lib/scroll'
import { content, subscribeContent } from './config/content'
import { Celebration } from './components/Celebration'
import { EASE, spring } from './components/motion'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { track } from './lib/insights'
import { accountsAvailable, useUser } from './lib/auth'
import { useSyncStatus } from './lib/sync'
import { applyUpdate, useUpdateWaiting } from './lib/appUpdate'
import { cn } from './lib/cn'

// Each page is its own chunk (all precached by the service worker, so still offline).
const Subjects = lazy(() => import('./pages/Subjects'))
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'))
const ChapterDetail = lazy(() => import('./pages/ChapterDetail'))
const Plan = lazy(() => import('./pages/Plan'))
const Focus = lazy(() => import('./pages/Focus'))
const History = lazy(() => import('./pages/History'))
const Resources = lazy(() => import('./pages/Resources'))
const Me = lazy(() => import('./pages/Me'))
const Progress = lazy(() => import('./pages/Progress'))
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'))
const Settings = lazy(() => import('./pages/Settings'))
const Coffee = lazy(() => import('./pages/Coffee'))
const MistakesPage = lazy(() => import('./pages/MistakesPage'))
const Account = lazy(() => import('./pages/Account'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Announcements = lazy(() => import('./pages/Announcements'))
const SubjectResources = lazy(() => import('./pages/SubjectResources'))
const Admin = lazy(() => import('./pages/Admin')) // owner-only tool, not linked anywhere

// `owns`: path prefixes that keep the tab highlighted on its sub-pages.
const TABS = [
  { to: '/', key: 'dashboard', Icon: LayoutGridIcon, owns: ['/plan', '/messages'] },
  { to: '/subjects', key: 'subjects', Icon: CheckCheckIcon, owns: ['/subjects'] },
  { to: '/focus', key: 'focus', Icon: TimerIcon, owns: ['/focus'] },
  { to: '/resources', key: 'resources', Icon: BookTextIcon, owns: ['/resources'] },
  { to: '/me', key: 'profile', Icon: UserIcon, owns: ['/me', '/progress', '/simulator', '/settings', '/coffee', '/mistakes', '/account', '/feedback'] },
] satisfies { to: string; key: TKey; Icon: unknown; owns: string[] }[]

const tabOf = (path: string) => {
  // `/` belongs to Accueil; unknown paths (e.g. /admin) highlight no tab.
  if (path === '/') return 0
  return TABS.findIndex((x) => x.owns.some((p) => path === p || path.startsWith(p + '/')))
}
const depthOf = (path: string) => path.split('/').filter(Boolean).length

// Anonymous usage: which kind of page was opened (never ids or names typed by the student).
const featureOf = (path: string) => {
  const [first, ...rest] = path.split('/').filter(Boolean)
  if (!first) return 'home'
  if (first === 'subjects') return ['subjects', 'subject', 'chapter'][rest.length] ?? 'chapter'
  if (first === 'focus') return rest.length ? 'history' : 'focus'
  return first
}

export default function App() {
  const s = useSettingsQuery()
  // Re-render everything when fresh admin content arrives from Supabase.
  useSyncExternalStore(subscribeContent, content)

  // Hand off from the HTML splash once data is ready (kept ≥1s so it doesn't flash).
  useEffect(() => {
    const el = document.getElementById('splash')
    if (!s || !el) return
    const id = setTimeout(() => {
      el.classList.add('hide')
      setTimeout(() => el.remove(), 500)
    }, Math.max(0, 1000 - performance.now()))
    return () => clearTimeout(id)
  }, [!!s])

  // Theme: explicit choice or follow the phone; mirrored to localStorage for public/theme-init.js.
  useEffect(() => {
    if (!s) return
    const media = matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const theme = s.theme === 'system' ? (media.matches ? 'light' : 'dark') : s.theme
      document.documentElement.dataset.theme = theme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f6f8' : '#0a0d12')
    }
    apply()
    try {
      localStorage.setItem('syncrobac-theme', s.theme)
    } catch {
      /* boot script falls back to system */
    }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [s?.theme])

  // "Réduire les animations": Motion animations below, CSS transitions via index.css.
  const motion = s ? (s.reduceMotion ? 'reduced' : 'full') : null
  useEffect(() => {
    if (motion) document.documentElement.dataset.motion = motion
  }, [motion])

  useEffect(() => {
    if (!s) return
    document.documentElement.lang = s.lang
    document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr'
  }, [s?.lang])

  if (!s) return null
  return (
    <SettingsContext value={s}>
      <MotionConfig reducedMotion={s.reduceMotion ? 'always' : 'user'}>
      <AnimatePresence mode="wait">
        {s.serie ? (
          <m.div key="app" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <Shell />
          </m.div>
        ) : (
          <m.div key="onboarding" className="h-full" exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }}>
            <Onboarding />
          </m.div>
        )}
      </AnimatePresence>
      {/* Outside the app/onboarding switch: an update can wait during onboarding too. */}
      <UpdateBanner />
      </MotionConfig>
    </SettingsContext>
  )
}

function Shell() {
  const s = useSettings()
  const { t } = useT()
  const loc = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // The just-finished focus session, shown in the celebration + check-in sheet.
  const [finished, setFinished] = useState<FinishedSession | null>(null)
  const closeCelebrate = useCallback(() => setFinished(null), [])

  // Direction-aware page slide (mirrored in RTL): across tabs by tab order, within a tab by depth.
  const idx = tabOf(loc.pathname)
  const adminArea = loc.pathname === '/admin' || loc.pathname.startsWith('/admin/')
  const depth = depthOf(loc.pathname)
  const prev = useRef({ idx, depth })
  const forward = idx === prev.current.idx ? depth >= prev.current.depth : idx > prev.current.idx
  const dir = (forward ? 1 : -1) * (s.lang === 'ar' ? -1 : 1)
  useEffect(() => {
    prev.current = { idx, depth }
    mainRef.current?.scrollTo(0, 0)
  }, [loc.pathname, idx, depth])
  useEffect(() => void (!adminArea && track(featureOf(loc.pathname))), [loc.pathname, adminArea])

  return (
    <div className="flex h-full">
      {!adminArea && <SideNav idx={idx} />}
      <m.main ref={mainRef} layoutScroll className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-28 md:px-8 md:pt-8 md:pb-12">
        {/* Phones: the familiar column. Tablets/desktop: a wider reading column; the admin gets a workspace. */}
        <div className={adminArea ? 'mx-auto w-full max-w-md lg:max-w-6xl' : 'mx-auto w-full max-w-md md:max-w-2xl'}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <m.div
            key={loc.pathname}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: 28 * d }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: -28 * d }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: EASE }}
          >
            <ScrollContainer value={mainRef}>
              <ErrorBoundary resetKey={loc.pathname}>
              <Suspense fallback={null}>
                <Routes location={loc}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/plan" element={<Plan />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/subjects/:subjectId" element={<SubjectDetail />} />
                  <Route path="/subjects/:subjectId/:chapterId" element={<ChapterDetail />} />
                  <Route path="/focus" element={<Focus />} />
                  <Route path="/focus/history" element={<History />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/resources/:subjectId" element={<SubjectResources />} />
                  <Route path="/me" element={<Me />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/simulator" element={<SimulatorPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/coffee" element={<Coffee />} />
                  <Route path="/mistakes" element={<MistakesPage />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/messages" element={<Announcements />} />
                  <Route path="/admin" element={<Admin />} />
                  {/* Old URLs from earlier versions */}
                  <Route path="/checklist" element={<Navigate to="/subjects" replace />} />
                  <Route path="/profile" element={<Navigate to="/me" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              </ErrorBoundary>
            </ScrollContainer>
          </m.div>
        </AnimatePresence>
        </div>
      </m.main>

      {/* Opaque + own GPU layer: no backdrop blur repainting over scrolling content on Android. */}
      {!adminArea && (
      <nav className="fixed inset-x-0 bottom-0 z-40 transform-gpu border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex max-w-md px-1">
          {TABS.map(({ to, key, Icon }, i) => {
            const isActive = i === idx
            return (
              <Link key={to} to={to} aria-current={isActive ? 'page' : undefined} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs">
                <span className="relative grid h-8 w-14 place-items-center">
                  {isActive && <m.span layoutId="nav-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent/12" />}
                  <span className={`relative ${isActive ? 'text-accent' : 'text-ink-3'}`}>
                    <Anim icon={Icon} size={22} play={isActive} />
                  </span>
                </span>
                <span className={isActive ? 'font-medium text-ink' : 'text-ink-3'}>{t(key)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      )}

      <TimerWatcher onFocusDone={setFinished} />
      <Celebration session={finished} onClose={closeCelebrate} />
      {accountsAvailable && <SyncIndicator />}
    </div>
  )
}

// Tablets and desktop: the same tabs as a side navigation.
function SideNav({ idx }: { idx: number }) {
  const { t } = useT()
  return (
    <nav className="hidden w-20 shrink-0 flex-col gap-1 border-e border-line px-2 py-6 md:flex lg:w-64 lg:px-3">
      <Link to="/" aria-label="SyncroBac" className="mb-6 flex items-center justify-center gap-2 lg:justify-start lg:px-3">
        <LogoMark className="h-7 w-auto" />
        <span className="hidden lg:inline">
          <Wordmark className="text-base" />
        </span>
      </Link>
      {TABS.map(({ to, key, Icon }, i) => {
        const isActive = i === idx
        return (
          <Link key={to} to={to} aria-current={isActive ? 'page' : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] transition-colors lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm ${isActive ? 'font-medium text-ink' : 'text-ink-2 hover:bg-raised hover:text-ink'}`}>
            {isActive && <m.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-xl bg-accent/12" />}
            <span className={`relative ${isActive ? 'text-accent' : ''}`}>
              <Anim icon={Icon} size={20} play={isActive} />
            </span>
            <span className="relative">{t(key)}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// Completes the running session whichever page is open. Isolated in its own component
// so its 1-second tick re-renders only this (renders nothing), not the whole app.
function TimerWatcher({ onFocusDone }: { onFocusDone: (s: FinishedSession) => void }) {
  const s = useSettings()
  const { t } = useT()
  const now = useNow()
  const completing = useRef(false)

  // The exact timeout fires on time when the browser allows; the 1s tick catches up after sleep.
  const [, bump] = useState(0)
  useEffect(() => {
    if (!s.timer.endsAt) return
    const id = setTimeout(() => bump((x) => x + 1), Math.max(0, s.timer.endsAt - Date.now()) + 50)
    return () => clearTimeout(id)
  }, [s.timer.endsAt])

  useEffect(() => {
    if (!s.timer.endsAt || s.timer.endsAt > Date.now() || completing.current) return
    completing.current = true
    complete(s)
      .then((finished) => {
        if (finished === undefined) return // already completed elsewhere
        notify(finished ? t('sessionDone') : t('breakDone'), finished ? t('sessionDoneSub') : t('breakDoneSub'))
        if (finished) {
          track('focus_done')
          onFocusDone(finished)
        }
      })
      .finally(() => (completing.current = false))
  }, [now, s, t, onFocusDone])

  return null
}

// ── New version downloaded while the student was busy ───────────────────

function UpdateBanner() {
  const waiting = useUpdateWaiting()
  const { t } = useT()
  return (
    <AnimatePresence>
      {waiting && (
        <m.div
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-surface p-3 ps-4 shadow-xl md:bottom-6"
        >
          <RefreshCw size={18} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 text-sm font-medium">{t('updateReady')}</span>
          <button onClick={applyUpdate} className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-medium text-accent-ink">
            {t('updateNow')}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}

// ── Sync status indicator (floating cloud icon, bottom-right) ───────────

function SyncIndicator() {
  const user = useUser()
  const sync = useSyncStatus()
  const loc = useLocation()
  // After a successful sync, the check shows briefly, then the indicator gets out of the way.
  const [justSynced, setJustSynced] = useState(false)
  useEffect(() => {
    if (!sync.lastSync) return
    setJustSynced(true)
    const id = setTimeout(() => setJustSynced(false), 2000)
    return () => clearTimeout(id)
  }, [sync.lastSync])

  // Hide on account/settings pages (they show sync status themselves)
  if (!user || loc.pathname === '/account' || loc.pathname === '/settings') return null

  const isSyncing = sync.state === 'syncing'
  const isError = sync.state === 'error'
  const isDone = !isSyncing && !isError && justSynced
  const visible = isSyncing || isError || isDone

  return (
    <m.div
      aria-hidden
      className={cn(
        'pointer-events-none fixed bottom-20 end-3 z-50 grid size-9 place-items-center rounded-full shadow-lg transition-colors md:bottom-6',
        isSyncing && 'bg-accent text-bg',
        isDone && 'bg-success text-bg',
        isError && 'bg-danger text-bg',
      )}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {isSyncing && <m.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={16} className="text-bg" />
      </m.span>}
      {isDone && <Check size={16} className="text-bg" />}
      {isError && <AlertCircle size={16} className="text-bg" />}
    </m.div>
  )
}
