import { useLiveQuery } from 'dexie-react-hooks'
import { db, today } from './db'
import { streakInfo, type StreakInfo } from './streak'

export const useTasks = () => useLiveQuery(() => db.tasks.toArray(), [], [])

const EMPTY_STREAK: StreakInfo = { current: 0, frozen: new Set(), freezeAvailable: true, weekActive: 0 }

export const useStreakInfo = () =>
  useLiveQuery(async () => streakInfo((await db.days.toArray()).map((d) => d.date)), [], EMPTY_STREAK)

export const useStreak = () => useStreakInfo().current

export const useTodaySessions = () => useLiveQuery(() => db.sessions.where('date').equals(today()).count(), [], 0)

export const useToday = () =>
  useLiveQuery(
    async () => {
      const sessions = await db.sessions.where('date').equals(today()).toArray()
      return {
        sessions: sessions.length,
        minutes: sessions.reduce((a, x) => a + x.minutes, 0),
        active: !!(await db.days.get(today())),
      }
    },
    [],
    { sessions: 0, minutes: 0, active: false },
  )

// Dates in the UI language; Arabic keeps Western digits (as used in Mauritanian schools).
export const dateLocale = (lang: 'fr' | 'ar') => (lang === 'ar' ? 'ar-u-nu-latn' : 'fr-FR')
