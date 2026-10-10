import { content } from './content'

// BAC-year chapter lists per série/subject, from the content bundle.
// Sources of the bundled defaults (keep honest; students can add their own chapters):
//  • official: IGEN "Curriculum de mathématiques" 2018 (maurimath.net) — `weeks` = official pacing
//  • draft:    IPN / Ministère Physique-Chimie 7D booklet (SWEDD) and IPN Sciences Naturelles 7AS
//  • generic:  no public programme found; skill-based units to personalise

export type { ChapterDef, Source, SubjectProgramme } from './content'

export const programme = () => content().programme

export const DEFAULT_WEEKS = 2
