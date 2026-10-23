import { content, type AnnouncementDef } from '../config/content'
import { updateSettings, type Settings } from './db'

// Admin messages for this student: their série (or every série), in their app language, within the dates.
export const announcementsFor = (s: Settings, now = Date.now()) =>
  (content().announcements ?? [])
    .filter((a) => (!a.serie || a.serie === s.serie) && a[s.lang] && Date.parse(a.startsAt) <= now && (!a.expiresAt || Date.parse(a.expiresAt) > now))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))

export const isUnread = (s: Settings, a: AnnouncementDef) => !(s.readAnnouncements ?? []).includes(a.id)

/** Remembers on this phone that these messages were seen (keeps the last 200 ids). */
export const markRead = (s: Settings, ids: number[]) =>
  ids.some((id) => !(s.readAnnouncements ?? []).includes(id)) && updateSettings({ readAnnouncements: [...new Set([...(s.readAnnouncements ?? []), ...ids])].slice(-200) })
