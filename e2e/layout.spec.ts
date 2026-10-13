import { expect, test } from '@playwright/test'
import { createFakeServer, installFakeSupabase } from './fake-supabase'
import { onboard } from './helpers'

test.beforeEach(async ({ context }) => installFakeSupabase(context, createFakeServer()))

const noHorizontalScroll = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

test('phone: bottom tab bar', async ({ page }) => {
  await onboard(page)
  const nav = page.getByRole('navigation')
  await expect(nav).toHaveCount(1)
  await expect(nav.getByRole('link', { name: 'Focus' })).toBeVisible()
  expect(await noHorizontalScroll(page)).toBe(true)
})

for (const [name, width, height] of [['tablet', 820, 1180], ['desktop', 1440, 900]] as const) {
  test(`${name}: side navigation and a wider column`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await onboard(page)
    const side = page.locator('nav').filter({ has: page.getByRole('link', { name: 'Ressources' }) }).first()
    await expect(side).toBeVisible()
    expect((await side.boundingBox())!.height).toBeGreaterThan(height * 0.9) // full-height rail, not a bottom bar
    await page.getByRole('link', { name: 'Matières' }).first().click()
    await expect(page).toHaveURL(/\/subjects$/)
    const column = await page.locator('main > div').boundingBox()
    expect(column!.width).toBeGreaterThan(600)
    expect(await noHorizontalScroll(page)).toBe(true)
  })
}

test('desktop admin sign-in stays a compact card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await onboard(page)
  await page.goto('/admin')
  const form = page.locator('form').first()
  await expect(form).toBeVisible()
  expect((await form.boundingBox())!.width).toBeLessThan(480)
  await expect(page.getByRole('link', { name: 'Ressources' })).toHaveCount(0) // no student nav in the admin
})
