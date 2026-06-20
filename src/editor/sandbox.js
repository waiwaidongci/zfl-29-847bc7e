import { GRID_SIZE, COSTS, ICONS, SANDBOX_SCENE_ID } from '../game/constants.js';
import { addScene } from '../data/scenes.js';

export function createEditorState() {
  return {
    editTool: 'pollute',
    cells: Array.from({ length: GRID_SIZE }, () => ({ type: 'empty', polluted: false })),
    params: {
      name: '',
      desc: '',
      budget: 120,
      water: 50,
      larvae: 20,
      bio: 20,
      turns: 10,
      stormChance: 0.2,
      goalScore: 50,
      goalPollutionMax: null,
      goalMinStats: null,
      seed: null
    }
  };
}

export function resetEditorState(editorState) {
  editorState.editTool = 'pollute';
  editorState.cells = Array.from({ length: GRID_SIZE }, () => ({ type: 'empty', polluted: false }));
  editorState.params = {
    name: '',
    desc: '',
    budget: 120,
    water: 50,
    larvae: 20,
    bio: 20,
    turns: 10,
    stormChance: 0.2,
    goalScore: 50,
    goalPollutionMax: null,
    goalMinStats: null,
    seed: null
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
  } else if (['oyster', 'grass', 'pile', 'buffer'].includes(tool)) {
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
    } else if (['oyster', 'grass', 'pile', 'buffer'].includes(editTool)) {
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

  if (params.water < 0 || params.water > 100) {
    errors.push('初始水质超出范围（0 - 100）。');
  }

  if (params.larvae < 0 || params.larvae > 100) {
    errors.push('初始幼体数量超出范围（0 - 100）。');
  }

  if (params.bio < 0 || params.bio > 100) {
    errors.push('初始多样性超出范围（0 - 100）。');
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

  if (params.goalPollutionMax != null && (params.goalPollutionMax < 0 || params.goalPollutionMax > GRID_SIZE)) {
    errors.push(`污染上限超出范围（0 - ${GRID_SIZE}）。`);
  }

  if (params.goalMinStats != null && (params.goalMinStats < 0 || params.goalMinStats > 100)) {
    errors.push('最低指标要求超出范围（0 - 100）。');
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
  const params = editorState.params;

  const goalParts = [`生态评分 ≥ ${params.goalScore}`];
  if (params.goalPollutionMax != null) {
    goalParts.push(`污染 ≤ ${params.goalPollutionMax}格`);
  }
  if (params.goalMinStats != null) {
    goalParts.push(`所有指标 ≥ ${params.goalMinStats}`);
  }
  const goalDesc = goalParts.join(' 且 ');

  const sandboxScene = {
    id: SANDBOX_SCENE_ID,
    name: params.name || '自定义沙盒',
    desc: params.desc || '玩家自定义配置的修复挑战场景。',
    budget: params.budget - facilityCost,
    water: params.water,
    larvae: params.larvae,
    bio: params.bio,
    turns: params.turns,
    stormChance: params.stormChance,
    pollutionIndices: pollutionIndices,
    goalScore: params.goalScore,
    goalPollutionMax: params.goalPollutionMax,
    goalMinStats: params.goalMinStats,
    goalDesc,
    tags: ['自定义', '沙盒'],
    winText: '自定义挑战完成！你成功修复了这片潮间带。',
    loseText: '自定义挑战失败，继续调整策略尝试吧！',
    initialCells: editorState.cells.map(c => ({ type: c.type, polluted: c.polluted }))
  };

  addScene(SANDBOX_SCENE_ID, sandboxScene);
  return sandboxScene;
}

export function readParamsFromDOM() {
  const goalPollutionMaxVal = document.querySelector('#paramGoalPollutionMax').value.trim();
  const goalMinStatsVal = document.querySelector('#paramGoalMinStats').value.trim();
  const seedVal = document.querySelector('#paramSeed').value.trim();
  return {
    name: document.querySelector('#paramName').value.trim(),
    desc: document.querySelector('#paramDesc').value.trim(),
    budget: Number(document.querySelector('#paramBudget').value),
    water: Number(document.querySelector('#paramWater').value),
    larvae: Number(document.querySelector('#paramLarvae').value),
    bio: Number(document.querySelector('#paramBio').value),
    turns: Number(document.querySelector('#paramTurns').value),
    stormChance: Number(document.querySelector('#paramStorm').value),
    goalScore: Number(document.querySelector('#paramGoal').value),
    goalPollutionMax: goalPollutionMaxVal !== '' ? Number(goalPollutionMaxVal) : null,
    goalMinStats: goalMinStatsVal !== '' ? Number(goalMinStatsVal) : null,
    seed: seedVal !== '' ? Number(seedVal) : null
  };
}

export function writeParamsToDOM(params) {
  document.querySelector('#paramName').value = params.name || '';
  document.querySelector('#paramDesc').value = params.desc || '';
  document.querySelector('#paramBudget').value = params.budget;
  document.querySelector('#paramWater').value = params.water;
  document.querySelector('#paramLarvae').value = params.larvae;
  document.querySelector('#paramBio').value = params.bio;
  document.querySelector('#paramTurns').value = params.turns;
  document.querySelector('#paramStorm').value = params.stormChance;
  document.querySelector('#paramGoal').value = params.goalScore;
  document.querySelector('#paramGoalPollutionMax').value = params.goalPollutionMax != null ? params.goalPollutionMax : '';
  document.querySelector('#paramGoalMinStats').value = params.goalMinStats != null ? params.goalMinStats : '';
  document.querySelector('#paramSeed').value = params.seed != null ? params.seed : '';
}
