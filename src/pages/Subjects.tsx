import { Link } from 'react-router'
import { m } from 'motion/react'
import { CalendarCheckIcon } from '../components/icons/calendar-check'
import { Item, Stagger } from '../components/motion'
import { Anim, PageHeader, ProgressBar } from '../components/ui'
import { getSerie } from '../config/bac'
import { statusOf, subjectMastery, useAllChapters, useChapterStates } from '../lib/curriculum'
import { subjectColor } from '../lib/colors'
import { subjectsFor, useSettings } from '../lib/db'
import { useT } from '../lib/i18n'

export default function Subjects() {
  const s = useSettings()
  const { t, lang } = useT()
  const all = useAllChapters(s)
  const states = useChapterStates()
  const subjects = subjectsFor(s)

  // Coefficient-weighted mastery: a chapter of Maths (×9) moves the needle more than one of English (×2).
  const totalCoeff = subjects.reduce((a, x) => a + x.coeff, 0)
  const sync = subjects.reduce((a, x) => a + x.coeff * subjectMastery(all.get(x.id) ?? [], states, x.id), 0) / (totalCoeff || 1)

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader
          title={t('subjects')}
          subtitle={`${t('serie')} ${s.serie} · ${getSerie(s.serie!)[lang]}`}
          action={
            <Link to="/plan" aria-label={t('plan')} className="grid size-11 place-items-center rounded-xl border border-line-strong bg-raised text-ink-2">
              <Anim icon={CalendarCheckIcon} size={20} autoplay />
            </Link>
          }
        />
      </Item>

      <Item className="card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-ink-2">{t('syncScore')}</p>
          <m.p key={Math.round(sync * 100)} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="tnum text-2xl font-semibold">
            {Math.round(sync * 100)}%
          </m.p>
        </div>
        <ProgressBar value={sync} className="mt-3" />
        <p className="mt-2 text-xs text-ink-3">{t('syncExplain')}</p>
      </Item>

      <div className="grid gap-3 md:grid-cols-2">
        {subjects.map((sub) => {
          const chapters = all.get(sub.id) ?? []
          const done = chapters.filter((c) => statusOf(states, sub.id, c.id) === 'done').length
          const mastery = subjectMastery(chapters, states, sub.id)
          const subColor = subjectColor(sub)
          return (
            <Item key={sub.id}>
              <Link to={`/subjects/${sub.id}`} className="card flex min-h-18 items-center gap-4 px-4 py-3 transition-colors active:bg-raised">
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none" style={{ backgroundColor: `${subColor}1F`, color: subColor }}>
                  <span className="tnum text-lg font-semibold">{sub.coeff}</span>
                  <span className="mt-0.5 text-[10px] font-medium opacity-80">{t('coeff')}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{sub[lang]}</span>
                    <span className="tnum shrink-0 text-sm text-ink-2">
                      {done}/{chapters.length}
                    </span>
                  </span>
                  <ProgressBar value={mastery} tone={mastery === 1 ? 'success' : 'accent'} color={mastery < 1 ? subColor : undefined} className="mt-2" />
                </span>
              </Link>
            </Item>
          )
        })}
      </div>
    </Stagger>
  )
}
