import { useEffect, useState } from 'react'
import { db, markActive, today, updateSettings, type Settings, type TimerMode } from './db'
import { completeMissions } from './curriculum'

// The timer is stored as an absolute `endsAt` timestamp, so it keeps counting
// across tab switches, navigation and reloads.

export const remaining = (t: Settings['timer'], now: number) =>
  t.endsAt ? Math.max(0, t.endsAt - now) : t.remainingMs

// Starting from a mission or a chapter page pins the session to that subject/chapter.
export const start = (s: Settings, subjectId = s.timer.subjectId, chapterId = subjectId === s.timer.subjectId ? (s.timer.chapterId ?? null) : null) =>
  updateSettings({ timer: { ...s.timer, subjectId, chapterId, endsAt: Date.now() + s.timer.remainingMs } })

/** Starts a focus session on a chapter. After a session the timer sits on a break: switch back to focus first. */
export const startFocus = (s: Settings, subjectId: string, chapterId: string | null) => {
  const focus = s.timer.mode === 'pomodoro' || s.timer.mode === 'custom'
  const timer = focus ? s.timer : { ...s.timer, mode: 'pomodoro' as const, remainingMs: s.durations.pomodoro * 60_000 }
  return start({ ...s, timer }, subjectId, chapterId)
}

export const pause = (s: Settings) =>
  updateSettings({ timer: { ...s.timer, endsAt: null, remainingMs: remaining(s.timer, Date.now()) } })

export const setMode = (s: Settings, mode: TimerMode, minutes = s.durations[mode]) =>
  updateSettings({
    durations: { ...s.durations, [mode]: minutes },
    timer: { ...s.timer, mode, endsAt: null, remainingMs: minutes * 60_000 },
  })

export interface FinishedSession {
  sessionId: number
  subjectId: string | null
  chapterId: string | null
  goal?: string
}

/**
 * Ends the running timer. Returns the logged focus session (for the end-of-session check-in), null for a
 * break, or undefined if this end was already handled (another tab, or a render that hadn't seen it yet).
 */
export async function complete(s: Settings): Promise<FinishedSession | null | undefined> {
  const { mode, subjectId, endsAt } = s.timer
  // Claim this end atomically (IndexedDB serializes it across tabs): only one caller logs the session.
  const claimed = await db.transaction('rw', db.settings, async () => {
    if ((await db.settings.get(1))?.timer.endsAt !== endsAt) return false
    await db.settings.update(1, { 'timer.endsAt': null })
    return true
  })
  if (!claimed || !endsAt) return undefined

  const chapterId = s.timer.chapterId ?? null
  const goal = s.timer.goal?.trim() || undefined
  const focus = mode === 'pomodoro' || mode === 'custom'
  let finished: FinishedSession | null = null
  if (focus) {
    // Dated when it ended, not when the app was reopened (a session ending at 23:50 belongs to that day).
    const ended = new Date(Math.min(endsAt, Date.now()))
    const sessionId = await db.sessions.add({ date: today(ended), minutes: s.durations[mode], subjectId, chapterId, goal, at: ended.getTime() })
    await markActive(ended)
    if (today(ended) === today()) await completeMissions({ subjectId, chapterId })
    finished = { sessionId: sessionId as number, subjectId, chapterId, goal }
  }
  // The goal belongs to one session: clear it once that session ends.
  await setMode({ ...s, timer: { ...s.timer, goal: focus ? '' : s.timer.goal } }, focus ? 'short' : 'pomodoro')
  navigator.vibrate?.([200, 100, 200])
  beep()
  return finished
}

let beepCtx: AudioContext | null = null
function beep() {
  const ctx = (beepCtx ??= new AudioContext()) // one context for the app: browsers cap how many can be open
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = 880
  g.gain.setValueAtTime(0.3, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + 1.2)
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

export const fmt = (ms: number) => {
  const t = Math.ceil(ms / 1000)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
