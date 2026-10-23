import { content, type ExamDef } from './content'

// Past BAC papers (admin-managed in Supabase `exam_papers`) for one subject of the student's série.
export const examsFor = (serie: string | null, subject: string): ExamDef[] =>
  (content().exams ?? []).filter((e) => e.subject === subject && (!e.serie || e.serie === serie))

/** Papers grouped by exam (year + session), newest first; each exam has its sujet and/or corrigé. */
export function groupExams(exams: ExamDef[]) {
  const groups = new Map<string, { year: number; session: ExamDef['session']; docs: ExamDef[] }>()
  for (const e of exams) {
    const key = `${e.year}-${e.session}`
    if (!groups.has(key)) groups.set(key, { year: e.year, session: e.session, docs: [] })
    groups.get(key)!.docs.push(e)
  }
  return [...groups.values()].sort((a, b) => b.year - a.year || (a.session === 'normale' ? -1 : 1))
}
