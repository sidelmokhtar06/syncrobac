import type { ContentBundle, ExamDef, LinkDef, Source } from './content'

// Pure: turns Supabase (PostgREST) rows into a ContentBundle. No imports with side effects,
// so it can be tested directly with Node (scripts/test-assemble.mts).

export interface Row {
  [k: string]: unknown
}

export interface Tables {
  series: Row[]
  serieSubjects: Row[] // with embedded `subjects`
  chapters: Row[]
  resources: Row[]
  config: Row[]
  exams?: Row[]
}

export function assembleBundle({ series, serieSubjects, chapters, resources, config, exams = [] }: Tables, fallbackBacDate: string, examFileBase = ''): ContentBundle {
  const cfg = Object.fromEntries(config.map((r) => [r.key as string, r.value]))
  const bundle: ContentBundle = {
    version: Number(cfg.content_version ?? 1),
    updatedAt: new Date().toISOString(),
    bacDate: (cfg.bac_date as string) ?? fallbackBacDate,
    series: series.map((s) => ({
      id: s.id as string,
      code: s.code as string,
      active: s.active !== false,
      fr: s.name_fr as string,
      ar: s.name_ar as string,
      subjects: serieSubjects
        .filter((x) => x.serie_id === s.id)
        .map((x) => {
          const sub = x.subjects as Row
          return { id: x.subject_id as string, fr: ((x.name_fr ?? sub.name_fr) as string), ar: ((x.name_ar ?? sub.name_ar) as string), coeff: Number(x.coeff) }
        }),
    })),
    programme: {},
    // Defense in depth (the DB also enforces it): only https links ever reach students.
    links: resources.filter((r) => /^https:\/\/[^\s]+$/i.test(String(r.url ?? ''))).map((r) => ({
      title: r.title as string,
      url: r.url as string,
      category: r.category as LinkDef['category'],
      fr: (r.description_fr as string) ?? '',
      ar: (r.description_ar as string) ?? '',
      serie: (r.serie_id as string) ?? null,
      subject: (r.subject_id as string) ?? null,
    })),
    exams: exams
      .map((r): ExamDef => ({
        id: Number(r.id),
        serie: (r.serie_id as string) ?? null,
        subject: r.subject_id as string,
        year: Number(r.year),
        session: r.session === 'complementaire' ? 'complementaire' : 'normale',
        kind: r.kind === 'solution' ? 'solution' : 'subject',
        title: (r.title as string) || undefined,
        url: r.file_path ? examFileBase + String(r.file_path) : String(r.url ?? ''),
      }))
      .filter((e) => /^https:\/\/[^\s]+$/i.test(e.url)),
  }
  for (const x of serieSubjects) {
    const serie = x.serie_id as string
    const subject = x.subject_id as string
    bundle.programme[serie] ??= {}
    bundle.programme[serie][subject] = {
      source: (x.source as Source) ?? 'generic',
      chapters: chapters
        .filter((c) => c.serie_id === serie && c.subject_id === subject)
        .map((c) => ({ id: c.chapter_key as string, fr: c.title_fr as string, ar: c.title_ar as string, weeks: (c.weeks as number) ?? undefined })),
    }
  }

  if (!bundle.series.length || bundle.series.some((s) => !s.subjects.length)) throw new Error('Remote content incomplete')
  return bundle
}
