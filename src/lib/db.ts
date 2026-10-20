import { createContext, useContext } from 'react'
import { uuid } from './uuid'
import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { defaultBacDate, getSerie, type SerieId, type Subject } from '../config/bac'
import type { ContentBundle } from '../config/content'

export type Lang = 'fr' | 'ar'
export type TimerMode = 'pomodoro' | 'short' | 'long' | 'custom'

export interface Settings {
  id: 1
  serie: SerieId | null
  lang: Lang
  theme: 'system' | 'light' | 'dark'
  bacDate: string
  bacCustom?: boolean // true once the student sets their own date; otherwise follow the admin's
  syncUpdatedAt?: number // last change to a synced setting (sync merge rule), set by sync hooks
  coeffOverrides: Partial<Record<string, number>>
  durations: Record<TimerMode, number> // minutes
  timer: { mode: TimerMode; endsAt: number | null; remainingMs: number; subjectId: string | null; chapterId?: string | null; goal?: string }
  sound: 'none' | 'rain' | 'atay' | 'lofi'
  keepAwake: boolean // keep the screen on during a focus session
  dailyGoal: number // Pomodoros per day
  weeklyGoal: number // active days per week (gentle streak)
  name: string
  dismissed: string[] // one-time cards the student closed (e.g. 'install')
  extensions: Record<string, boolean>
}

export interface Task {
  id?: number
  uid?: string // global id for sync (local `id` differs per device)
  updatedAt?: number
  subjectId: string
  chapterId?: string
  title: string
  done: boolean
  createdAt: number
}

export interface Session {
  id?: number
  uid?: string
  updatedAt?: number
  date: string // YYYY-MM-DD local
  minutes: number
  subjectId: string | null
  chapterId?: string | null
  at?: number // completion timestamp
  goal?: string // what the student set out to do
  result?: Confidence // end-of-session check-in
}

export type ChapterStatus = 'todo' | 'learning' | 'done'
export type Confidence = 'weak' | 'ok' | 'strong'

// Per-student progress on a chapter. key = `${subjectId}/${chapterId}`
export interface ChapterState {
  key: string
  subjectId: string
  status: ChapterStatus
  confidence?: Confidence
  notes?: string
  updatedAt: number
}

// Chapters a student adds when the programme list is incomplete.
export interface CustomChapter {
  id?: number
  uid?: string // chapter id in the app is `custom-${uid}`
  updatedAt?: number
  subjectId: string
  title: string
  createdAt: number
}

export interface Mission {
  kind: 'start' | 'review' | 'task' | 'recall'
  subjectId: string
  chapterId: string
  taskId?: number
  done: boolean
}

// Missions are generated once per day so the list stays stable while the student works.
export interface DayMissions {
  date: string
  items: Mission[]
}

// One entry of the mistake notebook: what went wrong and the right way, to reread before the BAC.
export interface SavedLink {
  id?: number
  uid?: string
  updatedAt?: number
  title: string
  url: string
  category: 'group' | 'site' | 'video' | 'app'
  note?: string
  createdAt: number
}

export interface SimulatorGrades {
  id: 1
  grades: Record<string, string>
  updatedAt: number
}

// A day counts toward the streak if the student finished a focus session or a task.
export interface ActiveDay {
  date: string
  updatedAt?: number
}

export const db = new Dexie('syncrobac') as Dexie & {
  settings: EntityTable<Settings, 'id'>
  tasks: EntityTable<Task, 'id'>
  sessions: EntityTable<Session, 'id'>
  days: EntityTable<ActiveDay, 'date'>
  chapters: EntityTable<ChapterState, 'key'>
  customChapters: EntityTable<CustomChapter, 'id'>
  missions: EntityTable<DayMissions, 'date'>
  links: EntityTable<SavedLink, 'id'>
  content: EntityTable<{ key: string; bundle: ContentBundle; fetchedAt: number }, 'key'>
  mistakes: EntityTable<Mistake, 'id'>
  deletions: EntityTable<{ id?: number; collection: string; key: string; at: number }, 'id'>
  simulator: EntityTable<SimulatorGrades, 'id'>
}

db.version(1).stores({
  settings: 'id',
  tasks: '++id, subjectId',
  sessions: '++id, date',
  days: 'date',
})

db.version(2).stores({
  tasks: '++id, subjectId, chapterId',
  sessions: '++id, date, subjectId',
  chapters: 'key, subjectId',
  customChapters: '++id, subjectId',
  missions: 'date',
  links: '++id, category',
})

// v3: cached copy of the admin-managed content bundle (see config/content.ts)
db.version(3).stores({ content: 'key' })

// v4: mistake notebook (carnet d'erreurs), per chapter
db.version(4).stores({ mistakes: '++id, subjectId, chapterId, createdAt' })

// v5: accounts & sync. Every synced record gets a global `uid` + `updatedAt`; deletions are
// recorded as tombstones. Custom chapters are referenced by uid (`custom-<uid>`) instead of
// their per-device numeric id, so references stay valid on every device.
db.version(5)
  .stores({
    tasks: '++id, subjectId, chapterId, uid',
    sessions: '++id, date, subjectId, uid',
    customChapters: '++id, subjectId, uid',
    links: '++id, category, uid',
    mistakes: '++id, subjectId, chapterId, createdAt, uid',
    deletions: '++id, collection',
  })
  .upgrade(async (tx) => {
    const now = Date.now()
    const renamed = new Map<string, string>()
    await tx.table('customChapters').toCollection().modify((c) => {
      c.uid ??= uuid()
      c.updatedAt ??= c.createdAt ?? now
      renamed.set(`custom-${c.id}`, `custom-${c.uid}`)
    })
    const remap = (id?: string | null) => (id && renamed.get(id)) || id
    for (const name of ['tasks', 'sessions', 'mistakes', 'links']) {
      await tx.table(name).toCollection().modify((r) => {
        r.uid ??= uuid()
        r.updatedAt ??= r.createdAt ?? r.at ?? now
        if ('chapterId' in r) r.chapterId = remap(r.chapterId)
      })
    }
    for (const st of await tx.table('chapters').toArray()) {
      const [subject, chapter] = st.key.split('/')
      const next = remap(chapter)
      if (next !== chapter) {
        await tx.table('chapters').delete(st.key)
        await tx.table('chapters').put({ ...st, key: `${subject}/${next}` })
      }
    }
    await tx.table('days').toCollection().modify((d) => void (d.updatedAt ??= now))
    await tx.table('missions').clear() // regenerated today; old ones may reference renamed chapters
  })

// v6: simulator grades persistence
db.version(6).stores({ simulator: 'id' })

const DURATIONS = { pomodoro: 25, short: 5, long: 15, custom: 45 }

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  serie: null,
  lang: navigator.language.startsWith('ar') ? 'ar' : 'fr',
  theme: 'system',
  bacDate: defaultBacDate(),
  coeffOverrides: {},
  durations: DURATIONS,
  timer: { mode: 'pomodoro', endsAt: null, remainingMs: DURATIONS.pomodoro * 60_000, subjectId: null, chapterId: null },
  sound: 'none',
  keepAwake: true,
  dailyGoal: 4,
  weeklyGoal: 5,
  name: '',
  dismissed: [],
  extensions: {},
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Loaded once in <App>; children read it from context so it's never undefined below the root.
export const useSettingsQuery = () =>
  useLiveQuery(async (): Promise<Settings> => {
    const s = { ...DEFAULT_SETTINGS, ...(await db.settings.get(1)) }
    // Unless the student picked their own date, always use the current (admin-managed) BAC date.
    return s.bacCustom ? s : { ...s, bacDate: defaultBacDate() }
  })

export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS)
export const useSettings = () => useContext(SettingsContext)

export const updateSettings = async (patch: Partial<Settings>) => {
  const cur = (await db.settings.get(1)) ?? DEFAULT_SETTINGS
  await db.settings.put({ ...cur, ...patch, id: 1 })
}

export const markActive = () => db.days.put({ date: today() })

export const subjectsFor = (s: Settings): Subject[] =>
  s.serie
    ? getSerie(s.serie)
        .subjects.slice()
        .sort((a, b) => b.coeff - a.coeff)
    : []

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.()
