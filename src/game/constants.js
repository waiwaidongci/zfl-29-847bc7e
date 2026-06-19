export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

export const CELL_TYPES = {
  EMPTY: 'empty',
  OYSTER: 'oyster',
  GRASS: 'grass',
  PILE: 'pile'
};

export const COSTS = {
  oyster: 12,
  grass: 10,
  pile: 8,
  erase: 0
};

export const ICONS = {
  oyster: '礁',
  grass: '草',
  pile: '桩',
  empty: ''
};

export const DEFAULT_SCENE_ID = 'beginner';
export const SANDBOX_EDITOR_ID = 'sandbox-editor';
export const SANDBOX_SCENE_ID = 'sandbox';

export const TURN_BUDGET_BONUS = 8;

export const OYSTER_WATER_BONUS = 2.1;
export const OYSTER_LARVAE_BONUS = 1.2;
export const OYSTER_BIO_BONUS = 0.4;
export const GRASS_LARVAE_BONUS = 0.6;
export const GRASS_BIO_BONUS = 1.8;

export const POLLUTION_WATER_PENALTY = 0.8;
export const POLLUTION_LARVAE_PENALTY = 0.4;
export const POLLUTION_BIO_PENALTY = 0.5;

export const POLLUTION_SPREAD_BASE = 0.28;
export const POLLUTION_SPREAD_MIN = 0.08;
export const POLLUTION_SPREAD_PILE_REDUCTION = 0.015;
export const OYSTER_CLEAN_CHANCE = 0.45;

export const STORM_DAMAGE_CHANCE = 0.55;
export const STORM_WATER_PENALTY = 8;

export const SCORE_WATER_WEIGHT = 0.35;
export const SCORE_LARVAE_WEIGHT = 0.25;
export const SCORE_BIO_WEIGHT = 0.35;
export const SCORE_BUDGET_WEIGHT = 0.1;
export const SCORE_POLLUTION_PENALTY = 1.5;

export const STATS_MIN = 0;
export const STATS_MAX = 100;
