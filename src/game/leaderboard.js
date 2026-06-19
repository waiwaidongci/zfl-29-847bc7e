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

export function getEntries(filters) {
  let result = [...entries];

  if (filters) {
    if (filters.gameMode && filters.gameMode !== 'all') {
      result = result.filter(e => e.gameMode === filters.gameMode);
    }
    if (filters.sceneId && filters.sceneId !== 'all') {
      result = result.filter(e => e.sceneId === filters.sceneId);
    }
    if (filters.win != null && filters.win !== 'all') {
      result = result.filter(e => e.win === filters.win);
    }
  }

  return result.sort((a, b) => b.score - a.score);
}

export function getBestEntry(sceneId, seed) {
  return entries
    .filter(e => e.sceneId === sceneId && e.seed === seed)
    .sort((a, b) => b.score - a.score)[0] || null;
}

export function getBestComparison(sceneId, seed, currentEntry) {
  const best = getBestEntry(sceneId, seed);
  if (!best) {
    return { isFirst: true, best: null, delta: null };
  }

  const isBetter = isBetterEntry(currentEntry, best);
  const delta = {
    score: currentEntry.score - best.score,
    pollution: currentEntry.pollution - best.pollution,
    budget: currentEntry.budget - best.budget,
    facilityCount: currentEntry.facilityCount - best.facilityCount,
    duration: currentEntry.duration != null && best.duration != null
      ? currentEntry.duration - best.duration
      : null
  };

  return {
    isFirst: false,
    isBetter,
    best,
    delta
  };
}

export function getTopEntries(filters, limit) {
  return getEntries(filters).slice(0, limit || 10);
}

export function getDistinctSceneIds() {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.sceneId)) {
      map.set(e.sceneId, { id: e.sceneId, name: e.sceneName });
    }
  }
  return Array.from(map.values());
}

export function resetLeaderboard() {
  entries = [];
  saveLeaderboardState();
}

export function getCategoryStats() {
  const stats = { standard: 0, sandbox: 0, challenge: 0, campaign: 0, all: entries.length };
  for (const e of entries) {
    if (stats[e.gameMode] !== undefined) {
      stats[e.gameMode]++;
    }
  }
  return stats;
}
