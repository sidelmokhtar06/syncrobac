import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
