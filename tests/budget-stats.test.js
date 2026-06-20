import { describe, it, expect } from 'vitest';
import {
  createRulesContext,
  applyEcosystemEffectsWithRules,
  calculateEcosystemEffects,
  clampStat,
  clampAllStatsWithRules,
  getFacilityCost
} from '../src/game/rules-engine.js';
import { applyEcosystemEffects, clampAllStats, placeFacility } from '../src/game/state.js';
import { createTestGame, TEST_SEED } from './helpers.js';
import { STATS_MIN, STATS_MAX, TURN_BUDGET_BONUS } from '../src/game/constants.js';

describe('rules-engine - 预算增长', () => {
  it('每回合获得基础预算奖励', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    const initialBudget = game.budget;

    const deltas = applyEcosystemEffectsWithRules(game, rules);

    expect(deltas.budgetDelta).toBe(TURN_BUDGET_BONUS);
    expect(game.budget).toBe(initialBudget + TURN_BUDGET_BONUS);
  });

  it('extraTurnBudgetBonus增加额外预算', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    const extra = 5;
    rules.effects.extraTurnBudgetBonus = extra;
    const initialBudget = game.budget;

    applyEcosystemEffectsWithRules(game, rules);

    expect(game.budget).toBe(initialBudget + TURN_BUDGET_BONUS + extra);
  });

  it('unlimitedBudget时设施成本为0', () => {
    const rules = createRulesContext();
    rules.effects.unlimitedBudget = true;
    expect(getFacilityCost(rules, 'oyster')).toBe(0);
    expect(getFacilityCost(rules, 'buffer')).toBe(0);
  });

  it('正常情况设施成本正确', () => {
    const rules = createRulesContext();
    expect(getFacilityCost(rules, 'oyster')).toBe(12);
    expect(getFacilityCost(rules, 'grass')).toBe(10);
    expect(getFacilityCost(rules, 'pile')).toBe(8);
    expect(getFacilityCost(rules, 'buffer')).toBe(15);
  });
});

describe('rules-engine - 数值约束 clamp', () => {
  it('clampStat将数值限制在范围内', () => {
    const rules = createRulesContext();
    expect(clampStat(-10, rules)).toBe(STATS_MIN);
    expect(clampStat(0, rules)).toBe(0);
    expect(clampStat(50, rules)).toBe(50);
    expect(clampStat(200, rules)).toBe(STATS_MAX);
  });

  it('clampAllStatsWithRules限制所有生态指标', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    game.water = -5;
    game.larvae = 150;
    game.bio = 50;

    clampAllStatsWithRules(game, rules);

    expect(game.water).toBe(STATS_MIN);
    expect(game.larvae).toBe(STATS_MAX);
    expect(game.bio).toBe(50);
  });

  it('自定义规则stats范围', () => {
    const customRules = createRulesContext({
      stats: { min: 10, max: 80 }
    });
    expect(clampStat(5, customRules)).toBe(10);
    expect(clampStat(90, customRules)).toBe(80);
  });
});

describe('rules-engine - 污染损害', () => {
  it('污染降低水质、幼体、多样性', () => {
    const game = createTestGame({ pollutionIndices: [0, 1, 2, 3, 4] });
    const rules = createRulesContext();
    const initialWater = game.water;
    const initialLarvae = game.larvae;
    const initialBio = game.bio;

    const deltas = calculateEcosystemEffects(game, rules);

    expect(deltas.waterDelta).toBe(-5 * rules.ecosystem.pollution.waterPenalty);
    expect(deltas.larvaeDelta).toBe(-5 * rules.ecosystem.pollution.larvaePenalty);
    expect(deltas.bioDelta).toBe(-5 * rules.ecosystem.pollution.bioPenalty);
  });

  it('污染免疫时无惩罚', () => {
    const game = createTestGame({ pollutionIndices: [0, 1, 2] });
    const rules = createRulesContext();
    rules.effects.pollutionImmunity = true;

    const deltas = calculateEcosystemEffects(game, rules);

    expect(deltas.waterDelta).toBe(0);
    expect(deltas.larvaeDelta).toBe(0);
    expect(deltas.bioDelta).toBe(0);
  });

  it('污染禁用时无惩罚', () => {
    const game = createTestGame({ pollutionIndices: [0, 1, 2] });
    const rules = createRulesContext();
    rules.ecosystem.pollution.enabled = false;

    const deltas = calculateEcosystemEffects(game, rules);

    expect(deltas.waterDelta).toBe(0);
    expect(deltas.larvaeDelta).toBe(0);
    expect(deltas.bioDelta).toBe(0);
  });
});

describe('rules-engine - 全局乘数', () => {
  it('全局水质乘数生效', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.effects.globalWaterMultiplier = 2;
    rules.effects.globalLarvaeMultiplier = 0.5;
    rules.effects.globalBioMultiplier = 3;

    game.cells[0].type = 'oyster';
    game.cells[1].type = 'oyster';

    const deltas = calculateEcosystemEffects(game, rules);
    const baseWater = 2 * rules.ecosystem.oyster.waterBonus;
    const baseLarvae = 2 * rules.ecosystem.oyster.larvaeBonus;
    const baseBio = 2 * rules.ecosystem.oyster.bioBonus;

    expect(deltas.waterDelta).toBe(baseWater * 2);
    expect(deltas.larvaeDelta).toBe(baseLarvae * 0.5);
    expect(deltas.bioDelta).toBe(baseBio * 3);
  });
});

describe('state - 生态效应和约束', () => {
  it('applyEcosystemEffects更新游戏状态', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const initialBudget = game.budget;
    const initialWater = game.water;

    applyEcosystemEffects(game);

    expect(game.budget).toBe(initialBudget + TURN_BUDGET_BONUS);
  });

  it('clampAllStats约束所有指标', () => {
    const game = createTestGame({ pollutionIndices: [] });
    game.water = -100;
    game.larvae = 999;
    game.bio = 50;

    clampAllStats(game);

    expect(game.water).toBe(STATS_MIN);
    expect(game.larvae).toBe(STATS_MAX);
  });
});
