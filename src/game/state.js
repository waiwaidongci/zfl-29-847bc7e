import {
  GRID_SIZE,
  CELL_TYPES,
  COSTS,
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
  GRID_COLS,
  GRID_ROWS
} from './constants.js';

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

export function createGameState(scene) {
  let cells;
  if (scene.initialCells) {
    cells = cloneCells(scene.initialCells);
  } else {
    cells = createCellsFromPollutionIndices(scene.pollutionIndices || []);
  }

  return {
    turn: 1,
    budget: scene.budget,
    water: scene.water,
    larvae: scene.larvae,
    bio: scene.bio,
    ended: false,
    cells,
    log: [`【${scene.name}】第1潮，退潮露出修复区。目标：${scene.goalDesc}`]
  };
}

export function getNeighbors(index) {
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

export function clamp(v) {
  return Math.max(STATS_MIN, Math.min(STATS_MAX, v));
}

export function placeFacility(game, index, tool) {
  if (game.ended) return false;

  const cell = game.cells[index];

  if (tool === 'erase') {
    if (cell.type !== CELL_TYPES.EMPTY) {
      cell.type = CELL_TYPES.EMPTY;
      game.log.unshift('移除了一处设施。');
      return true;
    }
    return false;
  }

  if (cell.type !== CELL_TYPES.EMPTY || game.budget < COSTS[tool]) {
    return false;
  }

  cell.type = tool;
  game.budget -= COSTS[tool];

  const nameMap = { oyster: '牡蛎礁', grass: '海草床', pile: '围护桩' };
  game.log.unshift(`放置${nameMap[tool]}。`);

  return true;
}

export function getFacilityCounts(game) {
  const oysters = game.cells.filter(c => c.type === 'oyster').length;
  const grass = game.cells.filter(c => c.type === 'grass').length;
  const piles = game.cells.filter(c => c.type === 'pile').length;
  const pollution = game.cells.filter(c => c.polluted).length;
  return { oysters, grass, piles, pollution };
}

export function spreadPollution(game, piles) {
  const newPolluted = new Set();

  game.cells.forEach((cell, i) => {
    if (!cell.polluted) return;
    for (const n of getNeighbors(i)) {
      if (game.cells[n].type === 'pile') continue;
      const spreadChance = Math.max(
        POLLUTION_SPREAD_MIN,
        POLLUTION_SPREAD_BASE - piles * POLLUTION_SPREAD_PILE_REDUCTION
      );
      if (Math.random() < spreadChance) {
        newPolluted.add(n);
      }
    }
  });

  newPolluted.forEach(i => {
    game.cells[i].polluted = true;
  });

  game.cells.forEach(cell => {
    if (cell.type === 'oyster' && cell.polluted && Math.random() < OYSTER_CLEAN_CHANCE) {
      cell.polluted = false;
    }
  });
}

export function triggerStorm(game) {
  const placed = game.cells.filter(c => c.type !== CELL_TYPES.EMPTY);
  if (placed.length && Math.random() < STORM_DAMAGE_CHANCE) {
    placed[Math.floor(Math.random() * placed.length)].type = CELL_TYPES.EMPTY;
  }
  game.water -= STORM_WATER_PENALTY;
  game.log.unshift('风暴潮冲刷了修复区，部分设施受损。');
}

export function applyEcosystemEffects(game) {
  const { oysters, grass, pollution } = getFacilityCounts(game);

  game.water += oysters * OYSTER_WATER_BONUS - pollution * POLLUTION_WATER_PENALTY;
  game.larvae += oysters * OYSTER_LARVAE_BONUS + grass * GRASS_LARVAE_BONUS - pollution * POLLUTION_LARVAE_PENALTY;
  game.bio += grass * GRASS_BIO_BONUS + oysters * OYSTER_BIO_BONUS - pollution * POLLUTION_BIO_PENALTY;

  game.budget += TURN_BUDGET_BONUS;
}

export function clampAllStats(game) {
  game.water = clamp(game.water);
  game.larvae = clamp(game.larvae);
  game.bio = clamp(game.bio);
}

export function calculateScore(game) {
  const pollution = game.cells.filter(c => c.polluted).length;
  return Math.round(
    game.water * SCORE_WATER_WEIGHT +
    game.larvae * SCORE_LARVAE_WEIGHT +
    game.bio * SCORE_BIO_WEIGHT +
    game.budget * SCORE_BUDGET_WEIGHT -
    pollution * SCORE_POLLUTION_PENALTY
  );
}

export function checkWinCondition(game, scene) {
  const score = calculateScore(game);
  const pollution = game.cells.filter(c => c.polluted).length;

  let win = score >= scene.goalScore;

  if (scene.goalPollutionMax !== undefined && pollution > scene.goalPollutionMax) {
    win = false;
  }

  if (scene.goalMinStats !== undefined) {
    if (
      game.water < scene.goalMinStats ||
      game.larvae < scene.goalMinStats ||
      game.bio < scene.goalMinStats
    ) {
      win = false;
    }
  }

  return { win, score, pollution };
}
