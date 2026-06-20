import { describe, it, expect } from 'vitest';
import { GRID_SIZE } from '../src/game/constants.js';
import {
  templates,
  getTemplatesByCategory,
  getAllTemplates,
  getTemplateById,
  applyTemplateToEditor,
  validateTemplate
} from '../src/editor/templates.js';
import { createEmptyCells } from './helpers.js';

function createEditorState(overrides = {}) {
  return {
    cells: createEmptyCells(),
    params: {
      name: '',
      desc: '',
      budget: 100,
      water: 50,
      larvae: 30,
      bio: 30,
      turns: 10,
      stormChance: 0.2,
      goalScore: 50,
      goalPollutionMax: null,
      goalMinStats: null,
      seed: null
    },
    editTool: 'pollute',
    ...overrides
  };
}

describe('templates - 模板列表', () => {
  it('templates数组非空', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it('每个模板有基本字段', () => {
    for (const t of templates) {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.desc).toBeDefined();
      expect(t.category).toBeDefined();
      expect(t.cells.length).toBe(GRID_SIZE);
      expect(t.params).toBeDefined();
      expect(typeof t.params.budget).toBe('number');
      expect(typeof t.params.turns).toBe('number');
      expect(typeof t.params.stormChance).toBe('number');
      expect(typeof t.params.goalScore).toBe('number');
    }
  });

  it('模板分类为pollution或facility', () => {
    for (const t of templates) {
      expect(['pollution', 'facility']).toContain(t.category);
    }
  });

  it('getAllTemplates返回所有模板的拷贝', () => {
    const all = getAllTemplates();
    expect(all.length).toBe(templates.length);
    expect(all).not.toBe(templates);
  });

  it('getTemplatesByCategory正确分类', () => {
    const pollution = getTemplatesByCategory('pollution');
    const facility = getTemplatesByCategory('facility');
    expect(pollution.every(t => t.category === 'pollution')).toBe(true);
    expect(facility.every(t => t.category === 'facility')).toBe(true);
    expect(pollution.length + facility.length).toBe(templates.length);
  });

  it('getTemplatesByCategory不存在的分类返回空数组', () => {
    expect(getTemplatesByCategory('nonexistent')).toEqual([]);
  });

  it('getTemplateById按ID获取', () => {
    const first = templates[0];
    const found = getTemplateById(first.id);
    expect(found).toBe(first);
  });

  it('getTemplateById不存在返回undefined', () => {
    expect(getTemplateById('nonexistent')).toBeUndefined();
  });
});

describe('templates - 污染模板', () => {
  it('散点污染模板有正确的污染格分布', () => {
    const t = getTemplateById('pollution_散点污染');
    expect(t).toBeDefined();
    expect(t.category).toBe('pollution');
    const pollutionCount = t.cells.filter(c => c.polluted).length;
    expect(pollutionCount).toBeGreaterThan(0);
  });

  it('集中污染模板有集中区域的污染格', () => {
    const t = getTemplateById('pollution_集中污染');
    expect(t).toBeDefined();
    const pollutionCount = t.cells.filter(c => c.polluted).length;
    expect(pollutionCount).toBeGreaterThan(5);
  });

  it('边缘入侵模板污染分布在边缘', () => {
    const t = getTemplateById('pollution_边缘入侵');
    expect(t).toBeDefined();
    const pollutedIndices = t.cells
      .map((c, i) => (c.polluted ? i : -1))
      .filter(i => i >= 0);
    const edgeIndices = pollutedIndices.filter(i => {
      const x = i % 12;
      const y = Math.floor(i / 12);
      return x === 0 || x === 11 || y === 0 || y === 7;
    });
    expect(edgeIndices.length).toBe(pollutedIndices.length);
  });
});

describe('templates - 设施模板', () => {
  it('防守型布局有大量围护桩', () => {
    const t = getTemplateById('facility_防守型布局');
    expect(t).toBeDefined();
    const piles = t.cells.filter(c => c.type === 'pile').length;
    expect(piles).toBeGreaterThan(5);
  });

  it('均衡型布局三类设施都有', () => {
    const t = getTemplateById('facility_均衡型布局');
    expect(t).toBeDefined();
    const oysters = t.cells.filter(c => c.type === 'oyster').length;
    const grass = t.cells.filter(c => c.type === 'grass').length;
    const piles = t.cells.filter(c => c.type === 'pile').length;
    expect(oysters).toBeGreaterThan(0);
    expect(grass).toBeGreaterThan(0);
    expect(piles).toBeGreaterThan(0);
  });

  it('进攻型布局有大量牡蛎礁和海草床', () => {
    const t = getTemplateById('facility_进攻型布局');
    expect(t).toBeDefined();
    const oysters = t.cells.filter(c => c.type === 'oyster').length;
    const grass = t.cells.filter(c => c.type === 'grass').length;
    expect(oysters).toBeGreaterThan(5);
    expect(grass).toBeGreaterThan(5);
  });

  it('新手入门模板预算充裕污染较少', () => {
    const t = getTemplateById('facility_新手入门');
    expect(t).toBeDefined();
    expect(t.params.budget).toBeGreaterThanOrEqual(150);
    const pollution = t.cells.filter(c => c.polluted).length;
    expect(pollution).toBeLessThanOrEqual(5);
  });
});

describe('templates - applyTemplateToEditor', () => {
  it('applyTemplateToEditor正确设置单元格', () => {
    const t = getTemplateById('pollution_散点污染');
    const editor = createEditorState();
    applyTemplateToEditor(editor, t);

    for (let i = 0; i < GRID_SIZE; i++) {
      expect(editor.cells[i].type).toBe(t.cells[i].type);
      expect(editor.cells[i].polluted).toBe(t.cells[i].polluted);
    }
  });

  it('applyTemplateToEditor正确设置参数', () => {
    const t = getTemplateById('facility_防守型布局');
    const editor = createEditorState();
    applyTemplateToEditor(editor, t);

    expect(editor.params.budget).toBe(t.params.budget);
    expect(editor.params.turns).toBe(t.params.turns);
    expect(editor.params.stormChance).toBe(t.params.stormChance);
    expect(editor.params.goalScore).toBe(t.params.goalScore);
  });

  it('applyTemplateToEditor设置默认water/larvae/bio', () => {
    const t = templates[0];
    const editor = createEditorState();
    applyTemplateToEditor(editor, t);
    expect(editor.params.water).toBe(50);
    expect(editor.params.larvae).toBe(20);
    expect(editor.params.bio).toBe(20);
  });

  it('applyTemplateToEditor重置editTool', () => {
    const editor = createEditorState();
    editor.editTool = 'oyster';
    applyTemplateToEditor(editor, templates[0]);
    expect(editor.editTool).toBe('pollute');
  });

  it('applyTemplateToEditor深拷贝单元格', () => {
    const t = templates[0];
    const editor = createEditorState();
    applyTemplateToEditor(editor, t);
    editor.cells[0].type = 'buffer';
    expect(t.cells[0].type).not.toBe('buffer');
  });
});

describe('templates - validateTemplate', () => {
  it('内置模板全部合法', () => {
    for (const t of templates) {
      const errors = validateTemplate(t);
      expect(errors).toEqual([]);
    }
  });

  it('单元格数量错误时报错', () => {
    const bad = { ...templates[0], cells: templates[0].cells.slice(0, 10) };
    const errors = validateTemplate(bad);
    expect(errors.some(e => e.includes('单元格数量'))).toBe(true);
  });

  it('缺少params时报错', () => {
    const bad = { ...templates[0] };
    delete bad.params;
    const errors = validateTemplate(bad);
    expect(errors.some(e => e.includes('缺少参数配置'))).toBe(true);
  });
});

describe('templates - 数据完整性', () => {
  it('所有模板ID唯一', () => {
    const ids = templates.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('污染模板不包含设施', () => {
    const pollution = getTemplatesByCategory('pollution');
    for (const t of pollution) {
      const facilities = t.cells.filter(c => c.type !== 'empty');
      expect(facilities.length).toBe(0);
    }
  });

  it('设施模板至少包含一个设施', () => {
    const facility = getTemplatesByCategory('facility');
    for (const t of facility) {
      const count = t.cells.filter(c => c.type !== 'empty').length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it('所有模板参数在合理范围内', () => {
    for (const t of templates) {
      expect(t.params.budget).toBeGreaterThanOrEqual(50);
      expect(t.params.budget).toBeLessThanOrEqual(500);
      expect(t.params.turns).toBeGreaterThanOrEqual(5);
      expect(t.params.turns).toBeLessThanOrEqual(30);
      expect(t.params.stormChance).toBeGreaterThanOrEqual(0);
      expect(t.params.stormChance).toBeLessThanOrEqual(1);
      expect(t.params.goalScore).toBeGreaterThanOrEqual(0);
    }
  });
});
