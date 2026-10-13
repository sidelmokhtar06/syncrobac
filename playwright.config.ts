import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// End-to-end tests against the production build (`pnpm test:e2e`).
// Supabase is faked in the browser (e2e/fake-supabase.ts): tests never touch the real project.
// Uses the system Chromium when present, otherwise run `pnpm exec playwright install chromium` once.
const systemChromium = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync)

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: 2, // each phone is a full browser; keeps memory reasonable
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4174',
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    locale: 'fr-FR',
    serviceWorkers: 'block', // the service worker would answer before route mocks
    launchOptions: systemChromium ? { executablePath: systemChromium } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
