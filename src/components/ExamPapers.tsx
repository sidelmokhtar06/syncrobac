import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { FileCheck2, FileText } from 'lucide-react'
import { groupExams } from '../config/exams'
import type { ExamDef } from '../config/content'
import { useT } from '../lib/i18n'
import { EASE } from './motion'
import { SectionTitle, Select } from './ui'

/** Past BAC papers of one subject: grouped by exam (year + session), filterable by year. */
export function ExamPapers({ exams }: { exams: ExamDef[] }) {
  const { t } = useT()
  const [year, setYear] = useState<number | 'all'>('all')
  const years = useMemo(() => [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a), [exams])
  const groups = useMemo(() => groupExams(year === 'all' ? exams : exams.filter((e) => e.year === year)), [exams, year])

  return (
    <section aria-labelledby="exam-papers">
      <SectionTitle
        action={
          years.length > 1 && (
            <Select aria-label={t('allYears')} value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : +e.target.value)} className="h-9 w-44 text-sm">
              <option value="all">{t('allYears')}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          )
        }
      >
        <span id="exam-papers">{t('examPapers')}</span>
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs text-ink-3">{t('examsNeedInternet')}</p>

      <div className="card divide-y divide-line">
        <AnimatePresence initial={false} mode="popLayout">
          {groups.map((g) => (
            <m.div
              key={`${g.year}-${g.session}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="tnum font-semibold">{g.year}</p>
                <p className="text-xs text-ink-3">{t(g.session === 'normale' ? 'sessionNormale' : 'sessionComplementaire')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.docs.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={d.title}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong bg-raised px-3 text-sm transition-colors hover:border-accent hover:text-accent"
                  >
                    {d.kind === 'solution' ? <FileCheck2 size={16} className="text-success" /> : <FileText size={16} className="text-accent" />}
                    {d.title || t(d.kind === 'solution' ? 'examSolution' : 'examSubject')}
                  </a>
                ))}
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
