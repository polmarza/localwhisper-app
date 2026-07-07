// Tiny UI "pop" sounds for record start/stop, synthesized with the Web Audio
// API so we don't have to bundle (or license) any audio files. A short sine
// with a fast attack and a slight downward pitch bend reads as a soft pop.

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function pop(freq: number, gain = 0.14, dur = 0.11) {
  const c = audioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.72), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/** Rising, brighter pop when a dictation starts. */
export function playStartSound() {
  pop(660);
}

/** Lower, softer pop when a dictation stops. */
export function playStopSound() {
  pop(430);
}
