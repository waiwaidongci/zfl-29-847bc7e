import { describe, it, expect } from 'vitest';
import { TURN_BUDGET_BONUS } from '../src/game/constants.js';
import { createGameState } from '../src/game/state.js';
import { advanceTurn, finishGame } from '../src/game/tide.js';
import { createTestScene, createTestGame, TEST_SEED } from './helpers.js';

describe('tide - 潮汐推进核心流程', () => {
  it('advanceTurn在未结束时推进回合', () => {
    const scene = createTestScene({ turns: 5 });
    const game = createGameState(scene, { seed: TEST_SEED });
    expect(game.turn).toBe(1);
    expect(game.ended).toBe(false);

    const result = advanceTurn(game, scene);
    expect(result.ended).toBe(false);
    expect(game.turn).toBe(2);
  });

  it('advanceTurn推进时增加预算', () => {
    const scene = createTestScene({ turns: 5, pollutionIndices: [] });
    const game = createGameState(scene, { seed: TEST_SEED });
    const initialBudget = game.budget;

    advanceTurn(game, scene);
    expect(game.budget).toBeGreaterThan(initialBudget);
  });

  it('达到回合数时游戏结束', () => {
    const scene = createTestScene({ turns: 1, goalScore: 0 });
    const game = createGameState(scene, { seed: TEST_SEED });
    game.water = 50;
    game.larvae = 50;
    game.bio = 50;

    const result = advanceTurn(game, scene);
    expect(result.ended).toBe(true);
    expect(game.ended).toBe(true);
    expect(result).toHaveProperty('win');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('pollution');
  });

  it('已结束的游戏advanceTurn不推进', () => {
    const scene = createTestScene({ turns: 5 });
    const game = createGameState(scene, { seed: TEST_SEED });
    game.ended = true;

    const result = advanceTurn(game, scene);
    expect(result.ended).toBe(false);
    expect(game.turn).toBe(1);
  });

  it('相同seed下潮汐推进结果可重复', () => {
    const scene = createTestScene({
      pollutionIndices: [0, 5, 10],
      turns: 3,
      stormChance: 0.3
    });

    const run1 = createGameState(scene, { seed: TEST_SEED });
    const run2 = createGameState(scene, { seed: TEST_SEED });

    run1.cells[20].type = 'oyster';
    run1.cells[21].type = 'grass';
    run2.cells[20].type = 'oyster';
    run2.cells[21].type = 'grass';

    for (let i = 0; i < 2; i++) {
      advanceTurn(run1, scene);
      advanceTurn(run2, scene);
    }

    expect(run1.turn).toBe(run2.turn);
    expect(run1.water).toBeCloseTo(run2.water);
    expect(run1.larvae).toBeCloseTo(run2.larvae);
    expect(run1.bio).toBeCloseTo(run2.bio);
    expect(run1.budget).toBe(run2.budget);
    expect(run1.stormHitCount).toBe(run2.stormHitCount);
    expect(run1.stormDamageCount).toBe(run2.stormDamageCount);

    for (let i = 0; i < run1.cells.length; i++) {
      expect(run1.cells[i].type).toBe(run2.cells[i].type);
      expect(run1.cells[i].polluted).toBe(run2.cells[i].polluted);
    }
  });

  it('finishGame返回完整结果对象', () => {
    const scene = createTestScene({ goalScore: 0 });
    const game = createGameState(scene, { seed: TEST_SEED });

    game.stormHitCount = 2;
    game.stormDamageCount = 1;

    const result = finishGame(game, scene);
    expect(result.ended).toBe(true);
    expect(result).toHaveProperty('win');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('pollution');
    expect(result).toHaveProperty('budget');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('stormSurvived');
    expect(result).toHaveProperty('stormDamaged');
    expect(result).toHaveProperty('stormHitCount');
    expect(result).toHaveProperty('stormDamageCount');
    expect(result).toHaveProperty('finalWater');
    expect(result).toHaveProperty('finalLarvae');
    expect(result).toHaveProperty('finalBio');
    expect(result.stormHitCount).toBe(2);
    expect(result.stormDamageCount).toBe(1);
    expect(result.stormSurvived).toBe(true);
    expect(result.stormDamaged).toBe(true);
  });

  it('风暴概率为0时不触发风暴', () => {
    const scene = createTestScene({
      turns: 10,
      stormChance: 0,
      pollutionIndices: []
    });
    const game = createGameState(scene, { seed: TEST_SEED });
    game.cells[10].type = 'oyster';
    game.cells[11].type = 'grass';

    for (let i = 0; i < 5; i++) {
      advanceTurn(game, scene);
    }

    expect(game.stormHitCount).toBe(0);
    expect(game.stormDamageCount).toBe(0);
  });
});
