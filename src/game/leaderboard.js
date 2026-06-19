const STORAGE_KEY = 'tidal_leaderboard';
const MAX_ENTRIES_PER_GROUP = 20;

let entries = [];
let nextId = 1;

export function loadLeaderboardState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      entries = JSON.parse(stored);
      nextId = entries.reduce((max, e) => Math.max(max, e._id || 0), 0) + 1;
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
  entries.push({
    ...entry,
    _id: id,
    recordedAt: Date.now()
  });

  const groupKey = `${entry.sceneId}|${entry.seed}`;
  const group = entries.filter(e => `${e.sceneId}|${e.seed}` === groupKey);
  group.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a._id - b._id;
  });

  const toRemoveIds = new Set(
    group.slice(MAX_ENTRIES_PER_GROUP).map(e => e._id)
  );
  if (toRemoveIds.size > 0) {
    entries = entries.filter(e => !toRemoveIds.has(e._id));
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
