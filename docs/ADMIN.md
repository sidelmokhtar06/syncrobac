# Managing SyncroBac content (admin)

Everything students see that isn't their own data — séries, subjects, coefficients,
chapters, recommended resources, BAC date — lives in Supabase. Change it there and every
student gets the update the next time they open the app online (offline phones keep the
last version they downloaded, and the bundled copy is always there as a fallback).

## One-time setup (≈10 min)

1. Create a free project at <https://supabase.com> (region close to Mauritania, e.g. EU West).
2. **SQL Editor** → paste and run `supabase/schema.sql`, then `supabase/seed.sql`.
   This creates the tables with today's content (5 séries, 233 chapters, links).
3. **Authentication → Users → Add user** with your email, then make yourself admin
   (SQL Editor):
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'YOUR_EMAIL';
   ```
4. **Settings → API**: copy the Project URL and the `anon` public key into
   `.env` (local) and into Vercel → Project → Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Redeploy. The anon key is safe to ship: security rules only allow reading.

## Everyday edits (Table Editor — like a spreadsheet)

| I want to… | Table | How |
|---|---|---|
| Add a resource for everyone | `resources` | New row: title, `https://` url, category (`group`/`site`/`video`/`app`), description FR/AR. Leave `serie_id` empty for all séries, or set it (`C`, `D`…) to target one. Untick `published` to hide. |
| Fix a coefficient | `serie_subjects` | Edit `coeff` on the (série, subject) row. |
| Add a subject to a série | `subjects` (if new) then `serie_subjects` | Set coeff, position, `source`. |
| Rename a subject for one série only | `serie_subjects` | Fill `name_fr` / `name_ar` (empty = catalog name). |
| Add / rename / reorder chapters | `chapters` | `position` sets the order, `weeks` the official pacing. **Never change `chapter_key`** of an existing chapter — students' progress is linked to it. |
| Mark a programme as verified | `serie_subjects.source` | `official` (verified), `draft`, or `generic`. |
| Change the BAC date | `app_config` | Row `bac_date`, value like `"2027-07-02T08:00:00Z"` (with quotes). |
| Add a série | `series` then `serie_subjects` + `chapters` | Set `active = false` to hide one. |

After a batch of edits, bump `app_config.content_version` (e.g. 1 → 2) so apps
replace their cached copy right away.

## Safety

- Row-level security: anyone can **read** published content; only users in `admins` can **write**.
- The app validates what it downloads; if a fetch fails or looks incomplete it keeps
  the previous content, so a mistake can't break students' apps.
- To regenerate the seed from the bundled JSON: `node scripts/gen-seed.mjs > supabase/seed.sql`.

## Later

A built-in `/admin` page (login + forms) can replace the Table Editor, plus moderation
of resources submitted by students.
