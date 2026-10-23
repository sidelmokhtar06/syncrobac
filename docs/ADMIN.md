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

## Security setup (do once, after setup.sql)

1. **Run `supabase/security.sql`** in the SQL Editor. From then on, writing content requires
   an admin **whose session passed two-factor** (authenticator code), and every change is
   recorded in `admin_audit` (who, when, before/after — cannot be erased, even by an admin).
2. **Disable public sign-ups**: Authentication → Sign In / Providers → Email → turn off
   *Allow new users to sign up*. Create accounts yourself from Authentication → Users.
   (Turn it back on later only when student accounts launch.)
3. **Create your admin user**: Authentication → Users → Add user → your email + a strong,
   unique password, tick **Auto Confirm User**. Then:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'YOUR_EMAIL';
   ```
4. First login on `/admin` asks you to **scan a QR code** with Google Authenticator or
   Microsoft Authenticator. Every later login asks for the 6-digit code.

Lost your phone? In the SQL Editor: `delete from auth.mfa_factors where user_id =
(select id from auth.users where email = 'YOUR_EMAIL');` then log in and scan a new QR code.

### What protects the admin

| Layer | Protection |
|---|---|
| Database (RLS) | Only `admins` + aal2 (two-factor) sessions can write; anonymous writes refused |
| Audit log | Every change to content/admins recorded by trigger, read-only |
| Session | Tab-only (sessionStorage), auto sign-out after 15 min idle |
| Site headers | Strict CSP (scripts from our domain only), no framing, HSTS, `/admin` noindex + no-store |
| Content | Only `https` links accepted (DB constraint + client filter) |

## Reaching the admin from the installed app

Settings → tap **“SyncroBac · version …”** 7 times. This opens `/admin` and adds an
**Administration** row in Profile on that device. It's only a shortcut: without your password
and authenticator code nothing can be changed.

## Everyday edits: the admin page

Open **https://syncrobac.vercel.app/admin** and sign in (password + authenticator code). On a
laptop the sections are listed on the left; on a phone they scroll horizontally. Sections:

- **Ressources**: add / edit / hide / delete recommended links, optionally for one série.
- **Annales**: past BAC papers per subject (and per série, or for all séries): year, session
  (normale / complémentaire), sujet or corrigé. Upload a PDF (20 MB max) or paste an https link;
  hide, open or delete. Students find them in Ressources → the subject → *Sujets du BAC*, with a
  year filter.
- **Matières**: per série, change coefficients, programme status (officiel / provisoire /
  générique), order, add an existing or new subject, remove one.
- **Chapitres**: per série + subject, rename (FR/AR), set official weeks, reorder, add, delete.
- **Retours**: messages students send from Profil → Donner mon avis (mark as treated, delete;
  a WhatsApp number or email opens directly), and crash reports grouped by error with the page,
  app version and technical trace.
- **Statistiques**: anonymous usage: active phones per day, new installs, which features are
  used, séries and languages. No names or emails: each phone has a random id, and students can
  turn it off in Réglages.
- **Général**: BAC date (applies to every student who hasn't set their own), content version,
  and the change journal (audit log).

Every save is published immediately (content version is bumped automatically).

### Turning on Retours and Statistiques (once)

Supabase → SQL Editor → run `supabase/insights.sql`. Until then those two sections say
"Indisponible". Anyone can send feedback or crash reports, only you (admin + two-factor) can read
them; a flood guard caps inserts per hour, and crash reports are dropped after 90 days.

### Turning on Annales (once)

Supabase → SQL Editor → run `supabase/exams.sql` (after `security.sql`). It creates the
`exam_papers` table and the public `exam-papers` storage bucket (PDF only, 20 MB max). Students
download without an account; only you (admin + two-factor) can upload or delete, and every change
is in the journal. Until it is run, the Annales section says "Indisponible" and the app shows no
papers (everything else keeps working).

## Advanced: Table Editor (like a spreadsheet)

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

When editing in the Table Editor directly, bump `app_config.content_version` afterwards
(e.g. 1 → 2) so apps replace their cached copy right away. The admin page does this for you.

## Safety

- Row-level security: anyone can **read** published content; only users in `admins` can **write**.
- The app validates what it downloads; if a fetch fails or looks incomplete it keeps
  the previous content, so a mistake can't break students' apps.
- To regenerate the seed from the bundled JSON: `node scripts/gen-seed.mjs > supabase/seed.sql`.

## Later

Moderation queue for resources submitted by students (needs student accounts).
