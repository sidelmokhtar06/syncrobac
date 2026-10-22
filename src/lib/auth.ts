import { useSyncExternalStore } from 'react'

// Student accounts (Supabase Auth over fetch). Passwordless: a 6-digit code by email, or Google.
// The session is kept in localStorage so students stay signed in on their own phone.
// (The admin uses lib/admin.ts: separate, tab-only session with two-factor.)

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const accountsAvailable = !!(URL && KEY)

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number // unix seconds
  user: { id: string; email: string }
}

const STORE = 'syncrobac-auth'
const listeners = new Set<() => void>()

let session: AuthSession | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? 'null')
  } catch {
    return null
  }
})()

function save(next: AuthSession | null) {
  session = next
  try {
    if (next) localStorage.setItem(STORE, JSON.stringify(next))
    else localStorage.removeItem(STORE)
  } catch {
    /* private mode: stays in memory */
  }
  listeners.forEach((f) => f())
}

// Another tab signed in, out, or refreshed the tokens: use its session (a stale refresh token would be rejected).
addEventListener('storage', (e) => {
  if (e.key !== STORE) return
  try {
    session = JSON.parse(e.newValue ?? 'null')
  } catch {
    session = null
  }
  listeners.forEach((f) => f())
})

export const currentUser = () => session?.user ?? null
export const subscribeAuth = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn))
export const useUser = () => useSyncExternalStore(subscribeAuth, currentUser)

type TokenJson = { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user?: { id: string; email?: string } }

function storeTokens(json: TokenJson) {
  save({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
    user: { id: json.user?.id ?? session?.user.id ?? '', email: json.user?.email ?? session?.user.email ?? '' },
  })
}

// Supabase error messages → short French/Arabic-friendly codes the UI translates.
export class AuthError extends Error {
  code: 'rate_limit' | 'invalid_code' | 'invalid_email' | 'offline' | 'unknown'
  status?: number
  constructor(code: AuthError['code'], message: string = code, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}, bearer?: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${URL}/auth/v1/${path}`, {
      ...init,
      headers: { apikey: KEY!, 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    })
  } catch {
    throw new AuthError('offline')
  }
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // Not JSON: a captive portal or proxy page answered, not Supabase.
    throw new AuthError(res.ok ? 'offline' : 'unknown', text.slice(0, 200), res.status)
  }
  if (!res.ok) {
    const msg = `${json?.error_code ?? ''} ${json?.msg ?? json?.message ?? json?.error_description ?? ''}`
    if (res.status === 429 || /rate.?limit/i.test(msg)) throw new AuthError('rate_limit', msg, res.status)
    if (/otp|token|expired|invalid.*code/i.test(msg)) throw new AuthError('invalid_code', msg, res.status)
    if (/email/i.test(msg)) throw new AuthError('invalid_email', msg, res.status)
    throw new AuthError('unknown', msg, res.status)
  }
  return json as T
}

/** Sends a 6-digit sign-in code (creates the account on first use). */
export const sendEmailCode = (email: string) => call('otp', { method: 'POST', body: JSON.stringify({ email, create_user: true }) })

/** Verifies the emailed code and signs in. */
export async function verifyEmailCode(email: string, token: string) {
  storeTokens(await call<TokenJson>('verify', { method: 'POST', body: JSON.stringify({ type: 'email', email, token }) }))
}

/** Redirects to Google; Supabase sends the student back to /account with the session in the URL hash. */
export function signInWithGoogle() {
  location.assign(`${URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${location.origin}/account`)}`)
}

/** Picks up a session returned in the URL hash after an OAuth redirect. Call once at startup. */
export function handleAuthRedirect() {
  if (!location.hash.includes('access_token=')) return
  const p = new URLSearchParams(location.hash.slice(1))
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')
  history.replaceState(null, '', location.pathname + location.search) // never leave tokens in the URL
  if (!access_token || !refresh_token) return
  try {
    const payload = JSON.parse(atob(access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    storeTokens({ access_token, refresh_token, expires_at: Number(p.get('expires_at')) || payload.exp, user: { id: payload.sub, email: payload.email } })
  } catch {
    /* malformed token: ignore */
  }
}

/** A valid access token, refreshed when about to expire. Null when signed out. */
export async function accessToken(): Promise<string | null> {
  if (!session) return null
  if (session.expires_at * 1000 - Date.now() < 60_000) {
    try {
      storeTokens(await call<TokenJson>('token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }))
    } catch (e) {
      // Only a rejected refresh token (revoked or expired) signs out. Offline, server errors,
      // rate limits: keep the session and retry later.
      if (e instanceof AuthError && (e.status === 400 || e.status === 401)) save(null)
      return null
    }
  }
  return session!.access_token
}

export async function signOut() {
  const token = session?.access_token
  save(null)
  if (token) await call('logout', { method: 'POST' }, token).catch(() => {})
}

let googleEnabled: Promise<boolean> | null = null
/** Whether Google sign-in is configured in the Supabase project. */
export const isGoogleEnabled = () =>
  (googleEnabled ??= call<{ external?: { google?: boolean } }>('settings').then((s) => !!s.external?.google, () => false))

/** Supabase REST call as the signed-in student (RLS: only their own rows). */
export async function restCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken()
  if (!token) throw new AuthError('offline', 'not signed in')
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new AuthError('unknown', text)
  return (text ? JSON.parse(text) : null) as T
}

export async function deleteAccount() {
  await restCall('rpc/delete_my_account', { method: 'POST', body: '{}' })
  save(null)
}
