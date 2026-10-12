let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 1) {
  const audio = context()
  if (!audio) return
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), audio.currentTime + dur)
  amp.gain.setValueAtTime(gain, audio.currentTime)
  amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + dur + 0.02)
}

function noise(dur: number, gain: number) {
  const audio = context()
  if (!audio) return
  const length = Math.floor(audio.sampleRate * dur)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  const src = audio.createBufferSource()
  src.buffer = buffer
  const amp = audio.createGain()
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  amp.gain.value = gain
  src.connect(filter)
  filter.connect(amp)
  amp.connect(audio.destination)
  src.start()
}

export function unlockAudio() {
  context()
}

export function playMatchEvent(kind: string) {
  if (kind === 'shot') {
    noise(0.06, 0.18)
    tone(210, 0.05, 'square', 0.04, 0.6)
  } else if (kind === 'shotgun') {
    noise(0.14, 0.28)
    tone(90, 0.12, 'sawtooth', 0.05, 0.4)
  } else if (kind === 'hit') {
    tone(740, 0.06, 'triangle', 0.05, 1.4)
  } else if (kind === 'hurt') {
    tone(140, 0.16, 'sawtooth', 0.06, 0.5)
  } else if (kind === 'reload') {
    tone(520, 0.04, 'square', 0.03, 1)
    tone(280, 0.05, 'square', 0.03, 0.8)
  } else if (kind === 'down') {
    tone(180, 0.22, 'triangle', 0.06, 0.35)
  } else if (kind === 'step') {
    noise(0.03, 0.05)
  }
}
