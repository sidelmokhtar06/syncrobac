import { useState, useSyncExternalStore } from 'react'
import { m } from 'motion/react'
import { CloudCheck, CloudOff, LogOut, RefreshCw, ShieldCheck, Smartphone, Trash2, WifiOff } from 'lucide-react'
import { AccountLogin } from '../components/AccountLogin'
import { Item, Stagger } from '../components/motion'
import { Button, PageHeader } from '../components/ui'
import { accountsAvailable, deleteAccount, signOut, useUser } from '../lib/auth'
import { cn } from '../lib/cn'
import { dateLocale } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { subscribeSync, syncNow, syncStatus } from '../lib/sync'

export const useSyncStatus = () => useSyncExternalStore(subscribeSync, syncStatus)

/** "il y a 3 min" / "منذ 3 دقائق" */
export function timeAgo(ts: number, lang: 'fr' | 'ar') {
  const rtf = new Intl.RelativeTimeFormat(dateLocale(lang), { numeric: 'auto' })
  const min = Math.round((ts - Date.now()) / 60_000)
  if (min === 0) return lang === 'ar' ? 'الآن' : 'à l’instant'
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  const h = Math.round(min / 60)
  if (Math.abs(h) < 24) return rtf.format(h, 'hour')
  return rtf.format(Math.round(h / 24), 'day')
}

export default function Account() {
  const { t, lang } = useT()
  const user = useUser()
  const sync = useSyncStatus()
  const [busy, setBusy] = useState(false)

  if (!accountsAvailable) return <PageHeader back="/me" title={t('myAccount')} subtitle={t('errUnknown')} />

  if (!user) {
    return (
      <Stagger className="flex flex-col gap-6">
        <Item>
          <PageHeader back="/me" title={t('myAccount')} subtitle={t('saveProgressSub')} />
        </Item>
        <Item className="card flex flex-col gap-3 p-4">
          {[
            { Icon: ShieldCheck, key: 'benefitSafe' as const },
            { Icon: Smartphone, key: 'benefitDevices' as const },
            { Icon: WifiOff, key: 'benefitOffline' as const },
          ].map(({ Icon, key }) => (
            <p key={key} className="flex items-center gap-3 text-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
                <Icon size={18} />
              </span>
              {t(key)}
            </p>
          ))}
        </Item>
        <Item>
          <AccountLogin />
        </Item>
        <Item>
          <p className="text-center text-xs text-ink-3">{t('privacyNote')}</p>
        </Item>
      </Stagger>
    )
  }

  const StatusIcon = sync.state === 'offline' ? WifiOff : sync.state === 'error' ? CloudOff : CloudCheck
  const statusText =
    sync.state === 'syncing'
      ? t('syncing')
      : sync.state === 'offline'
        ? t('syncOffline')
        : sync.state === 'error'
          ? t('syncError')
          : sync.lastSync
            ? `${t('synced')} · ${timeAgo(sync.lastSync, lang)}`
            : t('neverSynced')

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title={t('myAccount')} />
      </Item>

      <Item className="card flex flex-col gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">{t('signedInAs')}</p>
          <p className="truncate font-medium" dir="ltr">
            {user.email}
          </p>
        </div>
        <div className={cn('flex items-center gap-2 text-sm', sync.state === 'error' ? 'text-warning' : sync.state === 'idle' && sync.lastSync ? 'text-success' : 'text-ink-2')}>
          <m.span animate={sync.state === 'syncing' ? { rotate: 360 } : { rotate: 0 }} transition={sync.state === 'syncing' ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}} className="inline-flex">
            {sync.state === 'syncing' ? <RefreshCw size={16} /> : <StatusIcon size={16} />}
          </m.span>
          {statusText}
        </div>
        <Button variant="secondary" block disabled={sync.state === 'syncing'} onClick={() => syncNow()}>
          <RefreshCw size={16} />
          {t('syncNowBtn')}
        </Button>
      </Item>

      <Item className="flex flex-col gap-2">
        <Button variant="secondary" block onClick={() => signOut()}>
          <LogOut size={16} />
          {t('signOutBtn')}
        </Button>
        <p className="text-center text-xs text-ink-3">{t('signOutNote')}</p>
      </Item>

      <Item>
        <Button
          variant="ghost"
          block
          disabled={busy}
          className="text-danger hover:text-danger"
          onClick={async () => {
            if (!confirm(t('deleteAccountConfirm'))) return
            setBusy(true)
            try {
              await deleteAccount()
            } catch {
              alert(t('errUnknown'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Trash2 size={16} />
          {t('deleteAccountBtn')}
        </Button>
      </Item>
    </Stagger>
  )
}
