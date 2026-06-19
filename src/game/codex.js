import { getAllCodexEntries } from '../data/codex.js';

const STORAGE_KEY = 'tidal_codex_unlocked';

let unlockedSet = new Set();
let onUnlockCallback = null;

export function loadCodexState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      unlockedSet = new Set(JSON.parse(stored));
    }
  } catch {
    unlockedSet = new Set();
  }
}

export function saveCodexState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlockedSet]));
  } catch {}
}

export function isUnlocked(entryId) {
  return unlockedSet.has(entryId);
}

export function getUnlockedIds() {
  return [...unlockedSet];
}

export function getUnlockedCount() {
  return unlockedSet.size;
}

export function getTotalCount() {
  return getAllCodexEntries().length;
}

export function unlockEntry(entryId) {
  if (unlockedSet.has(entryId)) return false;
  unlockedSet.add(entryId);
  saveCodexState();
  if (onUnlockCallback) {
    onUnlockCallback(entryId);
  }
  return true;
}

export function unlockByEvent(eventName) {
  const entries = getAllCodexEntries();
  for (const entry of entries) {
    if (entry.unlockEvent === eventName) {
      unlockEntry(entry.id);
    }
  }
}

export function onUnlock(callback) {
  onUnlockCallback = callback;
}

export function resetCodexState() {
  unlockedSet = new Set();
  saveCodexState();
}
