// Tiny WebAudio sounds for Dapur Kilat. No audio files: every sound is a
// synthesized blip or a burst of filtered noise, made on first use so the
// browser's autoplay rules stay happy (init on the first user gesture).

let ctx = null;
let muted = false;

// Create (or reuse) the AudioContext. Call from a user gesture.
export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}

// One short oscillator blip: frequency slides from `from` to `to`.
function blip(from, to, duration, type, gainValue) {
  if (muted || !ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Audio is decoration; a failure never breaks the game.
  }
}

// A short burst of noise through a band-pass filter (the sizzle).
function noiseBurst(duration, frequency, gainValue) {
  if (muted || !ctx) return;
  try {
    const now = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  } catch {
    // Audio is decoration; a failure never breaks the game.
  }
}

// Chop: a quick low blip when an ingredient lands on the plate.
export function playChop() {
  blip(320, 140, 0.09, 'triangle', 0.18);
  noiseBurst(0.06, 2400, 0.08);
}

// Sizzle: the stove hisses while a dish is being assembled.
export function playSizzle() {
  noiseBurst(0.35, 5200, 0.05);
}

// Serve ding: two rising notes when a dish goes out.
export function playServe() {
  blip(660, 660, 0.12, 'sine', 0.2);
  setTimeout(() => blip(990, 990, 0.18, 'sine', 0.2), 90);
}

// Level-up fanfare: three quick rising notes.
export function playLevelUp() {
  blip(523, 523, 0.1, 'square', 0.12);
  setTimeout(() => blip(659, 659, 0.1, 'square', 0.12), 100);
  setTimeout(() => blip(784, 784, 0.16, 'square', 0.12), 200);
}

// Expire buzz: a low falling buzz when an order times out.
export function playExpire() {
  blip(220, 70, 0.35, 'sawtooth', 0.16);
}

// Wrong serve: a dull thud.
export function playWrong() {
  blip(160, 90, 0.15, 'square', 0.14);
}

// Click: a soft tick for buttons and the title screen.
export function playClick() {
  blip(700, 500, 0.05, 'sine', 0.1);
}

// Shift-complete chime: a warm two-note chime when a shift is survived.
export function playShiftDone() {
  blip(587, 587, 0.14, 'sine', 0.18);
  setTimeout(() => blip(880, 880, 0.22, 'sine', 0.18), 130);
}

// Ready chime: a bright two-note ping when the plate completes an order.
export function playReady() {
  blip(880, 880, 0.09, 'sine', 0.16);
  setTimeout(() => blip(1174, 1174, 0.14, 'sine', 0.16), 80);
}

// Game-over: three slow descending notes.
export function playGameOver() {
  blip(392, 392, 0.22, 'triangle', 0.16);
  setTimeout(() => blip(330, 330, 0.22, 'triangle', 0.16), 220);
  setTimeout(() => blip(262, 220, 0.4, 'triangle', 0.16), 440);
}
