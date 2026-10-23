// Admin API: Supabase Auth (email + password + TOTP two-factor) and authenticated writes over PostgREST.
// Security is enforced server-side by RLS (supabase/schema.sql + security.sql): only users listed
// in `admins` whose session passed two-factor (aal2) can write. This module only carries the token.

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
  storeTokens(json)
}

const storeTokens = (json: { access_token: string; refresh_token: string; expires_at: number; user?: { email?: string } }) =>
  save({ access_token: json.access_token, refresh_token: json.refresh_token, expires_at: json.expires_at, email: json.user?.email ?? session?.email ?? '' })

// ── Two-factor (TOTP) ───────────────────────────────────────────────────

/** Authentication Assurance Level of the current session: aal1 = password only, aal2 = password + code. */
export function aal(): 'aal1' | 'aal2' | null {
  if (!session) return null
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.aal ?? 'aal1'
  } catch {
    return 'aal1'
  }
}

async function authApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL}/auth/v1/${path}`, {
    ...init,
    headers: { apikey: KEY!, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(json?.msg ?? json?.message ?? json?.error_description ?? `Erreur ${res.status}`)
  return json as T
}

interface Factor {
  id: string
  factor_type: string
  status: 'verified' | 'unverified'
}

export const verifiedTotp = async () =>
  ((await authApi<{ factors?: Factor[] }>('user')).factors ?? []).find((f) => f.factor_type === 'totp' && f.status === 'verified') ?? null

/** Starts TOTP enrollment (removing any abandoned attempt). Returns the QR image and the manual secret. */
export async function enrollTotp() {
  const factors = (await authApi<{ factors?: Factor[] }>('user')).factors ?? []
  for (const f of factors.filter((x) => x.status === 'unverified')) await authApi(`factors/${f.id}`, { method: 'DELETE' })
  const res = await authApi<{ id: string; totp: { qr_code: string; secret: string } }>('factors', {
    method: 'POST',
    body: JSON.stringify({ factor_type: 'totp', issuer: 'SyncroBac', friendly_name: `SyncroBac ${new Date().toISOString().slice(0, 10)}` }),
  })
  const qr = res.totp.qr_code.startsWith('data:') ? res.totp.qr_code : `data:image/svg+xml;utf8,${encodeURIComponent(res.totp.qr_code)}`
  return { factorId: res.id, qr, secret: res.totp.secret }
}

/** Verifies a 6-digit code for a factor; on success the session is upgraded to aal2. */
export async function verifyTotp(factorId: string, code: string) {
  const { id: challengeId } = await authApi<{ id: string }>(`factors/${factorId}/challenge`, { method: 'POST' })
  try {
    const json = await authApi<Parameters<typeof storeTokens>[0]>(`factors/${factorId}/verify`, { method: 'POST', body: JSON.stringify({ challenge_id: challengeId, code }) })
    storeTokens(json)
  } catch (e) {
    throw new Error(/invalid|expired/i.test((e as Error).message) ? 'Code incorrect ou expiré.' : (e as Error).message)
  }
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

// ── Annales (PDF storage) ───────────────────────────────────────────────
// Files go to the public `exam-papers` bucket; only an admin with two-factor may write (supabase/exams.sql).

export const EXAM_MAX_BYTES = 20 * 1024 * 1024

/** Uploads a PDF under `path` (e.g. "c/maths/2024-normale-subject-k3x9.pdf"). Never overwrites an existing file. */
export async function uploadExamFile(path: string, file: File) {
  if (file.type !== 'application/pdf') throw new Error('Seuls les fichiers PDF sont acceptés.')
  if (file.size > EXAM_MAX_BYTES) throw new Error('Fichier trop lourd (20 Mo maximum).')
  const res = await fetch(`${URL}/storage/v1/object/exam-papers/${path}`, {
    method: 'POST',
    headers: { apikey: KEY!, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
    body: file,
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    if (res.status === 401 || res.status === 403) throw new Error('Envoi refusé : exécute supabase/exams.sql et vérifie que tu es administrateur.')
    throw new Error(json?.message ?? `Envoi impossible (${res.status})`)
  }
}

export async function deleteExamFile(path: string) {
  const res = await fetch(`${URL}/storage/v1/object/exam-papers/${path}`, { method: 'DELETE', headers: { apikey: KEY!, Authorization: `Bearer ${await token()}` } })
  if (!res.ok && res.status !== 404) throw new Error(`Suppression du fichier impossible (${res.status})`)
}
