// ⚠️ TO VERIFY against the official Ministry arrêté before launch.
// Confirmed from published exam papers: Maths coeff 9 in Série C (M), 6 in Série D (SN).
// Everything else is a best estimate. Students can override any coefficient in-app.

export type SerieId = 'C' | 'D' | 'TM' | 'LM' | 'LO'

export interface Subject {
  id: string
  fr: string
  ar: string
  coeff: number
}

export interface Serie {
  id: SerieId
  code: string // official short code used on results lists
  fr: string
  ar: string
  subjects: Subject[]
}

const s = (id: string, fr: string, ar: string, coeff: number): Subject => ({ id, fr, ar, coeff })

const ARABIC = s('arabic', 'Arabe', 'اللغة العربية', 3)
const FRENCH = s('french', 'Français', 'اللغة الفرنسية', 2)
const ENGLISH = s('english', 'Anglais', 'اللغة الإنجليزية', 2)
const ISLAMIC = s('islamic', 'Instruction islamique', 'التربية الإسلامية', 2)
const PHILO = s('philo', 'Philosophie', 'الفلسفة', 2)

export const SERIES: Serie[] = [
  {
    id: 'C', code: 'M', fr: 'Mathématiques', ar: 'الرياضيات',
    subjects: [
      s('maths', 'Mathématiques', 'الرياضيات', 9),
      s('physics', 'Sciences physiques', 'العلوم الفيزيائية', 7),
      s('natsci', 'Sciences naturelles', 'العلوم الطبيعية', 4),
      ARABIC, FRENCH, ENGLISH, PHILO, ISLAMIC,
    ],
  },
  {
    id: 'D', code: 'SN', fr: 'Sciences naturelles', ar: 'العلوم الطبيعية',
    subjects: [
      s('natsci', 'Sciences naturelles', 'العلوم الطبيعية', 9),
      s('maths', 'Mathématiques', 'الرياضيات', 6),
      s('physics', 'Sciences physiques', 'العلوم الفيزيائية', 6),
      ARABIC, FRENCH, ENGLISH, PHILO, ISLAMIC,
    ],
  },
  {
    id: 'TM', code: 'TM', fr: 'Technique mathématique', ar: 'الرياضيات التقنية',
    subjects: [
      s('maths', 'Mathématiques', 'الرياضيات', 7),
      s('tech', 'Technologie / Génie', 'التكنولوجيا', 7),
      s('physics', 'Sciences physiques', 'العلوم الفيزيائية', 5),
      ARABIC, FRENCH, ENGLISH, ISLAMIC,
    ],
  },
  {
    id: 'LM', code: 'LM', fr: 'Lettres modernes', ar: 'الآداب العصرية',
    subjects: [
      s('philo', 'Philosophie', 'الفلسفة', 5),
      s('french', 'Français', 'اللغة الفرنسية', 4),
      s('arabic', 'Arabe', 'اللغة العربية', 4),
      s('histgeo', 'Histoire-Géographie', 'التاريخ والجغرافيا', 3),
      s('english', 'Anglais', 'اللغة الإنجليزية', 3),
      s('maths', 'Mathématiques', 'الرياضيات', 2),
      ISLAMIC,
    ],
  },
  {
    id: 'LO', code: 'LO', fr: 'Lettres originales', ar: 'الآداب الأصلية',
    subjects: [
      s('arabic', 'Arabe', 'اللغة العربية', 6),
      s('islamic', 'Sciences islamiques', 'العلوم الشرعية', 6),
      s('philo', 'Philosophie', 'الفلسفة', 3),
      s('histgeo', 'Histoire-Géographie', 'التاريخ والجغرافيا', 3),
      FRENCH, ENGLISH,
    ],
  },
]

// Estimated: Mauritanian BAC usually starts early July. Editable in Profile.
export const DEFAULT_BAC_DATE = '2027-07-05T08:00:00Z'

export const PASS_MARK = 10
export const MENTIONS = [
  { min: 10, fr: 'Passable', ar: 'مقبول' },
  { min: 12, fr: 'Assez bien', ar: 'مستحسن' },
  { min: 14, fr: 'Bien', ar: 'حسن' },
  { min: 16, fr: 'Très bien', ar: 'حسن جدا' },
]

export const getSerie = (id: SerieId) => SERIES.find((x) => x.id === id)!
