import type { Settings } from './db'

// Rain is synthesized (zero bytes downloaded). Atay and Lo-Fi are small loops:
// drop atay.mp3 / lofi.mp3 (~300KB each) into src/assets/sounds/ — their buttons
// appear automatically at build time; until then they stay hidden.
const FILES = import.meta.glob<string>('../assets/sounds/*.mp3', { eager: true, query: '?url', import: 'default' })
const fileFor = (name: string) => FILES[`../assets/sounds/${name}.mp3`]

export const AVAILABLE_SOUNDS = (['none', 'rain', 'atay', 'lofi'] as const).filter((x) => x === 'none' || x === 'rain' || !!fileFor(x))

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
  const url = fileFor(sound)
  if (!url) return
  audio = new Audio(url)
  audio.loop = true
  audio.play().catch(() => {})
}
