# Student accounts & sync: setup

Accounts are optional and passwordless: a 6-digit code by email, or Google. Progress is saved on
the phone first and synced to Supabase when online; the most recent edit of each item wins.

## 1. Database (once)

Supabase → **SQL Editor** → paste and run `supabase/accounts.sql` (safe to re-run).
It creates `user_records` (one row per synced item, each student sees only their own rows),
`sync_push` (merge, most recent wins) and `delete_my_account` (erases the account and its data).

## 2. Email codes

1. **Authentication → Sign In / Providers → Email**: keep it enabled, and **Allow new users to
   sign up** must be ON (students create their account with the code). The admin stays protected
   by the `admins` list and two-factor, so this does not open the admin.
2. **Authentication → Email Templates**: the code must appear in the email. In both
   **Magic Link** and **Confirm signup**, put the code in the body, for example:

   ```html
   <h2>Ton code SyncroBac</h2>
   <p>Saisis ce code dans l’app : <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>Il expire dans 1 heure. Si tu n’as rien demandé, ignore cet email.</p>
   ```
3. **Before real launch, configure your own email sender.** Supabase's built-in sender only sends
   a few emails per hour (fine for testing). Free option: [Resend](https://resend.com)
   (3,000 emails/month): create an account, verify a sender, then in Supabase →
   **Authentication → Emails → SMTP Settings** paste Resend's SMTP host, user and API key.

## 3. Google sign-in (optional)

1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services →
   OAuth consent screen** (External, app name SyncroBac, your email).
2. **Credentials → Create credentials → OAuth client ID** → *Web application*:
   - Authorized JavaScript origins: `https://syncrobac.vercel.app`
   - Authorized redirect URI: `https://yboqvzwhqoffhzbxtkkf.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret** into Supabase → **Authentication → Sign In /
   Providers → Google**, enable it, save. The "Continuer avec Google" button appears automatically.

## 4. Redirect URLs (needed for Google)

Supabase → **Authentication → URL Configuration**:
- Site URL: `https://syncrobac.vercel.app`
- Redirect URLs: `https://syncrobac.vercel.app/**` (add `http://localhost:4173/**` for local tests)

## How sync behaves

- Works offline; syncs on launch, every 3 minutes, when the phone is back online, a few seconds
  after each change, and with **Synchroniser maintenant** on the account page.
- First sign-in on a phone that already has progress: both are merged (nothing is lost).
- Synced: settings (name, série, goals, theme, language…), chapters, tasks, sessions, active days,
  custom chapters, saved links, mistake notebook. Not synced: the running timer and daily missions
  (regenerated each day).
- Sign out keeps the data on the phone. **Supprimer mon compte** erases the online data.
