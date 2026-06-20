import { describe, it, expect, beforeEach } from 'vitest';
import { GRID_SIZE } from '../src/game/constants.js';
import {
  generateChallengeCode,
  parseChallengeCode,
  validateChallengeConfig,
  buildChallengeScene,
  applyDecodedToEditor
} from '../src/editor/challenge.js';
import { createEmptyCells } from './helpers.js';

function createEditorState(overrides = {}) {
  return {
    cells: createEmptyCells(),
    params: {
      name: '测试挑战',
      desc: '测试描述',
      budget: 150,
      water: 50,
      larvae: 30,
      bio: 30,
      turns: 10,
      stormChance: 0.2,
      goalScore: 60,
      goalPollutionMax: null,
      goalMinStats: null,
      seed: null,
      ...overrides
    },
    rules: null,
    editTool: 'pollute',
    ...overrides
  };
}

describe('challenge - 挑战码生成(V2)', () => {
  it('generateChallengeCode生成ZC2前缀的挑战码', () => {
    const state = createEditorState();
    const code = generateChallengeCode(state);
    expect(code.startsWith('ZC2:')).toBe(true);
    expect(code.length).toBeGreaterThan(10);
  });

  it('生成的挑战码包含单元格数据', () => {
    const state = createEditorState();
    state.cells[0].type = 'oyster';
    state.cells[0].polluted = false;
    state.cells[5].polluted = true;

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    expect(decoded.cells[0].type).toBe('oyster');
    expect(decoded.cells[0].polluted).toBe(false);
    expect(decoded.cells[5].type).toBe('empty');
    expect(decoded.cells[5].polluted).toBe(true);
  });

  it('生成的挑战码包含所有参数', () => {
    const state = createEditorState();
    state.params.name = '我的挑战';
    state.params.desc = '这是一个测试';
    state.params.budget = 200;
    state.params.water = 40;
    state.params.larvae = 25;
    state.params.bio = 35;
    state.params.turns = 15;
    state.params.stormChance = 0.35;
    state.params.goalScore = 70;
    state.params.goalPollutionMax = 20;
    state.params.goalMinStats = 40;
    state.params.seed = 12345;

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    expect(decoded.version).toBe(2);
    expect(decoded.params.name).toBe('我的挑战');
    expect(decoded.params.desc).toBe('这是一个测试');
    expect(decoded.params.budget).toBe(200);
    expect(decoded.params.water).toBe(40);
    expect(decoded.params.larvae).toBe(25);
    expect(decoded.params.bio).toBe(35);
    expect(decoded.params.turns).toBe(15);
    expect(decoded.params.stormChance).toBeCloseTo(0.35);
    expect(decoded.params.goalScore).toBe(70);
    expect(decoded.params.goalPollutionMax).toBe(20);
    expect(decoded.params.goalMinStats).toBe(40);
    expect(decoded.params.seed).toBe(12345);
  });

  it('可选参数为空时不包含在结果中', () => {
    const state = createEditorState();
    state.params.goalPollutionMax = null;
    state.params.goalMinStats = null;
    state.params.seed = null;

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    expect(decoded.params.goalPollutionMax).toBe(null);
    expect(decoded.params.goalMinStats).toBe(null);
    expect(decoded.params.seed).toBe(null);
  });

  it('包含自定义规则的挑战码能正确编解码', () => {
    const state = createEditorState();
    state.rules = {
      facilityCosts: { oyster: 20 },
      ecosystem: { oyster: { waterBonus: 5 } }
    };

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    expect(decoded.rules).not.toBe(null);
    expect(decoded.rules.facilityCosts.oyster).toBe(20);
    expect(decoded.rules.ecosystem.oyster.waterBonus).toBe(5);
  });
});

describe('challenge - 挑战码解析', () => {
  it('parseChallengeCode正确解析V2挑战码', () => {
    const state = createEditorState();
    state.cells[10].type = 'grass';
    state.cells[10].polluted = true;
    state.params.goalScore = 80;

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    expect(decoded.version).toBe(2);
    expect(decoded.cells.length).toBe(GRID_SIZE);
    expect(decoded.cells[10].type).toBe('grass');
    expect(decoded.cells[10].polluted).toBe(true);
    expect(decoded.params.goalScore).toBe(80);
  });

  it('空挑战码抛出错误', () => {
    expect(() => parseChallengeCode('')).toThrow();
    expect(() => parseChallengeCode(null)).toThrow();
    expect(() => parseChallengeCode(undefined)).toThrow();
  });

  it('错误前缀抛出错误', () => {
    expect(() => parseChallengeCode('INVALID:abc')).toThrow(/应以/);
  });

  it('空内容抛出错误', () => {
    expect(() => parseChallengeCode('ZC2:')).toThrow(/内容为空/);
  });

  it('损坏的Base64抛出错误', () => {
    expect(() => parseChallengeCode('ZC2:!!!invalid!!!')).toThrow();
  });

  it('损坏的JSON抛出错误', () => {
    const badJson = btoa('not a json object');
    expect(() => parseChallengeCode('ZC2:' + badJson.replace(/\+/g, '-').replace(/\//g, '_'))).toThrow(/JSON/);
  });

  it('不支持的版本抛出错误', () => {
    const payload = JSON.stringify({ v: 999, c: '0'.repeat(GRID_SIZE), b: 100, t: 10, s: 0.2, g: 50 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    expect(() => parseChallengeCode('ZC2:' + encoded)).toThrow(/不支持的挑战码版本/);
  });

  it('无效单元格编码抛出错误', () => {
    const payload = JSON.stringify({ v: 2, c: 'a'.repeat(GRID_SIZE), b: 100, w: 50, l: 30, i: 30, t: 10, s: 0.2, g: 50 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    expect(() => parseChallengeCode('ZC2:' + encoded)).toThrow(/单元格编码无效/);
  });

  it('单元格编码长度错误抛出错误', () => {
    const payload = JSON.stringify({ v: 2, c: '000', b: 100, w: 50, l: 30, i: 30, t: 10, s: 0.2, g: 50 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    expect(() => parseChallengeCode('ZC2:' + encoded)).toThrow(/长度错误/);
  });
});

describe('challenge - 挑战配置校验', () => {
  it('合法配置无错误', () => {
    const state = createEditorState();
    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);
    const errors = validateChallengeConfig(decoded);
    expect(errors).toEqual([]);
  });

  it('全部格子污染时报错', () => {
    const state = createEditorState();
    state.cells.forEach(c => { c.polluted = true; });
    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);
    const errors = validateChallengeConfig(decoded);
    expect(errors.some(e => e.includes('没有可修复区域'))).toBe(true);
  });

  it('预算为0时报错', () => {
    const state = createEditorState({ budget: 0 });
    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);
    const errors = validateChallengeConfig(decoded);
    expect(errors.some(e => e.includes('初始预算'))).toBe(true);
  });

  it('初始设施花费超过预算时报错', () => {
    const state = createEditorState({ budget: 10 });
    state.cells[0].type = 'oyster';
    state.cells[1].type = 'oyster';
    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);
    const errors = validateChallengeConfig(decoded);
    expect(errors.some(e => e.includes('超过初始预算'))).toBe(true);
  });

  it('指标超出范围时报错', () => {
    const cells = createEmptyCells();
    const decoded = {
      version: 2,
      params: {
        name: '',
        desc: '',
        budget: 150,
        water: 999,
        larvae: 30,
        bio: 30,
        turns: 10,
        stormChance: 0.2,
        goalScore: 60,
        goalPollutionMax: null,
        goalMinStats: null,
        seed: null
      },
      cells,
      rules: null
    };
    const errors = validateChallengeConfig(decoded);
    expect(errors.some(e => e.includes('初始水质'))).toBe(true);
  });
});

describe('challenge - 场景构建', () => {
  it('buildChallengeScene返回正确的场景对象', () => {
    const state = createEditorState();
    state.params.name = '构建测试';
    state.params.desc = '构建描述';
    state.cells[5].polluted = true;
    state.cells[10].type = 'oyster';
    state.params.goalPollutionMax = 5;

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);
    const scene = buildChallengeScene(decoded);

    expect(scene.id).toBe('sandbox');
    expect(scene.name).toBe('构建测试');
    expect(scene.desc).toBe('构建描述');
    expect(scene.turns).toBe(10);
    expect(scene.pollutionIndices).toEqual([5]);
    expect(scene.goalPollutionMax).toBe(5);
    expect(scene.initialCells).toBeDefined();
    expect(scene.initialCells[5].polluted).toBe(true);
    expect(scene.initialCells[10].type).toBe('oyster');
    expect(scene.fromChallenge).toBe(true);
    expect(scene.tags).toContain('挑战码');
  });

  it('预算减去初始设施花费', () => {
    const state = createEditorState({ budget: 100 });
    state.cells[0].type = 'oyster';
    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);
    const scene = buildChallengeScene(decoded);
    expect(scene.budget).toBeLessThan(100);
  });
});

describe('challenge - 应用到编辑器', () => {
  it('applyDecodedToEditor正确设置编辑器状态', () => {
    const state = createEditorState();
    state.cells[20].type = 'grass';
    state.cells[20].polluted = true;
    state.params.name = '原名称';

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    const editorState = createEditorState();
    applyDecodedToEditor(editorState, decoded);

    expect(editorState.cells[20].type).toBe('grass');
    expect(editorState.cells[20].polluted).toBe(true);
    expect(editorState.params.name).toBe('原名称');
    expect(editorState.editTool).toBe('pollute');
  });
});

describe('challenge - 编解码往返一致性', () => {
  it('编解码后数据完整一致', () => {
    const state = createEditorState();
    state.params.name = '往返测试';
    state.params.budget = 180;
    state.params.water = 45;
    state.params.larvae = 33;
    state.params.bio = 38;
    state.params.turns = 12;
    state.params.stormChance = 0.28;
    state.params.goalScore = 65;
    state.params.goalPollutionMax = 15;
    state.params.goalMinStats = 35;
    state.params.seed = 98765;
    state.cells[0].polluted = true;
    state.cells[1].type = 'oyster';
    state.cells[2].type = 'grass';
    state.cells[3].type = 'pile';
    state.cells[4].type = 'buffer';
    state.cells[5].type = 'oyster';
    state.cells[5].polluted = true;

    const code = generateChallengeCode(state);
    const decoded = parseChallengeCode(code);

    expect(decoded.params.name).toBe(state.params.name);
    expect(decoded.params.budget).toBe(state.params.budget);
    expect(decoded.params.water).toBe(state.params.water);
    expect(decoded.params.larvae).toBe(state.params.larvae);
    expect(decoded.params.bio).toBe(state.params.bio);
    expect(decoded.params.turns).toBe(state.params.turns);
    expect(decoded.params.stormChance).toBeCloseTo(state.params.stormChance);
    expect(decoded.params.goalScore).toBe(state.params.goalScore);
    expect(decoded.params.goalPollutionMax).toBe(state.params.goalPollutionMax);
    expect(decoded.params.goalMinStats).toBe(state.params.goalMinStats);
    expect(decoded.params.seed).toBe(state.params.seed);

    for (let i = 0; i < GRID_SIZE; i++) {
      expect(decoded.cells[i].type).toBe(state.cells[i].type);
      expect(decoded.cells[i].polluted).toBe(state.cells[i].polluted);
    }
  });

  it('挑战码首尾空白被正确trim', () => {
    const state = createEditorState();
    const code = generateChallengeCode(state);
    const padded = '   ' + code + '   ';
    const decoded = parseChallengeCode(padded);
    expect(decoded.version).toBe(2);
  });
});
