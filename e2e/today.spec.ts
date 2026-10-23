import { expect, test } from '@playwright/test'
import { createFakeServer, installFakeSupabase } from './fake-supabase'
import { onboard, readTable, trackErrors } from './helpers'

test.beforeEach(async ({ context }) => installFakeSupabase(context, createFakeServer()))

test('the next mission is one tap away, and always starts a focus session (not a break)', async ({ page }) => {
  const errors = trackErrors(page)
  await onboard(page)
  // The timer sits on a break, as it does right after a session
  await page.goto('/focus')
  await page.getByRole('radio', { name: '5 min', exact: true }).click()
  await page.goto('/')
  await expect(page.getByText(/Prochaine priorité/)).toBeVisible()
  await page.getByRole('button', { name: /Commencer · 25 min/ }).click()
  await expect(page).toHaveURL(/\/focus$/)
  const [s] = await readTable<{ timer: { mode: string; endsAt: number | null; chapterId: string | null } }>(page, 'settings')
  expect(s.timer.mode).toBe('pomodoro')
  expect(s.timer.endsAt).toBeGreaterThan(Date.now() + 24 * 60_000)
  expect(s.timer.chapterId).toBeTruthy()
  await page.goto('/')
  await expect(page.getByText('Session en cours')).toBeVisible()
  expect(errors).toEqual([])
})

test('one reminder at a time: saving progress first, closing it snoozes it', async ({ page }) => {
  await onboard(page)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('syncrobac')
        open.onsuccess = () => {
          const tx = open.result.transaction('days', 'readwrite')
          tx.objectStore('days').put({ date: '2026-01-05', updatedAt: 1 })
          tx.objectStore('days').put({ date: '2026-01-06', updatedAt: 1 })
          tx.oncomplete = () => resolve()
        }
      }),
  )
  await page.reload()
  await expect(page.getByText('Ta progression n’est que sur ce téléphone')).toBeVisible()
  await expect(page.getByText('Installe SyncroBac')).toHaveCount(0)
  await page.getByText('Ta progression n’est que sur ce téléphone').locator('xpath=../..').getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByText('Installe SyncroBac')).toBeVisible()
  const [s] = await readTable<{ dismissed: string[] }>(page, 'settings')
  expect(s.dismissed.some((d) => d.startsWith('account@'))).toBe(true)
})

test('"Réduire les animations" turns animations off on this phone', async ({ page }) => {
  await onboard(page)
  await page.goto('/settings')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full')
  await page.getByRole('switch', { name: 'Réduire les animations' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
})
