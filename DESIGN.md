# SyncroBac design system

Calm, focused, professional. One brand accent on neutral graphite. No emojis in the UI.

## Color (tokens in `src/index.css`)

| Token | Hex | Use |
|---|---|---|
| `bg` | #0A0D12 | App background |
| `surface` | #12161D | Cards |
| `raised` | #1A1F28 | Inputs, segmented tracks, icon tiles |
| `line` / `line-strong` | #232A35 / #2F3745 | Hairlines / control borders |
| `ink` | #E8ECF1 | Primary text (15:1) |
| `ink-2` | #A3ADBB | Secondary text (8:1) |
| `ink-3` | #788293 | Tertiary text (4.7:1), only on `bg`/`surface` |
| `accent` | #22C1D6 | Primary actions, selection, progress. Text on it: `accent-ink` |
| `success` / `warning` / `danger` | #3CCB8C / #F0A645 / #F26464 | Status only: done, streak/at-risk, delete |

Rules: never use a status color decoratively (for example, never color low-coefficient subjects amber). No gradients on controls and no glow shadows. Tint backgrounds use `accent/12`.

## Type: Readex Pro Variable (Arabic + Latin)

12 caption · 14 secondary · 16 body · 18 card title · 24 page title · 48–60 display numbers.
Weights 400 / 500 / 600. Nothing below 12px. Numbers use `.tnum`. Arabic gets line-height 1.75 and no letter-spacing.
French typography: « guillemets » and a narrow no-break space before `! ? :`.

## Spacing & shape

4px grid. Page gutter 20px, gap between sections 24px, gap inside a group 12px, card padding 16–20px.
Radius: cards 16px, controls 12px, chips full.

## Touch targets

At least 44px for every interactive element. `Button` md = 44px, lg = 52px (one primary action per screen).
Checkboxes are 22px boxes inside a 44px hit area. List rows are at least 48px, settings rows at least 60px.

## Components (`src/components/ui.tsx`)

`Button` (primary / secondary / ghost), `IconButton`, `Segmented`, `Select`, `PageHeader`, `SectionTitle`,
`Chip`, `ProgressBar`, `Anim`. Build screens from these. Don't hand-roll new button styles.

## Icons & motion

- Static icons: `lucide-react`. Animated icons: vendored from lucide-animated (MIT) into `src/components/icons/`
  (rewritten to use `m.` for LazyMotion strict). To add one: fetch `https://lucide-animated.com/r/<name>.json`, then run it through the same vendoring transform.
- Phones have no hover, so animated icons play on events through `<Anim play={…} autoplay />`.
- Motion conveys state changes (enter, select, complete) and is never decorative looping in the main UI.
  Durations 200–500ms, ease-out-expo. The OS "reduce motion" setting is respected globally.
- The mascot (Synci) appears only in onboarding and celebration moments.
