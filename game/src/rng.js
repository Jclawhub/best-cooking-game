// Seeded random numbers for Dapur Kilat.
// mulberry32: small, fast, deterministic. A fixed seed replays the same
// kitchen every time, which is what the screenshot staging relies on.

// Build a mulberry32 generator from any integer seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn a string (e.g. a query seed) into a 32-bit integer seed.
export function seedFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick a random element of an array with the given generator.
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

// A random integer in [min, max).
export function intIn(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

// Shuffle a copy of an array (Fisher-Yates) with the given generator.
export function shuffle(rng, array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// A random float in [min, max) with the given generator.
export function floatIn(rng, min, max) {
  return min + rng() * (max - min);
}

// Roll a chance: true with probability p (0..1).
export function chance(rng, p) {
  return rng() < p;
}
