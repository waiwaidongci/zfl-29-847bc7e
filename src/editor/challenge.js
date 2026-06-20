import { GRID_SIZE, COSTS as FALLBACK_COSTS, SANDBOX_SCENE_ID } from '../game/constants.js';
import { addScene } from '../data/scenes.js';
import { createRulesContext, getFacilityCost } from '../game/rules-engine.js';

function getTempRulesForDecoded(decoded) {
  if (decoded && decoded.rules) {
    return createRulesContext(decoded.rules);
  }
  return null;
}

function calcFacilityCostForDecoded(decoded, facilities) {
  const rules = getTempRulesForDecoded(decoded);
  if (rules) {
    return facilities.reduce((sum, c) => sum + getFacilityCost(rules, c.type), 0);
  }
  return facilities.reduce((sum, c) => sum + FALLBACK_COSTS[c.type], 0);
}

const CODE_PREFIX_V1 = 'ZC1:';
const CODE_PREFIX_V2 = 'ZC2:';
const CELL_CODE_MAP = {
  'empty,false': 0,
  'empty,true': 1,
  'oyster,false': 2,
  'oyster,true': 3,
  'grass,false': 4,
  'grass,true': 5,
  'pile,false': 6,
  'pile,true': 7,
  'buffer,false': 8,
  'buffer,true': 9
};
const CELL_CODE_REVERSE = [
  { type: 'empty', polluted: false },
  { type: 'empty', polluted: true },
  { type: 'oyster', polluted: false },
  { type: 'oyster', polluted: true },
  { type: 'grass', polluted: false },
  { type: 'grass', polluted: true },
  { type: 'pile', polluted: false },
  { type: 'pile', polluted: true },
  { type: 'buffer', polluted: false },
  { type: 'buffer', polluted: true }
];

function base64UrlEncode(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (e) {
    throw new Error('挑战码格式错误：Base64 解码失败。');
  }
}

function encodeCells(cells) {
  if (cells.length !== GRID_SIZE) {
    throw new Error(`单元格数量错误：期望 ${GRID_SIZE}，实际 ${cells.length}。`);
  }
  let s = '';
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const key = `${c.type},${c.polluted}`;
    const code = CELL_CODE_MAP[key];
    if (code === undefined) {
      throw new Error(`第 ${i} 格存在未知类型：${c.type}。`);
    }
    s += code;
  }
  return s;
}

function decodeCells(cellsStr) {
  if (cellsStr.length !== GRID_SIZE) {
    throw new Error(`单元格编码长度错误：期望 ${GRID_SIZE} 位，实际 ${cellsStr.length} 位。`);
  }
  const cells = [];
  for (let i = 0; i < cellsStr.length; i++) {
    const ch = cellsStr[i];
    const code = parseInt(ch, 10);
    if (isNaN(code) || code < 0 || code > 9) {
      throw new Error(`第 ${i} 位单元格编码无效："${ch}"。`);
    }
    cells.push({ ...CELL_CODE_REVERSE[code] });
  }
  return cells;
}

export function generateChallengeCode(editorState) {
  const cellsStr = encodeCells(editorState.cells);
  const params = editorState.params;
  const payload = {
    v: 2,
    n: params.name || '',
    d: params.desc || '',
    b: params.budget,
    w: params.water,
    l: params.larvae,
    i: params.bio,
    t: params.turns,
    s: params.stormChance,
    g: params.goalScore,
    c: cellsStr
  };
  if (params.goalPollutionMax != null) {
    payload.gp = params.goalPollutionMax;
  }
  if (params.goalMinStats != null) {
    payload.gm = params.goalMinStats;
  }
  if (params.seed != null) {
    payload.r = params.seed;
  }
  if (editorState.rules != null) {
    payload.ru = editorState.rules;
  }
  const json = JSON.stringify(payload);
  const encoded = base64UrlEncode(json);
  return CODE_PREFIX_V2 + encoded;
}

function validateNumber(val, name, min, max, allowFloat = false) {
  if (val === undefined || val === null) {
    throw new Error(`缺少字段：${name}。`);
  }
  const n = Number(val);
  if (isNaN(n)) {
    throw new Error(`${name} 不是有效数字。`);
  }
  if (!allowFloat && !Number.isInteger(n)) {
    throw new Error(`${name} 必须是整数。`);
  }
  if (n < min || n > max) {
    throw new Error(`${name} 超出合理范围（${min} - ${max}）。`);
  }
  return n;
}

function validateOptionalNumber(val, name, min, max, allowFloat = false) {
  if (val === undefined || val === null) return null;
  const n = Number(val);
  if (isNaN(n)) {
    throw new Error(`${name} 不是有效数字。`);
  }
  if (!allowFloat && !Number.isInteger(n)) {
    throw new Error(`${name} 必须是整数。`);
  }
  if (n < min || n > max) {
    throw new Error(`${name} 超出合理范围（${min} - ${max}）。`);
  }
  return n;
}

function parsePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('挑战码内容损坏：不是有效对象。');
  }

  const version = payload.v;

  if (version === 1) {
    return parseV1Payload(payload);
  }

  if (version === 2) {
    return parseV2Payload(payload);
  }

  throw new Error(`不支持的挑战码版本：${version}。当前支持版本：1、2。`);
}

function parseV1Payload(payload) {
  const budget = validateNumber(payload.b, '初始预算', 0, 10000);
  const turns = validateNumber(payload.t, '回合上限', 1, 30);
  const stormChance = validateNumber(payload.s, '风暴概率', 0, 1, true);
  const goalScore = validateNumber(payload.g, '目标评分', 0, 10000);

  if (typeof payload.c !== 'string') {
    throw new Error('单元格编码格式错误：缺少单元格数据。');
  }
  const cells = decodeCells(payload.c);

  return {
    version: 1,
    params: {
      name: '',
      desc: '',
      budget,
      water: 50,
      larvae: 20,
      bio: 20,
      turns,
      stormChance,
      goalScore,
      goalPollutionMax: null,
      goalMinStats: null,
      seed: null
    },
    cells
  };
}

function parseV2Payload(payload) {
  const name = typeof payload.n === 'string' ? payload.n : '';
  const desc = typeof payload.d === 'string' ? payload.d : '';
  const budget = validateNumber(payload.b, '初始预算', 0, 10000);
  const water = validateNumber(payload.w, '初始水质', 0, 100);
  const larvae = validateNumber(payload.l, '初始幼体', 0, 100);
  const bio = validateNumber(payload.i, '初始多样性', 0, 100);
  const turns = validateNumber(payload.t, '回合上限', 1, 30);
  const stormChance = validateNumber(payload.s, '风暴概率', 0, 1, true);
  const goalScore = validateNumber(payload.g, '目标评分', 0, 10000);
  const goalPollutionMax = validateOptionalNumber(payload.gp, '污染上限', 0, GRID_SIZE);
  const goalMinStats = validateOptionalNumber(payload.gm, '最低指标', 0, 100);
  const seed = validateOptionalNumber(payload.r, '随机种子', 0, 2147483647);
  const rules = payload.ru != null && typeof payload.ru === 'object' ? payload.ru : null;

  if (typeof payload.c !== 'string') {
    throw new Error('单元格编码格式错误：缺少单元格数据。');
  }
  const cells = decodeCells(payload.c);

  return {
    version: 2,
    params: {
      name,
      desc,
      budget,
      water,
      larvae,
      bio,
      turns,
      stormChance,
      goalScore,
      goalPollutionMax,
      goalMinStats,
      seed
    },
    cells,
    rules
  };
}

export function parseChallengeCode(code) {
  if (!code || typeof code !== 'string') {
    throw new Error('挑战码为空，请输入一段挑战码。');
  }

  const trimmed = code.trim();

  let prefix;
  if (trimmed.startsWith(CODE_PREFIX_V2)) {
    prefix = CODE_PREFIX_V2;
  } else if (trimmed.startsWith(CODE_PREFIX_V1)) {
    prefix = CODE_PREFIX_V1;
  } else {
    throw new Error(`挑战码格式错误：应以 "${CODE_PREFIX_V1}" 或 "${CODE_PREFIX_V2}" 开头，请确认是否复制完整。`);
  }

  const b64part = trimmed.slice(prefix.length);
  if (b64part.length === 0) {
    throw new Error('挑战码内容为空。');
  }

  const json = base64UrlDecode(b64part);
  let payload;
  try {
    payload = JSON.parse(json);
  } catch (e) {
    throw new Error('挑战码内容损坏：JSON 解析失败，请确认挑战码是否完整。');
  }

  return parsePayload(payload);
}

export function validateChallengeConfig(decoded) {
  const errors = [];
  const { params, cells } = decoded;

  const repairableCount = cells.filter(c => !c.polluted).length;
  if (repairableCount === 0) {
    errors.push('没有可修复区域：所有格子都被设置为污染。');
  }

  if (params.budget <= 0) {
    errors.push('初始预算为0或负数，无法放置任何设施。');
  }

  const initialFacilities = cells.filter(c => c.type !== 'empty');
  const facilityCost = calcFacilityCostForDecoded(decoded, initialFacilities);
  if (facilityCost > params.budget) {
    errors.push(`初始设施花费(${facilityCost})超过初始预算(${params.budget})，挑战无法开始。`);
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

  if (params.goalPollutionMax != null && (params.goalPollutionMax < 0 || params.goalPollutionMax > GRID_SIZE)) {
    errors.push(`污染上限超出范围（0 - ${GRID_SIZE}）。`);
  }

  if (params.goalMinStats != null && (params.goalMinStats < 0 || params.goalMinStats > 100)) {
    errors.push('最低指标要求超出范围（0 - 100）。');
  }

  return errors;
}

export function buildChallengeScene(decoded) {
  const cells = decoded.cells;
  const params = decoded.params;
  const pollutionIndices = cells
    .map((c, i) => (c.polluted ? i : -1))
    .filter(i => i >= 0);

  const initialFacilities = cells.filter(c => c.type !== 'empty');
  const facilityCost = calcFacilityCostForDecoded(decoded, initialFacilities);

  const goalParts = [`生态评分 ≥ ${params.goalScore}`];
  if (params.goalPollutionMax != null) {
    goalParts.push(`污染 ≤ ${params.goalPollutionMax}格`);
  }
  if (params.goalMinStats != null) {
    goalParts.push(`所有指标 ≥ ${params.goalMinStats}`);
  }
  const goalDesc = goalParts.join(' 且 ');

  const scene = {
    id: SANDBOX_SCENE_ID,
    name: params.name || '挑战码场景',
    desc: params.desc || '通过分享挑战码加载的自定义修复挑战。',
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
    tags: ['挑战码', '分享'],
    winText: '挑战成功！你完成了这段挑战码对应的修复任务。',
    loseText: '挑战失败，再接再厉，调整策略后重试吧！',
    initialCells: cells.map(c => ({ type: c.type, polluted: c.polluted })),
    fromChallenge: true,
    rules: decoded.rules || null
  };

  if (params.seed != null) {
    scene.seed = params.seed;
  }

  addScene(SANDBOX_SCENE_ID, scene);
  return scene;
}

export function applyDecodedToEditor(editorState, decoded) {
  editorState.cells = decoded.cells.map(c => ({ ...c }));
  editorState.params = {
    name: decoded.params.name || '',
    desc: decoded.params.desc || '',
    budget: decoded.params.budget,
    water: decoded.params.water,
    larvae: decoded.params.larvae,
    bio: decoded.params.bio,
    turns: decoded.params.turns,
    stormChance: decoded.params.stormChance,
    goalScore: decoded.params.goalScore,
    goalPollutionMax: decoded.params.goalPollutionMax,
    goalMinStats: decoded.params.goalMinStats,
    seed: decoded.params.seed
  };
  editorState.rules = decoded.rules || null;
  editorState.editTool = 'pollute';
}
