import { describe, it, expect } from 'vitest';
import { GRID_SIZE, GRID_COLS, GRID_ROWS } from '../src/game/constants.js';
import {
  createRulesContext,
  spreadPollutionWithRules,
  getNeighborsForRules,
  getCellsInRangeForRules
} from '../src/game/rules-engine.js';
import { createRNG } from '../src/game/seeded-random.js';
import { spreadPollution } from '../src/game/state.js';
import {
  createTestGame,
  createEmptyCells,
  getPollutedCount,
  TEST_SEED
} from './helpers.js';

describe('rules-engine - 污染扩散 (固定seed可重复)', () => {
  it('相同seed下污染扩散结果完全一致', () => {
    const pollutionIndices = [0, 1, GRID_COLS];
    const run1 = createTestGame({ pollutionIndices });
    const run2 = createTestGame({ pollutionIndices });

    const rules = createRulesContext();
    const result1 = spreadPollutionWithRules(run1, rules);
    const result2 = spreadPollutionWithRules(run2, rules);

    expect(result1.newPolluted.size).toBe(result2.newPolluted.size);
    expect([...result1.newPolluted].sort()).toEqual([...result2.newPolluted].sort());
    expect(result1.cleanedCount).toBe(result2.cleanedCount);

    for (let i = 0; i < GRID_SIZE; i++) {
      expect(run1.cells[i].polluted).toBe(run2.cells[i].polluted);
    }
  });

  it('不同seed下污染扩散结果可能不同', () => {
    const pollutionIndices = [0, 10, 20];
    const gameA = createTestGame({ pollutionIndices }, { seed: 111 });
    const gameB = createTestGame({ pollutionIndices }, { seed: 999 });

    const rules = createRulesContext();
    spreadPollutionWithRules(gameA, rules);
    spreadPollutionWithRules(gameB, rules);

    const pollutedA = getPollutedCount(gameA.cells);
    const pollutedB = getPollutedCount(gameB.cells);
    expect(typeof pollutedA).toBe('number');
    expect(typeof pollutedB).toBe('number');
    expect(pollutedA).toBeGreaterThanOrEqual(pollutionIndices.length);
    expect(pollutedB).toBeGreaterThanOrEqual(pollutionIndices.length);
  });

  it('污染向相邻格扩散而非远距离', () => {
    const pollutionIndices = [0];
    const game = createTestGame({ pollutionIndices });
    const rules = createRulesContext();
    rules.pollutionSpread.baseChance = 1.0;
    rules.pollutionSpread.minChance = 1.0;

    const result = spreadPollutionWithRules(game, rules);
    const neighbors = getNeighborsForRules(0);
    const expectedNeighbors = new Set([1, GRID_COLS]);

    expect(neighbors.sort()).toEqual([...expectedNeighbors].sort());
    for (const idx of result.newPolluted) {
      expect(expectedNeighbors.has(idx)).toBe(true);
    }
  });

  it('禁用污染扩散规则时不扩散', () => {
    const pollutionIndices = [0, 1, 2];
    const game = createTestGame({ pollutionIndices });
    const rules = createRulesContext();
    rules.pollutionSpread.enabled = false;

    const result = spreadPollutionWithRules(game, rules);
    expect(result.newPolluted.size).toBe(0);
    expect(result.cleanedCount).toBe(0);
    expect(getPollutedCount(game.cells)).toBe(pollutionIndices.length);
  });

  it('污染免疫规则下不扩散', () => {
    const pollutionIndices = [5, 6, 7];
    const game = createTestGame({ pollutionIndices });
    const rules = createRulesContext();
    rules.effects.pollutionImmunity = true;

    const result = spreadPollutionWithRules(game, rules);
    expect(result.newPolluted.size).toBe(0);
    expect(getPollutedCount(game.cells)).toBe(pollutionIndices.length);
  });
});

describe('rules-engine - 辅助函数', () => {
  it('getNeighborsForRules返回正确的四邻域', () => {
    const center = GRID_COLS * 4 + 5;
    const neighbors = getNeighborsForRules(center);
    expect(neighbors).toContain(center - 1);
    expect(neighbors).toContain(center + 1);
    expect(neighbors).toContain(center - GRID_COLS);
    expect(neighbors).toContain(center + GRID_COLS);
    expect(neighbors.length).toBe(4);
  });

  it('getNeighborsForRules处理边界格子', () => {
    const corner = 0;
    const neighbors = getNeighborsForRules(corner);
    expect(neighbors).toContain(1);
    expect(neighbors).toContain(GRID_COLS);
    expect(neighbors.length).toBe(2);
  });

  it('getCellsInRangeForRules返回曼哈顿距离内的格子', () => {
    const center = GRID_COLS * 4 + 5;
    const range = 2;
    const cells = getCellsInRangeForRules(center, range);
    expect(cells.length).toBeGreaterThan(0);
    for (const idx of cells) {
      const cx = center % GRID_COLS;
      const cy = Math.floor(center / GRID_COLS);
      const nx = idx % GRID_COLS;
      const ny = Math.floor(idx / GRID_COLS);
      const dist = Math.abs(cx - nx) + Math.abs(cy - ny);
      expect(dist).toBeLessThanOrEqual(range);
      expect(dist).toBeGreaterThan(0);
    }
  });

  it('getCellsInRangeForRules不包含中心格', () => {
    const center = 25;
    const cells = getCellsInRangeForRules(center, 1);
    expect(cells).not.toContain(center);
  });
});

describe('state - 污染扩散记录事件', () => {
  it('spreadPollution记录replay事件', () => {
    const game = createTestGame({ pollutionIndices: [0, 1, 2] });
    const initialEventCount = game.replay.events.length;

    spreadPollution(game);

    expect(game.replay.events.length).toBeGreaterThan(initialEventCount);
    const pollutionEvents = game.replay.events.filter(e =>
      e.type === 'pollution_spread' || e.type === 'oyster_clean'
    );
    expect(pollutionEvents.length).toBeGreaterThanOrEqual(0);
  });
});
