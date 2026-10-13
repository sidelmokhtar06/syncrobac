# SyncroBac

> Synchro ta révision. Domine le BAC. — زامِن تركيزك.. واضمن نجاحك

Offline-first PWA for Mauritanian BAC candidates: BAC countdown, coefficient-weighted checklist,
Pomodoro focus engine, score simulator with rescue points, streaks and badges. French + Arabic (RTL).

## Run

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build && pnpm preview   # test the PWA / service worker
```

## Tests

```sh
pnpm test:e2e   # app in a real browser (phone, tablet, desktop), Supabase faked: onboarding,
                # focus check-in, mistake notebook, two-phone sync, backup restore, feedback,
                # crash reports, anonymous stats, layouts. First time without system Chromium:
                # pnpm exec playwright install chromium
pnpm test:sql   # runs every supabase/*.sql on a throwaway Postgres (Docker) and checks the
                # security rules: students only see their own data, only the admin with
                # two-factor reads feedback and stats, etc.
pnpm test       # both
```

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · react-router · Dexie (IndexedDB) · vite-plugin-pwa ·
Motion (lazy-loaded `domMax`, respects reduced-motion) · Readex Pro variable font (Arabic + Latin, self-hosted, precached).
Backend for the Resource Center (phase 2): Supabase.

See [DESIGN.md](DESIGN.md) for colors, type, spacing and component rules.

## Pages

| Route | Page |
|---|---|
| `/` | Today: BAC countdown, 3 daily missions, daily/weekly goals |
| `/plan` | Week-by-week revision plan until the BAC |
| `/subjects` · `/subjects/:id` · `/subjects/:id/:chapter` | Subjects → chapters (status, confidence, tasks, notes) |
| `/focus` · `/focus/history` | Timer · session log |
| `/resources` | Useful links & study groups (community sharing with accounts) |
| `/me` · `/progress` · `/simulator` · `/settings` | Profile hub · stats & streak · score simulator · settings & backup |
| `/account` · `/feedback` · `/mistakes` · `/coffee` | Optional account & sync · send feedback · mistake notebook · support the developer |
| `/admin` | Owner tool (password + two-factor), not linked |

Phones get a bottom tab bar; from 768px a side navigation (icon rail on tablets, full sidebar from 1024px).

Pages are lazy-loaded chunks, all precached by the service worker.

## Layout

```
src/
  config/bac.ts         series, subjects, coefficients, BAC date      ⚠️ verify
  config/programme.ts   BAC-year chapters per subject/série (sources inside) ⚠️ draft parts
  config/links.ts       suggested public links
  lib/db.ts             Dexie schema (v2) + settings context
  lib/curriculum.ts     chapters, revision plan, daily missions
  lib/streak.ts         gentle streak (1 freeze / week)
  lib/timer.ts          timestamp-based Pomodoro, logs sessions per chapter
  components/ui.tsx     design-system primitives (see DESIGN.md)
  pages/                one file per route
```

## Roadmap

- [x] Phase 1 — offline core: onboarding, dashboard, checklist, focus timer, simulator, profile, PWA, FR/AR
- [ ] Verify official coefficients per series + 2027 BAC date (`src/config/bac.ts`)
- [ ] Record / source Atay + Lo-Fi ambient loops
- [x] Multi-page IA: subject/chapter pages, plan, missions, progress, settings, history, resources
- [ ] Verify draft programme chapters with teachers (`src/config/programme.ts`)
- [ ] Phase 2 — Supabase: accounts, community links/groups, leagues & live focus, annales: auth, PDF upload (Storage), upvotes, offline download cache, moderation/report
- [ ] Phase 3 — extensions: past exam papers (Examens modèles), flash quizzes, audio summaries
- [ ] Phase 4 — AI Coach
