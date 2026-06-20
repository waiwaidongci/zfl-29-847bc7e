import { describe, it, expect } from 'vitest';
import { GRID_COLS, BUFFER_RANGE } from '../src/game/constants.js';
import {
  createRulesContext,
  triggerStormWithRules,
  getBufferProtectionCountWithRules,
  getCellsInRangeForRules
} from '../src/game/rules-engine.js';
import { triggerStorm } from '../src/game/state.js';
import {
  createTestGame,
  getFacilityCount,
  TEST_SEED
} from './helpers.js';

describe('rules-engine - 缓冲带防风暴', () => {
  it('缓冲带在指定范围内提供保护', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();

    const bufferIndex = GRID_COLS * 3 + 3;
    game.cells[bufferIndex].type = 'buffer';

    const protectedTarget = GRID_COLS * 3 + 4;
    const unprotectedTarget = GRID_COLS * 7 + 7;

    const protectedCount = getBufferProtectionCountWithRules(game.cells, protectedTarget, rules);
    const unprotectedCount = getBufferProtectionCountWithRules(game.cells, unprotectedTarget, rules);

    expect(protectedCount).toBe(1);
    expect(unprotectedCount).toBe(0);
  });

  it('多个缓冲带累积保护', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    const center = GRID_COLS * 4 + 4;

    const range = BUFFER_RANGE;
    const neighbors = getCellsInRangeForRules(center, range);
    game.cells[neighbors[0]].type = 'buffer';
    game.cells[neighbors[1]].type = 'buffer';

    const protectionCount = getBufferProtectionCountWithRules(game.cells, center, rules);
    expect(protectionCount).toBe(2);
  });

  it('风暴潮100%概率时未受保护设施必被损毁', () => {
    const game = createTestGame({ pollutionIndices: [] }, { seed: 1 });
    const rules = createRulesContext();
    rules.storm.damageChance = 1.0;
    rules.storm.bufferDamageReduction = 0;

    const targetIdx = 20;
    game.cells[targetIdx].type = 'oyster';

    const initialWater = game.water;
    const result = triggerStormWithRules(game, rules);

    expect(result.damaged).toBe(true);
    expect(result.damagedType).toBe('oyster');
    expect(result.bufferCount).toBe(0);
    expect(game.cells[targetIdx].type).toBe('empty');
    expect(game.water).toBe(initialWater - rules.storm.waterPenalty);
    expect(game.stormHitCount).toBe(1);
    expect(game.stormDamageCount).toBe(1);
  });

  it('足够缓冲带保护下设施免于损毁', () => {
    const game = createTestGame({ pollutionIndices: [] }, { seed: 1 });
    const rules = createRulesContext();
    rules.storm.damageChance = 1.0;
    rules.storm.bufferDamageReduction = 1.0;

    const center = GRID_COLS * 4 + 4;
    const protectedCells = getCellsInRangeForRules(center, BUFFER_RANGE);
    game.cells[protectedCells[0]].type = 'buffer';
    game.cells[center].type = 'oyster';

    const result = triggerStormWithRules(game, rules);
    expect(result.bufferSaved).toBe(true);
    expect(result.damaged).toBe(false);
    expect(game.cells[center].type).toBe('oyster');
  });

  it('相同seed下风暴结果可重复', () => {
    const run1 = createTestGame({ pollutionIndices: [] }, { seed: TEST_SEED });
    const run2 = createTestGame({ pollutionIndices: [] }, { seed: TEST_SEED });
    const rules = createRulesContext();

    run1.cells[10].type = 'oyster';
    run1.cells[11].type = 'grass';
    run2.cells[10].type = 'oyster';
    run2.cells[11].type = 'grass';

    const result1 = triggerStormWithRules(run1, rules);
    const result2 = triggerStormWithRules(run2, rules);

    expect(result1.damaged).toBe(result2.damaged);
    expect(result1.damagedType).toBe(result2.damagedType);
    expect(result1.bufferCount).toBe(result2.bufferCount);
    expect(result1.targetType).toBe(result2.targetType);
    expect(result1.bufferSaved).toBe(result2.bufferSaved);
    expect(run1.stormHitCount).toBe(run2.stormHitCount);
    expect(run1.stormDamageCount).toBe(run2.stormDamageCount);
  });

  it('风暴免疫时不触发风暴', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.effects.stormImmunity = true;
    game.cells[10].type = 'oyster';

    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(false);
    expect(result.damagedType).toBeNull();
    expect(game.cells[10].type).toBe('oyster');
    expect(game.stormHitCount).toBe(0);
  });

  it('禁用风暴时不触发风暴', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    rules.storm.enabled = false;
    game.cells[10].type = 'oyster';

    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(false);
    expect(game.cells[10].type).toBe('oyster');
  });

  it('无设施时风暴仍扣水质但不损毁设施', () => {
    const game = createTestGame({ pollutionIndices: [] });
    const rules = createRulesContext();
    const initialWater = game.water;

    const result = triggerStormWithRules(game, rules);
    expect(result.damaged).toBe(false);
    expect(result.damagedType).toBeNull();
    expect(game.water).toBe(initialWater - rules.storm.waterPenalty);
    expect(game.stormHitCount).toBe(1);
    expect(game.stormDamageCount).toBe(0);
  });
});

describe('state - 风暴记录', () => {
  it('triggerStorm记录replay事件', () => {
    const game = createTestGame({ pollutionIndices: [] });
    game.cells[10].type = 'oyster';
    const initialEventCount = game.replay.events.length;
    const initialLogCount = game.log.length;

    triggerStorm(game);

    expect(game.replay.events.length).toBeGreaterThan(initialEventCount);
    const stormEvent = game.replay.events.find(e => e.type === 'storm');
    expect(stormEvent).toBeDefined();
    expect(stormEvent.turn).toBe(game.turn);
    expect(game.log.length).toBeGreaterThan(initialLogCount);
  });
});
