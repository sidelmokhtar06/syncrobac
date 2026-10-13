import { AnimatePresence, m } from 'motion/react'
import { AlertTriangle, EllipsisVertical, PlusSquare, Share, SmartphoneNfc } from 'lucide-react'
import { useT, type TKey } from '../lib/i18n'
import { EASE } from './motion'
import { Button } from './ui'
import { LogoMark } from './Logo'

/** Manual install instructions, for when the browser can't show its own prompt (iOS, http, some browsers). */
export function InstallSheet({ open, onClose, ios }: { open: boolean; onClose: () => void; ios: boolean }) {
  const { t } = useT()
  const steps: { Icon: typeof Share; key: TKey }[] = ios
    ? [
        { Icon: Share, key: 'installIos1' },
        { Icon: PlusSquare, key: 'installIos2' },
        { Icon: SmartphoneNfc, key: 'installIos3' },
      ]
    : [
        { Icon: EllipsisVertical, key: 'installAndroid1' },
        { Icon: PlusSquare, key: 'installAndroid2' },
        { Icon: SmartphoneNfc, key: 'installAndroid3' },
      ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={t('installTitle')}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl md:bottom-6 md:rounded-3xl md:border border-t border-line-strong bg-surface px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: EASE }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 100 || info.velocity.y > 500) && onClose()}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl border border-line bg-bg">
                <LogoMark className="h-5 w-auto" />
              </span>
              <div>
                <p className="font-semibold">{t('installTitle')}</p>
                <p className="text-sm text-ink-2">{t('installSub')}</p>
              </div>
            </div>

            {!window.isSecureContext && (
              <p className="mt-4 flex gap-2 rounded-xl border border-warning/40 bg-warning/8 p-3 text-sm text-warning">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                {t('installInsecure')}
              </p>
            )}

            <ol className="mt-5 flex flex-col gap-3">
              {steps.map(({ Icon, key }, i) => (
                <m.li
                  key={key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: EASE }}
                  className="flex items-center gap-3"
                >
                  <span className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-accent/12 text-xs font-semibold text-accent">{i + 1}</span>
                  <span className="flex-1 text-[15px]">{t(key)}</span>
                  <Icon size={20} className="shrink-0 text-ink-3" />
                </m.li>
              ))}
            </ol>

            <Button block size="lg" className="mt-6" onClick={onClose}>
              {t('gotIt')}
            </Button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
