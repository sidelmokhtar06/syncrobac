import Simulator from '../components/Simulator'
import { Item, Stagger } from '../components/motion'
import { PageHeader } from '../components/ui'
import { useT } from '../lib/i18n'

export default function SimulatorPage() {
  const { t } = useT()
  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/me" title={t('simulator')} />
      </Item>
      <Item className="card p-4">
        <Simulator />
      </Item>
    </Stagger>
  )
}
