import { GRID_SIZE } from '../game/constants.js';

const DRAFTS_STORAGE_KEY = 'tidal_restoration_drafts';
const MAX_DRAFTS = 10;

export function loadDrafts() {
  try {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!stored) return [];
    const drafts = JSON.parse(stored);
    return Array.isArray(drafts) ? drafts : [];
  } catch (e) {
    console.error('加载草稿失败:', e);
    return [];
  }
}

export function saveDrafts(drafts) {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    return true;
  } catch (e) {
    console.error('保存草稿列表失败:', e);
    return false;
  }
}

export function createDraft(editorState, name = '') {
  const now = Date.now();
  const draftName = name.trim() || `草稿 ${new Date(now).toLocaleString('zh-CN')}`;
  
  return {
    id: `draft_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: draftName,
    createdAt: now,
    updatedAt: now,
    cells: editorState.cells.map(c => ({ ...c })),
    params: { ...editorState.params }
  };
}

export function saveDraft(editorState, name = '') {
  const drafts = loadDrafts();
  const draft = createDraft(editorState, name);
  
  if (drafts.length >= MAX_DRAFTS) {
    drafts.sort((a, b) => b.updatedAt - a.updatedAt);
    drafts.pop();
  }
  
  drafts.unshift(draft);
  saveDrafts(drafts);
  return draft;
}

export function updateDraft(draftId, editorState, name = null) {
  const drafts = loadDrafts();
  const index = drafts.findIndex(d => d.id === draftId);
  if (index === -1) return null;
  
  drafts[index].cells = editorState.cells.map(c => ({ ...c }));
  drafts[index].params = { ...editorState.params };
  drafts[index].updatedAt = Date.now();
  if (name !== null) {
    drafts[index].name = name.trim() || drafts[index].name;
  }
  
  saveDrafts(drafts);
  return drafts[index];
}

export function deleteDraft(draftId) {
  const drafts = loadDrafts();
  const filtered = drafts.filter(d => d.id !== draftId);
  if (filtered.length === drafts.length) return false;
  saveDrafts(filtered);
  return true;
}

export function getDraft(draftId) {
  const drafts = loadDrafts();
  return drafts.find(d => d.id === draftId) || null;
}

export function applyDraftToEditor(editorState, draft) {
  editorState.cells = draft.cells.map(c => ({ ...c }));
  editorState.params = { ...draft.params };
  editorState.editTool = 'pollute';
}

export function validateDraft(draft) {
  const errors = [];
  
  if (!draft || typeof draft !== 'object') {
    errors.push('草稿数据无效。');
    return errors;
  }
  
  if (!draft.cells || draft.cells.length !== GRID_SIZE) {
    errors.push(`草稿单元格数量错误：期望 ${GRID_SIZE}。`);
  }
  
  if (!draft.params) {
    errors.push('草稿缺少参数配置。');
  } else {
    const { budget, turns, stormChance, goalScore } = draft.params;
    if (typeof budget !== 'number' || budget < 0) {
      errors.push('草稿预算无效。');
    }
    if (typeof turns !== 'number' || turns < 1 || turns > 30) {
      errors.push('草稿回合数无效。');
    }
    if (typeof stormChance !== 'number' || stormChance < 0 || stormChance > 1) {
      errors.push('草稿风暴概率无效。');
    }
    if (typeof goalScore !== 'number' || goalScore < 0) {
      errors.push('草稿目标评分无效。');
    }
  }
  
  return errors;
}

export function formatDraftPreview(draft) {
  const pollutionCount = draft.cells.filter(c => c.polluted).length;
  const facilities = draft.cells.filter(c => c.type !== 'empty');
  const facilityCount = facilities.length;
  
  return {
    pollutionCount,
    facilityCount,
    budget: draft.params.budget,
    turns: draft.params.turns,
    stormChance: draft.params.stormChance,
    goalScore: draft.params.goalScore,
    updatedAt: draft.updatedAt,
    createdAt: draft.createdAt
  };
}

export function getDraftCount() {
  return loadDrafts().length;
}

export function clearAllDrafts() {
  try {
    localStorage.removeItem(DRAFTS_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('清空草稿失败:', e);
    return false;
  }
}
