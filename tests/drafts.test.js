import { describe, it, expect, beforeEach } from 'vitest';
import { GRID_SIZE } from '../src/game/constants.js';
import {
  loadDrafts,
  saveDrafts,
  createDraft,
  saveDraft,
  updateDraft,
  deleteDraft,
  getDraft,
  applyDraftToEditor,
  validateDraft,
  formatDraftPreview,
  getDraftCount,
  clearAllDrafts
} from '../src/editor/drafts.js';
import { createEmptyCells } from './helpers.js';

function createTestEditorState(overrides = {}) {
  return {
    cells: createEmptyCells(),
    params: {
      name: '',
      desc: '',
      budget: 150,
      water: 50,
      larvae: 30,
      bio: 30,
      turns: 10,
      stormChance: 0.2,
      goalScore: 60,
      goalPollutionMax: null,
      goalMinStats: null,
      seed: null
    },
    editTool: 'pollute',
    ...overrides
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('drafts - 基础存储', () => {
  it('初始无草稿', () => {
    expect(loadDrafts()).toEqual([]);
    expect(getDraftCount()).toBe(0);
  });

  it('saveDrafts保存后可loadDrafts读取', () => {
    const drafts = [{ id: 'test', name: '测试' }];
    saveDrafts(drafts);
    expect(loadDrafts()).toEqual(drafts);
  });

  it('clearAllDrafts清空所有草稿', () => {
    saveDrafts([{ id: 'a' }, { id: 'b' }]);
    expect(getDraftCount()).toBe(2);
    clearAllDrafts();
    expect(getDraftCount()).toBe(0);
    expect(loadDrafts()).toEqual([]);
  });
});

describe('drafts - createDraft', () => {
  it('createDraft创建正确结构的草稿', () => {
    const editor = createTestEditorState();
    editor.cells[0].polluted = true;
    editor.cells[5].type = 'oyster';
    editor.params.budget = 200;

    const draft = createDraft(editor, '我的草稿');
    expect(draft.id).toMatch(/^draft_/);
    expect(draft.name).toBe('我的草稿');
    expect(typeof draft.createdAt).toBe('number');
    expect(typeof draft.updatedAt).toBe('number');
    expect(draft.cells.length).toBe(GRID_SIZE);
    expect(draft.cells[0].polluted).toBe(true);
    expect(draft.cells[5].type).toBe('oyster');
    expect(draft.params.budget).toBe(200);
  });

  it('createDraft空名称时自动生成名称', () => {
    const editor = createTestEditorState();
    const draft = createDraft(editor);
    expect(draft.name.length).toBeGreaterThan(0);
    expect(draft.name).toMatch(/草稿/);
  });

  it('createDraft深拷贝编辑器状态', () => {
    const editor = createTestEditorState();
    editor.cells[0].type = 'oyster';
    const draft = createDraft(editor, 'test');
    editor.cells[0].type = 'grass';
    expect(draft.cells[0].type).toBe('oyster');
  });
});

describe('drafts - saveDraft/获取草稿', () => {
  it('saveDraft保存草稿并返回', () => {
    const editor = createTestEditorState();
    const draft = saveDraft(editor, '测试保存');
    expect(draft).toBeDefined();
    expect(getDraftCount()).toBe(1);

    const loaded = getDraft(draft.id);
    expect(loaded).toEqual(draft);
  });

  it('saveDraft将新草稿放在最前', () => {
    saveDraft(createTestEditorState(), '草稿1');
    saveDraft(createTestEditorState(), '草稿2');
    const drafts = loadDrafts();
    expect(drafts[0].name).toBe('草稿2');
    expect(drafts[1].name).toBe('草稿1');
  });

  it('超过最大草稿数时移除最旧的', () => {
    for (let i = 0; i < 12; i++) {
      saveDraft(createTestEditorState(), `草稿${i}`);
    }
    expect(getDraftCount()).toBe(10);
    const drafts = loadDrafts();
    expect(drafts[0].name).toBe('草稿11');
    expect(drafts[9].name).toBe('草稿2');
  });

  it('getDraft不存在返回null', () => {
    expect(getDraft('nonexistent')).toBe(null);
  });
});

describe('drafts - updateDraft', () => {
  it('updateDraft更新草稿内容', () => {
    const editor1 = createTestEditorState();
    editor1.params.budget = 100;
    const draft = saveDraft(editor1, '原名称');

    const editor2 = createTestEditorState();
    editor2.params.budget = 300;
    editor2.cells[0].type = 'grass';

    const updated = updateDraft(draft.id, editor2, '新名称');
    expect(updated.name).toBe('新名称');
    expect(updated.params.budget).toBe(300);
    expect(updated.cells[0].type).toBe('grass');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(draft.createdAt);
  });

  it('updateDraft name为null时保留原名称', () => {
    const editor = createTestEditorState();
    const draft = saveDraft(editor, '保留名称');
    const updated = updateDraft(draft.id, editor, null);
    expect(updated.name).toBe('保留名称');
  });

  it('updateDraft空名称时保留原名称', () => {
    const editor = createTestEditorState();
    const draft = saveDraft(editor, '保留名称');
    const updated = updateDraft(draft.id, editor, '   ');
    expect(updated.name).toBe('保留名称');
  });

  it('updateDraft不存在的id返回null', () => {
    const editor = createTestEditorState();
    expect(updateDraft('nonexistent', editor)).toBe(null);
  });
});

describe('drafts - deleteDraft', () => {
  it('deleteDraft删除指定草稿', () => {
    const draft = saveDraft(createTestEditorState(), '要删除');
    expect(getDraftCount()).toBe(1);
    const result = deleteDraft(draft.id);
    expect(result).toBe(true);
    expect(getDraftCount()).toBe(0);
    expect(getDraft(draft.id)).toBe(null);
  });

  it('deleteDraft不存在返回false', () => {
    expect(deleteDraft('nonexistent')).toBe(false);
  });
});

describe('drafts - applyDraftToEditor', () => {
  it('applyDraftToEditor正确还原草稿', () => {
    const editor1 = createTestEditorState();
    editor1.cells[10].type = 'buffer';
    editor1.cells[10].polluted = true;
    editor1.params.budget = 250;
    editor1.params.goalScore = 80;
    editor1.editTool = 'oyster';

    const draft = createDraft(editor1, '测试');
    const editor2 = createTestEditorState();
    applyDraftToEditor(editor2, draft);

    expect(editor2.cells[10].type).toBe('buffer');
    expect(editor2.cells[10].polluted).toBe(true);
    expect(editor2.params.budget).toBe(250);
    expect(editor2.params.goalScore).toBe(80);
    expect(editor2.editTool).toBe('pollute');
  });
});

describe('drafts - validateDraft', () => {
  it('合法草稿无错误', () => {
    const editor = createTestEditorState();
    const draft = createDraft(editor, '合法');
    expect(validateDraft(draft)).toEqual([]);
  });

  it('null或非对象报错', () => {
    expect(validateDraft(null).length).toBeGreaterThan(0);
    expect(validateDraft(undefined).length).toBeGreaterThan(0);
    expect(validateDraft('string').length).toBeGreaterThan(0);
  });

  it('单元格数量错误报错', () => {
    const draft = createDraft(createTestEditorState());
    draft.cells = draft.cells.slice(0, 10);
    const errors = validateDraft(draft);
    expect(errors.some(e => e.includes('单元格数量'))).toBe(true);
  });

  it('缺少params报错', () => {
    const draft = createDraft(createTestEditorState());
    delete draft.params;
    const errors = validateDraft(draft);
    expect(errors.some(e => e.includes('缺少参数配置'))).toBe(true);
  });

  it('预算无效报错', () => {
    const draft = createDraft(createTestEditorState());
    draft.params.budget = -10;
    const errors = validateDraft(draft);
    expect(errors.some(e => e.includes('预算'))).toBe(true);
  });

  it('回合数无效报错', () => {
    const draft = createDraft(createTestEditorState());
    draft.params.turns = 100;
    const errors = validateDraft(draft);
    expect(errors.some(e => e.includes('回合数'))).toBe(true);
  });

  it('风暴概率无效报错', () => {
    const draft = createDraft(createTestEditorState());
    draft.params.stormChance = 2;
    const errors = validateDraft(draft);
    expect(errors.some(e => e.includes('风暴概率'))).toBe(true);
  });

  it('目标评分无效报错', () => {
    const draft = createDraft(createTestEditorState());
    draft.params.goalScore = -1;
    const errors = validateDraft(draft);
    expect(errors.some(e => e.includes('目标评分'))).toBe(true);
  });
});

describe('drafts - formatDraftPreview', () => {
  it('formatDraftPreview返回正确预览信息', () => {
    const editor = createTestEditorState();
    editor.cells[0].polluted = true;
    editor.cells[1].polluted = true;
    editor.cells[5].polluted = true;
    editor.cells[10].type = 'oyster';
    editor.cells[20].type = 'grass';

    const draft = createDraft(editor, '预览测试');
    const preview = formatDraftPreview(draft);

    expect(preview.pollutionCount).toBe(3);
    expect(preview.facilityCount).toBe(2);
    expect(preview.budget).toBe(150);
    expect(preview.turns).toBe(10);
    expect(preview.stormChance).toBe(0.2);
    expect(preview.goalScore).toBe(60);
    expect(preview.updatedAt).toBe(draft.updatedAt);
    expect(preview.createdAt).toBe(draft.createdAt);
  });
});
