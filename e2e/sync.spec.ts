import { expect, test, type Browser, type Page } from '@playwright/test'
import { CODE, createFakeServer, installFakeSupabase, type FakeServer } from './fake-supabase'
import { onboard, readTable, trackErrors } from './helpers'

async function phone(browser: Browser, server: FakeServer) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4174', viewport: { width: 390, height: 844 }, locale: 'fr-FR', serviceWorkers: 'block', isMobile: true, hasTouch: true })
  await installFakeSupabase(ctx, server)
  const page = await ctx.newPage()
  return { page, errors: trackErrors(page) }
}

async function signIn(page: Page, email: string) {
  await page.getByLabel('Ton email').fill(email)
  await page.getByRole('button', { name: /Recevoir un code/ }).click()
  await page.getByLabel(/Saisis le code/).fill(CODE)
  await page.getByRole('button', { name: 'Valider' }).click()
}

async function syncNow(page: Page) {
  await page.goto('/account')
  await page.getByRole('button', { name: 'Synchroniser maintenant' }).click()
  await expect(page.getByText(/Synchronisé/)).toBeVisible()
}

test('progress follows the student to a second phone and back', async ({ browser }) => {
  const server = createFakeServer()
  const A = await phone(browser, server)

  // Phone A: some progress, then create the account (wrong code first)
  await onboard(A.page)
  await A.page.goto('/subjects/maths/complexes')
  await A.page.getByPlaceholder('Ajouter une tâche…').fill('Exercices forme exponentielle')
  await A.page.keyboard.press('Enter')
  await A.page.getByRole('button', { name: 'Ajouter au carnet' }).click()
  await A.page.getByLabel('Mon erreur').fill('Argument faux : oublié le quadrant')
  await A.page.getByRole('button', { name: 'Enregistrer' }).click()
  await A.page.goto('/settings')
  await A.page.getByPlaceholder('Ton prénom').fill('Aicha')
  await A.page.getByPlaceholder('Ton prénom').blur()

  await A.page.goto('/account')
  await A.page.getByLabel('Ton email').fill('aicha@example.com')
  await A.page.getByRole('button', { name: /Recevoir un code/ }).click()
  await A.page.getByLabel(/Saisis le code/).fill('999999')
  await A.page.getByRole('button', { name: 'Valider' }).click()
  await expect(A.page.getByRole('alert')).toHaveText('Code incorrect ou expiré.')
  await A.page.getByLabel(/Saisis le code/).fill(CODE)
  await A.page.getByRole('button', { name: 'Valider' }).click()
  await expect(A.page.getByText('aicha@example.com')).toBeVisible()
  await expect.poll(() => [...(server.records.get('user-1')?.keys() ?? [])].some((k) => k.startsWith('mistakes/'))).toBe(true)

  // Phone B: fresh install, "J'ai déjà un compte" → lands in the app with A's data
  const B = await phone(browser, server)
  await B.page.goto('/')
  await B.page.getByRole('button', { name: 'J’ai déjà un compte' }).click()
  await signIn(B.page, 'aicha@example.com')
  await expect(B.page.locator('h1').first()).toContainText('Aicha', { timeout: 15_000 })
  await B.page.goto('/subjects/maths/complexes')
  await expect(B.page.getByText('Exercices forme exponentielle')).toBeVisible()
  await expect(B.page.getByText('Argument faux')).toBeVisible()

  // Changes on B flow back to A: task checked, mistake deleted
  await B.page.getByLabel('Exercices forme exponentielle').click()
  await B.page.locator('[aria-label="Supprimer"]').first().click()
  await syncNow(B.page)
  await syncNow(A.page)
  await expect.poll(async () => (await readTable<{ done: boolean }>(A.page, 'tasks')).map((t) => t.done)).toEqual([true])
  await expect.poll(async () => (await readTable(A.page, 'mistakes')).length).toBe(0)

  expect(A.errors).toEqual([])
  expect(B.errors).toEqual([])
})

test('restoring a backup while signed in does not delete anything online', async ({ browser }) => {
  const server = createFakeServer()
  const A = await phone(browser, server)
  await onboard(A.page)
  await A.page.goto('/subjects/maths/complexes')
  await A.page.getByPlaceholder('Ajouter une tâche…').fill('Tâche sauvegardée')
  await A.page.keyboard.press('Enter')
  await A.page.goto('/account')
  await signIn(A.page, 'sidi@example.com')
  await expect(A.page.getByText('sidi@example.com')).toBeVisible()
  await syncNow(A.page)

  // Export, then import the same file (clears every table, writes the rows back)
  await A.page.goto('/settings')
  const download = A.page.waitForEvent('download')
  await A.page.getByRole('button', { name: /Exporter/ }).click()
  const file = await (await download).path()
  await A.page.locator('input[type=file]').setInputFiles(file)
  await expect(A.page.getByRole('status')).toBeVisible()
  await syncNow(A.page)

  const task = [...server.records.get('user-1')!.values()].find((r) => r.collection === 'tasks')
  expect(task?.deleted).toBe(false)
  expect(task?.data?.title).toBe('Tâche sauvegardée')
  expect(A.errors).toEqual([])
})

test('signing in from onboarding never overwrites the account with the unfinished settings', async ({ browser }) => {
  const server = createFakeServer()
  const A = await phone(browser, server)
  await onboard(A.page)
  await A.page.goto('/settings')
  await A.page.getByPlaceholder('Ton prénom').fill('Aicha')
  await A.page.getByPlaceholder('Ton prénom').blur()
  await A.page.goto('/account')
  await signIn(A.page, 'aicha@example.com')
  await syncNow(A.page)

  // Phone B: switching the language during onboarding writes settings (no série yet) before signing in
  const B = await phone(browser, server)
  await B.page.goto('/')
  await B.page.getByRole('button', { name: 'ع' }).click()
  await B.page.getByRole('button', { name: 'FR' }).click()
  await B.page.getByRole('button', { name: 'J’ai déjà un compte' }).click()
  await signIn(B.page, 'aicha@example.com')
  await expect(B.page.locator('h1').first()).toContainText('Aicha', { timeout: 15_000 })
  expect(server.records.get('user-1')?.get('settings/me')?.data?.serie).toBeTruthy()

  expect(A.errors).toEqual([])
  expect(B.errors).toEqual([])
})
