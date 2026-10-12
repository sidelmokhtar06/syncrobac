import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import { AuthError, isGoogleEnabled, sendEmailCode, signInWithGoogle, verifyEmailCode } from '../lib/auth'
import { cn } from '../lib/cn'
import { useT, type TKey } from '../lib/i18n'
import { syncNow } from '../lib/sync'
import { EASE } from './motion'
import { Button, inputClass } from './ui'

const ERRORS: Record<AuthError['code'], TKey> = {
  rate_limit: 'errRateLimit',
  invalid_code: 'errInvalidCode',
  invalid_email: 'errInvalidEmail',
  offline: 'errOffline',
  unknown: 'errUnknown',
}

/** Passwordless sign-in: email → 6-digit code, or Google. Syncs right after signing in. */
export function AccountLogin({ onDone }: { onDone?: () => void }) {
  const { t, lang } = useT()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [google, setGoogle] = useState(false)
  useEffect(() => void isGoogleEnabled().then(setGoogle), [])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(t(ERRORS[e instanceof AuthError ? e.code : 'unknown']))
    } finally {
      setBusy(false)
    }
  }

  const send = () =>
    run(async () => {
      await sendEmailCode(email.trim().toLowerCase())
      setStep('code')
    })

  const verify = () =>
    run(async () => {
      await verifyEmailCode(email.trim().toLowerCase(), code)
      await syncNow()
      onDone?.()
    })

  const Back = lang === 'ar' ? ArrowRight : ArrowLeft
  const Fwd = lang === 'ar' ? ArrowLeft : ArrowRight

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'email' ? (
          <m.form
            key="email"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (/^\S+@\S+\.\S+$/.test(email.trim())) send()
            }}
          >
            <label className="relative block">
              <Mail size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailLabel')}
                aria-label={t('emailLabel')}
                dir="ltr"
                className={cn(inputClass, 'h-12 w-full ps-10 text-start')}
              />
            </label>
            <Button type="submit" size="lg" block disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}>
              {t('sendCode')}
              <Fwd size={18} />
            </Button>
          </m.form>
        ) : (
          <m.form
            key="code"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.length === 6) verify()
            }}
          >
            <p className="text-sm text-ink-2">
              {t('codeSentTo')} <bdi className="font-medium text-ink">{email}</bdi>. {t('enterCode')}
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              aria-label={t('enterCode')}
              dir="ltr"
              className={cn(inputClass, 'tnum h-14 text-center text-2xl tracking-[0.4em]')}
            />
            <Button type="submit" size="lg" block disabled={busy || code.length !== 6}>
              {t('verify')}
            </Button>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => (setStep('email'), setCode(''), setError(''))}>
                <Back size={16} />
                {t('changeEmail')}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={send}>
                {t('resend')}
              </Button>
            </div>
          </m.form>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {google && step === 'email' && (
        <>
          <div className="flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-line" />
            {t('orWord')}
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" size="lg" block onClick={signInWithGoogle}>
            <GoogleMark />
            {t('continueGoogle')}
          </Button>
        </>
      )}
    </div>
  )
}

// Google's "G" (brand mark required by Google sign-in guidelines).
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}
