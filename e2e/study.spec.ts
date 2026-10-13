import { expect, test } from '@playwright/test'
import { createFakeServer, installFakeSupabase } from './fake-supabase'
import { onboard, readTable, trackErrors } from './helpers'

test.beforeEach(async ({ context }) => installFakeSupabase(context, createFakeServer()))

test('focus session with a goal ends with a check-in that updates the chapter', async ({ page }) => {
  const errors = trackErrors(page)
  await onboard(page)
  await page.goto('/subjects/maths/complexes')
  await page.getByRole('button', { name: 'Focus sur ce chapitre' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByLabel('Objectif', { exact: true }).fill('Finir les exercices 1 à 5')
  await page.getByRole('button', { name: /Reprendre/ }).click()

  // Fast-forward: the session ends in 1.5 s instead of 25 min.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('syncrobac')
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite')
          const store = tx.objectStore('settings')
          store.get(1).onsuccess = (e) => {
            const s = (e.target as IDBRequest).result
            s.timer.endsAt = Date.now() + 1500
            store.put(s)
          }
          tx.oncomplete = () => resolve()
        }
      }),
  )
  await page.reload()
  await page.getByRole('button', { name: 'À revoir' }).click({ timeout: 15_000 })

  await expect.poll(async () => (await readTable<{ result?: string; goal?: string }>(page, 'sessions'))[0]).toMatchObject({ result: 'weak', goal: 'Finir les exercices 1 à 5' })
  const chapter = (await readTable<{ key: string; status: string }>(page, 'chapters')).find((c) => c.key === 'maths/complexes')
  expect(chapter?.status).toBe('learning')
  expect((await readTable<{ timer: { goal?: string } }>(page, 'settings'))[0].timer.goal).toBeFalsy()
  expect(errors).toEqual([])
})

test('mistake notebook: add from a chapter, find it in the notebook', async ({ page }) => {
  const errors = trackErrors(page)
  await onboard(page)
  await page.goto('/subjects/maths/complexes')
  await page.getByRole('button', { name: 'Ajouter au carnet' }).click()
  await page.getByLabel('Mon erreur').fill('J’ai oublié le conjugué au dénominateur')
  await page.getByLabel('La bonne méthode (optionnel)').fill('Multiplier haut et bas par le conjugué')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await page.goto('/mistakes')
  await expect(page.getByText('J’ai oublié le conjugué au dénominateur')).toBeVisible()
  expect(await readTable(page, 'mistakes')).toHaveLength(1)
  expect(errors).toEqual([])
})

test('every main page opens without errors', async ({ page }) => {
  const errors = trackErrors(page)
  await onboard(page)
  for (const path of ['/', '/plan', '/subjects', '/subjects/maths', '/focus', '/focus/history', '/resources', '/me', '/progress', '/simulator', '/settings', '/coffee', '/mistakes', '/account', '/feedback']) {
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByText('Oups, cette page a planté')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
