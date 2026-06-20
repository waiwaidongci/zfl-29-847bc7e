import {
  GRID_SIZE,
  CELL_TYPES,
  STATS_MIN,
  STATS_MAX,
  GRID_COLS,
  GRID_ROWS,
  BUFFER_RANGE
} from './constants.js';
import { unlockByEvent } from './codex.js';
import { createRNG, generateSeed, seedToString } from './seeded-random.js';
import {
  createRulesContext,
  getFacilityCost,
  getFacilityName,
  clampStat,
  applyEcosystemEffectsWithRules,
  spreadPollutionWithRules,
  triggerStormWithRules,
  calculateScoreWithRules,
  checkWinConditionWithRules,
  clampAllStatsWithRules,
  getCellsInRangeForRules,
  getBufferProtectionCountWithRules,
  getNeighborsForRules
} from './rules-engine.js';

function createEmptyCells() {
  return Array.from({ length: GRID_SIZE }, () => ({
    type: CELL_TYPES.EMPTY,
    polluted: false
  }));
}

function createCellsFromPollutionIndices(pollutionIndices) {
  const cells = createEmptyCells();
  pollutionIndices.forEach(i => {
    if (i >= 0 && i < GRID_SIZE) {
      cells[i].polluted = true;
    }
  });
  return cells;
}

function cloneCells(cells) {
  return cells.map(cell => ({ ...cell }));
}

function serializeCells(cells) {
  return cells.map(cell => ({
    type: cell.type,
    polluted: cell.polluted
  }));
}

export function createGameState(scene, options) {
  const opts = options || {};
  let cells;
  if (scene.initialCells) {
    cells = cloneCells(scene.initialCells);
  } else {
    cells = createCellsFromPollutionIndices(scene.pollutionIndices || []);
  }

  const { oysters, grass, piles, buffers, pollution } = getFacilityCountsFromCells(cells);

  const seed = opts.seed != null ? (opts.seed | 0) : generateSeed();
  const rng = createRNG(seed);

  let gameMode = 'standard';
  if (scene.id === 'sandbox') {
    gameMode = scene.fromChallenge ? 'challenge' : 'sandbox';
  }
  if (scene.fromDailyChallenge) {
    gameMode = 'daily';
  }
  if (opts.campaignMode) {
    gameMode = 'campaign';
  }

  const rules = createRulesContext(scene.rules || {});

  const state = {
    turn: 1,
    budget: scene.budget,
    water: scene.water,
    larvae: scene.larvae,
    bio: scene.bio,
    ended: false,
    cells,
    log: [`【${scene.name}】第1潮，退潮露出修复区。目标：${scene.goalDesc}`],
    seed,
    seedStr: seedToString(seed),
    rng,
    rules,
    gameMode,
    dailyDate: scene.dateStr || null,
    campaignProgress: opts.campaignProgress || null,
    campaignId: opts.campaignId || null,
    campaignChapterOrder: opts.campaignChapterOrder || null,
    startTime: Date.now(),
    stormHitCount: 0,
    stormDamageCount: 0,
    replay: {
      sceneId: scene.id,
      sceneName: scene.name,
      goalDesc: scene.goalDesc,
      goalScore: scene.goalScore,
      seed,
      seedStr: seedToString(seed),
      gameMode,
      dailyDate: scene.dateStr || null,
      rulesSnapshot: JSON.parse(JSON.stringify(rules)),
      snapshots: [{
        turn: 0,
        water: scene.water,
        larvae: scene.larvae,
        bio: scene.bio,
        pollution,
        budget: scene.budget,
        oysters,
        grass,
        piles,
        buffers,
        cells: serializeCells(cells)
      }],
      events: [{
        turn: 0,
        type: 'start',
        message: `开始修复：${scene.name}，目标：${scene.goalDesc}`
      }]
    }
  };

  return state;
}

function getFacilityCountsFromCells(cells) {
  const oysters = cells.filter(c => c.type === 'oyster').length;
  const grass = cells.filter(c => c.type === 'grass').length;
  const piles = cells.filter(c => c.type === 'pile').length;
  const buffers = cells.filter(c => c.type === 'buffer').length;
  const pollution = cells.filter(c => c.polluted).length;
  return { oysters, grass, piles, buffers, pollution };
}

export function recordReplaySnapshot(game) {
  const { oysters, grass, piles, buffers, pollution } = getFacilityCounts(game);
  game.replay.snapshots.push({
    turn: game.turn,
    water: Math.round(game.water),
    larvae: Math.round(game.larvae),
    bio: Math.round(game.bio),
    pollution,
    budget: game.budget,
    oysters,
    grass,
    piles,
    buffers,
    cells: serializeCells(game.cells)
  });
}

export function recordReplayEvent(game, type, message, data) {
  game.replay.events.push({
    turn: game.turn,
    type,
    message,
    data: data || null
  });
}

export function getNeighbors(index) {
  return getNeighborsForRules(index);
}

export function getCellsInRange(index, range) {
  return getCellsInRangeForRules(index, range);
}

function getBufferProtectionCount(cells, index) {
  return getBufferProtectionCountWithRules(cells, index, createRulesContext());
}

export function clamp(v) {
  return Math.max(STATS_MIN, Math.min(STATS_MAX, v));
}

export function placeFacility(game, index, tool) {
  if (game.ended) return false;

  const cell = game.cells[index];
  const rules = game.rules || createRulesContext();

  if (tool === 'erase') {
    if (cell.type !== CELL_TYPES.EMPTY) {
      const removedType = cell.type;
      cell.type = CELL_TYPES.EMPTY;
      game.log.unshift('移除了一处设施。');
      recordReplayEvent(game, 'remove', '移除了一处设施', { type: removedType });
      return true;
    }
    return false;
  }

  const cost = getFacilityCost(rules, tool);
  if (cell.type !== CELL_TYPES.EMPTY || game.budget < cost) {
    return false;
  }

  cell.type = tool;
  game.budget -= cost;

  const name = getFacilityName(rules, tool);
  game.log.unshift(`放置${name}。`);
  recordReplayEvent(game, 'place', `放置${name}`, { type: tool, cost });
  unlockByEvent('place_' + tool);

  return true;
}

export function getFacilityCounts(game) {
  const oysters = game.cells.filter(c => c.type === 'oyster').length;
  const grass = game.cells.filter(c => c.type === 'grass').length;
  const piles = game.cells.filter(c => c.type === 'pile').length;
  const buffers = game.cells.filter(c => c.type === 'buffer').length;
  const pollution = game.cells.filter(c => c.polluted).length;
  return { oysters, grass, piles, buffers, pollution };
}

export function spreadPollution(game, piles) {
  const rules = game.rules || createRulesContext();
  const result = spreadPollutionWithRules(game, rules);
  const { newPolluted, cleanedCount } = result;

  if (newPolluted.size > 0) {
    recordReplayEvent(game, 'pollution_spread', `污染扩散，新增${newPolluted.size}个污染格`, { count: newPolluted.size });
    unlockByEvent('pollution_spread');
  }

  if (cleanedCount > 0) {
    recordReplayEvent(game, 'oyster_clean', `牡蛎礁净化了${cleanedCount}个污染格`, { count: cleanedCount });
    unlockByEvent('oyster_clean');
  }
}

export function triggerStorm(game) {
  const rules = game.rules || createRulesContext();

  if (!rules.storm.enabled || rules.effects.stormImmunity) {
    return;
  }

  const result = triggerStormWithRules(game, rules);
  const { damaged, damagedType, bufferCount, targetType, bufferSaved } = result;

  let damagedName = damagedType ? getFacilityName(rules, damagedType) : '设施';
  let targetName = targetType ? getFacilityName(rules, targetType) : '';
  let stormMsg = damaged
    ? `风暴潮冲刷了修复区，一处${damagedName}受损。`
    : '风暴潮冲刷了修复区，设施未受损。';
  if (bufferSaved) {
    stormMsg = `风暴潮冲刷了修复区，${targetName}在缓冲带保护下免受损毁。`;
  }
  game.log.unshift(stormMsg);
  recordReplayEvent(game, 'storm', stormMsg, {
    damaged,
    damagedType,
    bufferCount,
    targetType,
    bufferSaved
  });
  unlockByEvent('storm');
  if (!damaged) {
    unlockByEvent('storm_survive');
  }
}

export function applyEcosystemEffects(game) {
  const rules = game.rules || createRulesContext();
  applyEcosystemEffectsWithRules(game, rules);
}

export function clampAllStats(game) {
  const rules = game.rules || createRulesContext();
  clampAllStatsWithRules(game, rules);
}

export function calculateScore(game) {
  const rules = game.rules || createRulesContext();
  return calculateScoreWithRules(game, rules);
}

export function checkWinCondition(game, scene) {
  const rules = game.rules || createRulesContext();
  return checkWinConditionWithRules(game, scene, rules);
}

export function getGameRules(game) {
  return game.rules || createRulesContext();
}
