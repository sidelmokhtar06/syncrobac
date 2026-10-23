import { expect, test, type Page, type Route } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createFakeServer, installFakeSupabase } from './fake-supabase'
import { onboard, readTable, trackErrors } from './helpers'

// Announcements: the admin writes a message, students see it on Today (card + bell) and in the inbox,
// only in their language, their série and within its dates. Supabase is faked here.

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const adminJwt = `${b64({ alg: 'none' })}.${b64({ sub: 'admin-1', email: 'admin@x.mr', aal: 'aal2', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
const DEFAULT_CONTENT = JSON.parse(readFileSync(new URL('../src/content/default-content.json', import.meta.url), 'utf8'))
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

test('admin sends a message to série C, in French only', async ({ page }) => {
  const errors = trackErrors(page)
  const sent: Record<string, unknown>[] = []
  await page.context().route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    if (path.endsWith('/auth/v1/token')) return json(route, 200, { access_token: adminJwt, refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { email: 'admin@x.mr' } })
    if (path.endsWith('/rest/v1/admins')) return json(route, 200, [{ user_id: 'admin-1' }])
    if (path.endsWith('/rest/v1/series')) return json(route, 200, [{ id: 'C' }, { id: 'D' }])
    if (path.endsWith('/rest/v1/app_config')) return req.method() === 'GET' ? json(route, 200, [{ key: 'content_version', value: 3 }]) : route.fulfill({ status: 201 })
    if (path.endsWith('/rest/v1/announcements')) {
      if (req.method() === 'POST') {
        sent.push(req.postDataJSON())
        return route.fulfill({ status: 201 })
      }
      return json(route, 200, sent.map((r, i) => ({ id: i + 1, starts_at: new Date().toISOString(), ...r })))
    }
    return json(route, 503, { message: 'not faked' })
  })

  await onboard(page)
  await page.goto('/admin')
  await page.getByLabel('Email').fill('admin@x.mr')
  await page.getByLabel('Mot de passe').fill('secret-password')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.getByRole('button', { name: 'Annonces' }).or(page.getByRole('link', { name: 'Annonces' })).first().click()
  await page.getByRole('button', { name: 'Nouvelle' }).click()
  await page.getByLabel('Destinataires').selectOption('C')
  await page.getByLabel('Titre (FR)').fill('Sujet de maths 2024 en ligne')
  await page.getByLabel(/Texte \(FR\)/).fill('Entraîne-toi dans les conditions du BAC.')
  await page.getByLabel(/Lien \(facultatif\)/).fill('javascript:alert(1)')
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  await page.getByLabel(/Lien \(facultatif\)/).fill('/resources/maths')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByRole('status')).toContainText('Publié')

  expect(sent).toEqual([
    { serie_id: 'C', title_fr: 'Sujet de maths 2024 en ligne', body_fr: 'Entraîne-toi dans les conditions du BAC.', title_ar: null, body_ar: null, link: '/resources/maths', expires_at: null, published: true },
  ])
  await expect(page.getByText('En ligne', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

async function withAnnouncements(page: Page, announcements: object[]) {
  await page.evaluate(
    ([base, announcements]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('syncrobac')
        open.onsuccess = () => {
          const tx = open.result.transaction(['content'], 'readwrite')
          tx.objectStore('content').put({ key: 'bundle', fetchedAt: Date.now(), bundle: { ...base, version: base.version + 1, announcements } })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
    [DEFAULT_CONTENT, announcements] as const,
  )
  await page.reload()
}

test('students see messages for their série and language, on Today and in the inbox', async ({ page, context }) => {
  await installFakeSupabase(context, createFakeServer()) // never reach the real project
  const errors = trackErrors(page)
  await onboard(page) // série C, French
  const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()
  await withAnnouncements(page, [
    { id: 1, serie: null, fr: { title: 'Bienvenue sur SyncroBac', body: 'Bonne révision !' }, startsAt: day(-3) },
    { id: 2, serie: 'C', fr: { title: 'Sujet de maths 2024 en ligne' }, link: '/resources/maths', startsAt: day(-1) },
    { id: 3, serie: null, ar: { title: 'للعربية فقط' }, startsAt: day(-1) },
    { id: 4, serie: 'D', fr: { title: 'Seulement pour la D' }, startsAt: day(-1) },
    { id: 5, serie: null, fr: { title: 'Expirée' }, startsAt: day(-5), expiresAt: day(-2) },
    { id: 6, serie: null, fr: { title: 'Programmée' }, startsAt: day(2) },
  ])

  // Today: newest unread message in the card, 2 unread on the bell
  await expect(page.getByRole('heading', { name: 'Sujet de maths 2024 en ligne' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Annonces (2)' })).toBeVisible()
  await page.getByRole('heading', { name: 'Sujet de maths 2024 en ligne' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByRole('heading', { name: 'Bienvenue sur SyncroBac' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Annonces (1)' })).toBeVisible()

  // Inbox: exactly the 2 messages meant for this student; opening it marks them read
  await page.getByRole('link', { name: /Annonces/ }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page.getByText('Seulement pour la D')).toHaveCount(0)
  await expect(page.getByText('Expirée')).toHaveCount(0)
  await expect(page.getByText('Programmée')).toHaveCount(0)
  await page.getByRole('link', { name: 'Voir' }).click()
  await expect(page).toHaveURL(/\/resources\/maths$/)
  expect((await readTable<{ readAnnouncements: number[] }>(page, 'settings'))[0].readAnnouncements.sort()).toEqual([1, 2])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Missions du jour', exact: false })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Annonces', exact: true })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
  expect(errors).toEqual([])
})
