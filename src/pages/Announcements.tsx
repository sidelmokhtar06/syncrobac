import { useEffect, useState } from 'react'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { Item, Stagger } from '../components/motion'
import { PageHeader } from '../components/ui'
import { announcementsFor, isUnread, markRead } from '../lib/announcements'
import { useSettings } from '../lib/db'
import { useT } from '../lib/i18n'

// Inbox of admin messages, newest first. Opening it marks them as read (the dots stay for this visit).
export default function Announcements() {
  const s = useSettings()
  const { t } = useT()
  const list = announcementsFor(s)
  const [unreadOnOpen] = useState(() => new Set(list.filter((a) => isUnread(s, a)).map((a) => a.id)))
  useEffect(() => void markRead(s, list.map((a) => a.id)), [s, list])

  return (
    <Stagger className="flex flex-col gap-6">
      <Item>
        <PageHeader back="/" title={t('announcements')} />
      </Item>
      {list.length === 0 ? (
        <Item>
          <p className="card px-4 py-8 text-center text-sm text-ink-3">{t('noAnnouncements')}</p>
        </Item>
      ) : (
        list.map((a) => (
          <Item key={a.id}>
            <AnnouncementCard a={a} unread={unreadOnOpen.has(a.id)} />
          </Item>
        ))
      )}
    </Stagger>
  )
}
