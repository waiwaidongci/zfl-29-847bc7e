import { GRID_SIZE, GRID_COLS, GRID_ROWS, COSTS } from './constants.js';
import { createRNG, seedFromString, seedToString } from './seeded-random.js';

export const DAILY_CHALLENGE_SCENE_ID = 'daily-challenge';
const STORAGE_KEY = 'tidal_daily_challenge_state';

let cachedDailyChallenge = null;
let cachedDateStr = null;

export function getDateStr(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isToday(dateStr) {
  return dateStr === getDateStr();
}

export function generateDailySeed(dateStr) {
  const seedStr = `daily-challenge-${dateStr}`;
  return seedFromString(seedStr) || 12345;
}

export function generateDailyChallenge(dateStr) {
  if (cachedDateStr === dateStr && cachedDailyChallenge) {
    return cachedDailyChallenge;
  }

  const seed = generateDailySeed(dateStr);
  const rng = createRNG(seed);

  const difficultySeed = rng.random();
  let difficulty;
  if (difficultySeed < 0.4) difficulty = 'easy';
  else if (difficultySeed < 0.75) difficulty = 'medium';
  else difficulty = 'hard';

  const difficultyConfig = {
    easy: {
      budgetRange: [120, 160],
      turnsRange: [10, 12],
      stormRange: [0.15, 0.25],
      pollutionRange: [15, 25],
      goalScoreRange: [45, 55],
      waterRange: [50, 60],
      larvaeRange: [25, 35],
      bioRange: [25, 35],
      prebuiltFacilityCount: [2, 4]
    },
    medium: {
      budgetRange: [100, 140],
      turnsRange: [10, 14],
      stormRange: [0.20, 0.35],
      pollutionRange: [20, 35],
      goalScoreRange: [50, 65],
      waterRange: [40, 55],
      larvaeRange: [15, 30],
      bioRange: [15, 30],
      prebuiltFacilityCount: [1, 3]
    },
    hard: {
      budgetRange: [80, 120],
      turnsRange: [12, 16],
      stormRange: [0.30, 0.45],
      pollutionRange: [30, 45],
      goalScoreRange: [55, 75],
      waterRange: [30, 45],
      larvaeRange: [10, 25],
      bioRange: [10, 25],
      prebuiltFacilityCount: [0, 2]
    }
  };

  const config = difficultyConfig[difficulty];

  function randRange(range) {
    return Math.floor(rng.random() * (range[1] - range[0] + 1)) + range[0];
  }

  function randFloatRange(range) {
    return Math.round((rng.random() * (range[1] - range[0]) + range[0]) * 100) / 100;
  }

  const budget = randRange(config.budgetRange);
  const turns = randRange(config.turnsRange);
  const stormChance = randFloatRange(config.stormRange);
  const pollutionCount = randRange(config.pollutionRange);
  const goalScore = randRange(config.goalScoreRange);
  const water = randRange(config.waterRange);
  const larvae = randRange(config.larvaeRange);
  const bio = randRange(config.bioRange);
  const prebuiltCount = randRange(config.prebuiltFacilityCount);

  const cells = Array.from({ length: GRID_SIZE }, () => ({
    type: 'empty',
    polluted: false
  }));

  const allIndices = Array.from({ length: GRID_SIZE }, (_, i) => i);
  const shuffled = allIndices.sort(() => rng.random() - 0.5);

  const pollutionIndices = shuffled.slice(0, pollutionCount);
  pollutionIndices.forEach(i => {
    cells[i].polluted = true;
  });

  const availableIndices = shuffled.slice(pollutionCount);
  const facilityTypes = ['oyster', 'grass', 'pile', 'buffer'];
  let prebuiltCost = 0;

  for (let i = 0; i < prebuiltCount && i < availableIndices.length; i++) {
    const idx = availableIndices[i];
    const typeIdx = Math.floor(rng.random() * facilityTypes.length);
    const type = facilityTypes[typeIdx];
    const cost = COSTS[type];

    if (prebuiltCost + cost <= budget * 0.3) {
      cells[idx].type = type;
      prebuiltCost += cost;
    }
  }

  const goalPollutionMax = rng.random() < 0.5
    ? Math.max(0, pollutionCount - Math.floor(rng.random() * 10) - 3)
    : null;

  const goalMinStats = rng.random() < 0.3
    ? Math.floor(rng.random() * 20) + 30
    : null;

  const goalParts = [`生态评分 ≥ ${goalScore}`];
  if (goalPollutionMax != null) {
    goalParts.push(`污染 ≤ ${goalPollutionMax}格`);
  }
  if (goalMinStats != null) {
    goalParts.push(`所有指标 ≥ ${goalMinStats}`);
  }
  const goalDesc = goalParts.join(' 且 ');

  const difficultyLabel = { easy: '简单', medium: '中等', hard: '困难' }[difficulty];
  const difficultyIcon = { easy: '🌱', medium: '🌊', hard: '⛈️' }[difficulty];

  const scene = {
    id: `${DAILY_CHALLENGE_SCENE_ID}-${dateStr}`,
    dateStr,
    name: `每日挑战 · ${dateStr}`,
    displayName: `${difficultyIcon} 每日挑战 · ${dateStr}`,
    difficulty,
    difficultyLabel,
    difficultyIcon,
    desc: generateDailyDescription(dateStr, difficulty, seed),
    budget: budget - prebuiltCost,
    water,
    larvae,
    bio,
    turns,
    stormChance,
    pollutionIndices,
    goalScore,
    goalPollutionMax,
    goalMinStats,
    goalDesc,
    tags: ['每日挑战', difficultyLabel],
    winText: '🎉 恭喜！你成功完成了今日的每日挑战！',
    loseText: '挑战失败，调整策略后再试一次吧！',
    initialCells: cells.map(c => ({ type: c.type, polluted: c.polluted })),
    seed,
    seedStr: seedToString(seed),
    prebuiltCost,
    fromDailyChallenge: true
  };

  cachedDailyChallenge = scene;
  cachedDateStr = dateStr;

  return scene;
}

function generateDailyDescription(dateStr, difficulty, seed) {
  const seedStr = seedToString(seed);
  const difficultyDesc = {
    easy: '今日挑战难度较低，适合练习基础修复技巧。',
    medium: '今日挑战难度适中，需要合理规划设施布局。',
    hard: '今日挑战难度较高，需要精细的策略和时机把握！'
  }[difficulty];

  const tips = [
    '提示：先建立围护桩控制污染扩散，再投放生态修复设施。',
    '提示：牡蛎礁净化水质效果显著，建议优先布置。',
    '提示：海草床能有效提升生物多样性，可与牡蛎礁搭配使用。',
    '提示：潮汐缓冲带能降低风暴损毁风险，关键设施旁记得布置。',
    '提示：分散设施布局可以降低风暴潮造成的连锁损失。',
    '提示：关注每回合的预算增长，合理安排投放节奏。'
  ];

  const tipIdx = (seed & 0xffff) % tips.length;

  return `${difficultyDesc}\n${tips[tipIdx]}\n挑战种子：${seedStr}`;
}

export function getTodayDailyChallenge() {
  const dateStr = getDateStr();
  return generateDailyChallenge(dateStr);
}

export function getDailyChallengeByDate(dateStr) {
  return generateDailyChallenge(dateStr);
}

export function getAvailableDailyChallengeDates() {
  const state = loadDailyChallengeState();
  return state.playedDates || [];
}

export function recordDailyChallengePlayed(dateStr) {
  const state = loadDailyChallengeState();
  if (!state.playedDates.includes(dateStr)) {
    state.playedDates.push(dateStr);
    state.playedDates.sort().reverse();
    if (state.playedDates.length > 365) {
      state.playedDates = state.playedDates.slice(0, 365);
    }
    saveDailyChallengeState(state);
  }
}

export function getDailyChallengeBestScore(dateStr) {
  const state = loadDailyChallengeState();
  return state.bestScores?.[dateStr] || null;
}

export function setDailyChallengeBestScore(dateStr, score) {
  const state = loadDailyChallengeState();
  if (!state.bestScores) {
    state.bestScores = {};
  }
  if (!state.bestScores[dateStr] || score > state.bestScores[dateStr]) {
    state.bestScores[dateStr] = score;
    saveDailyChallengeState(state);
  }
}

function loadDailyChallengeState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    playedDates: [],
    bestScores: {}
  };
}

function saveDailyChallengeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function formatDateDisplay(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  }
  return dateStr;
}

export function getDifficultyColor(difficulty) {
  return {
    easy: '#6eb77a',
    medium: '#c08d2d',
    hard: '#c0392b'
  }[difficulty] || '#4a5f5d';
}
