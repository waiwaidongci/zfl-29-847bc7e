import { GRID_SIZE, COSTS, ICONS, SANDBOX_SCENE_ID } from '../game/constants.js';
import { addScene } from '../data/scenes.js';

export function createEditorState() {
  return {
    editTool: 'pollute',
    cells: Array.from({ length: GRID_SIZE }, () => ({ type: 'empty', polluted: false })),
    params: {
      budget: 120,
      turns: 10,
      stormChance: 0.2,
      goalScore: 50
    }
  };
}

export function resetEditorState(editorState) {
  editorState.editTool = 'pollute';
  editorState.cells = Array.from({ length: GRID_SIZE }, () => ({ type: 'empty', polluted: false }));
  editorState.params = {
    budget: 120,
    turns: 10,
    stormChance: 0.2,
    goalScore: 50
  };
}

export function renderEditorGrid(editorGridEl, cells, onClick, onHover) {
  editorGridEl.innerHTML = cells
    .map((cell, i) => {
      let classes = 'cell ' + cell.type;
      if (cell.polluted) classes += ' polluted';
      return `<div class="${classes}" data-i="${i}"><span>${ICONS[cell.type]}</span></div>`;
    })
    .join('');

  editorGridEl.querySelectorAll('.cell').forEach(cell => {
    const index = Number(cell.dataset.i);
    cell.onclick = () => onClick(index);
    cell.onmouseenter = () => onHover(index, true);
    cell.onmouseleave = () => onHover(index, false);
  });
}

export function renderEditorTools(editorToolsEl, currentTool) {
  editorToolsEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.edit === currentTool);
  });
}

export function updateEditorPreview() {
  return editorState => {
    const pollutionCount = editorState.cells.filter(c => c.polluted).length;
    const repairableCount = editorState.cells.filter(c => !c.polluted).length;
    const facilities = editorState.cells.filter(c => c.type !== 'empty');
    const facilityCount = facilities.length;
    const facilityCost = facilities.reduce((sum, c) => sum + COSTS[c.type], 0);

    document.querySelector('#previewPollution').textContent = pollutionCount;
    document.querySelector('#previewRepairable').textContent = repairableCount;
    document.querySelector('#previewFacilities').textContent = facilityCount;
    document.querySelector('#previewCost').textContent = facilityCost;
  };
}

export function handleEditorClick(editorState, index) {
  const cell = editorState.cells[index];
  const tool = editorState.editTool;

  if (tool === 'pollute') {
    cell.polluted = true;
  } else if (tool === 'unpollute') {
    cell.polluted = false;
  } else if (tool === 'erase') {
    cell.type = 'empty';
  } else if (tool === 'clearAll') {
    resetEditorState(editorState);
    return true;
  } else if (['oyster', 'grass', 'pile'].includes(tool)) {
    if (cell.type === 'empty') {
      cell.type = tool;
    }
  }

  return false;
}

export function handleEditorHover(editorGridEl, index, enter, editTool) {
  const cell = editorGridEl.querySelector(`[data-i="${index}"]`);
  if (!cell) return;

  if (enter) {
    if (editTool === 'pollute') {
      cell.classList.add('preview-pol');
    } else if (['oyster', 'grass', 'pile'].includes(editTool)) {
      cell.classList.add('preview-obs');
    }
  } else {
    cell.classList.remove('preview-pol', 'preview-obs');
  }
}

export function validateEditorConfig(editorState) {
  const params = editorState.params;
  const cells = editorState.cells;
  const errors = [];

  const repairableCount = cells.filter(c => !c.polluted).length;
  if (repairableCount === 0) {
    errors.push('没有可修复区域：所有格子都被设置为污染，请至少保留一个非污染格。');
  }

  if (params.budget < 0) {
    errors.push('初始预算不能为负数。');
  }

  if (params.budget === 0) {
    errors.push('初始预算为0，无法放置任何设施。');
  }

  if (params.turns < 1 || params.turns > 30) {
    errors.push('回合数超出合理范围：请设置1-30回合。');
  }

  if (params.stormChance < 0 || params.stormChance > 1) {
    errors.push('风暴概率必须在0到1之间。');
  }

  if (params.goalScore < 0) {
    errors.push('目标评分不能为负数。');
  }

  const facilityCost = cells
    .filter(c => c.type !== 'empty')
    .reduce((sum, c) => sum + COSTS[c.type], 0);
  if (facilityCost > params.budget) {
    errors.push(`初始设施花费(${facilityCost})超过初始预算(${params.budget})。`);
  }

  return errors;
}

export function showEditorError(editorErrorEl, message) {
  editorErrorEl.textContent = message;
  editorErrorEl.classList.add('show');
}

export function clearEditorError(editorErrorEl) {
  editorErrorEl.textContent = '';
  editorErrorEl.classList.remove('show');
}

export function buildSandboxScene(editorState) {
  const pollutionIndices = editorState.cells
    .map((c, i) => (c.polluted ? i : -1))
    .filter(i => i >= 0);

  const initialFacilities = editorState.cells.filter(c => c.type !== 'empty');
  const facilityCost = initialFacilities.reduce((sum, c) => sum + COSTS[c.type], 0);

  const sandboxScene = {
    id: SANDBOX_SCENE_ID,
    name: '自定义沙盒',
    desc: '玩家自定义配置的修复挑战场景。',
    budget: editorState.params.budget - facilityCost,
    water: 50,
    larvae: 20,
    bio: 20,
    turns: editorState.params.turns,
    stormChance: editorState.params.stormChance,
    pollutionIndices: pollutionIndices,
    goalScore: editorState.params.goalScore,
    goalDesc: `生态评分 ≥ ${editorState.params.goalScore}`,
    tags: ['自定义', '沙盒'],
    winText: '自定义挑战完成！你成功修复了这片潮间带。',
    loseText: '自定义挑战失败，继续调整策略尝试吧！',
    initialCells: editorState.cells.map(c => ({ type: c.type, polluted: c.polluted }))
  };

  addScene(SANDBOX_SCENE_ID, sandboxScene);
  return sandboxScene;
}

export function readParamsFromDOM() {
  return {
    budget: Number(document.querySelector('#paramBudget').value),
    turns: Number(document.querySelector('#paramTurns').value),
    stormChance: Number(document.querySelector('#paramStorm').value),
    goalScore: Number(document.querySelector('#paramGoal').value)
  };
}

export function writeParamsToDOM(params) {
  document.querySelector('#paramBudget').value = params.budget;
  document.querySelector('#paramTurns').value = params.turns;
  document.querySelector('#paramStorm').value = params.stormChance;
  document.querySelector('#paramGoal').value = params.goalScore;
}

export function applyCellsAndParams(editorState, cells, params) {
  editorState.cells = cells.map(c => ({ ...c }));
  editorState.params = { ...params };
  editorState.editTool = 'pollute';
}

export function serializeEditorState(editorState) {
  return {
    cells: editorState.cells.map(c => ({ ...c })),
    params: { ...editorState.params }
  };
}

export function deserializeToEditorState(editorState, data) {
  if (data.cells) {
    editorState.cells = data.cells.map(c => ({ ...c }));
  }
  if (data.params) {
    editorState.params = { ...data.params };
  }
  editorState.editTool = 'pollute';
}
