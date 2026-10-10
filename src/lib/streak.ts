import { today } from './db'

// Gentle streak: each calendar week (Mon–Sun) includes one automatic "freeze",
// so a single missed day doesn't reset the streak. A second miss in the same week does.

const mondayKey = (d: Date) => {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return today(x)
}

export interface StreakInfo {
  current: number
  frozen: Set<string> // days saved by a freeze (shown on the calendar)
  freezeAvailable: boolean // this week's freeze is still unused
  weekActive: number // active days this week
}

export function streakInfo(dates: string[]): StreakInfo {
  const set = new Set(dates)
  const earliest = dates.length ? [...dates].sort()[0] : today()
  const used = new Set<string>()
  const frozen = new Set<string>()
  const d = new Date()
  // Today isn't over yet: if not active, start counting from yesterday.
  if (!set.has(today(d))) d.setDate(d.getDate() - 1)

  let current = 0
  let pending: string[] = []
  while (today(d) >= earliest) {
    const key = today(d)
    if (set.has(key)) {
      current++
      pending.forEach((k) => frozen.add(k)) // a freeze only counts if the streak continues past it
      pending = []
    } else {
      const week = mondayKey(d)
      if (used.has(week)) break
      used.add(week)
      pending.push(key)
    }
    d.setDate(d.getDate() - 1)
  }

  const thisWeek = mondayKey(new Date())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(thisWeek + 'T12:00:00')
    x.setDate(x.getDate() + i)
    return today(x)
  })
  return {
    current,
    frozen,
    freezeAvailable: ![...frozen].some((k) => mondayKey(new Date(k + 'T12:00:00')) === thisWeek),
    weekActive: weekDays.filter((k) => set.has(k)).length,
  }
}

// Longest run using the same one-freeze-per-week rule.
export function bestStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort()
  if (!sorted.length) return 0
  const set = new Set(sorted)
  let best = 0
  let run = 0
  let usedWeek = ''
  const d = new Date(sorted[0] + 'T12:00:00')
  const end = new Date(sorted[sorted.length - 1] + 'T12:00:00')
  while (d <= end) {
    const key = today(d)
    if (set.has(key)) {
      run++
      best = Math.max(best, run)
    } else if (usedWeek !== mondayKey(d)) {
      usedWeek = mondayKey(d)
    } else {
      run = 0
    }
    d.setDate(d.getDate() + 1)
  }
  return best
}
