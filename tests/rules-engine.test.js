import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RULES,
  createRulesContext,
  getFacilityCost,
  getFacilityName,
  clampStat,
  calculateEcosystemEffects,
  applyEcosystemEffectsWithRules,
  getCellsInRangeForRules,
  getNeighborsForRules,
  getBufferProtectionCountWithRules,
  spreadPollutionWithRules,
  triggerStormWithRules,
  calculateScoreWithRules,
  checkWinConditionWithRules,
  clampAllStatsWithRules,
  buildSceneGoalDesc
} from '../src/game/rules-engine.js';
import { createTestGame, createTestScene, TEST_SEED } from './helpers.js';

describe('rules-engine - 规则上下文创建与合并', () => {
  it('createRulesContext返回默认规则的深拷贝', () => {
    const rules = createRulesContext();
    expect(rules).not.toBe(DEFAULT_RULES);
    expect(rules.facilityCosts).toEqual(DEFAULT_RULES.facilityCosts);
    expect(rules.ecosystem.oyster.enabled).toBe(true);
  });

  it('场景规则可覆盖默认规则', () => {
    const sceneRules = {
      facilityCosts: { oyster: 20 },
      ecosystem: {
        oyster: { waterBonus: 5 }
      }
    };
    const rules = createRulesContext(sceneRules);
    expect(rules.facilityCosts.oyster).toBe(20);
    expect(rules.facilityCosts.grass).toBe(DEFAULT_RULES.facilityCosts.grass);
    expect(rules.ecosystem.oyster.waterBonus).toBe(5);
    expect(rules.ecosystem.oyster.larvaeBonus).toBe(DEFAULT_RULES.ecosystem.oyster.larvaeBonus);
  });

  it('createRulesContext不修改传入的场景规则对象', () => {
    const sceneRules = { facilityCosts: { oyster: 99 } };
    const original = JSON.parse(JSON.stringify(sceneRules));
    createRulesContext(sceneRules);
    expect(sceneRules).toEqual(original);
  });
});

describe('rules-engine - 设施成本与名称', () => {
  it('getFacilityCost返回正确成本', () => {
    const rules = createRulesContext();
    expect(getFacilityCost(rules, 'oyster')).toBe(rules.facilityCosts.oyster);
    expect(getFacilityCost(rules, 'grass')).toBe(rules.facilityCosts.grass);
    expect(getFacilityCost(rules, 'pile')).toBe(rules.facilityCosts.pile);
    expect(getFacilityCost(rules, 'buffer')).toBe(rules.facilityCosts.buffer);
  });

  it('unlimitedBudget效果时成本为0', () => {
    const rules = createRulesContext();
    rules.effects.unlimitedBudget = true;
    expect(getFacilityCost(rules, 'oyster')).toBe(0);
  });

  it('未知类型成本返回0', () => {
    const rules = createRulesContext();
    expect(getFacilityCost(rules, 'unknown')).toBe(0);
  });

  it('getFacilityName返回正确名称', () => {
    const rules = createRulesContext();
    expect(getFacilityName(rules, 'oyster')).toBe('牡蛎礁');
    expect(getFacilityName(rules, 'grass')).toBe('海草床');
    expect(getFacilityName(rules, 'unknown')).toBe('unknown');
  });
});

describe('rules-engine - 数值夹紧', () => {
  it('clampStat夹紧在默认范围内', () => {
    const rules = createRulesContext();
    expect(clampStat(-1, rules)).toBe(0);
    expect(clampStat(0, rules)).toBe(0);
    expect(clampStat(50, rules)).toBe(50);
    expect(clampStat(100, rules)).toBe(100);
    expect(clampStat(150, rules)).toBe(100);
  });

  it('clampStat支持自定义范围', () => {
    const rules = createRulesContext({ stats: { min: 10, max: 90 } });
    expect(clampStat(0, rules)).toBe(10);
    expect(clampStat(50, rules)).toBe(50);
    expect(clampStat(100, rules)).toBe(90);
  });

  it('clampAllStatsWithRules夹紧所有指标', () => {
    const game = createTestGame();
    const rules = createRulesContext();
    game.water = -5;
    game.larvae = 200;
    game.bio = 50;
    clampAllStatsWithRules(game, rules);
    expect(game.water).toBe(0);
    expect(game.larvae).toBe(100);
    expect(game.bio).toBe(50);
  });
});

describe('rules-engine - 生态效应计算', () => {
  it('calculateEcosystemEffects正确计算牡蛎贡献', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    game.cells[0].type = 'oyster';
    game.cells[1].type = 'oyster';

    const deltas = calculateEcosystemEffects(game, rules);
    expect(deltas.waterDelta).toBe(2 * rules.ecosystem.oyster.waterBonus);
    expect(deltas.larvaeDelta).toBe(2 * rules.ecosystem.oyster.larvaeBonus);
    expect(deltas.bioDelta).toBe(2 * rules.ecosystem.oyster.bioBonus);
    expect(deltas.oysters).toBe(2);
  });

  it('calculateEcosystemEffects正确计算海草贡献', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    game.cells[0].type = 'grass';
    game.cells[1].type = 'grass';
    game.cells[2].type = 'grass';

    const deltas = calculateEcosystemEffects(game, rules);
    expect(deltas.waterDelta).toBe(0);
    expect(deltas.larvaeDelta).toBe(3 * rules.ecosystem.grass.larvaeBonus);
    expect(deltas.bioDelta).toBe(3 * rules.ecosystem.grass.bioBonus);
    expect(deltas.grass).toBe(3);
  });

  it('calculateEcosystemEffects正确计算污染惩罚', () => {
    const game = createTestGame({ pollutionIndices: [0, 1, 2] });
    const rules = createRulesContext();
    rules.ecosystem.oyster.enabled = false;
    rules.ecosystem.grass.enabled = false;

    const deltas = calculateEcosystemEffects(game, rules);
    expect(deltas.waterDelta).toBe(-3 * rules.ecosystem.pollution.waterPenalty);
    expect(deltas.larvaeDelta).toBe(-3 * rules.ecosystem.pollution.larvaePenalty);
    expect(deltas.bioDelta).toBe(-3 * rules.ecosystem.pollution.bioPenalty);
    expect(deltas.pollution).toBe(3);
  });

  it('pollutionImmunity效果时污染惩罚无效', () => {
    const game = createTestGame({ pollutionIndices: [0, 1] });
    const rules = createRulesContext();
    rules.effects.pollutionImmunity = true;
    rules.ecosystem.oyster.enabled = false;
    rules.ecosystem.grass.enabled = false;

    const deltas = calculateEcosystemEffects(game, rules);
    expect(deltas.waterDelta).toBe(0);
    expect(deltas.larvaeDelta).toBe(0);
    expect(deltas.bioDelta).toBe(0);
  });

  it('applyEcosystemEffectsWithRules实际修改game状态', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.ecosystem.oyster.enabled = false;
    rules.ecosystem.grass.enabled = false;
    rules.ecosystem.pollution.enabled = false;

    const initialWater = game.water;
    const initialBudget = game.budget;
    applyEcosystemEffectsWithRules(game, rules);
    expect(game.water).toBe(initialWater);
    expect(game.budget).toBe(initialBudget + rules.ecosystem.turnBudgetBonus);
  });
});

describe('rules-engine - 网格计算', () => {
  it('getNeighborsForRules返回四角邻居', () => {
    const neighbors = getNeighborsForRules(0);
    expect(neighbors).toEqual([1, 12]);

    const corner = getNeighborsForRules(11);
    expect(corner).toEqual([10, 23]);
  });

  it('getNeighborsForRules中心格返回四个邻居', () => {
    const neighbors = getNeighborsForRules(37);
    expect(neighbors.length).toBe(4);
    expect(neighbors).toContain(36);
    expect(neighbors).toContain(38);
    expect(neighbors).toContain(25);
    expect(neighbors).toContain(49);
  });

  it('getCellsInRangeForRules返回曼哈顿距离内的格子', () => {
    const cells = getCellsInRangeForRules(0, 1);
    expect(cells).toHaveLength(2);
    expect(cells).toContain(1);
    expect(cells).toContain(12);

    const range2 = getCellsInRangeForRules(0, 2);
    expect(range2).toContain(1);
    expect(range2).toContain(12);
    expect(range2).toContain(2);
    expect(range2).toContain(13);
    expect(range2).toContain(24);
  });

  it('getBufferProtectionCountWithRules统计范围内缓冲带数量', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    game.cells[25].type = 'buffer';
    game.cells[27].type = 'buffer';
    game.cells[90].type = 'buffer';

    const count = getBufferProtectionCountWithRules(game.cells, 26, rules);
    expect(count).toBe(2);
  });
});

describe('rules-engine - 污染扩散', () => {
  it('pollutionSpread禁用时不扩散', () => {
    const game = createTestGame({ pollutionIndices: [0] });
    const rules = createRulesContext();
    rules.pollutionSpread.enabled = false;

    const result = spreadPollutionWithRules(game, rules);
    expect(result.newPolluted.size).toBe(0);
    expect(result.cleanedCount).toBe(0);
  });

  it('pollutionImmunity效果时不扩散', () => {
    const game = createTestGame({ pollutionIndices: [0] });
    const rules = createRulesContext();
    rules.effects.pollutionImmunity = true;

    const result = spreadPollutionWithRules(game, rules);
    expect(result.newPolluted.size).toBe(0);
  });

  it('围护桩阻挡污染扩散', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.pollutionSpread.baseChance = 1.0;
    rules.pollutionSpread.minChance = 1.0;
    rules.ecosystem.oyster.cleanChance = 0;

    game.cells[0].polluted = true;
    game.cells[1].type = 'pile';
    game.cells[12].type = 'pile';

    const result = spreadPollutionWithRules(game, rules);
    expect(result.newPolluted.size).toBe(0);
  });

  it('baseChance为1时邻居全部被污染', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.pollutionSpread.baseChance = 1.0;
    rules.pollutionSpread.minChance = 1.0;
    rules.ecosystem.oyster.cleanChance = 0;
    rules.pollutionSpread.pileBlocksSpread = false;
    rules.pollutionSpread.pileReductionPerPile = 0;
    rules.pollutionSpread.bufferReductionPerBuffer = 0;

    game.cells[37].polluted = true;
    const result = spreadPollutionWithRules(game, rules);
    expect(result.newPolluted.size).toBe(4);
  });
});

describe('rules-engine - 风暴效果', () => {
  it('storm禁用时不触发风暴', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.storm.enabled = false;
    game.cells[10].type = 'oyster';
    const initialHitCount = game.stormHitCount;

    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(false);
    expect(game.stormHitCount).toBe(initialHitCount);
  });

  it('stormImmunity效果时不触发风暴', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.effects.stormImmunity = true;

    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(false);
  });

  it('没有设施时风暴不损毁', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();

    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(false);
    expect(result.damagedType).toBe(null);
    expect(game.water).toBe(createTestGame().water - rules.storm.waterPenalty);
  });

  it('damageChance为1时设施必然损毁', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.storm.damageChance = 1.0;
    rules.storm.bufferDamageReduction = 0;
    game.cells[20].type = 'oyster';
    game.cells[30].type = 'grass';

    const beforeWater = game.water;
    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(true);
    expect(['oyster', 'grass']).toContain(result.damagedType);
    expect(game.water).toBe(beforeWater - rules.storm.waterPenalty);
    expect(game.stormHitCount).toBe(1);
    expect(game.stormDamageCount).toBe(1);
  });
});

describe('rules-engine - 评分与胜负', () => {
  it('calculateScoreWithRules正确计算综合评分', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    game.water = 50;
    game.larvae = 40;
    game.bio = 60;
    game.budget = 100;

    const expected = Math.round(
      50 * rules.scoring.waterWeight +
      40 * rules.scoring.larvaeWeight +
      60 * rules.scoring.bioWeight +
      100 * rules.scoring.budgetWeight
    );
    expect(calculateScoreWithRules(game, rules)).toBe(expected);
  });

  it('评分扣减污染惩罚', () => {
    const game1 = createTestGame({ pollutionIndices: [] });
    const game2 = createTestGame({ pollutionIndices: [0, 1, 2] });
    const rules = createRulesContext();
    game1.water = game2.water = 50;
    game1.larvae = game2.larvae = 50;
    game1.bio = game2.bio = 50;
    game1.budget = game2.budget = 50;

    const score1 = calculateScoreWithRules(game1, rules);
    const score2 = calculateScoreWithRules(game2, rules);
    expect(score2).toBeLessThan(score1);
  });

  it('checkWinConditionWithRules评分达标时胜利', () => {
    const scene = createTestScene({ goalScore: 50 });
    const game = createTestGame({ goalScore: 50 });
    const rules = createRulesContext();
    game.water = 100;
    game.larvae = 100;
    game.bio = 100;
    game.budget = 100;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('checkWinConditionWithRules评分不足时失败', () => {
    const scene = createTestScene({ goalScore: 9999 });
    const game = createTestGame();
    const rules = createRulesContext();

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(false);
  });

  it('checkWinConditionWithRules污染上限检查', () => {
    const scene = createTestScene({ goalScore: 0, goalPollutionMax: 2 });
    const game = createTestGame({ pollutionIndices: [0, 1, 2, 3] });
    const rules = createRulesContext();
    game.water = 100;
    game.larvae = 100;
    game.bio = 100;
    game.budget = 100;

    const result = checkWinConditionWithRules(game, scene, rules);
    expect(result.win).toBe(false);
    expect(result.pollution).toBe(4);
  });
});

describe('rules-engine - 目标描述构建', () => {
  it('buildSceneGoalDesc只包含评分目标', () => {
    const scene = createTestScene({ goalScore: 60 });
    const rules = createRulesContext();
    expect(buildSceneGoalDesc(scene, rules)).toBe('生态评分 ≥ 60');
  });

  it('buildSceneGoalDesc包含污染上限', () => {
    const scene = createTestScene({ goalScore: 60, goalPollutionMax: 10 });
    const rules = createRulesContext();
    expect(buildSceneGoalDesc(scene, rules)).toBe('生态评分 ≥ 60 且 污染 ≤ 10格');
  });

  it('buildSceneGoalDesc包含所有目标', () => {
    const scene = createTestScene({ goalScore: 60, goalPollutionMax: 10, goalMinStats: 40 });
    const rules = createRulesContext();
    expect(buildSceneGoalDesc(scene, rules)).toBe('生态评分 ≥ 60 且 污染 ≤ 10格 且 所有指标 ≥ 40');
  });
});
