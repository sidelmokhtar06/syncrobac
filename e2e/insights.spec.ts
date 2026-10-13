import { expect, test } from '@playwright/test'
import { createFakeServer, installFakeSupabase, type FakeServer } from './fake-supabase'
import { onboard } from './helpers'

let server: FakeServer
test.beforeEach(async ({ context }) => {
  server = createFakeServer()
  await installFakeSupabase(context, server)
})

test('a student sends feedback without an account', async ({ page }) => {
  await onboard(page)
  await page.goto('/me')
  await page.getByRole('link', { name: /Donner mon avis/ }).click()
  await page.getByRole('radio', { name: 'Contenu' }).click()
  await page.getByLabel('Ton message').fill('Le chapitre Suites manque en série D')
  await page.getByLabel(/Email ou WhatsApp/).fill('37360696')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByText('Merci ! Ton message est bien arrivé.')).toBeVisible()
  expect(server.feedback).toHaveLength(1)
  expect(server.feedback[0]).toMatchObject({ kind: 'content', message: 'Le chapitre Suites manque en série D', contact: '37360696', user_id: null })
  expect(server.feedback[0].context.serie).toBe('C')
})

test('crashes are reported once, with the page and version', async ({ page }) => {
  await onboard(page)
  await page.goto('/progress')
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) dispatchEvent(new ErrorEvent('error', { error: new TypeError('boom from test') }))
  })
  await expect.poll(() => server.errors.length).toBe(1)
  expect(server.errors[0]).toMatchObject({ message: 'TypeError: boom from test', page: '/progress' })
  expect(server.errors[0].app_version).toMatch(/^\d+\.\d+\.\d+$/)
})

test('anonymous usage is sent, and nothing once the student turns it off', async ({ page }) => {
  await onboard(page)
  for (const path of ['/focus', '/plan']) {
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible()
  }
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))) // still visible: no flush
  await expect.poll(() => server.usage.length, { timeout: 20_000 }).toBeGreaterThan(0)
  const last = server.usage.at(-1)!
  expect(last.p_features).toEqual(expect.arrayContaining(['open', 'home', 'focus', 'plan']))
  expect(last.p_device).toMatch(/^[0-9a-f-]{36}$/)
  expect(JSON.stringify(last)).not.toContain('@') // nothing personal

  await page.goto('/settings')
  await page.getByRole('switch', { name: 'Statistiques anonymes' }).click()
  const before = server.usage.length
  await page.goto('/mistakes')
  await page.waitForTimeout(12_000)
  expect(server.usage.length).toBe(before)
})
