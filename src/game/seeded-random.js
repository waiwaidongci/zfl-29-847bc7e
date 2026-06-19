export function createRNG(seed) {
  let s = seed | 0;

  function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    random: next,
    seed
  };
}

export function generateSeed() {
  return (Math.random() * 2147483647) | 0;
}

export function seedToString(seed) {
  return (seed >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

export function seedFromString(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim().toUpperCase();
  const parsed = parseInt(trimmed, 36);
  if (isNaN(parsed) || parsed < 0) return null;
  return parsed | 0;
}
