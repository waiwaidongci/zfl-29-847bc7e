import { describe, it, expect } from 'vitest';
import {
  createRulesContext,
  calculateScoreWithRules,
  checkWinConditionWithRules,
  buildSceneGoalDesc
} from '../src/game/rules-engine.js';
import {
  calculateScore,
  checkWinCondition
} from '../src/game/state.js';
import {
  createTestGame,
  createTestScene,
  TEST_SEED
} from './helpers.js';

describe('rules-engine - 评分计算', () => {
  it('评分按权重计算各项之和', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();

    game.water = 60;
    game.larvae = 40;
    game.bio = 50;
    game.budget = 100;

    const expectedScore = Math.round(
      60 * rules.scoring.waterWeight +
      40 * rules.scoring.larvaeWeight +
      50 * rules.scoring.bioWeight +
      100 * rules.scoring.budgetWeight
    );

    const score = calculateScoreWithRules(game, rules);
    expect(score).toBe(expectedScore);
  });

  it('污染按惩罚值扣分', () => {
    const game = createTestGame({ pollutionIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
    const rules = createRulesContext();

    game.water = 50;
    game.larvae = 30;
    game.bio = 30;
    game.budget = 80;

    const scoreWithPollution = calculateScoreWithRules(game, rules);

    game.cells.forEach(c => c.polluted = false);
    const scoreWithoutPollution = calculateScoreWithRules(game, rules);

    const expectedPenalty = 10 * rules.scoring.pollutionPenalty;
    expect(scoreWithoutPollution - scoreWithPollution).toBe(expectedPenalty);
  });
});

describe('rules-engine - 胜负判定', () => {
  it('评分达标时胜利', () => {
    const scene = createTestScene({ goalScore: 60 });
    const game = createTestGame({ goalScore: 60 });
    const rules = createRulesContext();

    game.water = 100;
    game.larvae = 100;
    game.bio = 100;
    game.budget = 100;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('评分未达标时失败', () => {
    const scene = createTestScene({ goalScore: 999 });
    const game = createTestGame({ goalScore: 999 });
    const rules = createRulesContext();

    game.water = 0;
    game.larvae = 0;
    game.bio = 0;
    game.budget = 0;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(false);
    expect(result.pollution).toBe(0);
  });

  it('requirePollutionMax时污染超标判负', () => {
    const scene = createTestScene({
      goalScore: 0,
      goalPollutionMax: 2
    });
    const game = createTestGame({
      goalScore: 0,
      goalPollutionMax: 2,
      pollutionIndices: [0, 1, 2, 3]
    });
    const rules = createRulesContext();
    rules.winConditions.requirePollutionMax = true;

    game.water = 100;
    game.larvae = 100;
    game.bio = 100;
    game.budget = 100;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(false);
    expect(result.pollution).toBe(4);
  });

  it('污染未超标且评分达标时胜利', () => {
    const scene = createTestScene({
      goalScore: 50,
      goalPollutionMax: 5
    });
    const game = createTestGame({
      goalScore: 50,
      goalPollutionMax: 5,
      pollutionIndices: [0, 1]
    });
    const rules = createRulesContext();
    rules.winConditions.requirePollutionMax = true;

    game.water = 100;
    game.larvae = 100;
    game.bio = 100;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(true);
  });

  it('requireMinStats时指标不足判负', () => {
    const scene = createTestScene({
      goalScore: 0,
      goalMinStats: 50
    });
    const game = createTestGame({
      goalScore: 0,
      goalMinStats: 50
    });
    const rules = createRulesContext();
    rules.winConditions.requireMinStats = true;

    game.water = 100;
    game.larvae = 30;
    game.bio = 100;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(false);
  });

  it('所有指标达标时胜利', () => {
    const scene = createTestScene({
      goalScore: 0,
      goalMinStats: 30
    });
    const game = createTestGame({
      goalScore: 0,
      goalMinStats: 30
    });
    const rules = createRulesContext();
    rules.winConditions.requireMinStats = true;

    game.water = 50;
    game.larvae = 50;
    game.bio = 50;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(true);
  });
});

describe('rules-engine - 目标描述', () => {
  it('buildSceneGoalDesc正确构建单目标描述', () => {
    const scene = createTestScene({ goalScore: 60 });
    const rules = createRulesContext();
    const desc = buildSceneGoalDesc(scene, rules);
    expect(desc).toContain('60');
  });

  it('buildSceneGoalDesc正确构建多目标描述', () => {
    const scene = createTestScene({
      goalScore: 55,
      goalPollutionMax: 18
    });
    const rules = createRulesContext();
    const desc = buildSceneGoalDesc(scene, rules);
    expect(desc).toContain('55');
    expect(desc).toContain('18');
  });
});

describe('state - 胜负判定接口', () => {
  it('calculateScore委托给rules-engine', () => {
    const game = createTestGame({ pollutionIndices: [] });
    game.water = 50;
    game.larvae = 30;
    game.bio = 30;
    game.budget = 80;
    const score = calculateScore(game);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThan(0);
  });

  it('checkWinCondition返回胜负结果', () => {
    const scene = createTestScene({ goalScore: 60 });
    const game = createTestGame({ goalScore: 60 });
    game.water = 100;
    game.larvae = 100;
    game.bio = 100;
    game.budget = 100;

    const result = checkWinCondition(game, scene);
    expect(result).toHaveProperty('win');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('pollution');
  });
});
