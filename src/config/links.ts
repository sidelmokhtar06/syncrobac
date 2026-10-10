import type { SavedLink } from '../lib/db'

// Public sites found while researching the programme. Shown as "Suggestion", not endorsements.
// Students add their own groups/channels; community sharing arrives with accounts (Supabase).
export const SUGGESTED_LINKS: (Omit<SavedLink, 'id' | 'createdAt'> & { fr: string; ar: string })[] = [
  {
    title: 'maurimath.net',
    url: 'https://maurimath.net/',
    category: 'site',
    fr: 'Programmes officiels et documents de mathématiques',
    ar: 'البرامج الرسمية ووثائق الرياضيات',
  },
  {
    title: 'Sigmaths — BAC Mauritanie',
    url: 'https://www.sigmaths.net/bac2/mauritanie.php',
    category: 'site',
    fr: 'Sujets de mathématiques du BAC mauritanien',
    ar: 'مواضيع الرياضيات في الباكالوريا الموريتانية',
  },
  {
    title: 'Devoir.tn — Physique Mauritanie',
    url: 'https://www.devoir.tn/secondaire/Bac-%C3%A9tranger/Mauritanie/Physiques.html',
    category: 'site',
    fr: 'Annales de sciences physiques',
    ar: 'امتحانات سابقة في العلوم الفيزيائية',
  },
  {
    title: 'RimBac',
    url: 'https://rimbac.com/',
    category: 'site',
    fr: 'Manuels et préparation au BAC',
    ar: 'كتب مدرسية وتحضير للباكالوريا',
  },
]
