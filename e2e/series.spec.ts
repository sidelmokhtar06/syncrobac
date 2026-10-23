import { expect, test } from '@playwright/test'
import { createFakeServer, installFakeSupabase } from './fake-supabase'
import { onboard, readTable, trackErrors } from './helpers'

// Launch with séries C and D only; TM, LM, LO stay in the data for later.
test.beforeEach(async ({ context }) => installFakeSupabase(context, createFakeServer()))

test('new students choose between C and D, the other séries are shown as coming soon', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Passer' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
  await expect(page.getByRole('radio', { name: /Mathématiques/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Sciences naturelles/ })).toBeVisible()
  await expect(page.getByText('Lettres modernes')).toBeVisible()
  await expect(page.getByText('Bientôt')).toHaveCount(3)
})

test('a student already in a closed série is asked to switch to C or D', async ({ page }) => {
  const errors = trackErrors(page)
  await onboard(page)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('syncrobac')
        open.onsuccess = () => {
          const store = open.result.transaction('settings', 'readwrite').objectStore('settings')
          const get = store.get(1)
          get.onsuccess = () => {
            store.put({ ...get.result, serie: 'TM' })
            resolve()
          }
        }
      }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Ta série n’est pas encore disponible')
  await page.getByRole('button', { name: 'Passer en série D' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect((await readTable<{ serie: string }>(page, 'settings'))[0].serie).toBe('D')
  await page.goto('/settings')
  await expect(page.getByLabel('Série', { exact: true }).getByRole('option')).toHaveCount(2)
  expect(errors).toEqual([])
})
