import { expect, test, type Route } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { onboard, trackErrors } from './helpers'

// Annales: the admin uploads a PDF, students find it under the subject and filter by year.
// Supabase is faked here (admin sign-in with two-factor, exam_papers, storage).

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const adminJwt = `${b64({ alg: 'none' })}.${b64({ sub: 'admin-1', email: 'admin@x.mr', aal: 'aal2', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
const DEFAULT_CONTENT = JSON.parse(readFileSync(new URL('../src/content/default-content.json', import.meta.url), 'utf8'))
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

test('admin uploads a past paper as a PDF', async ({ page }) => {
  const errors = trackErrors(page)
  const papers: Record<string, unknown>[] = []
  const files: { path: string; type: string; size: number }[] = []
  await page.context().route(/supabase\.co\//, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    if (path.endsWith('/auth/v1/token')) return json(route, 200, { access_token: adminJwt, refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { email: 'admin@x.mr' } })
    if (path.endsWith('/rest/v1/admins')) return json(route, 200, [{ user_id: 'admin-1' }])
    if (path.endsWith('/rest/v1/series')) return json(route, 200, [{ id: 'C' }, { id: 'D' }])
    if (path.endsWith('/rest/v1/subjects')) return json(route, 200, [{ id: 'maths', name_fr: 'Mathématiques' }, { id: 'physics', name_fr: 'Physique-Chimie' }])
    if (path.endsWith('/rest/v1/app_config')) return req.method() === 'GET' ? json(route, 200, [{ key: 'content_version', value: 3 }]) : route.fulfill({ status: 201 })
    if (path.endsWith('/rest/v1/exam_papers')) {
      if (req.method() === 'POST') {
        papers.push({ id: papers.length + 1, published: true, ...req.postDataJSON() })
        return route.fulfill({ status: 201 })
      }
      return json(route, 200, papers.filter((p) => `eq.${p.subject_id}` === url.searchParams.get('subject_id')))
    }
    if (path.includes('/storage/v1/object/exam-papers/') && req.method() === 'POST') {
      files.push({ path: path.split('/exam-papers/')[1], type: req.headers()['content-type'], size: req.postDataBuffer()?.length ?? 0 })
      return json(route, 200, { Key: path })
    }
    return json(route, 503, { message: 'not faked' })
  })

  await onboard(page)
  await page.goto('/admin')
  await page.getByLabel('Email').fill('admin@x.mr')
  await page.getByLabel('Mot de passe').fill('secret-password')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.getByRole('link', { name: 'Annales' }).or(page.getByRole('button', { name: 'Annales' })).first().click()

  await page.getByLabel('Série').selectOption('C')
  await page.getByRole('button', { name: 'Ajouter' }).click()
  await page.getByLabel('Année').fill('2024')
  await page.getByLabel(/Fichier PDF \(/).setInputFiles({ name: 'maths-2024.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sujet') })
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('status')).toContainText('Publié')

  expect(files).toHaveLength(1)
  expect(files[0].type).toBe('application/pdf')
  expect(files[0].path).toMatch(/^c\/maths\/2024-normale-subject-[a-z0-9]+\.pdf$/)
  expect(papers).toHaveLength(1)
  expect(papers[0]).toMatchObject({ serie_id: 'C', subject_id: 'maths', year: 2024, session: 'normale', kind: 'subject', file_path: files[0].path })
  await expect(page.getByText('2024 · Sujet')).toBeVisible()
  expect(errors).toEqual([])
})

test('students find past papers under the subject and filter them by year', async ({ page }) => {
  const errors = trackErrors(page)
  await onboard(page) // série C
  // Content as downloaded from Supabase: 2024 (sujet + corrigé), 2023 complémentaire, one paper of another série.
  await page.evaluate(
    (base) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('syncrobac')
        open.onsuccess = () => {
          const tx = open.result.transaction(['content'], 'readwrite')
          const exam = (id: number, year: number, kind: string, serie: string | null, session = 'normale') => ({ id, serie, subject: 'maths', year, session, kind, url: `https://files.example.org/${id}.pdf` })
          const exams = [exam(1, 2024, 'subject', 'C'), exam(2, 2024, 'solution', null), exam(3, 2023, 'subject', 'C', 'complementaire'), exam(4, 2022, 'subject', 'D')]
          tx.objectStore('content').put({ key: 'bundle', fetchedAt: Date.now(), bundle: { ...base, version: base.version + 1, exams } })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
    DEFAULT_CONTENT,
  )
  await page.reload() // the cached bundle is applied at startup
  await page.goto('/resources')
  await expect(page.getByText(/2 sujets/)).toBeVisible()
  await page.goto('/resources/maths')
  await expect(page.getByText('Sujets du BAC')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sujet' })).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Corrigé' })).toHaveAttribute('href', 'https://files.example.org/2.pdf')
  await expect(page.getByText('Session complémentaire')).toBeVisible()
  await expect(page.getByText('2022')).toHaveCount(0) // série D only

  await page.getByLabel('Toutes les années').selectOption('2023')
  await expect(page.getByRole('link', { name: 'Corrigé' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Sujet' })).toHaveCount(1)
  expect(errors).toEqual([])
})
