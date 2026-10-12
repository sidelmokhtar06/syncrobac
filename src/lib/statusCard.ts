// Draws the weekly recap as a 1080x1920 WhatsApp status image on a canvas and opens the
// native share sheet (falls back to a download). Always dark: it's an image to share,
// independent of the app theme.

const FONT = '"Readex Pro Variable", system-ui, sans-serif'

export interface WeeklyCard {
  title: string // "Ta semaine"
  hours: string // "6.5"
  hoursLabel: string // "h de focus"
  stats: { value: string; label: string }[] // 3 columns
  footnote?: string // e.g. most-studied subject
  tagline: string
}

export async function shareWeeklyCard(card: WeeklyCard) {
  await Promise.all([document.fonts.load(`700 84px ${FONT}`, card.title), document.fonts.load(`500 44px ${FONT}`, card.tagline)])
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!

  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0A0D12')
  bg.addColorStop(1, '#12161D')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, 700)
  glow.addColorStop(0, 'rgba(34,193,214,0.22)')
  glow.addColorStop(1, 'rgba(34,193,214,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)

  // Wordmark (always LTR Latin)
  g.textAlign = 'center'
  g.font = `700 72px ${FONT}`
  g.fillStyle = '#fff'
  g.fillText('SYNCRO', W / 2 - 90, 220)
  g.fillStyle = '#22C1D6'
  g.fillText('BAC', W / 2 + 175, 220)

  // Everything else follows the UI language.
  g.direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  g.font = `600 64px ${FONT}`
  g.fillStyle = '#22C1D6'
  g.fillText(card.title, W / 2, 440)

  g.font = `700 280px ${FONT}`
  g.fillStyle = '#E8ECF1'
  g.fillText(card.hours, W / 2, 800)
  g.font = `500 56px ${FONT}`
  g.fillStyle = '#A3ADBB'
  g.fillText(card.hoursLabel, W / 2, 900)

  // Three stat columns on a rounded panel
  const top = 1040
  g.fillStyle = 'rgba(255,255,255,0.05)'
  g.beginPath()
  g.roundRect(80, top, W - 160, 300, 40)
  g.fill()
  const cols = card.stats.slice(0, 3)
  cols.forEach((st, i) => {
    const x = ((i + 0.5) / cols.length) * (W - 160) + 80
    g.font = `700 104px ${FONT}`
    g.fillStyle = i === 2 ? '#F0A645' : '#3CCB8C'
    g.fillText(st.value, x, top + 160)
    g.font = `500 38px ${FONT}`
    g.fillStyle = '#A3ADBB'
    g.fillText(st.label, x, top + 230)
  })

  if (card.footnote) {
    g.font = `500 44px ${FONT}`
    g.fillStyle = '#E8ECF1'
    g.fillText(card.footnote, W / 2, 1460)
  }

  g.font = `500 44px ${FONT}`
  g.fillStyle = '#788293'
  g.fillText(card.tagline, W / 2, H - 160)

  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'))
  const file = new File([blob], 'syncrobac-semaine.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {})
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
  }
}
