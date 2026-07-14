'use client'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    audioContext = new AudioContextClass()
  }
  // Browsers suspend a freshly-created context until a user gesture occurs
  // on the page; resuming is harmless if it's already running.
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
  return audioContext
}

// A short, gentle bubble-pop: a sine tone that glides quickly downward in
// pitch with a fast exponential decay, kept quiet so a cascade of these
// (one per entering player token) reads as cute rather than jarring.
export function playBubblePop() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  const startFreq = 900 + Math.random() * 300
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(startFreq, now)
  oscillator.frequency.exponentialRampToValueAtTime(startFreq * 0.45, now + 0.09)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(now)
  oscillator.stop(now + 0.13)
}
