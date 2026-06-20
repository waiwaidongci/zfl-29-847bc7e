import { achievements, getTotalAchievements } from '../data/achievements.js';

const STORAGE_KEY = 'tidal_achievements_state';
const STORAGE_KEY_PROGRESS = 'tidal_achievements_progress';

let unlockedMap = {};
let progressStats = {
  totalGames: 0,
  totalWins: 0,
  totalOysters: 0,
  totalGrass: 0,
  totalPiles: 0,
  totalBuffers: 0,
  totalCleaned: 0,
  stormsSurvived: 0,
  wonScenes: [],
  lastWin: false,
  lastScore: 0,
  lastSceneId: null
};
let onUnlockCallback = null;

function defaultProgress() {
  return {
    totalGames: 0,
    totalWins: 0,
    totalOysters: 0,
    totalGrass: 0,
    totalPiles: 0,
    totalBuffers: 0,
    totalCleaned: 0,
    stormsSurvived: 0,
    wonScenes: [],
    lastWin: false,
    lastScore: 0,
    lastSceneId: null
  };
}

export function loadAchievementsState() {
  try {
    const storedUnlocked = localStorage.getItem(STORAGE_KEY);
    if (storedUnlocked) {
      unlockedMap = JSON.parse(storedUnlocked);
    }
  } catch {
    unlockedMap = {};
  }

  try {
    const storedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (storedProgress) {
      progressStats = { ...defaultProgress(), ...JSON.parse(storedProgress) };
    } else {
      progressStats = defaultProgress();
    }
  } catch {
    progressStats = defaultProgress();
  }
}

export function saveAchievementsState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedMap));
  } catch {}
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progressStats));
  } catch {}
}

export function isUnlocked(achievementId) {
  return !!unlockedMap[achievementId];
}

export function getUnlockInfo(achievementId) {
  return unlockedMap[achievementId] || null;
}

export function getUnlockedCount() {
  return Object.keys(unlockedMap).length;
}

export function getTotalCount() {
  return getTotalAchievements();
}

export function getProgressStats() {
  return { ...progressStats };
}

export function onAchievementUnlock(callback) {
  onUnlockCallback = callback;
}

function unlockAchievement(achievementId, sceneId) {
  if (unlockedMap[achievementId]) return false;

  const now = Date.now();
  unlockedMap[achievementId] = {
    unlockedAt: now,
    sceneId: sceneId || null
  };
  saveAchievementsState();

  if (onUnlockCallback) {
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement) {
      onUnlockCallback(achievement, unlockedMap[achievementId]);
    }
  }
  return true;
}

export function recordPlaceFacility(type) {
  if (type === 'oyster') progressStats.totalOysters += 1;
  if (type === 'grass') progressStats.totalGrass += 1;
  if (type === 'pile') progressStats.totalPiles += 1;
  if (type === 'buffer') progressStats.totalBuffers += 1;
  saveAchievementsState();
}

export function recordCleanPollution(count) {
  progressStats.totalCleaned += count || 0;
  saveAchievementsState();
}

export function recordStormSurvived() {
  progressStats.stormsSurvived += 1;
  saveAchievementsState();
}

export function checkGameEndAchievements(game, scene, win, score) {
  progressStats.totalGames += 1;
  progressStats.lastWin = win;
  progressStats.lastScore = score;
  progressStats.lastSceneId = scene.id;

  if (win) {
    progressStats.totalWins += 1;
    if (scene.id !== 'sandbox' && !progressStats.wonScenes.includes(scene.id)) {
      progressStats.wonScenes.push(scene.id);
    }
  }

  saveAchievementsState();

  const newlyUnlocked = [];
  for (const achievement of achievements) {
    if (!isUnlocked(achievement.id)) {
      try {
        if (achievement.check(progressStats, game, scene)) {
          if (unlockAchievement(achievement.id, scene.id)) {
            newlyUnlocked.push(achievement);
          }
        }
      } catch (e) {
      }
    }
  }

  return newlyUnlocked;
}

export function checkCumulativeAchievements(sceneId) {
  const newlyUnlocked = [];
  for (const achievement of achievements) {
    if (achievement.type === 'cumulative' && !isUnlocked(achievement.id)) {
      try {
        if (achievement.check(progressStats, null, null)) {
          if (unlockAchievement(achievement.id, sceneId || progressStats.lastSceneId)) {
            newlyUnlocked.push(achievement);
          }
        }
      } catch (e) {
      }
    }
  }
  return newlyUnlocked;
}

export function resetAchievements() {
  unlockedMap = {};
  progressStats = defaultProgress();
  saveAchievementsState();
}
