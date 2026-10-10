import type { Settings } from './db'

// Rain is synthesized (zero bytes downloaded). Atay and Lo-Fi play small local
// loops from /public/sounds — drop atay.mp3 / lofi.mp3 there (~300KB each).

let ctx: AudioContext | null = null
let noise: AudioBufferSourceNode | null = null
let audio: HTMLAudioElement | null = null

export function stopAmbient() {
  noise?.stop()
  noise = null
  audio?.pause()
  audio = null
}

export function playAmbient(sound: Settings['sound']) {
  stopAmbient()
  if (sound === 'none') return
  if (sound === 'rain') {
    ctx ??= new AudioContext()
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      // Brown noise: integrated white noise, soft and rain-like.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const gain = ctx.createGain()
    gain.gain.value = 0.5
    noise.connect(gain).connect(ctx.destination)
    noise.start()
    return
  }
  audio = new Audio(`/sounds/${sound}.mp3`)
  audio.loop = true
  audio.play().catch(() => {})
}
