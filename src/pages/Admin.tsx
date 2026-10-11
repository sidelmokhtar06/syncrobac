import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Eye, EyeOff, History, KeyRound, LogOut, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { EASE, Item, Stagger } from '../components/motion'
import { Button, Chip, IconButton, PageHeader, SectionTitle, Segmented, Select, inputClass } from '../components/ui'
import { aal, adminConfigured, api, currentEmail, enrollTotp, isAdmin, publish, signIn, signOut, slugKey, verifiedTotp, verifyTotp } from '../lib/admin'
import { cn } from '../lib/cn'
import { refreshContent } from '../lib/contentSync'

// Internal tool for the app owner (French only, always LTR). Students never see it: no public
// link, own chunk. Access: password → two-factor code (TOTP) → admin check. Writes are enforced
// server-side (RLS requires admin + aal2), this UI only mirrors those rules.

const IDLE_MS = 15 * 60_000

type Tab = 'resources' | 'subjects' | 'chapters' | 'general'
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export default function Admin() {
  const [state, setState] = useState<'loading' | 'signedOut' | 'mfa' | 'enroll' | 'notAdmin' | 'ready'>('loading')
  const [factorId, setFactorId] = useState('')
  const [expired, setExpired] = useState(false)
  const [tab, setTab] = useState<Tab>('resources')
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  const check = useCallback(async () => {
    if (!currentEmail()) return setState('signedOut')
    try {
      // Two-factor is mandatory: password-only sessions must enroll or confirm a code first.
      if (aal() !== 'aal2') {
        const factor = await verifiedTotp()
        if (factor) {
          setFactorId(factor.id)
          return setState('mfa')
        }
        return setState('enroll')
      }
      setState((await isAdmin()) ? 'ready' : 'notAdmin')
    } catch {
      signOut()
      setState('signedOut')
    }
  }, [])
  useEffect(() => void check(), [check])

  const leave = useCallback(() => {
    signOut()
    setState('signedOut')
  }, [])

  // Auto sign-out after 15 minutes without interaction.
  useEffect(() => {
    if (state === 'signedOut' || state === 'loading') return
    let last = Date.now()
    const bump = () => (last = Date.now())
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }))
    const id = setInterval(() => {
      if (Date.now() - last > IDLE_MS) {
        setExpired(true)
        leave()
      }
    }, 30_000)
    return () => {
      clearInterval(id)
      events.forEach((e) => window.removeEventListener(e, bump, { capture: true }))
    }
  }, [state, leave])

  // Every write goes through here: run it, publish a new content version, refresh this device.
  const save = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      const v = await publish()
      await refreshContent()
      setToast({ ok: true, text: `Publié · version ${v}` })
      return true
    } catch (e) {
      setToast({ ok: false, text: (e as Error).message })
      return false
    } finally {
      setTimeout(() => setToast(null), 3000)
    }
  }, [])

  return (
    <div dir="ltr" lang="fr" className="text-start">
      {!adminConfigured ? (
        <Notice text="Supabase n’est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)." />
      ) : state === 'loading' ? null : state === 'signedOut' ? (
        <Login onDone={() => (setExpired(false), check())} expired={expired} />
      ) : state === 'mfa' ? (
        <TotpChallenge factorId={factorId} onDone={check} onCancel={leave} />
      ) : state === 'enroll' ? (
        <TotpEnroll onDone={check} onCancel={leave} />
      ) : state === 'notAdmin' ? (
        <NotAdmin onSignOut={leave} />
      ) : (
        <Panel tab={tab} setTab={setTab} save={save} toast={toast} onSignOut={leave} />
      )}
    </div>
  )
}

function Panel({ tab, setTab, save, toast, onSignOut }: { tab: Tab; setTab: (t: Tab) => void; save: Save; toast: { ok: boolean; text: string } | null; onSignOut: () => void }) {
  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader
          title="Administration"
          subtitle={
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-success" /> {currentEmail()} · 2FA
            </span>
          }
          action={
            <IconButton label="Se déconnecter" onClick={onSignOut}>
              <LogOut size={18} />
            </IconButton>
          }
        />
      </Item>
      <Item>
        <Segmented<Tab>
          id="admin-tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'resources', label: 'Ressources' },
            { value: 'subjects', label: 'Matières' },
            { value: 'chapters', label: 'Chapitres' },
            { value: 'general', label: 'Général' },
          ]}
        />
      </Item>
      <Item>
        {tab === 'resources' && <ResourcesAdmin save={save} />}
        {tab === 'subjects' && <SubjectsAdmin save={save} />}
        {tab === 'chapters' && <ChaptersAdmin save={save} />}
        {tab === 'general' && <GeneralAdmin save={save} />}
      </Item>

      <AnimatePresence>
        {toast && (
          <m.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn('fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-xl', toast.ok ? 'bg-success text-bg' : 'bg-danger text-white')}
          >
            {toast.ok ? <Check size={16} /> : <ShieldAlert size={16} />}
            {toast.text}
          </m.div>
        )}
      </AnimatePresence>
    </Stagger>
  )
}

type Save = (fn: () => Promise<unknown>) => Promise<boolean>

// ── Auth screens ────────────────────────────────────────────────────────

function Login({ onDone, expired }: { onDone: () => void; expired: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex min-h-[70vh] flex-col justify-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoMark animated className="h-12 w-auto" />
        <h1 className="text-2xl">Administration</h1>
        <p className="text-sm text-ink-2">Connecte-toi avec ton compte Supabase.</p>
      </div>
      {expired && <p className="rounded-xl border border-warning/40 bg-warning/8 p-3 text-sm text-warning">Session fermée après 15 minutes d’inactivité.</p>}
      <form
        className="card flex flex-col gap-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          try {
            await signIn(email.trim(), password)
            onDone()
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={inputClass} dir="ltr" />
        <div className="relative">
          <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" aria-label="Mot de passe" className={cn(inputClass, 'w-full pe-12')} dir="ltr" />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Masquer' : 'Afficher'} className="absolute end-0 top-0 grid size-11 place-items-center text-ink-3">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  )
}

function CodeInput({ onSubmit, busy, error }: { onSubmit: (code: string) => void; busy: boolean; error: string }) {
  const [code, setCode] = useState('')
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (code.length === 6) onSubmit(code)
      }}
    >
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        aria-label="Code à 6 chiffres"
        className={cn(inputClass, 'tnum h-14 text-center text-2xl tracking-[0.4em]')}
      />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" block disabled={busy || code.length !== 6}>
        {busy ? 'Vérification…' : 'Vérifier'}
      </Button>
    </form>
  )
}

function useVerify(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (factorId: string, code: string) => {
    setBusy(true)
    setError('')
    try {
      await verifyTotp(factorId, code)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function TotpChallenge({ factorId, onDone, onCancel }: { factorId: string; onDone: () => void; onCancel: () => void }) {
  const v = useVerify(onDone)
  return (
    <div className="flex min-h-[70vh] flex-col justify-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent/12 text-accent">
          <KeyRound size={26} />
        </span>
        <h1 className="text-2xl">Code de sécurité</h1>
        <p className="max-w-xs text-sm text-ink-2">Ouvre ton application d’authentification et saisis le code SyncroBac à 6 chiffres.</p>
      </div>
      <div className="card p-5">
        <CodeInput busy={v.busy} error={v.error} onSubmit={(code) => v.run(factorId, code)} />
      </div>
      <Button variant="ghost" onClick={onCancel}>
        <LogOut size={16} /> Annuler
      </Button>
    </div>
  )
}

function TotpEnroll({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const [error, setError] = useState('')
  const v = useVerify(onDone)
  useEffect(() => {
    enrollTotp().then(setSetup, (e) => setError((e as Error).message))
  }, [])
  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent/12 text-accent">
          <ShieldCheck size={26} />
        </span>
        <h1 className="text-2xl">Activer la double authentification</h1>
        <p className="max-w-xs text-sm text-ink-2">Obligatoire pour l’administration : même avec ton mot de passe, personne ne pourra modifier le contenu sans ton téléphone.</p>
      </div>
      <ol className="card flex flex-col gap-4 p-5 text-sm">
        <li>
          <span className="font-medium">1.</span> Installe Google Authenticator ou Microsoft Authenticator.
        </li>
        <li className="flex flex-col gap-3">
          <span>
            <span className="font-medium">2.</span> Scanne ce QR code dans l’application :
          </span>
          {setup ? (
            <>
              <img src={setup.qr} alt="QR code de double authentification" className="mx-auto size-48 rounded-xl bg-white p-2" />
              <details className="text-xs text-ink-3">
                <summary className="min-h-11 cursor-pointer py-3">Impossible de scanner ? Saisir la clé à la main</summary>
                <code className="block rounded-lg bg-bg p-3 break-all text-ink-2" dir="ltr">{setup.secret}</code>
              </details>
            </>
          ) : (
            <p className="text-ink-3">{error || 'Préparation…'}</p>
          )}
        </li>
        <li className="flex flex-col gap-3">
          <span>
            <span className="font-medium">3.</span> Saisis le code affiché pour confirmer :
          </span>
          <CodeInput busy={v.busy || !setup} error={v.error} onSubmit={(code) => setup && v.run(setup.factorId, code)} />
        </li>
      </ol>
      <Button variant="ghost" onClick={onCancel}>
        <LogOut size={16} /> Annuler
      </Button>
    </div>
  )
}

function NotAdmin({ onSignOut }: { onSignOut: () => void }) {
  const sql = `insert into admins (user_id) select id from auth.users where email = '${currentEmail()}';`
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex min-h-[70vh] flex-col justify-center gap-5">
      <div className="card flex flex-col gap-3 p-5">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <ShieldAlert size={18} /> Compte non administrateur
        </p>
        <p className="text-sm text-ink-2">
          Connecté en tant que <span className="text-ink">{currentEmail()}</span>. Pour lui donner les droits, exécute ceci dans Supabase → SQL Editor, puis recharge cette page :
        </p>
        <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-xs text-ink-2" dir="ltr">{sql}</pre>
        <Button variant="secondary" onClick={() => (navigator.clipboard?.writeText(sql), setCopied(true))}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copié' : 'Copier la requête'}
        </Button>
      </div>
      <Button variant="ghost" onClick={onSignOut}>
        <LogOut size={16} /> Changer de compte
      </Button>
    </div>
  )
}

function Notice({ text }: { text: string }) {
  return <p className="card mt-10 p-5 text-sm text-ink-2">{text}</p>
}

// ── Shared bits ─────────────────────────────────────────────────────────

function useTable<T extends Row>(path: string | null) {
  const [rows, setRows] = useState<T[] | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    if (!path) return setRows([])
    try {
      setRows(await api<T[]>(path))
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [path])
  useEffect(() => void reload(), [reload])
  return { rows, error, reload }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink-3">{label}</span>
      {children}
    </label>
  )
}

const SERIE_OPTIONS = (series: Row[] | null) => (series ?? []).map((s) => ({ value: s.id as string, label: s.id as string }))

function swapPositions(table: string, a: Row, b: Row, keyOf: (r: Row) => string) {
  return Promise.all([
    api(`${table}?${keyOf(a)}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ position: b.position }) }),
    api(`${table}?${keyOf(b)}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify({ position: a.position }) }),
  ])
}

// ── Resources ───────────────────────────────────────────────────────────

const EMPTY_RES = { title: '', url: 'https://', category: 'site', description_fr: '', description_ar: '', serie_id: '', published: true }

function ResourcesAdmin({ save }: { save: Save }) {
  const { rows, error, reload } = useTable('resources?select=*&order=position,created_at')
  const { rows: series } = useTable('series?select=id&order=position')
  const [edit, setEdit] = useState<Row | null>(null)

  const submit = async () => {
    if (!edit) return
    const { id: _id, created_at: _created, ...fields } = edit
    const body = { ...fields, serie_id: edit.serie_id || null, title: edit.title.trim(), url: edit.url.trim() }
    const ok = await save(() =>
      edit.id
        ? api(`resources?id=eq.${edit.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : api('resources', { method: 'POST', body: JSON.stringify({ ...body, position: rows?.length ?? 0 }) }),
    )
    if (ok) {
      setEdit(null)
      reload()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle action={<Button onClick={() => setEdit({ ...EMPTY_RES })}><Plus size={16} /> Ajouter</Button>}>
        Ressources recommandées <span className="tnum text-ink-3">· {rows?.length ?? '…'}</span>
      </SectionTitle>
      {error && <p className="text-sm text-danger">{error}</p>}

      <AnimatePresence initial={false}>
        {edit && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="card flex flex-col gap-3 p-4">
              <Field label="Titre"><input className={inputClass} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Lien (https://)"><input className={inputClass} dir="ltr" inputMode="url" value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Catégorie">
                  <Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                    <option value="site">Site</option>
                    <option value="group">Groupe</option>
                    <option value="video">Vidéo</option>
                    <option value="app">App</option>
                  </Select>
                </Field>
                <Field label="Série">
                  <Select value={edit.serie_id ?? ''} onChange={(e) => setEdit({ ...edit, serie_id: e.target.value })}>
                    <option value="">Toutes</option>
                    {SERIE_OPTIONS(series).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Description (FR)"><input className={inputClass} value={edit.description_fr ?? ''} onChange={(e) => setEdit({ ...edit, description_fr: e.target.value })} /></Field>
              <Field label="الوصف (AR)"><input className={inputClass} dir="rtl" lang="ar" value={edit.description_ar ?? ''} onChange={(e) => setEdit({ ...edit, description_ar: e.target.value })} /></Field>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} className="size-5 accent-accent" />
                Publié (visible par les élèves)
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setEdit(null)}>Annuler</Button>
                <Button className="flex-1" disabled={!edit.title.trim() || !/^https:\/\/\S+\.\S+/.test(edit.url)} onClick={submit}>Enregistrer</Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className="card divide-y divide-line">
        {rows?.map((r) => (
          <div key={r.id} className="flex min-h-15 items-center gap-2 px-3 py-2">
            <button onClick={() => setEdit({ ...r, serie_id: r.serie_id ?? '' })} className="min-w-0 flex-1 text-start">
              <span className="flex items-center gap-2">
                <span className={cn('truncate text-sm font-medium', !r.published && 'text-ink-3 line-through')}>{r.title}</span>
                {r.serie_id && <Chip>{r.serie_id}</Chip>}
              </span>
              <span className="block truncate text-xs text-ink-3" dir="ltr">{r.url}</span>
            </button>
            <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir" className="grid size-11 place-items-center text-ink-3"><ExternalLink size={16} /></a>
            <button
              aria-label="Supprimer"
              className="grid size-11 place-items-center text-ink-3 hover:text-danger"
              onClick={async () => confirm(`Supprimer « ${r.title} » ?`) && (await save(() => api(`resources?id=eq.${r.id}`, { method: 'DELETE', prefer: 'return=minimal' }))) && reload()}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {rows?.length === 0 && <p className="p-4 text-sm text-ink-3">Aucune ressource.</p>}
      </div>
    </div>
  )
}

// ── Subjects & coefficients per série ───────────────────────────────────

function SubjectsAdmin({ save }: { save: Save }) {
  const { rows: series } = useTable('series?select=*&order=position')
  const [serie, setSerie] = useState<string>('')
  useEffect(() => void (series?.length && !serie && setSerie(series[0].id)), [series, serie])
  const { rows, reload } = useTable(serie ? `serie_subjects?serie_id=eq.${serie}&select=*,subjects(*)&order=position` : null)
  const { rows: catalog, reload: reloadCatalog } = useTable('subjects?select=*&order=name_fr')
  const [adding, setAdding] = useState<{ subject: string; newId: string; fr: string; ar: string; coeff: number } | null>(null)
  const key = (r: Row) => `serie_id=eq.${r.serie_id}&subject_id=eq.${r.subject_id}`

  const patch = (r: Row, body: Row) => save(() => api(`serie_subjects?${key(r)}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify(body) })).then(reload)
  const available = (catalog ?? []).filter((c) => !rows?.some((r) => r.subject_id === c.id))

  return (
    <div className="flex flex-col gap-4">
      {series && <Segmented id="adm-serie" value={serie} onChange={setSerie} options={SERIE_OPTIONS(series)} />}
      <SectionTitle action={<Button variant="secondary" onClick={() => setAdding({ subject: available[0]?.id ?? '__new', newId: '', fr: '', ar: '', coeff: 2 })}><Plus size={16} /> Matière</Button>}>
        Matières et coefficients
      </SectionTitle>

      {adding && (
        <div className="card flex flex-col gap-3 p-4">
          <Field label="Matière">
            <Select value={adding.subject} onChange={(e) => setAdding({ ...adding, subject: e.target.value })}>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
              <option value="__new">+ Nouvelle matière…</option>
            </Select>
          </Field>
          {adding.subject === '__new' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Identifiant (ex : economie)"><input className={inputClass} dir="ltr" value={adding.newId} onChange={(e) => setAdding({ ...adding, newId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
              <Field label="Coefficient"><input type="number" min={1} max={12} className={inputClass} value={adding.coeff} onChange={(e) => setAdding({ ...adding, coeff: +e.target.value })} /></Field>
              <Field label="Nom (FR)"><input className={inputClass} value={adding.fr} onChange={(e) => setAdding({ ...adding, fr: e.target.value })} /></Field>
              <Field label="الاسم (AR)"><input className={inputClass} dir="rtl" value={adding.ar} onChange={(e) => setAdding({ ...adding, ar: e.target.value })} /></Field>
            </div>
          )}
          {adding.subject !== '__new' && (
            <Field label="Coefficient"><input type="number" min={1} max={12} className={inputClass} value={adding.coeff} onChange={(e) => setAdding({ ...adding, coeff: +e.target.value })} /></Field>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAdding(null)}>Annuler</Button>
            <Button
              className="flex-1"
              disabled={adding.coeff <= 0 || (adding.subject === '__new' && (!adding.newId || !adding.fr || !adding.ar))}
              onClick={async () => {
                const subjectId = adding.subject === '__new' ? adding.newId : adding.subject
                const ok = await save(async () => {
                  if (adding.subject === '__new') await api('subjects', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({ id: subjectId, name_fr: adding.fr, name_ar: adding.ar }) })
                  await api('serie_subjects', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify({ serie_id: serie, subject_id: subjectId, coeff: adding.coeff, position: rows?.length ?? 0 }) })
                })
                if (ok) {
                  setAdding(null)
                  reload()
                  reloadCatalog()
                }
              }}
            >
              Ajouter
            </Button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-line">
        {rows?.map((r, i) => (
          <div key={r.subject_id} className="flex flex-col gap-2 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium">{r.name_fr ?? r.subjects?.name_fr}</span>
              <IconButton label="Monter" disabled={i === 0} className="size-9 disabled:opacity-30" onClick={() => save(() => swapPositions('serie_subjects', r, rows[i - 1], key)).then(reload)}><ArrowUp size={16} /></IconButton>
              <IconButton label="Descendre" disabled={i === rows.length - 1} className="size-9 disabled:opacity-30" onClick={() => save(() => swapPositions('serie_subjects', r, rows[i + 1], key)).then(reload)}><ArrowDown size={16} /></IconButton>
              <IconButton
                label="Retirer de la série"
                className="size-9 hover:text-danger"
                onClick={async () => confirm(`Retirer ${r.subjects?.name_fr} de la série ${serie} ? Ses chapitres pour cette série seront supprimés.`) && (await save(() => api(`serie_subjects?${key(r)}`, { method: 'DELETE', prefer: 'return=minimal' }))) && reload()}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-2">
              <Field label="Coeff">
                <input type="number" min={1} max={12} step={0.5} defaultValue={r.coeff} className={cn(inputClass, 'tnum')} onBlur={(e) => +e.target.value > 0 && +e.target.value !== Number(r.coeff) && patch(r, { coeff: +e.target.value })} />
              </Field>
              <Field label="Programme">
                <Select value={r.source} onChange={(e) => patch(r, { source: e.target.value })}>
                  <option value="official">Officiel (vérifié)</option>
                  <option value="draft">Provisoire</option>
                  <option value="generic">Générique</option>
                </Select>
              </Field>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-3">Les modifications sont publiées dès que tu quittes le champ.</p>
    </div>
  )
}

// ── Chapters ────────────────────────────────────────────────────────────

function ChaptersAdmin({ save }: { save: Save }) {
  const { rows: series } = useTable('series?select=*&order=position')
  const [serie, setSerie] = useState('')
  const [subject, setSubject] = useState('')
  useEffect(() => void (series?.length && !serie && setSerie(series[0].id)), [series, serie])
  const { rows: subjects } = useTable(serie ? `serie_subjects?serie_id=eq.${serie}&select=subject_id,subjects(name_fr)&order=position` : null)
  useEffect(() => {
    if (subjects?.length && !subjects.some((x) => x.subject_id === subject)) setSubject(subjects[0].subject_id)
  }, [subjects, subject])
  const { rows, reload } = useTable(serie && subject ? `chapters?serie_id=eq.${serie}&subject_id=eq.${subject}&select=*&order=position` : null)
  const [draft, setDraft] = useState({ fr: '', ar: '', weeks: '' })
  const key = (r: Row) => `serie_id=eq.${r.serie_id}&subject_id=eq.${r.subject_id}&chapter_key=eq.${encodeURIComponent(r.chapter_key)}`
  const patch = (r: Row, body: Row) => save(() => api(`chapters?${key(r)}`, { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify(body) })).then(reload)

  return (
    <div className="flex flex-col gap-4">
      {series && <Segmented id="adm-serie-ch" value={serie} onChange={setSerie} options={SERIE_OPTIONS(series)} />}
      <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Matière">
        {subjects?.map((x) => <option key={x.subject_id} value={x.subject_id}>{x.subjects?.name_fr}</option>)}
      </Select>

      <div className="card divide-y divide-line">
        {rows?.map((r, i) => (
          <div key={r.chapter_key} className="flex flex-col gap-2 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="tnum w-6 text-sm text-ink-3">{i + 1}.</span>
              <input defaultValue={r.title_fr} aria-label="Titre FR" className={cn(inputClass, 'min-w-0 flex-1')} onBlur={(e) => e.target.value.trim() && e.target.value !== r.title_fr && patch(r, { title_fr: e.target.value.trim() })} />
              <IconButton label="Monter" disabled={i === 0} className="size-9 disabled:opacity-30" onClick={() => save(() => swapPositions('chapters', r, rows[i - 1], key)).then(reload)}><ArrowUp size={16} /></IconButton>
              <IconButton label="Descendre" disabled={i === rows.length - 1} className="size-9 disabled:opacity-30" onClick={() => save(() => swapPositions('chapters', r, rows[i + 1], key)).then(reload)}><ArrowDown size={16} /></IconButton>
            </div>
            <div className="flex items-center gap-2 ps-8">
              <input defaultValue={r.title_ar} aria-label="Titre AR" dir="rtl" lang="ar" className={cn(inputClass, 'min-w-0 flex-1')} onBlur={(e) => e.target.value.trim() && e.target.value !== r.title_ar && patch(r, { title_ar: e.target.value.trim() })} />
              <input type="number" min={0} max={12} defaultValue={r.weeks ?? ''} placeholder="sem." aria-label="Semaines" className={cn(inputClass, 'tnum w-16 text-center')} onBlur={(e) => String(r.weeks ?? '') !== e.target.value && patch(r, { weeks: e.target.value ? +e.target.value : null })} />
              <IconButton
                label="Supprimer"
                className="size-9 hover:text-danger"
                onClick={async () => confirm(`Supprimer « ${r.title_fr} » ? La progression des élèves sur ce chapitre ne sera plus affichée.`) && (await save(() => api(`chapters?${key(r)}`, { method: 'DELETE', prefer: 'return=minimal' }))) && reload()}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
        ))}
        {rows?.length === 0 && <p className="p-4 text-sm text-ink-3">Aucun chapitre pour cette matière.</p>}
      </div>

      <div className="card flex flex-col gap-3 p-4">
        <p className="text-sm font-medium">Nouveau chapitre</p>
        <input className={inputClass} placeholder="Titre (FR)" value={draft.fr} onChange={(e) => setDraft({ ...draft, fr: e.target.value })} />
        <div className="flex gap-2">
          <input className={cn(inputClass, 'min-w-0 flex-1')} dir="rtl" lang="ar" placeholder="العنوان (AR)" value={draft.ar} onChange={(e) => setDraft({ ...draft, ar: e.target.value })} />
          <input type="number" min={0} max={12} className={cn(inputClass, 'w-20 text-center')} placeholder="sem." value={draft.weeks} onChange={(e) => setDraft({ ...draft, weeks: e.target.value })} />
        </div>
        <Button
          disabled={!draft.fr.trim() || !draft.ar.trim() || !subject}
          onClick={async () => {
            const chapter_key = slugKey(draft.fr, new Set(rows?.map((r) => r.chapter_key)))
            const ok = await save(() =>
              api('chapters', {
                method: 'POST',
                prefer: 'return=minimal',
                body: JSON.stringify({ serie_id: serie, subject_id: subject, chapter_key, title_fr: draft.fr.trim(), title_ar: draft.ar.trim(), weeks: draft.weeks ? +draft.weeks : null, position: rows?.length ?? 0 }),
              }),
            )
            if (ok) {
              setDraft({ fr: '', ar: '', weeks: '' })
              reload()
            }
          }}
        >
          <Plus size={16} /> Ajouter le chapitre
        </Button>
      </div>
    </div>
  )
}

// ── General ─────────────────────────────────────────────────────────────

function GeneralAdmin({ save }: { save: Save }) {
  const { rows, reload } = useTable('app_config?select=*')
  const cfg = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))
  const [date, setDate] = useState('')
  useEffect(() => void (cfg.bac_date && !date && setDate(String(cfg.bac_date).slice(0, 10))), [cfg.bac_date, date])

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3 p-4">
        <Field label="Date du BAC (début des épreuves)">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button
          disabled={!date || String(cfg.bac_date ?? '').slice(0, 10) === date}
          onClick={() =>
            save(() => api('app_config?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: JSON.stringify({ key: 'bac_date', value: `${date}T08:00:00Z` }) })).then(reload)
          }
        >
          Enregistrer la date
        </Button>
        <p className="text-xs text-ink-3">S’applique à tous les élèves, sauf ceux qui ont choisi leur propre date dans Réglages.</p>
      </div>
      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-ink-2">Version du contenu</p>
          <p className="tnum text-2xl font-semibold">{cfg.content_version ?? '…'}</p>
        </div>
        <Button variant="secondary" onClick={() => save(async () => undefined).then(reload)}>
          Republier
        </Button>
      </div>
      <AuditLog />
      <a href="https://supabase.com/dashboard/project/yboqvzwhqoffhzbxtkkf/editor" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 text-sm text-accent">
        <ExternalLink size={16} /> Ouvrir l’éditeur de tables Supabase
      </a>
    </div>
  )
}

// Read-only journal of every content change (filled by a database trigger, can't be erased).
function AuditLog() {
  const { rows, error } = useTable('admin_audit?select=*&order=at.desc&limit=30')
  const label = (r: Row) => {
    const row = r.row_new ?? r.row_old ?? {}
    return row.title ?? row.title_fr ?? row.name_fr ?? row.key ?? row.subject_id ?? row.id ?? ''
  }
  return (
    <div>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <History size={16} /> Journal des modifications
        </span>
      </SectionTitle>
      {error ? (
        <p className="card p-4 text-xs text-ink-3">Journal indisponible : exécute supabase/security.sql dans Supabase.</p>
      ) : (
        <div className="card divide-y divide-line">
          {rows?.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Chip tone={r.action === 'DELETE' ? 'warning' : r.action === 'INSERT' ? 'success' : 'neutral'}>{r.action}</Chip>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.table_name} · {String(label(r))}</span>
                <span className="block truncate text-xs text-ink-3">
                  {new Date(r.at).toLocaleString('fr-FR')} · {r.email}
                </span>
              </span>
            </div>
          ))}
          {rows?.length === 0 && <p className="p-4 text-sm text-ink-3">Aucune modification pour l’instant.</p>}
        </div>
      )}
    </div>
  )
}
