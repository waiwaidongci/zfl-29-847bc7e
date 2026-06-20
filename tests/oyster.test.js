import { describe, it, expect } from 'vitest';
import { GRID_SIZE, GRID_COLS, OYSTER_CLEAN_CHANCE } from '../src/game/constants.js';
import {
  createRulesContext,
  spreadPollutionWithRules,
  calculateEcosystemEffects,
  applyEcosystemEffectsWithRules
} from '../src/game/rules-engine.js';
import { placeFacility, spreadPollution, getFacilityCounts } from '../src/game/state.js';
import {
  createTestGame,
  getPollutedCount,
  getFacilityCount,
  TEST_SEED
} from './helpers.js';

describe('rules-engine - 牡蛎净化', () => {
  it('污染格上的牡蛎礁按概率净化', () => {
    const pollutionIndices = [10, 20, 30, 40];
    const game = createTestGame({ pollutionIndices });
    const rules = createRulesContext();
    rules.ecosystem.oyster.cleanChance = 1.0;
    rules.ecosystem.oyster.enabled = true;
    rules.pollutionSpread.baseChance = 0;
    rules.pollutionSpread.minChance = 0;

    for (const idx of pollutionIndices) {
      game.cells[idx].type = 'oyster';
    }

    const result = spreadPollutionWithRules(game, rules);
    expect(result.cleanedCount).toBe(pollutionIndices.length);
    expect(getPollutedCount(game.cells)).toBe(0);
  });

  it('cleanChance为0时不净化', () => {
    const pollutionIndices = [5, 15, 25];
    const game = createTestGame({ pollutionIndices });
    const rules = createRulesContext();
    rules.ecosystem.oyster.cleanChance = 0;
    rules.pollutionSpread.baseChance = 0;
    rules.pollutionSpread.minChance = 0;

    for (const idx of pollutionIndices) {
      game.cells[idx].type = 'oyster';
    }

    const result = spreadPollutionWithRules(game, rules);
    expect(result.cleanedCount).toBe(0);
    expect(getPollutedCount(game.cells)).toBe(pollutionIndices.length);
  });

  it('非污染格上的牡蛎礁不触发净化', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.ecosystem.oyster.cleanChance = 1.0;
    rules.pollutionSpread.enabled = false;

    game.cells[10].type = 'oyster';
    game.cells[20].type = 'oyster';

    const result = spreadPollutionWithRules(game, rules);
    expect(result.cleanedCount).toBe(0);
  });

  it('牡蛎生态效应正确提升水质、幼体、多样性', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();

    const oysterCount = 5;
    for (let i = 0; i < oysterCount; i++) {
      game.cells[i].type = 'oyster';
    }

    const initialWater = game.water;
    const initialLarvae = game.larvae;
    const initialBio = game.bio;

    const deltas = applyEcosystemEffectsWithRules(game, rules);

    expect(deltas.waterDelta).toBe(oysterCount * rules.ecosystem.oyster.waterBonus);
    expect(deltas.larvaeDelta).toBe(oysterCount * rules.ecosystem.oyster.larvaeBonus);
    expect(deltas.bioDelta).toBe(oysterCount * rules.ecosystem.oyster.bioBonus);
    expect(game.water).toBeCloseTo(initialWater + deltas.waterDelta);
    expect(game.larvae).toBeCloseTo(initialLarvae + deltas.larvaeDelta);
    expect(game.bio).toBeCloseTo(initialBio + deltas.bioDelta);
  });

  it('海草床提升幼体和多样性', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();

    const grassCount = 3;
    for (let i = 0; i < grassCount; i++) {
      game.cells[i].type = 'grass';
    }

    const deltas = calculateEcosystemEffects(game, rules);
    expect(deltas.larvaeDelta).toBe(grassCount * rules.ecosystem.grass.larvaeBonus);
    expect(deltas.bioDelta).toBe(grassCount * rules.ecosystem.grass.bioBonus);
    expect(deltas.waterDelta).toBe(0);
  });

  it('相同seed下牡蛎净化结果可重复', () => {
    const pollutionIndices = [10, 20, 30, 40, 50];
    const run1 = createTestGame({ pollutionIndices }, { seed: TEST_SEED });
    const run2 = createTestGame({ pollutionIndices }, { seed: TEST_SEED });
    const rules = createRulesContext();

    for (const idx of pollutionIndices) {
      run1.cells[idx].type = 'oyster';
      run2.cells[idx].type = 'oyster';
    }
    rules.pollutionSpread.baseChance = 0;
    rules.pollutionSpread.minChance = 0;

    const result1 = spreadPollutionWithRules(run1, rules);
    const result2 = spreadPollutionWithRules(run2, rules);

    expect(result1.cleanedCount).toBe(result2.cleanedCount);
    expect(getPollutedCount(run1.cells)).toBe(getPollutedCount(run2.cells));
  });
});

describe('state - 设施放置', () => {
  it('放置牡蛎礁扣除预算', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    const cost = rules.facilityCosts.oyster;
    const initialBudget = game.budget;

    const result = placeFacility(game, 15, 'oyster');
    expect(result).toBe(true);
    expect(game.cells[15].type).toBe('oyster');
    expect(game.budget).toBe(initialBudget - cost);
  });

  it('预算不足时无法放置设施', () => {
    const game = createTestGame({ budget: 5, pollutionIndices: [] });
    const result = placeFacility(game, 15, 'oyster');
    expect(result).toBe(false);
    expect(game.cells[15].type).toBe('empty');
  });

  it('已有设施的格子无法重复放置', () => {
    const game = createTestGame({ pollutionIndices: [] });
    placeFacility(game, 15, 'oyster');
    const initialBudget = game.budget;
    const result = placeFacility(game, 15, 'grass');
    expect(result).toBe(false);
    expect(game.cells[15].type).toBe('oyster');
    expect(game.budget).toBe(initialBudget);
  });

  it('getFacilityCounts正确统计各类设施', () => {
    const game = createTestGame({ pollutionIndices: [10, 20, 30] });
    placeFacility(game, 0, 'oyster');
    placeFacility(game, 1, 'grass');
    placeFacility(game, 2, 'pile');
    placeFacility(game, 3, 'buffer');
    const counts = getFacilityCounts(game);
    expect(counts.oysters).toBe(1);
    expect(counts.grass).toBe(1);
    expect(counts.piles).toBe(1);
    expect(counts.buffers).toBe(1);
    expect(counts.pollution).toBe(3);
  });
});
