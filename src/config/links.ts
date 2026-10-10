import { content } from './content'

// Recommended links (admin-managed in Supabase `resources`). Filtered to the student's série when set.
export const suggestedLinks = (serie: string | null) => content().links.filter((l) => !l.serie || l.serie === serie)
