import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// `pnpm preview` serves the same global security headers as production (vercel.json),
// so the Content-Security-Policy is tested locally before it ships.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const globalHeaders = Object.fromEntries(
  vercel.headers
    .find((h: { source: string }) => h.source === '/(.*)')
    // Local preview is plain http (also on the LAN), so don't upgrade requests to https there.
    .headers.map((h: { key: string; value: string }) => [h.key, h.value.replace(/;\s*upgrade-insecure-requests/, '')]),
)

export default defineConfig({
  preview: { headers: globalHeaders },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app registers the service worker itself and picks the moment to switch versions (lib/appUpdate.ts).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'SyncroBac',
        short_name: 'SyncroBac',
        description: 'Synchro ta révision. Domine le BAC.',
        theme_color: '#0A0D12',
        background_color: '#0A0D12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'fr',
        categories: ['education', 'productivity'],
        // Screenshots make Android show the rich install sheet instead of a tiny dialog.
        screenshots: [
          { src: 'screenshots/home.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Accueil' },
          { src: 'screenshots/subjects.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Matières' },
          { src: 'screenshots/focus.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'Focus' },
        ],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Fonts: only the Arabic + Latin subsets the app actually uses.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'assets/readex-pro-{arabic,latin}-wght-*.woff2'],
        navigateFallback: '/index.html',
        importScripts: ['sw-notify.js'],
        runtimeCaching: [
          // Ambient loops: cache on first play, then fully offline.
          { urlPattern: /\.mp3$/, handler: 'CacheFirst', options: { cacheName: 'sounds', rangeRequests: true } },
        ],
      },
    }),
  ],
})
