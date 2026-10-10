import type { SerieId } from './bac'

// BAC-year (7ème année) chapter lists per subject and série.
//
// Sources — keep this list honest; students can add their own chapters in-app:
//  • official: IGEN "Curriculum de mathématiques" 2018, progressions annuelles 7ème
//    (https://maurimath.net/documents/Prog/PgmMathLycee10092018.pdf). `weeks` = official pacing.
//  • draft:    IPN / Ministère "Recueil d'exercices Physique-Chimie 7ème D" (SWEDD) and
//              IPN "Sciences Naturelles 7ème AS" textbook tables of contents. To verify with teachers.
//  • generic:  no public programme found; skill-based units the student should personalise.

export type Source = 'official' | 'draft' | 'generic'

export interface ChapterDef {
  id: string
  fr: string
  ar: string
  weeks?: number // official recommended duration; defaults to 2 for planning
}

export interface SubjectProgramme {
  source: Source
  chapters: ChapterDef[]
}

const c = (id: string, fr: string, ar: string, weeks?: number): ChapterDef => ({ id, fr, ar, weeks })

const MATHS_M: SubjectProgramme = {
  source: 'official',
  chapters: [
    c('matrices', 'Matrices et systèmes linéaires', 'المصفوفات والأنظمة الخطية', 1),
    c('complexes', 'Nombres complexes', 'الأعداد العقدية', 4),
    c('arith', 'Arithmétique', 'الحسابيات', 3),
    c('integrales', 'Primitives et intégrales', 'الدوال الأصلية والتكامل', 3),
    c('fonctions', 'Généralités sur les fonctions (rappel)', 'عموميات حول الدوال', 1),
    c('ln', 'Fonctions logarithmes', 'الدوال اللوغاريتمية', 1),
    c('exp', 'Fonctions exponentielles', 'الدوال الأسية', 2),
    c('eqdiff', 'Équations différentielles', 'المعادلات التفاضلية', 1),
    c('angles', 'Angles orientés', 'الزوايا الموجهة', 1),
    c('bary', 'Barycentre et produit scalaire', 'المرجح والجداء السلمي', 2),
    c('espace', 'Configurations dans l’espace', 'الهندسة في الفضاء', 2),
    c('transf-plan', 'Transformations du plan', 'تحويلات المستوى', 3),
    c('courbes', 'Courbes planes', 'المنحنيات المستوية', 2),
    c('transf-espace', 'Transformations de l’espace', 'تحويلات الفضاء', 1),
    c('proba', 'Probabilités', 'الاحتمالات', 2),
  ],
}

const MATHS_SN: SubjectProgramme = {
  source: 'official',
  chapters: [
    c('complexes', 'Nombres complexes', 'الأعداد العقدية', 4),
    c('suites', 'Suites numériques', 'المتتاليات العددية', 3),
    c('fonctions', 'Généralités sur les fonctions', 'عموميات حول الدوال', 4),
    c('integrales', 'Primitives et intégrales', 'الدوال الأصلية والتكامل', 3),
    c('ln', 'Fonctions logarithmes', 'الدوال اللوغاريتمية', 4),
    c('exp', 'Fonctions exponentielles', 'الدوال الأسية', 3),
    c('eqdiff', 'Équations différentielles', 'المعادلات التفاضلية', 2),
    c('proba', 'Probabilités', 'الاحتمالات', 4),
  ],
}

const MATHS_LM: SubjectProgramme = {
  source: 'official',
  chapters: [
    c('second-degre', 'Équations et inéquations du second degré', 'معادلات ومتراجحات من الدرجة الثانية', 3),
    c('limites', 'Limites des fonctions', 'نهايات الدوال', 2),
    c('derivees', 'Dérivées', 'الاشتقاق', 2),
    c('rationnelles', 'Étude des fonctions rationnelles', 'دراسة الدوال الكسرية', 4),
    c('ln', 'Fonction logarithme népérien', 'دالة اللوغاريتم النيبيري', 2),
    c('eq-ln', 'Équations du second degré en ln x', 'معادلات من الدرجة الثانية بالمتغير ln x', 3),
    c('exp', 'Fonction exponentielle', 'الدالة الأسية', 2),
    c('eq-exp', 'Équations du second degré en eˣ', 'معادلات من الدرجة الثانية بالمتغير eˣ', 2),
    c('suites', 'Suites', 'المتتاليات', 5),
    c('denombrement', 'Dénombrement', 'العدّ', 2),
    c('proba', 'Probabilités', 'الاحتمالات', 1),
  ],
}

const PHYSICS: SubjectProgramme = {
  source: 'draft',
  chapters: [
    c('cinetique', 'Cinétique chimique', 'الحركية الكيميائية'),
    c('solutions', 'Acides, bases, pH et dosages', 'الأحماض والقواعد والمعايرة'),
    c('organique', 'Fonctions oxygénées et azotées', 'الوظائف العضوية الأكسجينية والآزوتية'),
    c('derives-acides', 'Dérivés des acides carboxyliques', 'مشتقات الأحماض الكربوكسيلية'),
    c('cinematique', 'Cinématique du point', 'حركية النقطة'),
    c('dynamique', 'Dynamique : lois de Newton, projectiles, satellites', 'التحريك: قوانين نيوتن، القذائف، الأقمار'),
    c('champ-electrique', 'Particule chargée dans un champ électrique', 'جسيم مشحون في مجال كهربائي'),
    c('champ-magnetique', 'Champ magnétique', 'المجال المغناطيسي'),
    c('particule-magnetique', 'Particule chargée dans un champ magnétique', 'جسيم مشحون في مجال مغناطيسي'),
    c('laplace', 'Force de Laplace', 'قوة لابلاس'),
    c('induction', 'Induction électromagnétique', 'التحريض الكهرومغناطيسي'),
    c('ondes', 'Vibrations et propagation', 'الاهتزازات والانتشار'),
    c('interf-meca', 'Interférences mécaniques', 'التداخل الميكانيكي'),
    c('interf-lum', 'Interférences lumineuses', 'التداخل الضوئي'),
    c('photoelectrique', 'Effet photoélectrique', 'المفعول الكهروضوئي'),
    c('nucleaire', 'Réactions nucléaires', 'التفاعلات النووية'),
  ],
}

const NATSCI: SubjectProgramme = {
  source: 'draft',
  chapters: [
    c('reproduction', 'Reproduction chez les mammifères', 'التكاثر عند الثدييات'),
    c('genetique', 'Génétique', 'علم الوراثة'),
    c('genie-genetique', 'Génie génétique', 'الهندسة الوراثية'),
    c('nerveuse', 'Communication nerveuse', 'الاتصال العصبي'),
    c('muscle', 'Activité du muscle squelettique', 'نشاط العضلة الهيكلية'),
    c('cardiaque', 'Activité cardiaque', 'النشاط القلبي'),
    c('humorale', 'Communication humorale et intégration neuro-hormonale', 'الاتصال الهرموني والتكامل العصبي الهرموني'),
    c('immunite', 'Le système immunitaire', 'الجهاز المناعي'),
  ],
}

const g = (chapters: ChapterDef[]): SubjectProgramme => ({ source: 'generic', chapters })

const ARABIC = g([
  c('textes', 'Étude de textes littéraires', 'دراسة النصوص الأدبية'),
  c('nahw', 'Grammaire (nahw et sarf)', 'النحو والصرف'),
  c('balagha', 'Rhétorique (balagha)', 'البلاغة'),
  c('arud', 'Prosodie (ʿarūḍ)', 'العروض'),
  c('insha', 'Expression écrite', 'التعبير والإنشاء'),
])
const FRENCH = g([
  c('resume', 'Résumé / contraction de texte', 'التلخيص'),
  c('commentaire', 'Commentaire et questions sur texte', 'التعليق وأسئلة النص'),
  c('dissertation', 'Dissertation / discussion', 'المقالة والمناقشة'),
  c('oeuvres', 'Œuvres au programme', 'المؤلفات المقررة'),
  c('langue', 'Grammaire et expression', 'القواعد والتعبير'),
])
const ENGLISH = g([
  c('reading', 'Reading comprehension', 'فهم المقروء'),
  c('grammar', 'Grammar', 'القواعد'),
  c('vocabulary', 'Vocabulary', 'المفردات'),
  c('writing', 'Essay writing', 'كتابة المقال'),
])
const ISLAMIC = g([
  c('aqida', 'Croyance (ʿaqīda)', 'العقيدة'),
  c('fiqh', 'Jurisprudence (fiqh)', 'الفقه'),
  c('hadith', 'Hadith', 'الحديث'),
  c('tafsir', 'Exégèse (tafsīr)', 'التفسير'),
  c('sira', 'Sīra et éthique', 'السيرة والأخلاق'),
])
const PHILO = g([
  c('methode-dissert', 'Méthode : dissertation', 'المنهجية: المقالة الفلسفية'),
  c('methode-texte', 'Méthode : analyse de texte', 'المنهجية: تحليل النص'),
  c('notions', 'Notions du programme', 'مفاهيم البرنامج'),
  c('auteurs', 'Auteurs et citations', 'الفلاسفة والأقوال'),
])
const HISTGEO = g([
  c('histoire', 'Histoire', 'التاريخ'),
  c('geographie', 'Géographie', 'الجغرافيا'),
  c('methode', 'Méthode : documents et croquis', 'المنهجية: الوثائق والخرائط'),
])
const TECH = g([
  c('construction', 'Construction mécanique', 'البناء الميكانيكي'),
  c('electrotech', 'Électrotechnique', 'الكهروتقنية'),
  c('dessin', 'Dessin technique', 'الرسم التقني'),
])

const COMMON = { arabic: ARABIC, french: FRENCH, english: ENGLISH, islamic: ISLAMIC, philo: PHILO, histgeo: HISTGEO }

export const PROGRAMME: Record<SerieId, Record<string, SubjectProgramme>> = {
  C: { ...COMMON, maths: MATHS_M, physics: PHYSICS, natsci: NATSCI },
  D: { ...COMMON, maths: MATHS_SN, physics: PHYSICS, natsci: NATSCI },
  TM: { ...COMMON, maths: { ...MATHS_M, source: 'draft' }, physics: PHYSICS, tech: TECH },
  LM: { ...COMMON, maths: MATHS_LM },
  LO: { ...COMMON },
}

export const DEFAULT_WEEKS = 2
