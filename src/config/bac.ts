import { content, type SerieDef, type SubjectDef } from './content'

// Séries, subjects and coefficients now come from the content bundle
// (src/content/default-content.json, overridable from Supabase — see docs/ADMIN.md).
// ⚠️ Coefficients and the BAC date are still to verify against the official arrêté.

export type SerieId = string
export type Subject = SubjectDef
export type Serie = SerieDef

export const listSeries = () => content().series

/** Falls back to the first série if an admin removed the student's one. */
export const getSerie = (id: SerieId): Serie => content().series.find((x) => x.id === id) ?? content().series[0]

export const defaultBacDate = () => content().bacDate

export const PASS_MARK = 10
export const MENTIONS = [
  { min: 10, fr: 'Passable', ar: 'مقبول' },
  { min: 12, fr: 'Assez bien', ar: 'مستحسن' },
  { min: 14, fr: 'Bien', ar: 'حسن' },
  { min: 16, fr: 'Très bien', ar: 'حسن جدا' },
]
