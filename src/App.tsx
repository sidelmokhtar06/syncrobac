import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import { LayoutGridIcon } from './components/icons/layout-grid'
import { CheckCheckIcon } from './components/icons/check-check'
import { TimerIcon } from './components/icons/timer'
import { BookTextIcon } from './components/icons/book-text'
import { UserIcon } from './components/icons/user'
import { Anim } from './components/ui'
import { SettingsContext, useSettings, useSettingsQuery } from './lib/db'
import { useT, type TKey } from './lib/i18n'
import { complete, useNow } from './lib/timer'
import { Celebration } from './components/Celebration'
import { EASE, spring } from './components/motion'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

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

// `owns`: path prefixes that keep the tab highlighted on its sub-pages.
const TABS = [
  { to: '/', key: 'dashboard', Icon: LayoutGridIcon, owns: ['/plan'] },
  { to: '/subjects', key: 'subjects', Icon: CheckCheckIcon, owns: ['/subjects'] },
  { to: '/focus', key: 'focus', Icon: TimerIcon, owns: ['/focus'] },
  { to: '/resources', key: 'resources', Icon: BookTextIcon, owns: ['/resources'] },
  { to: '/me', key: 'profile', Icon: UserIcon, owns: ['/me', '/progress', '/simulator', '/settings'] },
] satisfies { to: string; key: TKey; Icon: unknown; owns: string[] }[]

const tabOf = (path: string) => {
  const i = TABS.findIndex((x) => x.owns.some((p) => path === p || path.startsWith(p + '/')))
  return i === -1 ? 0 : i
}
const depthOf = (path: string) => path.split('/').filter(Boolean).length

export default function App() {
  const s = useSettingsQuery()

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

  useEffect(() => {
    if (!s) return
    document.documentElement.lang = s.lang
    document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr'
  }, [s?.lang])

  if (!s) return null
  return (
    <SettingsContext value={s}>
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
    </SettingsContext>
  )
}

function Shell() {
  const s = useSettings()
  const { t } = useT()
  const now = useNow()
  const loc = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const completing = useRef(false)
  const [celebrate, setCelebrate] = useState(false)
  const closeCelebrate = useCallback(() => setCelebrate(false), [])

  // Global timer watcher: completes the session whichever tab is open.
  useEffect(() => {
    if (!s.timer.endsAt || s.timer.endsAt > now || completing.current) return
    completing.current = true
    complete(s)
      .then((focus) => focus && setCelebrate(true))
      .finally(() => (completing.current = false))
  }, [now, s])

  // Direction-aware page slide (mirrored in RTL): across tabs by tab order, within a tab by depth.
  const idx = tabOf(loc.pathname)
  const depth = depthOf(loc.pathname)
  const prev = useRef({ idx, depth })
  const forward = idx === prev.current.idx ? depth >= prev.current.depth : idx > prev.current.idx
  const dir = (forward ? 1 : -1) * (s.lang === 'ar' ? -1 : 1)
  useEffect(() => {
    prev.current = { idx, depth }
    mainRef.current?.scrollTo(0, 0)
  }, [loc.pathname, idx, depth])

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-28">
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
                <Route path="/me" element={<Me />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/simulator" element={<SimulatorPage />} />
                <Route path="/settings" element={<Settings />} />
                {/* Old URLs from earlier versions */}
                <Route path="/checklist" element={<Navigate to="/subjects" replace />} />
                <Route path="/profile" element={<Navigate to="/me" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </m.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
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

      <Celebration open={celebrate} onClose={closeCelebrate} />
    </div>
  )
}
