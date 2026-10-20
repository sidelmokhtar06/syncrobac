import type { SubjectDef } from '../config/content'

// Subject-specific accent colors for visual scannability.
// Remote Supabase subjects can override with a `color` field.
const COLOR_MAP: Record<string, string> = {
  maths:     '#22C1D6',
  physics:   '#818CF8',
  natsci:    '#34D399',
  french:    '#F472B6',
  arabic:    '#FBBF24',
  english:   '#A78BFA',
  philo:     '#60A5FA',
  islamic:   '#FB923C',
  histgeo:   '#2DD4BF',
  tech:      '#E879F9',
}

/** Returns the accent hex for a subject, falling back to the app accent. */
export function subjectColor(sub: SubjectDef): string {
  return sub.color ?? COLOR_MAP[sub.id] ?? '#22C1D6'
}
