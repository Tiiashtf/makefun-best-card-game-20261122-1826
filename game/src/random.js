// Cinder & Tide — a small seeded random source.
//
// Real games seed from the clock; staged screenshots seed from a fixed
// number so the same scene always renders the same way.

/** Mulberry32: a tiny, fast PRNG with a 32-bit seed. */
export function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from the clock, for real games. */
export function clockSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
