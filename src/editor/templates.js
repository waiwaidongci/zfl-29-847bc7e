import { GRID_SIZE } from '../game/constants.js';

function createEmptyCells() {
  return Array.from({ length: GRID_SIZE }, () => ({ type: 'empty', polluted: false }));
}

function setPollution(cells, indices) {
  indices.forEach(i => {
    if (i >= 0 && i < cells.length) {
      cells[i].polluted = true;
    }
  });
}

function setFacility(cells, index, type) {
  if (index >= 0 && index < cells.length && cells[index].type === 'empty') {
    cells[index].type = type;
  }
}

function createPollutionTemplate(name, desc, pollutionIndices, paramsOverrides = {}) {
  const cells = createEmptyCells();
  setPollution(cells, pollutionIndices);
  return {
    id: `pollution_${name}`,
    name,
    desc,
    category: 'pollution',
    cells,
    params: {
      budget: 120,
      turns: 10,
      stormChance: 0.2,
      goalScore: 50,
      ...paramsOverrides
    }
  };
}

function createFacilityTemplate(name, desc, facilities, pollutionIndices = [], paramsOverrides = {}) {
  const cells = createEmptyCells();
  setPollution(cells, pollutionIndices);
  facilities.forEach(({ index, type }) => setFacility(cells, index, type));
  return {
    id: `facility_${name}`,
    name,
    desc,
    category: 'facility',
    cells,
    params: {
      budget: 150,
      turns: 10,
      stormChance: 0.2,
      goalScore: 50,
      ...paramsOverrides
    }
  };
}

export const templates = [
  createPollutionTemplate(
    '散点污染',
    '污染随机散布在整个区域，适合练习均匀布控能力。',
    [5, 17, 29, 41, 53, 65, 77, 89],
    { budget: 130, goalScore: 55 }
  ),
  createPollutionTemplate(
    '集中污染',
    '污染集中在中心区域，需要快速控制污染源防止扩散。',
    [34, 35, 42, 43, 46, 47, 54, 55, 38, 39, 50, 51],
    { budget: 140, turns: 12, goalScore: 60 }
  ),
  createPollutionTemplate(
    '边缘入侵',
    '污染从边缘向内扩散，考验防线构建能力。',
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95],
    { budget: 160, turns: 15, stormChance: 0.25, goalScore: 65 }
  ),
  createPollutionTemplate(
    '走廊污染',
    '污染沿对角线分布，形成污染走廊。',
    [0, 13, 26, 39, 52, 65, 78, 91, 11, 22, 33, 44, 55, 66, 77, 88],
    { budget: 135, turns: 11, goalScore: 55 }
  ),
  createPollutionTemplate(
    '棋盘污染',
    '污染格与清洁格交替分布，难度适中。',
    [1, 3, 5, 7, 9, 11, 12, 14, 16, 18, 20, 22, 25, 27, 29, 31, 33, 35, 36, 38, 40, 42, 44, 46, 49, 51, 53, 55, 57, 59, 60, 62, 64, 66, 68, 70, 73, 75, 77, 79, 81, 83, 84, 86, 88, 90, 92, 94],
    { budget: 140, turns: 12, goalScore: 60 }
  ),
  createFacilityTemplate(
    '防守型布局',
    '密集的围护桩防线，配合牡蛎礁净化，适合高风暴概率场景。',
    [
      { index: 24, type: 'pile' }, { index: 25, type: 'pile' }, { index: 26, type: 'pile' },
      { index: 27, type: 'pile' }, { index: 28, type: 'pile' }, { index: 29, type: 'pile' },
      { index: 30, type: 'pile' }, { index: 31, type: 'pile' },
      { index: 40, type: 'oyster' }, { index: 42, type: 'oyster' }, { index: 44, type: 'oyster' },
      { index: 46, type: 'oyster' }, { index: 50, type: 'oyster' }, { index: 52, type: 'oyster' },
      { index: 54, type: 'oyster' }, { index: 56, type: 'oyster' },
      { index: 64, type: 'grass' }, { index: 66, type: 'grass' }, { index: 68, type: 'grass' },
      { index: 70, type: 'grass' }, { index: 74, type: 'grass' }, { index: 76, type: 'grass' }
    ],
    [3, 7, 15, 19, 83, 87, 91, 95],
    { budget: 180, stormChance: 0.35, turns: 12, goalScore: 60 }
  ),
  createFacilityTemplate(
    '均衡型布局',
    '三类设施均衡分布，兼顾净化、多样性和防波能力。',
    [
      { index: 25, type: 'oyster' }, { index: 28, type: 'grass' }, { index: 31, type: 'pile' },
      { index: 37, type: 'grass' }, { index: 40, type: 'pile' }, { index: 43, type: 'oyster' },
      { index: 49, type: 'pile' }, { index: 52, type: 'oyster' }, { index: 55, type: 'grass' },
      { index: 61, type: 'oyster' }, { index: 64, type: 'grass' }, { index: 67, type: 'pile' },
      { index: 73, type: 'grass' }, { index: 76, type: 'pile' }, { index: 79, type: 'oyster' }
    ],
    [4, 14, 24, 71, 81, 91],
    { budget: 160, turns: 10, goalScore: 55 }
  ),
  createFacilityTemplate(
    '进攻型布局',
    '大量牡蛎礁主攻污染净化，海草床提升多样性，适合预算充裕场景。',
    [
      { index: 25, type: 'oyster' }, { index: 27, type: 'oyster' }, { index: 29, type: 'oyster' },
      { index: 37, type: 'oyster' }, { index: 39, type: 'oyster' }, { index: 41, type: 'oyster' },
      { index: 49, type: 'oyster' }, { index: 51, type: 'oyster' }, { index: 53, type: 'oyster' },
      { index: 61, type: 'oyster' }, { index: 63, type: 'oyster' }, { index: 65, type: 'oyster' },
      { index: 26, type: 'grass' }, { index: 28, type: 'grass' }, { index: 30, type: 'grass' },
      { index: 38, type: 'grass' }, { index: 40, type: 'grass' }, { index: 42, type: 'grass' },
      { index: 50, type: 'grass' }, { index: 52, type: 'grass' }, { index: 54, type: 'grass' },
      { index: 62, type: 'grass' }, { index: 64, type: 'grass' }, { index: 66, type: 'grass' },
      { index: 36, type: 'pile' }, { index: 48, type: 'pile' }, { index: 60, type: 'pile' }, { index: 72, type: 'pile' }
    ],
    [2, 6, 10, 18, 22, 73, 77, 85, 89, 93],
    { budget: 250, stormChance: 0.15, turns: 10, goalScore: 70 }
  ),
  createFacilityTemplate(
    '新手入门',
    '预设基础设施布局，适合新手快速上手。污染较少，预算充裕。',
    [
      { index: 40, type: 'oyster' }, { index: 43, type: 'oyster' }, { index: 46, type: 'oyster' },
      { index: 50, type: 'grass' }, { index: 53, type: 'grass' }, { index: 56, type: 'grass' },
      { index: 62, type: 'pile' }, { index: 65, type: 'pile' }
    ],
    [23, 35, 47, 71],
    { budget: 180, turns: 10, stormChance: 0.15, goalScore: 50 }
  ),
  createFacilityTemplate(
    '风暴前线复刻',
    '复刻"风暴前线"场景的初始布局，高风暴概率下的经典配置。',
    [
      { index: 16, type: 'pile' }, { index: 28, type: 'pile' }, { index: 40, type: 'pile' },
      { index: 52, type: 'pile' }, { index: 64, type: 'pile' }, { index: 76, type: 'pile' },
      { index: 19, type: 'oyster' }, { index: 31, type: 'oyster' }, { index: 43, type: 'oyster' },
      { index: 55, type: 'oyster' }, { index: 67, type: 'oyster' },
      { index: 22, type: 'grass' }, { index: 34, type: 'grass' }, { index: 46, type: 'grass' },
      { index: 58, type: 'grass' }, { index: 70, type: 'grass' }
    ],
    [7, 19, 35, 50, 68, 82],
    { budget: 180, turns: 10, stormChance: 0.45, goalScore: 50 }
  )
];

export function getTemplatesByCategory(category) {
  return templates.filter(t => t.category === category);
}

export function getAllTemplates() {
  return [...templates];
}

export function getTemplateById(id) {
  return templates.find(t => t.id === id);
}

export function applyTemplateToEditor(editorState, template) {
  editorState.cells = template.cells.map(c => ({ ...c }));
  editorState.params = {
    name: template.params.name || '',
    desc: template.params.desc || '',
    budget: template.params.budget,
    water: template.params.water != null ? template.params.water : 50,
    larvae: template.params.larvae != null ? template.params.larvae : 20,
    bio: template.params.bio != null ? template.params.bio : 20,
    turns: template.params.turns,
    stormChance: template.params.stormChance,
    goalScore: template.params.goalScore,
    goalPollutionMax: template.params.goalPollutionMax != null ? template.params.goalPollutionMax : null,
    goalMinStats: template.params.goalMinStats != null ? template.params.goalMinStats : null,
    seed: template.params.seed != null ? template.params.seed : null
  };
  editorState.editTool = 'pollute';
}

export function validateTemplate(template) {
  const errors = [];
  if (!template.cells || template.cells.length !== GRID_SIZE) {
    errors.push(`模板单元格数量错误：期望 ${GRID_SIZE}。`);
  }
  if (!template.params) {
    errors.push('模板缺少参数配置。');
  }
  return errors;
}
