import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_WEEKS, programme, type Source } from '../config/programme'
import { content } from '../config/content'
import type { Subject } from '../config/bac'
import { db, subjectsFor, today, type ChapterState, type ChapterStatus, type DayMissions, type Lang, type Mission, type Settings, type Task } from './db'

export interface Chapter {
  id: string
  title: Record<Lang, string>
  weeks: number
  custom: boolean
}

export const chapterKey = (subjectId: string, chapterId: string) => `${subjectId}/${chapterId}`

export function programmeFor(s: Settings, subjectId: string): { source: Source; chapters: Chapter[] } {
  const p = s.serie ? programme()[s.serie]?.[subjectId] : undefined
  return {
    source: p?.source ?? 'generic',
    chapters: (p?.chapters ?? []).map((c) => ({ id: c.id, title: { fr: c.fr, ar: c.ar }, weeks: c.weeks ?? DEFAULT_WEEKS, custom: false })),
  }
}

// Programme chapters + the student's own, in order.
export function useChapters(s: Settings, subjectId: string) {
  const custom = useLiveQuery(() => db.customChapters.where('subjectId').equals(subjectId).sortBy('createdAt'), [subjectId], [])
  const base = programmeFor(s, subjectId)
  return {
    source: base.source,
    chapters: [
      ...base.chapters,
      ...custom.map((c) => ({ id: `custom-${c.id}`, title: { fr: c.title, ar: c.title }, weeks: DEFAULT_WEEKS, custom: true })),
    ],
  }
}

export async function loadAllChapters(s: Settings): Promise<Map<string, Chapter[]>> {
  const custom = await db.customChapters.orderBy('id').toArray()
  return new Map(
    subjectsFor(s).map((sub) => [
      sub.id,
      [
        ...programmeFor(s, sub.id).chapters,
        ...custom
          .filter((c) => c.subjectId === sub.id)
          .map((c) => ({ id: `custom-${c.id}`, title: { fr: c.title, ar: c.title }, weeks: DEFAULT_WEEKS, custom: true })),
      ],
    ]),
  )
}

export const useAllChapters = (s: Settings) =>
  // Re-load when the série changes or new admin content arrives (chapters/coefficients edited remotely).
  useLiveQuery(() => loadAllChapters(s), [s.serie, content().version, content().updatedAt], new Map<string, Chapter[]>())

export const useChapterStates = () =>
  useLiveQuery(async () => new Map((await db.chapters.toArray()).map((c) => [c.key, c])), [], new Map<string, ChapterState>())

export const statusOf = (states: Map<string, ChapterState>, subjectId: string, chapterId: string): ChapterStatus =>
  states.get(chapterKey(subjectId, chapterId))?.status ?? 'todo'

export async function setChapter(subjectId: string, chapterId: string, patch: Partial<Omit<ChapterState, 'key' | 'subjectId'>>) {
  const key = chapterKey(subjectId, chapterId)
  const cur = await db.chapters.get(key)
  await db.chapters.put({ key, subjectId, status: 'todo', ...cur, ...patch, updatedAt: Date.now() })
  if (patch.status && patch.status !== cur?.status) await completeMissions({ subjectId, chapterId })
}

// 0..1 mastery of a subject: done = 1, learning = 0.5.
export function subjectMastery(chapters: Chapter[], states: Map<string, ChapterState>, subjectId: string) {
  if (!chapters.length) return 0
  const pts = chapters.reduce((a, c) => {
    const st = statusOf(states, subjectId, c.id)
    return a + (st === 'done' ? 1 : st === 'learning' ? 0.5 : 0)
  }, 0)
  return pts / chapters.length
}

// ── School calendar ─────────────────────────────────────────────────────

const WEEK = 7 * 86_400_000
export const schoolYearStart = (bacDate: string) => new Date(new Date(bacDate).getFullYear() - 1, 9, 1) // 1 October
export const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // Monday
  return x
}

// Official progressions run October → May (~32 teaching weeks).
const TEACHING_WEEKS = 32

/** Share of the programme the class should have covered by now (official pacing, Oct → May). */
export const expectedShare = (s: Settings, now = new Date()) =>
  Math.min(1, Math.max(0, (now.getTime() - schoolYearStart(s.bacDate).getTime()) / WEEK / TEACHING_WEEKS))

/** Chapters the class has (at least) started by now according to the official pacing. */
export function seenByPacing(chapters: Chapter[], share: number) {
  const total = chapters.reduce((a, c) => a + c.weeks, 0)
  let cum = 0
  const seen = new Set<string>()
  for (const c of chapters) {
    if (cum < share * total) seen.add(c.id)
    cum += c.weeks
  }
  return seen
}

/** Coefficient-weighted mastery across all subjects (0..1). */
export function weightedMastery(s: Settings, all: Map<string, Chapter[]>, states: Map<string, ChapterState>) {
  const subjects = subjectsFor(s)
  const total = subjects.reduce((a, x) => a + x.coeff, 0) || 1
  return subjects.reduce((a, x) => a + x.coeff * subjectMastery(all.get(x.id) ?? [], states, x.id), 0) / total
}

// ── Revision plan ───────────────────────────────────────────────────────

export interface PlanWeek {
  start: Date
  items: { subject: Subject; chapter: Chapter }[]
  revision: boolean
}

/**
 * Spreads each subject's unfinished chapters (official order, official durations)
 * over the weeks left before the BAC, keeping the last weeks for general revision.
 * If the student is behind, chapters are compressed — `pace` > 1 tells the UI.
 */
export function buildPlan(s: Settings, chaptersBySubject: Map<string, Chapter[]>, states: Map<string, ChapterState>, now = new Date()) {
  const first = startOfWeek(now)
  const bac = new Date(s.bacDate)
  const totalWeeks = Math.max(1, Math.ceil((bac.getTime() - first.getTime()) / WEEK))
  const revisionWeeks = Math.min(3, Math.max(0, totalWeeks - 1))
  const studyWeeks = Math.max(1, totalWeeks - revisionWeeks)

  const weeks: PlanWeek[] = Array.from({ length: totalWeeks }, (_, i) => ({
    start: new Date(first.getTime() + i * WEEK),
    items: [],
    revision: i >= studyWeeks,
  }))

  let pace = 1
  for (const subject of subjectsFor(s)) {
    const remaining = (chaptersBySubject.get(subject.id) ?? []).filter((c) => statusOf(states, subject.id, c.id) !== 'done')
    const need = remaining.reduce((a, c) => a + c.weeks, 0)
    if (!need) continue
    const scale = Math.min(1, studyWeeks / need)
    pace = Math.max(pace, need / studyWeeks)
    let cursor = 0
    for (const chapter of remaining) {
      const len = chapter.weeks * scale
      const from = Math.floor(cursor)
      const to = Math.max(from, Math.ceil(cursor + len) - 1)
      for (let w = from; w <= Math.min(to, studyWeeks - 1); w++) weeks[w].items.push({ subject, chapter })
      cursor += len
    }
  }
  return { weeks, pace, studyWeeks }
}

// ── Daily missions ──────────────────────────────────────────────────────

const RECALL_AFTER = 14 * 86_400_000

export function generateMissions(
  s: Settings,
  chaptersBySubject: Map<string, Chapter[]>,
  states: Map<string, ChapterState>,
  tasks: Task[],
  now = new Date(),
): Mission[] {
  const weeksIn = Math.max(0, (now.getTime() - schoolYearStart(s.bacDate).getTime()) / WEEK)
  const candidates: (Mission & { score: number })[] = []

  for (const subject of subjectsFor(s)) {
    const chapters = chaptersBySubject.get(subject.id) ?? []
    const total = chapters.reduce((a, c) => a + c.weeks, 0) || 1
    const expected = (weeksIn / TEACHING_WEEKS) * total // where the official pacing says the class should be
    let cum = 0
    let best: (Mission & { score: number }) | null = null
    for (const ch of chapters) {
      const st = states.get(chapterKey(subject.id, ch.id))
      const status = st?.status ?? 'todo'
      const due = cum <= expected
      cum += ch.weeks
      let score: number
      let kind: Mission['kind']
      if (status === 'done') {
        if (!st || now.getTime() - st.updatedAt < RECALL_AFTER) continue
        kind = 'recall'
        score = subject.coeff * 0.4
      } else {
        kind = status === 'learning' ? 'review' : 'start'
        score = subject.coeff * (due ? 1.5 : 0.5) * (status === 'learning' ? 1.2 : 1) * (st?.confidence === 'weak' ? 1.3 : 1)
      }
      const task = tasks.find((t) => !t.done && t.subjectId === subject.id && t.chapterId === ch.id)
      if (task && kind !== 'recall') kind = 'task'
      if (!best || score > best.score) best = { kind, subjectId: subject.id, chapterId: ch.id, taskId: task?.id, done: false, score }
    }
    if (best) candidates.push(best)
  }

  candidates.sort((a, b) => b.score - a.score)
  const picked: Mission[] = []
  for (const c of candidates) {
    if (picked.length === 3) break
    if (c.kind === 'recall' && picked.some((p) => p.kind === 'recall')) continue
    const { score: _score, ...m } = c
    picked.push(m)
  }
  return picked
}

export const useMissions = () => useLiveQuery(() => db.missions.get(today()), [])

export async function ensureMissions(s: Settings, chaptersBySubject: Map<string, Chapter[]>) {
  if (await db.missions.get(today())) return
  const [states, tasks] = await Promise.all([db.chapters.toArray(), db.tasks.toArray()])
  const items = generateMissions(s, chaptersBySubject, new Map(states.map((c) => [c.key, c])), tasks)
  await db.missions.put({ date: today(), items })
}

// Marks today's matching missions as done (called on session end, task check, status change).
export async function completeMissions(match: { subjectId: string | null; chapterId?: string | null; taskId?: number }) {
  const day: DayMissions | undefined = await db.missions.get(today())
  if (!day) return
  let changed = false
  const items = day.items.map((m) => {
    // A task completes its own mission (or its chapter's); a session or status change completes the chapter's mission,
    // and a session with no chapter counts for that subject's mission.
    const sameChapter = !!match.chapterId && m.chapterId === match.chapterId
    const hit =
      !m.done &&
      m.subjectId === match.subjectId &&
      (match.taskId !== undefined ? m.taskId === match.taskId || sameChapter : !match.chapterId || sameChapter)
    if (hit) changed = true
    return hit ? { ...m, done: true } : m
  })
  if (changed) await db.missions.put({ ...day, items })
}

export const toggleMission = async (index: number) => {
  const day = await db.missions.get(today())
  if (!day) return
  day.items[index] = { ...day.items[index], done: !day.items[index].done }
  await db.missions.put(day)
}
