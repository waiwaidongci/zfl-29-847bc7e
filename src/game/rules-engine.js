import {
  GRID_SIZE,
  CELL_TYPES,
  COSTS as DEFAULT_COSTS,
  STATS_MIN,
  STATS_MAX,
  TURN_BUDGET_BONUS,
  OYSTER_WATER_BONUS,
  OYSTER_LARVAE_BONUS,
  OYSTER_BIO_BONUS,
  GRASS_LARVAE_BONUS,
  GRASS_BIO_BONUS,
  POLLUTION_WATER_PENALTY,
  POLLUTION_LARVAE_PENALTY,
  POLLUTION_BIO_PENALTY,
  POLLUTION_SPREAD_BASE,
  POLLUTION_SPREAD_MIN,
  POLLUTION_SPREAD_PILE_REDUCTION,
  OYSTER_CLEAN_CHANCE,
  STORM_DAMAGE_CHANCE,
  STORM_WATER_PENALTY,
  SCORE_WATER_WEIGHT,
  SCORE_LARVAE_WEIGHT,
  SCORE_BIO_WEIGHT,
  SCORE_BUDGET_WEIGHT,
  SCORE_POLLUTION_PENALTY,
  BUFFER_RANGE,
  BUFFER_STORM_REDUCTION,
  BUFFER_POLLUTION_REDUCTION
} from './constants.js';

export const DEFAULT_RULESET_ID = 'default';

export const DEFAULT_RULES = {
  id: DEFAULT_RULESET_ID,
  version: 1,
  name: '标准生态规则',
  description: '默认的海岸生态修复模拟规则集',

  facilityCosts: { ...DEFAULT_COSTS },

  facilityNames: {
    oyster: '牡蛎礁',
    grass: '海草床',
    pile: '围护桩',
    buffer: '潮汐缓冲带',
    erase: '移除'
  },

  ecosystem: {
    turnBudgetBonus: TURN_BUDGET_BONUS,
    oyster: {
      waterBonus: OYSTER_WATER_BONUS,
      larvaeBonus: OYSTER_LARVAE_BONUS,
      bioBonus: OYSTER_BIO_BONUS,
      cleanChance: OYSTER_CLEAN_CHANCE,
      enabled: true
    },
    grass: {
      larvaeBonus: GRASS_LARVAE_BONUS,
      bioBonus: GRASS_BIO_BONUS,
      enabled: true
    },
    pollution: {
      waterPenalty: POLLUTION_WATER_PENALTY,
      larvaePenalty: POLLUTION_LARVAE_PENALTY,
      bioPenalty: POLLUTION_BIO_PENALTY,
      enabled: true
    }
  },

  pollutionSpread: {
    baseChance: POLLUTION_SPREAD_BASE,
    minChance: POLLUTION_SPREAD_MIN,
    pileReductionPerPile: POLLUTION_SPREAD_PILE_REDUCTION,
    enabled: true,
    pileBlocksSpread: true,
    bufferReductionPerBuffer: BUFFER_POLLUTION_REDUCTION
  },

  storm: {
    damageChance: STORM_DAMAGE_CHANCE,
    waterPenalty: STORM_WATER_PENALTY,
    enabled: true,
    bufferProtectionRange: BUFFER_RANGE,
    bufferDamageReduction: BUFFER_STORM_REDUCTION
  },

  scoring: {
    waterWeight: SCORE_WATER_WEIGHT,
    larvaeWeight: SCORE_LARVAE_WEIGHT,
    bioWeight: SCORE_BIO_WEIGHT,
    budgetWeight: SCORE_BUDGET_WEIGHT,
    pollutionPenalty: SCORE_POLLUTION_PENALTY
  },

  winConditions: {
    requireScore: true,
    requirePollutionMax: false,
    requireMinStats: false
  },

  effects: {
    extraTurnBudgetBonus: 0,
    globalWaterMultiplier: 1,
    globalLarvaeMultiplier: 1,
    globalBioMultiplier: 1,
    pollutionImmunity: false,
    stormImmunity: false,
    unlimitedBudget: false
  },

  advisor: {
    enabled: true,
    stormRiskThreshold: 0.25,
    highStormRiskThreshold: 0.35,
    highPollutionRatio: 0.3,
    mediumPollutionRatio: 0.15,
    criticalTurns: 3,
    warningTurns: 5
  }
};

export function createRulesContext(sceneRules) {
  const base = deepClone(DEFAULT_RULES);
  const scene = sceneRules || {};
  return mergeRules(base, scene);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeRules(base, override) {
  if (!override || typeof override !== 'object') return base;
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = result[key];
    const overVal = override[key];
    if (
      baseVal !== undefined &&
      overVal !== null &&
      typeof overVal === 'object' &&
      !Array.isArray(overVal)
    ) {
      result[key] = mergeRules(baseVal, overVal);
    } else if (overVal !== undefined) {
      result[key] = overVal;
    }
  }
  return result;
}

export function getFacilityCost(rules, type) {
  if (rules.effects.unlimitedBudget) return 0;
  return rules.facilityCosts[type] != null ? rules.facilityCosts[type] : 0;
}

export function getFacilityName(rules, type) {
  return rules.facilityNames[type] || type;
}

export function clampStat(v, rules) {
  const min = rules.stats?.min != null ? rules.stats.min : STATS_MIN;
  const max = rules.stats?.max != null ? rules.stats.max : STATS_MAX;
  return Math.max(min, Math.min(max, v));
}

export function calculateEcosystemEffects(game, rules) {
  const cells = game.cells;
  let oysters = 0, grass = 0, pollution = 0;
  cells.forEach(c => {
    if (c.type === 'oyster') oysters++;
    if (c.type === 'grass') grass++;
    if (c.polluted) pollution++;
  });

  const eco = rules.ecosystem;
  let waterDelta = 0;
  let larvaeDelta = 0;
  let bioDelta = 0;

  if (eco.oyster.enabled) {
    waterDelta += oysters * eco.oyster.waterBonus;
    larvaeDelta += oysters * eco.oyster.larvaeBonus;
    bioDelta += oysters * eco.oyster.bioBonus;
  }

  if (eco.grass.enabled) {
    larvaeDelta += grass * eco.grass.larvaeBonus;
    bioDelta += grass * eco.grass.bioBonus;
  }

  if (eco.pollution.enabled && !rules.effects.pollutionImmunity) {
    waterDelta -= pollution * eco.pollution.waterPenalty;
    larvaeDelta -= pollution * eco.pollution.larvaePenalty;
    bioDelta -= pollution * eco.pollution.bioPenalty;
  }

  waterDelta *= rules.effects.globalWaterMultiplier || 1;
  larvaeDelta *= rules.effects.globalLarvaeMultiplier || 1;
  bioDelta *= rules.effects.globalBioMultiplier || 1;

  let budgetDelta = eco.turnBudgetBonus + (rules.effects.extraTurnBudgetBonus || 0);

  return { waterDelta, larvaeDelta, bioDelta, budgetDelta, oysters, grass, pollution };
}

export function applyEcosystemEffectsWithRules(game, rules) {
  const deltas = calculateEcosystemEffects(game, rules);
  game.water += deltas.waterDelta;
  game.larvae += deltas.larvaeDelta;
  game.bio += deltas.bioDelta;
  game.budget += deltas.budgetDelta;
  return deltas;
}

export function getCellsInRangeForRules(index, range) {
  const GRID_COLS = 12;
  const GRID_ROWS = 8;
  const x = index % GRID_COLS;
  const y = Math.floor(index / GRID_COLS);
  const cells = [];
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance <= range) {
          cells.push(ny * GRID_COLS + nx);
        }
      }
    }
  }
  return cells;
}

export function getBufferProtectionCountWithRules(cells, index, rules) {
  const protectedBy = new Set();
  const range = rules.storm.bufferProtectionRange;
  cells.forEach((cell, i) => {
    if (cell.type === 'buffer') {
      const protectedCells = getCellsInRangeForRules(i, range);
      if (protectedCells.includes(index)) {
        protectedBy.add(i);
      }
    }
  });
  return protectedBy.size;
}

export function getNeighborsForRules(index) {
  const GRID_COLS = 12;
  const GRID_ROWS = 8;
  const x = index % GRID_COLS;
  const y = Math.floor(index / GRID_COLS);
  return [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1]
  ]
    .filter(([a, b]) => a >= 0 && a < GRID_COLS && b >= 0 && b < GRID_ROWS)
    .map(([a, b]) => b * GRID_COLS + a);
}

export function spreadPollutionWithRules(game, rules) {
  if (!rules.pollutionSpread.enabled || rules.effects.pollutionImmunity) {
    return { newPolluted: new Set(), cleanedCount: 0 };
  }

  const ps = rules.pollutionSpread;
  const piles = game.cells.filter(c => c.type === 'pile').length;
  const newPolluted = new Set();
  const rng = game.rng;

  game.cells.forEach((cell, i) => {
    if (!cell.polluted) return;
    for (const n of getNeighborsForRules(i)) {
      if (ps.pileBlocksSpread && game.cells[n].type === 'pile') continue;
      if (game.cells[n].polluted) continue;
      const bufferCount = getBufferProtectionCountWithRules(game.cells, n, rules);
      const spreadChance = Math.max(
        ps.minChance,
        ps.baseChance - piles * ps.pileReductionPerPile - bufferCount * (ps.bufferReductionPerBuffer || 0)
      );
      if (rng.random() < spreadChance) {
        newPolluted.add(n);
      }
    }
  });

  newPolluted.forEach(i => {
    game.cells[i].polluted = true;
  });

  let cleanedCount = 0;
  if (rules.ecosystem.oyster.enabled && rules.ecosystem.oyster.cleanChance > 0) {
    game.cells.forEach(cell => {
      if (cell.type === 'oyster' && cell.polluted && rng.random() < rules.ecosystem.oyster.cleanChance) {
        cell.polluted = false;
        cleanedCount++;
      }
    });
  }

  return { newPolluted, cleanedCount };
}

export function triggerStormWithRules(game, rules) {
  if (!rules.storm.enabled || rules.effects.stormImmunity) {
    return { damaged: false, damagedType: null, bufferCount: 0, targetType: null, bufferSaved: false };
  }

  const sr = rules.storm;
  const placed = game.cells.filter(c => c.type !== CELL_TYPES.EMPTY);
  let damaged = false;
  let damagedType = null;
  let bufferCount = 0;
  let targetType = null;

  if (placed.length > 0) {
    const idx = Math.floor(game.rng.random() * placed.length);
    const targetCell = placed[idx];
    targetType = targetCell.type;
    const targetIndex = game.cells.indexOf(targetCell);
    bufferCount = getBufferProtectionCountWithRules(game.cells, targetIndex, rules);
    const adjustedDamageChance = Math.max(0, sr.damageChance * (1 - bufferCount * sr.bufferDamageReduction));
    if (game.rng.random() < adjustedDamageChance) {
      damagedType = targetCell.type;
      targetCell.type = CELL_TYPES.EMPTY;
      damaged = true;
    }
  }

  game.water -= sr.waterPenalty;
  game.stormHitCount = (game.stormHitCount || 0) + 1;
  if (damaged) {
    game.stormDamageCount = (game.stormDamageCount || 0) + 1;
  }

  return {
    damaged,
    damagedType,
    bufferCount,
    targetType,
    bufferSaved: bufferCount > 0 && !damaged && targetType != null
  };
}

export function calculateScoreWithRules(game, rules) {
  const pollution = game.cells.filter(c => c.polluted).length;
  const sc = rules.scoring;
  return Math.round(
    game.water * sc.waterWeight +
    game.larvae * sc.larvaeWeight +
    game.bio * sc.bioWeight +
    game.budget * sc.budgetWeight -
    pollution * sc.pollutionPenalty
  );
}

export function checkWinConditionWithRules(game, scene, rules) {
  const score = calculateScoreWithRules(game, rules);
  const pollution = game.cells.filter(c => c.polluted).length;
  const wc = rules.winConditions;

  let win = true;

  if (wc.requireScore) {
    win = win && score >= scene.goalScore;
  }

  if (wc.requirePollutionMax && scene.goalPollutionMax != null) {
    win = win && pollution <= scene.goalPollutionMax;
  }

  if (wc.requireMinStats && scene.goalMinStats != null) {
    win = win &&
      game.water >= scene.goalMinStats &&
      game.larvae >= scene.goalMinStats &&
      game.bio >= scene.goalMinStats;
  }

  if (scene.goalPollutionMax != null) {
    win = win && pollution <= scene.goalPollutionMax;
  }

  if (scene.goalMinStats != null) {
    win = win &&
      game.water >= scene.goalMinStats &&
      game.larvae >= scene.goalMinStats &&
      game.bio >= scene.goalMinStats;
  }

  return { win, score, pollution };
}

export function clampAllStatsWithRules(game, rules) {
  game.water = clampStat(game.water, rules);
  game.larvae = clampStat(game.larvae, rules);
  game.bio = clampStat(game.bio, rules);
}

export function getRulesForAdvisor(rules) {
  return {
    turnBudgetBonus: rules.ecosystem.turnBudgetBonus,
    oysterWaterBonus: rules.ecosystem.oyster.waterBonus,
    oysterLarvaeBonus: rules.ecosystem.oyster.larvaeBonus,
    oysterBioBonus: rules.ecosystem.oyster.bioBonus,
    oysterCleanChance: rules.ecosystem.oyster.cleanChance,
    grassLarvaeBonus: rules.ecosystem.grass.larvaeBonus,
    grassBioBonus: rules.ecosystem.grass.bioBonus,
    pollutionWaterPenalty: rules.ecosystem.pollution.waterPenalty,
    pollutionLarvaePenalty: rules.ecosystem.pollution.larvaePenalty,
    pollutionBioPenalty: rules.ecosystem.pollution.bioPenalty,
    pollutionSpreadBase: rules.pollutionSpread.baseChance,
    pollutionSpreadMin: rules.pollutionSpread.minChance,
    pollutionSpreadPileReduction: rules.pollutionSpread.pileReductionPerPile,
    stormDamageChance: rules.storm.damageChance,
    stormWaterPenalty: rules.storm.waterPenalty,
    scoreWaterWeight: rules.scoring.waterWeight,
    scoreLarvaeWeight: rules.scoring.larvaeWeight,
    scoreBioWeight: rules.scoring.bioWeight,
    scoreBudgetWeight: rules.scoring.budgetWeight,
    scorePollutionPenalty: rules.scoring.pollutionPenalty,
    bufferRange: rules.storm.bufferProtectionRange,
    bufferStormReduction: rules.storm.bufferDamageReduction,
    bufferPollutionReduction: rules.pollutionSpread.bufferReductionPerBuffer || 0,
    stormRiskThreshold: rules.advisor.stormRiskThreshold,
    highStormRiskThreshold: rules.advisor.highStormRiskThreshold,
    highPollutionRatio: rules.advisor.highPollutionRatio,
    mediumPollutionRatio: rules.advisor.mediumPollutionRatio,
    criticalTurns: rules.advisor.criticalTurns,
    warningTurns: rules.advisor.warningTurns,
    facilityCosts: { ...rules.facilityCosts }
  };
}

export function buildSceneGoalDesc(scene, rules) {
  const goalParts = [`生态评分 ≥ ${scene.goalScore}`];
  if (scene.goalPollutionMax != null) {
    goalParts.push(`污染 ≤ ${scene.goalPollutionMax}格`);
  }
  if (scene.goalMinStats != null) {
    goalParts.push(`所有指标 ≥ ${scene.goalMinStats}`);
  }
  return goalParts.join(' 且 ');
}
