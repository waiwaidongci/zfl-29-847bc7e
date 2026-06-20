import { GRID_SIZE, CELL_TYPES } from '../src/game/constants.js';
import { createGameState } from '../src/game/state.js';
import { createRNG } from '../src/game/seeded-random.js';
import { createRulesContext } from '../src/game/rules-engine.js';

export const TEST_SEED = 123456789;

export function createEmptyCells() {
  return Array.from({ length: GRID_SIZE }, () => ({
    type: CELL_TYPES.EMPTY,
    polluted: false
  }));
}

export function createTestScene(overrides = {}) {
  return {
    id: 'test-scene',
    name: '测试场景',
    desc: '测试用场景',
    budget: 150,
    water: 50,
    larvae: 30,
    bio: 30,
    turns: 10,
    stormChance: 0.2,
    pollutionIndices: [],
    goalScore: 60,
    goalDesc: '评分 ≥ 60',
    tags: ['test'],
    winText: '测试胜利',
    loseText: '测试失败',
    ...overrides
  };
}

export function createTestGame(sceneOverrides = {}, stateOptions = {}) {
  const scene = createTestScene(sceneOverrides);
  const options = { seed: TEST_SEED, ...stateOptions };
  return createGameState(scene, options);
}

export function createDeterministicRNG(seed = TEST_SEED) {
  return createRNG(seed);
}

export function createDefaultRules() {
  return createRulesContext();
}

export function getPollutedCount(cells) {
  return cells.filter(c => c.polluted).length;
}

export function getFacilityCount(cells, type) {
  return cells.filter(c => c.type === type).length;
}

export function cloneGame(game) {
  return JSON.parse(JSON.stringify({
    turn: game.turn,
    budget: game.budget,
    water: game.water,
    larvae: game.larvae,
    bio: game.bio,
    ended: game.ended,
    cells: game.cells.map(c => ({ ...c })),
    seed: game.seed,
    stormHitCount: game.stormHitCount,
    stormDamageCount: game.stormDamageCount
  }));
}
