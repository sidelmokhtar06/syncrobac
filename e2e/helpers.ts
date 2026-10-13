import { expect, type Page } from '@playwright/test'

/** Walks through onboarding: welcome → série → … → app home. */
export async function onboard(page: Page, serie = /Mathématiques/) {
  await page.goto('/')
  // Steps slide in and out: wait for each one to settle before the next tap.
  const next = async (name: string | RegExp) => {
    await page.getByRole('button', { name }).click()
    await page.waitForTimeout(400)
  }
  await next('Suivant')
  await next('Passer')
  await page.getByRole('radio', { name: serie }).first().click()
  for (let i = 0; i < 3; i++) await next('Suivant')
  await next(/C’est parti/)
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 10_000 })
}

/** All rows of an IndexedDB table. */
export const readTable = <T = Record<string, unknown>>(page: Page, table: string) =>
  page.evaluate(
    (table) =>
      new Promise<T[]>((resolve) => {
        const open = indexedDB.open('syncrobac')
        open.onsuccess = () => {
          const q = open.result.transaction(table).objectStore(table).getAll()
          q.onsuccess = () => resolve(q.result)
        }
      }),
    table,
  )

/** Collects uncaught page errors; assert it's empty at the end of a test. */
export function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}
