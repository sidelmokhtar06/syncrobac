import defaults from '../content/default-content.json'
import { assembleBundle, type Row } from './assemble'

// ── The content bundle ──────────────────────────────────────────────────
// Everything an admin can change without shipping a new app version: séries,
// subjects + coefficients, chapters, recommended links, BAC date.
// Source of truth = Supabase tables (see supabase/schema.sql). The bundled JSON
// is the offline fallback and the seed.

export type Source = 'official' | 'draft' | 'generic'

export interface SubjectDef {
  id: string
  fr: string
  ar: string
  coeff: number
  color?: string // hex for subject-specific accent
}

export interface SerieDef {
  id: string
  code: string
  active?: boolean // false = not open to new students yet (data kept for later); absent = open
  fr: string
  ar: string
  subjects: SubjectDef[]
}

export interface ChapterDef {
  id: string
  fr: string
  ar: string
  weeks?: number
}

export interface SubjectProgramme {
  source: Source
  chapters: ChapterDef[]
}

export interface LinkDef {
  title: string
  url: string
  category: 'group' | 'site' | 'video' | 'app'
  fr: string
  ar: string
  serie?: string | null // only shown to this série when set
  subject?: string | null
}

// A past BAC paper (annale): the subject (sujet) or its solution (corrigé), as a PDF link.
export interface ExamDef {
  id: number
  serie: string | null // null = every série
  subject: string
  year: number
  session: 'normale' | 'complementaire'
  kind: 'subject' | 'solution'
  title?: string
  url: string
}

export interface ContentBundle {
  version: number
  updatedAt: string
  bacDate: string
  series: SerieDef[]
  programme: Record<string, Record<string, SubjectProgramme>>
  links: LinkDef[]
  exams?: ExamDef[] // absent in bundles cached before annales existed
}

export const DEFAULT_CONTENT = defaults as ContentBundle

let current: ContentBundle = DEFAULT_CONTENT
const listeners = new Set<() => void>()

export const content = () => current

export function setContent(next: ContentBundle) {
  current = next
  listeners.forEach((f) => f())
}

export function subscribeContent(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

// ── Remote (Supabase) ───────────────────────────────────────────────────

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const remoteConfigured = !!(URL && KEY)
// Uploaded annales are served from the public `exam-papers` storage bucket.
export const examFileBase = `${URL}/storage/v1/object/public/exam-papers/`

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` } })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json()
}

/** Fetches the tables and assembles a bundle. Throws if anything looks wrong (we then keep the cache). */
export async function fetchRemoteContent(): Promise<ContentBundle> {
  if (!remoteConfigured) throw new Error('Supabase not configured')
  const [series, serieSubjects, chapters, resources, config, exams] = await Promise.all([
    get<Row[]>('series?select=*&order=position'), // closed séries too: their students are asked to switch
    get<Row[]>('serie_subjects?select=*,subjects(*)&order=position'),
    get<Row[]>('chapters?select=*&order=position'),
    get<Row[]>('resources?select=*&published=eq.true&order=position'),
    get<Row[]>('app_config?select=*'),
    // Optional: before supabase/exams.sql is run the table doesn't exist, and the rest still loads.
    get<Row[]>('exam_papers?select=*&published=eq.true&order=year.desc,session,kind').catch(() => []),
  ])
  return assembleBundle({ series, serieSubjects, chapters, resources, config, exams }, DEFAULT_CONTENT.bacDate, examFileBase)
}
