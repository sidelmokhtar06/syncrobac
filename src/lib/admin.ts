// Admin API: Supabase Auth (email + password) and authenticated writes over PostgREST.
// Security is enforced server-side by RLS (supabase/schema.sql): only users listed in
// `admins` can write. This module only carries the signed-in user's token.

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const adminConfigured = !!(URL && KEY)

interface Session {
  access_token: string
  refresh_token: string
  expires_at: number // unix seconds
  email: string
}

// sessionStorage: the admin stays signed in for this tab only, never on a shared phone for long.
const STORE = 'syncrobac-admin'
let session: Session | null = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? 'null')
  } catch {
    return null
  }
})()

const save = (s: Session | null) => {
  session = s
  try {
    if (s) sessionStorage.setItem(STORE, JSON.stringify(s))
    else sessionStorage.removeItem(STORE)
  } catch {
    /* private mode: session stays in memory */
  }
}

async function authRequest(grant: 'password' | 'refresh_token', body: object) {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    const msg: string = json.error_description ?? json.msg ?? json.message ?? ''
    if (/invalid login/i.test(msg)) throw new Error('Email ou mot de passe incorrect.')
    if (/not confirmed/i.test(msg)) throw new Error('Email non confirmé : dans Supabase → Authentication → Users, confirme l’utilisateur.')
    throw new Error(msg || 'Connexion impossible')
  }
  save({ access_token: json.access_token, refresh_token: json.refresh_token, expires_at: json.expires_at, email: json.user?.email ?? '' })
}

export const signIn = (email: string, password: string) => authRequest('password', { email, password })
export const signOut = () => save(null)
export const currentEmail = () => session?.email ?? null

async function token() {
  if (!session) throw new Error('Non connecté')
  if (session.expires_at * 1000 - Date.now() < 60_000) await authRequest('refresh_token', { refresh_token: session.refresh_token })
  return session!.access_token
}

/** PostgREST call as the signed-in admin. Throws with the server's message on failure. */
export async function api<T = unknown>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
      Prefer: init.prefer ?? 'return=representation',
    },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || json?.code === '42501') throw new Error('Accès refusé : ce compte n’est pas administrateur.')
    throw new Error(json?.message ?? `Erreur ${res.status}`)
  }
  return json as T
}

/** The `admins` policy lets a user read only their own row: 1 row = admin. */
export const isAdmin = async () => (await api<unknown[]>('admins?select=user_id')).length > 0

/** Bump content_version so every app replaces its cached copy on next launch. Returns the new version. */
export async function publish() {
  const rows = await api<{ value: number }[]>('app_config?key=eq.content_version&select=value')
  const next = Number(rows[0]?.value ?? 1) + 1
  await api('app_config?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: JSON.stringify({ key: 'content_version', value: next }) })
  return next
}

/** URL-safe stable key from a title, unique among `taken`. */
export function slugKey(title: string, taken: Set<string>) {
  const base =
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'chapitre'
  let key = base
  for (let i = 2; taken.has(key); i++) key = `${base}-${i}`
  return key
}
