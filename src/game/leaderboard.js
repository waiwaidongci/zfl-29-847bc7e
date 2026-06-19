const STORAGE_KEY = 'tidal_leaderboard';

let entries = [];
let nextId = 1;

function getEntryKey(entry) {
  return `${entry.sceneId}|${entry.seed}`;
}

function isBetterEntry(candidate, current) {
  if (!current) return true;
  if (candidate.score !== current.score) return candidate.score > current.score;
  return (candidate.recordedAt || 0) < (current.recordedAt || 0);
}

function normalizeEntries() {
  const bestByKey = new Map();
  for (const entry of entries) {
    const key = getEntryKey(entry);
    const current = bestByKey.get(key);
    if (isBetterEntry(entry, current)) {
      bestByKey.set(key, entry);
    }
  }
  entries = Array.from(bestByKey.values());
}

export function loadLeaderboardState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      entries = JSON.parse(stored);
      normalizeEntries();
      nextId = entries.reduce((max, e) => Math.max(max, e._id || 0), 0) + 1;
      saveLeaderboardState();
    }
  } catch {
    entries = [];
  }
}

export function saveLeaderboardState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function addEntry(entry) {
  const id = nextId++;
  const nextEntry = {
    ...entry,
    _id: id,
    recordedAt: Date.now()
  };

  const key = getEntryKey(nextEntry);
  const current = entries.find(e => getEntryKey(e) === key);
  if (isBetterEntry(nextEntry, current)) {
    entries = entries.filter(e => getEntryKey(e) !== key);
    entries.push(nextEntry);
  }

  saveLeaderboardState();
}

export function getEntries(category) {
  if (category === 'all') {
    return [...entries].sort((a, b) => b.score - a.score);
  }
  return entries
    .filter(e => e.gameMode === category)
    .sort((a, b) => b.score - a.score);
}

export function getBestEntry(sceneId, seed) {
  return entries
    .filter(e => e.sceneId === sceneId && e.seed === seed)
    .sort((a, b) => b.score - a.score)[0] || null;
}

export function getTopEntries(category, limit) {
  return getEntries(category).slice(0, limit || 10);
}

export function resetLeaderboard() {
  entries = [];
  saveLeaderboardState();
}

export function getCategoryStats() {
  const stats = { standard: 0, sandbox: 0, challenge: 0, all: entries.length };
  for (const e of entries) {
    if (stats[e.gameMode] !== undefined) {
      stats[e.gameMode]++;
    }
  }
  return stats;
}
