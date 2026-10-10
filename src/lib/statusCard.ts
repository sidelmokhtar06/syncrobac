// Draws a 1080x1920 WhatsApp status card on a canvas and opens the native share
// sheet (falls back to a download). Lighter and more reliable than html2canvas.

const FONT = '"Readex Pro Variable", system-ui, sans-serif'

export async function shareStatusCard(opts: { quote: string; streak: number; streakLabel: string; tagline: string }) {
  await Promise.all([document.fonts.load(`700 84px ${FONT}`, opts.quote), document.fonts.load(`500 44px ${FONT}`, opts.tagline)])
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

  const glow = g.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.42, 700)
  glow.addColorStop(0, 'rgba(34,193,214,0.25)')
  glow.addColorStop(1, 'rgba(34,193,214,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)

  g.textAlign = 'center'
  g.font = `700 72px ${FONT}`
  g.fillStyle = '#fff'
  g.fillText('SYNCRO', W / 2 - 90, 220)
  g.fillStyle = '#22C1D6'
  g.fillText('BAC', W / 2 + 175, 220)

  // Wordmark above is always LTR; quote and labels follow the UI language.
  g.direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  g.font = `700 84px ${FONT}`
  g.fillStyle = '#22C1D6'
  wrap(g, opts.quote, W / 2, H * 0.4, W - 160, 110)

  // Streak: lucide "flame" path drawn on canvas (no emoji — renders identically on every phone).
  g.save()
  g.translate(W / 2 - 230, H * 0.68 - 150)
  g.scale(7, 7)
  g.strokeStyle = '#F0A645'
  g.lineWidth = 2
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke(new Path2D('M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'))
  g.restore()
  g.font = `600 160px ${FONT}`
  g.fillStyle = '#E8ECF1'
  g.textAlign = 'left'
  g.fillText(String(opts.streak), W / 2 - 20, H * 0.68)
  g.textAlign = 'center'
  g.font = `600 56px ${FONT}`
  g.fillStyle = '#3CCB8C'
  g.fillText(opts.streakLabel, W / 2, H * 0.68 + 90)

  g.font = `500 44px ${FONT}`
  g.fillStyle = '#788293'
  g.fillText(opts.tagline, W / 2, H - 160)

  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'))
  const file = new File([blob], 'syncrobac-status.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {})
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
  }
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > max && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  lines.push(line)
  lines.forEach((l, i) => g.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh))
}
