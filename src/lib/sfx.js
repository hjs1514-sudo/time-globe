// 효과음: 파일 없이 브라우저에서 바로 만들어 낸다.
let ctx = null, muted = false
export const setMuted = m => { muted = m }
function tone(freq, t0, dur, type = 'sine', vol = 0.12, slide = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime + t0)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + t0 + dur)
  g.gain.setValueAtTime(0.0001, ctx.currentTime + t0)
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur)
  o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05)
}
export function sfx(name) {
  if (muted) return
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const S = {
      click: () => tone(660, 0, 0.06, 'triangle', 0.06),
      warp: () => { tone(180, 0, 0.5, 'sawtooth', 0.07, 900); tone(90, 0, 0.5, 'sine', 0.1, 300) },
      right: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.18, 'triangle', 0.12)),
      wrong: () => { tone(220, 0, 0.25, 'square', 0.07, -80); tone(160, 0.15, 0.3, 'square', 0.07, -60) },
      found: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.25, 'sine', 0.13)),
      thief: () => [880, 1175, 880, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.12, 'square', 0.07)),
      beep: () => tone(1320, 0, 0.05, 'sine', 0.08),
      storm: () => { tone(60, 0, 1.2, 'sawtooth', 0.12, 200); tone(900, 0, 1.2, 'sawtooth', 0.04, -800) },
      alarm: () => [0, 0.25, 0.5].forEach(t => { tone(740, t, 0.12, 'square', 0.08); tone(554, t + 0.12, 0.12, 'square', 0.08) }),
    }
    S[name]?.()
  } catch { /* 소리 없음 */ }
}
