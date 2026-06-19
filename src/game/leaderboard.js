const STORAGE_KEY = 'tidal_leaderboard';
const MAX_ENTRIES_PER_SCENE = 20;

let entries = [];

export function loadLeaderboardState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      entries = JSON.parse(stored);
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
  entries.push({
    ...entry,
    recordedAt: Date.now()
  });

  const key = `${entry.sceneId}|${entry.seed}`;
  const group = entries.filter(e => `${e.sceneId}|${e.seed}` === key);
  group.sort((a, b) => b.score - a.score);
  const toRemove = group.slice(MAX_ENTRIES_PER_SCENE);
  if (toRemove.length > 0) {
    const removeSet = new Set(toRemove.map(e => e.recordedAt));
    entries = entries.filter(e => !removeSet.has(e.recordedAt) || `${e.sceneId}|${e.seed}` !== key);
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
