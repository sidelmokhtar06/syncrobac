import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { LazyMotion, MotionConfig } from 'motion/react'
import '@fontsource-variable/readex-pro'
import './index.css'
import './lib/pwa' // capture the install prompt before any page mounts
import App from './App.tsx'
import { loadCachedContent, refreshContent } from './lib/contentSync'
import { handleAuthRedirect } from './lib/auth'
import { installSyncHooks, startSync } from './lib/sync'

// Admin-managed content: cached copy first (instant, offline), then refresh in the background.
await loadCachedContent()
refreshContent()

// Accounts: pick up a Google sign-in redirect, track local changes, sync in the background.
handleAuthRedirect()
installSyncHooks()
startSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LazyMotion features={() => import('./lib/motionFeatures').then((r) => r.default)} strict>
        {/* Honors the OS "reduce motion" setting for every animation in the app. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </LazyMotion>
    </BrowserRouter>
  </StrictMode>,
)
