import { useEffect } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useT } from '../lib/i18n'
import { Mascot } from './Mascot'
import { Burst, EASE } from './motion'
import { Button } from './ui'

export function Celebration({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  useEffect(() => {
    if (!open) return
    const id = setTimeout(onClose, 6000)
    return () => clearTimeout(id)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={t('sessionDone')}
          className="fixed inset-0 z-50 grid place-items-center bg-bg/90 px-8 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <m.div
            className="relative flex w-full max-w-xs flex-col items-center gap-4 text-center"
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="relative mb-2">
              <Mascot size={150} cheer />
              <Burst fire={1} count={14} radius={110} />
            </div>
            <h2 className="text-2xl">{t('sessionDone')}</h2>
            <p className="text-ink-2">{t('sessionDoneSub')}</p>
            <Button size="lg" block className="mt-4" onClick={onClose}>
              {t('continueBtn')}
            </Button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
