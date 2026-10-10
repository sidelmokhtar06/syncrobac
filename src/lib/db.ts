import { createContext, useContext } from 'react'
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
  bacDate: string
  coeffOverrides: Partial<Record<string, number>>
  durations: Record<TimerMode, number> // minutes
  timer: { mode: TimerMode; endsAt: number | null; remainingMs: number; subjectId: string | null; chapterId?: string | null }
  sound: 'none' | 'rain' | 'atay' | 'lofi'
  dailyGoal: number // Pomodoros per day
  weeklyGoal: number // active days per week (gentle streak)
  name: string
  dismissed: string[] // one-time cards the student closed (e.g. 'install')
  extensions: Record<string, boolean>
}

export interface Task {
  id?: number
  subjectId: string
  chapterId?: string
  title: string
  done: boolean
  createdAt: number
}

export interface Session {
  id?: number
  date: string // YYYY-MM-DD local
  minutes: number
  subjectId: string | null
  chapterId?: string | null
  at?: number // completion timestamp
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

export interface SavedLink {
  id?: number
  title: string
  url: string
  category: 'group' | 'site' | 'video' | 'app'
  note?: string
  createdAt: number
}

// A day counts toward the streak if the student finished a focus session or a task.
export interface ActiveDay {
  date: string
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

const DURATIONS = { pomodoro: 25, short: 5, long: 15, custom: 45 }

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  serie: null,
  lang: navigator.language.startsWith('ar') ? 'ar' : 'fr',
  bacDate: defaultBacDate(),
  coeffOverrides: {},
  durations: DURATIONS,
  timer: { mode: 'pomodoro', endsAt: null, remainingMs: DURATIONS.pomodoro * 60_000, subjectId: null, chapterId: null },
  sound: 'none',
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
  useLiveQuery(async (): Promise<Settings> => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get(1)) }))

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
        .subjects.map((sub) => ({ ...sub, coeff: s.coeffOverrides[sub.id] ?? sub.coeff }))
        .sort((a, b) => b.coeff - a.coeff)
    : []

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.()
