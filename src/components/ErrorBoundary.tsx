import { Component, type ReactNode } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { reportError } from '../lib/insights'
import { useT } from '../lib/i18n'
import { Button } from './ui'

/** Catches a crash in one page: shows a way out instead of a blank screen, and reports it. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  // Navigating to another page clears the error.
  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; key: string }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null
  }

  componentDidCatch(error: unknown) {
    reportError(error)
  }

  render() {
    return this.state.failed ? <Crashed /> : this.props.children
  }
}

function Crashed() {
  const { t } = useT()
  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-warning/12 text-warning">
        <TriangleAlert size={26} />
      </span>
      <h1 className="text-xl">{t('crashTitle')}</h1>
      <p className="max-w-xs text-sm text-ink-2">{t('crashSub')}</p>
      <Button onClick={() => location.reload()}>
        <RotateCw size={16} />
        {t('reload')}
      </Button>
    </div>
  )
}
