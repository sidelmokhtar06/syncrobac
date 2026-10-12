import { useLiveQuery } from 'dexie-react-hooks'
import { db, today } from './db'
import { streakInfo } from './streak'

export interface WeekStats {
  minutes: number
  sessions: number
  activeDays: number
  mastered: number // chapters marked "mastered" during the week
  streak: number
  topSubjectId: string | null
  weekKey: string // Monday of the current week, to dismiss the recap once per week
}

const DAY = 86_400_000

/** Last 7 days (today included). */
export async function weekStats(): Promise<WeekStats> {
  const since = new Date(Date.now() - 6 * DAY)
  const from = today(since)
  const [sessions, days, chapters] = await Promise.all([
    db.sessions.where('date').aboveOrEqual(from).toArray(),
    db.days.toArray(),
    db.chapters.toArray(),
  ])
  const bySubject = new Map<string, number>()
  for (const x of sessions) if (x.subjectId) bySubject.set(x.subjectId, (bySubject.get(x.subjectId) ?? 0) + x.minutes)
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return {
    minutes: sessions.reduce((a, x) => a + x.minutes, 0),
    sessions: sessions.length,
    activeDays: days.filter((d) => d.date >= from).length,
    mastered: chapters.filter((c) => c.status === 'done' && c.updatedAt >= since.getTime()).length,
    streak: streakInfo(days.map((d) => d.date)).current,
    topSubjectId: [...bySubject].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    weekKey: today(monday),
  }
}

export const useWeekStats = () => useLiveQuery(weekStats, [])
