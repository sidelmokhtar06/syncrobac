import type { BrowserContext, Request, Route } from '@playwright/test'

// In-memory stand-in for the Supabase endpoints the app calls, with the same rules as the SQL
// (last-write-wins per record, one store per user). Content requests fail, so the app uses its
// bundled content, exactly like a first launch offline.

export interface FakeServer {
  records: Map<string, Map<string, Row>>
  feedback: Row[]
  errors: Row[]
  usage: Row[]
  pushes: number
  clock: number // server time for updated_at, shared by every phone
}
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export const CODE = '123456'

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (sub: string, email: string) => `${b64({ alg: 'none' })}.${b64({ sub, email, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
const userOf = (req: Request) => {
  const token = (req.headers()['authorization'] ?? '').split(' ')[1] ?? ''
  try {
    return (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub as string) ?? null
  } catch {
    return null // anon key
  }
}
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

export function createFakeServer(): FakeServer {
  return { records: new Map(), feedback: [], errors: [], usage: [], pushes: 0, clock: Date.parse('2026-01-01T00:00:00Z') }
}

export async function installFakeSupabase(ctx: BrowserContext, server: FakeServer) {
  const users = new Map<string, string>()

  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname

    if (path.endsWith('/auth/v1/settings')) return json(route, 200, { external: { google: false, email: true } })
    if (path.endsWith('/auth/v1/otp')) return json(route, 200, {})
    if (path.endsWith('/auth/v1/logout')) return route.fulfill({ status: 204 })
    if (path.endsWith('/auth/v1/verify')) {
      const { email, token } = req.postDataJSON()
      if (token !== CODE) return json(route, 403, { error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
      if (!users.has(email)) users.set(email, `user-${users.size + 1}`)
      const id = users.get(email)!
      return json(route, 200, { access_token: jwt(id, email), refresh_token: 'r', expires_in: 3600, user: { id, email } })
    }

    // Insights: anyone may send
    if (path.endsWith('/rest/v1/feedback') && req.method() === 'POST') {
      server.feedback.push({ ...req.postDataJSON(), user_id: userOf(req) })
      return route.fulfill({ status: 201 })
    }
    if (path.endsWith('/rest/v1/client_errors') && req.method() === 'POST') {
      server.errors.push(...[req.postDataJSON()].flat())
      return route.fulfill({ status: 201 })
    }
    if (path.endsWith('/rest/v1/rpc/track_day')) {
      server.usage.push(req.postDataJSON())
      return route.fulfill({ status: 204 })
    }

    // Student sync: signed in only
    if (path.includes('/rest/v1/rpc/sync_push') || path.includes('/rest/v1/user_records') || path.includes('/rest/v1/rpc/delete_my_account')) {
      const uid = userOf(req)
      if (!uid) return json(route, 401, { message: 'JWT required' })
      const mine = server.records.get(uid) ?? new Map<string, Row>()
      server.records.set(uid, mine)
      if (path.endsWith('/rpc/sync_push')) {
        server.pushes++
        for (const r of req.postDataJSON().records) {
          const key = `${r.collection}/${r.id}`
          const cur = mine.get(key)
          if (!cur || cur.client_updated_at < r.client_updated_at) mine.set(key, { ...r, data: r.data ?? null, updated_at: new Date(server.clock++).toISOString() })
        }
        return route.fulfill({ status: 204 })
      }
      if (path.endsWith('/user_records')) {
        const gt = (url.searchParams.get('updated_at') ?? 'gt.1970').slice(3)
        const rows = [...mine.values()].filter((r) => r.updated_at > gt).sort((a, b) => a.updated_at.localeCompare(b.updated_at))
        return json(route, 200, rows.slice(0, 1000))
      }
      server.records.delete(uid)
      return route.fulfill({ status: 204 })
    }

    return json(route, 503, { message: 'not faked' }) // content etc. → bundled defaults
  })
}
