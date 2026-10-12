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

/** Ends the running timer. Returns the logged focus session (for the end-of-session check-in), or null for a break. */
export async function complete(s: Settings): Promise<FinishedSession | null> {
  const { mode, subjectId } = s.timer
  const chapterId = s.timer.chapterId ?? null
  const goal = s.timer.goal?.trim() || undefined
  const focus = mode === 'pomodoro' || mode === 'custom'
  let finished: FinishedSession | null = null
  if (focus) {
    const sessionId = await db.sessions.add({ date: today(), minutes: s.durations[mode], subjectId, chapterId, goal, at: Date.now() })
    await markActive()
    await completeMissions({ subjectId, chapterId })
    finished = { sessionId: sessionId as number, subjectId, chapterId, goal }
  }
  // The goal belongs to one session: clear it once that session ends.
  await setMode({ ...s, timer: { ...s.timer, goal: focus ? '' : s.timer.goal } }, focus ? 'short' : 'pomodoro')
  navigator.vibrate?.([200, 100, 200])
  beep()
  return finished
}

function beep() {
  const ctx = new AudioContext()
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
