import './styles/main.css';
import { DEFAULT_SCENE_ID, SANDBOX_EDITOR_ID, SANDBOX_SCENE_ID } from './game/constants.js';
import { getScene } from './data/scenes.js';
import { createGameState, placeFacility } from './game/state.js';
import { advanceTurn } from './game/tide.js';
import { loadCodexState, onUnlock } from './game/codex.js';
import { showCodex, updateCodexButton } from './ui/codex.js';
import {
  loadAchievementsState,
  onAchievementUnlock,
  recordPlaceFacility,
  recordCleanPollution,
  recordStormSurvived,
  checkGameEndAchievements,
  checkCumulativeAchievements
} from './game/achievements.js';
import {
  showAchievements,
  updateAchievementsButton,
  showAchievementToast,
  onAchievementsReset
} from './ui/achievements.js';
import {
  renderGrid,
  renderStats,
  renderLog,
  renderToolButtons,
  renderGridWithHighlights
} from './renderer/board.js';
import { generateAdvice } from './game/advisor.js';
import {
  renderAdvisor,
  setHighlightCallback,
  setApplySuggestionCallback,
  clearHighlights
} from './ui/advisor.js';
import {
  createEditorState,
  resetEditorState,
  renderEditorGrid,
  renderEditorTools,
  handleEditorClick,
  handleEditorHover,
  updateEditorPreview,
  validateEditorConfig,
  showEditorError,
  clearEditorError,
  buildSandboxScene,
  readParamsFromDOM,
  writeParamsToDOM
} from './editor/sandbox.js';
import {
  generateChallengeCode,
  parseChallengeCode,
  validateChallengeConfig,
  buildChallengeScene,
  applyDecodedToEditor
} from './editor/challenge.js';
import { COSTS } from './game/constants.js';
import { seedFromString } from './game/seeded-random.js';
import {
  loadLeaderboardState,
  addEntry,
  getCategoryStats
} from './game/leaderboard.js';
import {
  showLeaderboard,
  hideLeaderboard,
  updateLeaderboardButton
} from './ui/leaderboard.js';
import {
  renderSceneList,
  showSceneSelect,
  showResult,
  updateSceneInfo,
  showEditor as showEditorModal,
  hideEditor as hideEditorModal,
  hideOverlay,
  bindResultTabSwitcher,
  renderReplayView
} from './ui/modals.js';

const gridEl = document.querySelector('#grid');
const logEl = document.querySelector('#log');
const advisorEl = document.querySelector('#advisor');
const overlay = document.querySelector('#overlay');
const sceneOverlay = document.querySelector('#sceneOverlay');
const sceneListEl = document.querySelector('#sceneList');
const sceneInfoEl = document.querySelector('#sceneInfo');
const resultTitle = document.querySelector('#resultTitle');
const resultText = document.querySelector('#resultText');
const editorOverlay = document.querySelector('#editorOverlay');
const editorGridEl = document.querySelector('#editorGrid');
const editorToolsEl = document.querySelector('#editorTools');
const editorErrorEl = document.querySelector('#editorError');
const codexOverlay = document.querySelector('#codexOverlay');
const codexBtn = document.querySelector('#codexBtn');
const achievementsBtn = document.querySelector('#achievementsBtn');
const achievementsOverlay = document.querySelector('#achievementsOverlay');
const challengeInput = document.querySelector('#challengeInput');
const challengeLoadBtn = document.querySelector('#challengeLoadBtn');
const challengeStartBtn = document.querySelector('#challengeStartBtn');
const challengeErrorEl = document.querySelector('#challengeError');
const challengePreviewEl = document.querySelector('#challengePreview');
const challengeOutput = document.querySelector('#challengeOutput');
const challengeGenBtn = document.querySelector('#challengeGenBtn');
const challengeCopyBtn = document.querySelector('#challengeCopyBtn');
const challengeGenErrorEl = document.querySelector('#challengeGenError');
const leaderboardOverlay = document.querySelector('#leaderboardOverlay');
const leaderboardBtn = document.querySelector('#leaderboardBtn');
const seedInputEl = document.querySelector('#seedInput');
const seedTextEl = document.querySelector('#seedText');

let highlightedCells = [];
let currentAdvice = null;

let currentSceneId = DEFAULT_SCENE_ID;
let selectedSceneId = DEFAULT_SCENE_ID;
let currentTool = 'oyster';
let game = null;
let editorState = createEditorState();
let parsedChallenge = null;
let lastEventCount = 0;

function fullRender() {
  const scene = getScene(currentSceneId);
  if (highlightedCells.length > 0) {
    renderGridWithHighlights(gridEl, game.cells, highlightedCells, i => handlePlace(i));
  } else {
    renderGrid(gridEl, game.cells, i => handlePlace(i));
  }
  renderStats(game, scene);
  seedTextEl.textContent = game.seedStr;
  renderLog(logEl, game.log);
  renderToolButtons(currentTool);
  updateAdvisor();
}

function updateAdvisor() {
  if (!game || game.ended) {
    renderAdvisor(advisorEl, null, game);
    return;
  }
  const scene = getScene(currentSceneId);
  currentAdvice = generateAdvice(game, scene);
  renderAdvisor(advisorEl, currentAdvice, game);
}

function handlePlace(index) {
  if (placeFacility(game, index, currentTool)) {
    if (currentTool !== 'erase') {
      recordPlaceFacility(currentTool);
      checkCumulativeAchievements(currentSceneId);
      updateAchievementsButton(achievementsBtn);
    }
    clearHighlights();
    highlightedCells = [];
    fullRender();
  }
}

function handleHighlight(cells, suggestion) {
  highlightedCells = cells || [];
  const scene = getScene(currentSceneId);
  if (highlightedCells.length > 0) {
    renderGridWithHighlights(gridEl, game.cells, highlightedCells, i => handlePlace(i));
  } else {
    renderGrid(gridEl, game.cells, i => handlePlace(i));
  }
}

function handleApplySuggestion(suggestion) {
  if (suggestion === 'refresh') {
    updateAdvisor();
    return;
  }
  
  if (!suggestion || !suggestion.targetIndices && !suggestion.targetIndex) return;
  
  const targetIndices = suggestion.targetIndices || [suggestion.targetIndex];
  const tool = suggestion.type;
  const toolCost = COSTS[tool];
  
  let anyPlaced = false;
  for (const index of targetIndices) {
    if (game.budget >= toolCost) {
      if (placeFacility(game, index, tool)) {
        recordPlaceFacility(tool);
        anyPlaced = true;
      }
    }
  }
  
  if (anyPlaced) {
    checkCumulativeAchievements(currentSceneId);
    updateAchievementsButton(achievementsBtn);
    clearHighlights();
    highlightedCells = [];
    fullRender();
  }
}

function startNewGame(sceneId) {
  currentSceneId = sceneId;
  const scene = getScene(sceneId);

  let seed = undefined;
  if (seedInputEl && seedInputEl.value.trim()) {
    const parsed = seedFromString(seedInputEl.value.trim());
    if (parsed !== null) {
      seed = parsed;
    }
  }
  if (seedInputEl) seedInputEl.value = '';

  game = createGameState(scene, { seed });
  lastEventCount = game.replay.events.length;
  updateSceneInfo(sceneInfoEl, scene.name);
  hideOverlay(overlay);
  clearHighlights();
  highlightedCells = [];
  fullRender();
}

function handleNextTurn() {
  if (game.ended) return;
  clearHighlights();
  highlightedCells = [];
  const scene = getScene(currentSceneId);
  const result = advanceTurn(game, scene);

  const newEvents = game.replay.events.slice(lastEventCount);
  for (const ev of newEvents) {
    if (ev.type === 'storm' && ev.data && !ev.data.damaged) {
      recordStormSurvived();
    }
    if (ev.type === 'oyster_clean' && ev.data && ev.data.count) {
      recordCleanPollution(ev.data.count);
    }
  }
  lastEventCount = game.replay.events.length;
  checkCumulativeAchievements(currentSceneId);
  updateAchievementsButton(achievementsBtn);

  if (result.ended) {
    const newlyUnlocked = checkGameEndAchievements(game, scene, result.win, result.score);
    if (newlyUnlocked.length > 0) {
      updateAchievementsButton(achievementsBtn);
    }
    recordToLeaderboard(game, scene, result);
    showResult(resultTitle, resultText, overlay, result.title, result.text);
    renderReplayView(game);
  }

  fullRender();
}

function handleToolSelect(tool) {
  currentTool = tool;
  renderToolButtons(currentTool);
}

function recordToLeaderboard(game, scene, result) {
  const facilityCount = game.cells.filter(c => c.type !== 'empty').length;
  const pollution = game.cells.filter(c => c.polluted).length;
  const duration = game.startTime ? Date.now() - game.startTime : null;

  addEntry({
    sceneId: scene.id,
    sceneName: scene.name,
    seed: game.seed,
    seedStr: game.seedStr,
    gameMode: game.gameMode,
    score: result.score,
    win: result.win,
    budget: game.budget,
    pollution,
    facilityCount,
    duration
  });

  updateLeaderboardButton(leaderboardBtn);
}

function handleSeedClick() {
  if (!game || !game.seedStr) return;
  const seedStr = game.seedStr;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(seedStr).catch(() => {});
  }
  seedTextEl.textContent = '已复制!';
  setTimeout(() => {
    seedTextEl.textContent = game.seedStr;
  }, 1200);
}

function openSceneSelect() {
  selectedSceneId = currentSceneId;
  parsedChallenge = null;
  challengeInput.value = '';
  if (seedInputEl) seedInputEl.value = '';
  challengePreviewEl.textContent = '解析成功后，此处将显示挑战配置预览。';
  challengePreviewEl.classList.add('empty');
  clearChallengeError();
  challengeStartBtn.disabled = true;
  challengeStartBtn.style.opacity = '0.5';
  challengeStartBtn.style.cursor = 'not-allowed';
  renderSceneList(sceneListEl, selectedSceneId, id => {
    selectedSceneId = id;
    renderSceneList(sceneListEl, selectedSceneId, handleSceneSelect);
  });
  showSceneSelect(sceneOverlay, overlay);
}

function clearChallengeError() {
  challengeErrorEl.textContent = '';
  challengeErrorEl.classList.remove('show');
}

function showChallengeError(message) {
  challengeErrorEl.textContent = message;
  challengeErrorEl.classList.add('show');
}

function clearChallengeGenError() {
  challengeGenErrorEl.textContent = '';
  challengeGenErrorEl.classList.remove('show');
}

function showChallengeGenError(message) {
  challengeGenErrorEl.textContent = message;
  challengeGenErrorEl.classList.add('show');
}

function formatChallengePreview(decoded) {
  const pollutionCount = decoded.cells.filter(c => c.polluted).length;
  const facilities = decoded.cells.filter(c => c.type !== 'empty');
  const facilityCount = facilities.length;
  const facilityCost = facilities.reduce((sum, c) => sum + COSTS[c.type], 0);
  const oysterCount = facilities.filter(c => c.type === 'oyster').length;
  const grassCount = facilities.filter(c => c.type === 'grass').length;
  const pileCount = facilities.filter(c => c.type === 'pile').length;
  const remainingBudget = decoded.params.budget - facilityCost;

  const validateErrors = validateChallengeConfig(decoded);
  let statusHtml = '';
  if (validateErrors.length > 0) {
    statusHtml = `<div style="color:#c0392b; margin-top:6px;">⚠️ 警告：${validateErrors.join('；')}</div>`;
  } else {
    statusHtml = `<div style="color:#237070; margin-top:6px;">✅ 配置有效，可以开始挑战。</div>`;
  }

  return `
    <div><strong>预算：</strong>${decoded.params.budget}（初始设施花费 ${facilityCost}，剩余 ${remainingBudget}）</div>
    <div><strong>回合：</strong>${decoded.params.turns} 潮</div>
    <div><strong>风暴概率：</strong>${Math.round(decoded.params.stormChance * 100)}%</div>
    <div><strong>目标评分：</strong>${decoded.params.goalScore}</div>
    <div><strong>污染格：</strong>${pollutionCount} 格</div>
    <div><strong>初始设施：</strong>${facilityCount} 处（牡蛎礁 ${oysterCount} · 海草床 ${grassCount} · 围护桩 ${pileCount}）</div>
    ${statusHtml}
  `;
}

function handleLoadChallenge() {
  clearChallengeError();
  parsedChallenge = null;
  challengeStartBtn.disabled = true;
  challengeStartBtn.style.opacity = '0.5';
  challengeStartBtn.style.cursor = 'not-allowed';

  const code = challengeInput.value;
  if (!code.trim()) {
    showChallengeError('请输入挑战码。');
    challengePreviewEl.textContent = '解析成功后，此处将显示挑战配置预览。';
    challengePreviewEl.classList.add('empty');
    return;
  }

  try {
    const decoded = parseChallengeCode(code);
    parsedChallenge = decoded;

    const validateErrors = validateChallengeConfig(decoded);
    challengePreviewEl.innerHTML = formatChallengePreview(decoded);
    challengePreviewEl.classList.remove('empty');

    if (validateErrors.length === 0) {
      challengeStartBtn.disabled = false;
      challengeStartBtn.style.opacity = '1';
      challengeStartBtn.style.cursor = 'pointer';
    } else {
      showChallengeError(validateErrors.join('\n'));
    }
  } catch (e) {
    showChallengeError(e.message);
    challengePreviewEl.textContent = '解析失败，请检查挑战码是否正确完整。';
    challengePreviewEl.classList.add('empty');
  }
}

function handleStartChallenge() {
  if (!parsedChallenge) {
    showChallengeError('请先成功解析一段挑战码。');
    return;
  }

  const validateErrors = validateChallengeConfig(parsedChallenge);
  if (validateErrors.length > 0) {
    showChallengeError(validateErrors.join('\n'));
    return;
  }

  try {
    buildChallengeScene(parsedChallenge);
    startNewGame(SANDBOX_SCENE_ID);
    hideOverlay(sceneOverlay);
  } catch (e) {
    showChallengeError('启动场景失败：' + e.message);
  }
}

function handleGenerateChallenge() {
  clearChallengeGenError();
  challengeOutput.value = '';

  const params = readParamsFromDOM();
  editorState.params = params;

  const errors = validateEditorConfig(editorState);
  if (errors.length > 0) {
    showChallengeGenError(errors.join('\n'));
    return;
  }

  try {
    const code = generateChallengeCode(editorState);
    challengeOutput.value = code;
  } catch (e) {
    showChallengeGenError('生成失败：' + e.message);
  }
}

function handleCopyChallenge() {
  clearChallengeGenError();
  const code = challengeOutput.value;
  if (!code) {
    showChallengeGenError('请先点击"生成"创建挑战码。');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => {
        const originalText = challengeCopyBtn.textContent;
        challengeCopyBtn.textContent = '已复制 ✓';
        challengeCopyBtn.style.background = '#6eb77a';
        setTimeout(() => {
          challengeCopyBtn.textContent = originalText;
          challengeCopyBtn.style.background = '';
        }, 1500);
      })
      .catch(() => {
        fallbackCopy(code);
      });
  } else {
    fallbackCopy(code);
  }
}

function fallbackCopy(text) {
  challengeOutput.select();
  challengeOutput.setSelectionRange(0, text.length);
  try {
    document.execCommand('copy');
    const originalText = challengeCopyBtn.textContent;
    challengeCopyBtn.textContent = '已复制 ✓';
    challengeCopyBtn.style.background = '#6eb77a';
    setTimeout(() => {
      challengeCopyBtn.textContent = originalText;
      challengeCopyBtn.style.background = '';
    }, 1500);
  } catch (e) {
    showChallengeGenError('复制失败，请手动选中复制。');
  }
  window.getSelection().removeAllRanges();
}

function handleSceneSelect(sceneId) {
  if (sceneId === SANDBOX_EDITOR_ID) {
    openSandboxEditor();
    return;
  }
  startNewGame(sceneId);
  hideOverlay(sceneOverlay);
}

function handleStartScene() {
  if (selectedSceneId === SANDBOX_EDITOR_ID) {
    openSandboxEditor();
    return;
  }
  startGameWithScene(selectedSceneId);
}

function startGameWithScene(sceneId) {
  if (sceneId === SANDBOX_EDITOR_ID) {
    openSandboxEditor();
    return;
  }
  startNewGame(sceneId);
  hideOverlay(sceneOverlay);
}

function openSandboxEditor() {
  resetEditorState(editorState);
  writeParamsToDOM(editorState.params);
  clearEditorError(editorErrorEl);
  clearChallengeGenError();
  challengeOutput.value = '';
  showEditorModal(editorOverlay, sceneOverlay);
  renderEditor();
  bindEditorEvents();
}

function closeSandboxEditor() {
  hideEditorModal(editorOverlay, sceneOverlay);
  selectedSceneId = currentSceneId;
  renderSceneList(sceneListEl, selectedSceneId, handleSceneSelect);
}

function renderEditor() {
  renderEditorGrid(
    editorGridEl,
    editorState.cells,
    i => onEditorCellClick(i),
    (i, enter) => onEditorCellHover(i, enter)
  );
  renderEditorTools(editorToolsEl, editorState.editTool);
  updateEditorPreview()(editorState);
}

function onEditorCellClick(i) {
  const clearedAll = handleEditorClick(editorState, i);
  if (clearedAll) {
    writeParamsToDOM(editorState.params);
    clearEditorError(editorErrorEl);
  }
  renderEditor();
}

function onEditorCellHover(i, enter) {
  handleEditorHover(editorGridEl, i, enter, editorState.editTool);
}

function bindEditorEvents() {
  editorToolsEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      editorState.editTool = btn.dataset.edit;
      if (editorState.editTool === 'clearAll') {
        resetEditorState(editorState);
        writeParamsToDOM(editorState.params);
        clearEditorError(editorErrorEl);
      }
      renderEditor();
    };
  });

  ['paramBudget', 'paramTurns', 'paramStorm', 'paramGoal'].forEach(id => {
    document.querySelector('#' + id).oninput = () => {
      const params = readParamsFromDOM();
      editorState.params = params;
      updateEditorPreview()(editorState);
      clearEditorError(editorErrorEl);
    };
  });
}

function saveAndStartSandbox() {
  const params = readParamsFromDOM();
  editorState.params = params;

  const errors = validateEditorConfig(editorState);
  if (errors.length > 0) {
    showEditorError(editorErrorEl, errors.join('\n'));
    return;
  }

  clearEditorError(editorErrorEl);
  buildSandboxScene(editorState);
  startNewGame(SANDBOX_SCENE_ID);
  hideOverlay(editorOverlay);
}

function bindGlobalEvents() {
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.onclick = () => handleToolSelect(btn.dataset.tool);
  });

  bindResultTabSwitcher();

  document.querySelector('#nextBtn').onclick = handleNextTurn;
  document.querySelector('#restartBtn').onclick = () => startNewGame(currentSceneId);
  document.querySelector('#againBtn').onclick = () => startNewGame(currentSceneId);
  document.querySelector('#switchSceneBtn').onclick = openSceneSelect;
  document.querySelector('#startSceneBtn').onclick = handleStartScene;
  document.querySelector('#editorCancelBtn').onclick = closeSandboxEditor;
  document.querySelector('#editorSaveBtn').onclick = saveAndStartSandbox;
  codexBtn.onclick = () => showCodex(codexOverlay);
  achievementsBtn.onclick = () => showAchievements(achievementsOverlay);
  leaderboardBtn.onclick = () => showLeaderboard(leaderboardOverlay);
  seedTextEl.onclick = handleSeedClick;

  challengeLoadBtn.onclick = handleLoadChallenge;
  challengeStartBtn.onclick = handleStartChallenge;
  challengeStartBtn.disabled = true;
  challengeStartBtn.style.opacity = '0.5';
  challengeStartBtn.style.cursor = 'not-allowed';
  challengeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLoadChallenge();
  });

  challengeGenBtn.onclick = handleGenerateChallenge;
  challengeCopyBtn.onclick = handleCopyChallenge;
}

function init() {
  loadCodexState();
  onUnlock(() => updateCodexButton(codexBtn));
  updateCodexButton(codexBtn);

  loadAchievementsState();
  onAchievementUnlock((achievement, info) => {
    showAchievementToast(achievement, info);
    updateAchievementsButton(achievementsBtn);
  });
  onAchievementsReset(() => {
    updateAchievementsButton(achievementsBtn);
  });
  updateAchievementsButton(achievementsBtn);

  loadLeaderboardState();
  updateLeaderboardButton(leaderboardBtn);

  setHighlightCallback(handleHighlight);
  setApplySuggestionCallback(handleApplySuggestion);

  bindGlobalEvents();
  const defaultScene = getScene(DEFAULT_SCENE_ID);
  updateSceneInfo(sceneInfoEl, defaultScene.name);
  openSceneSelect();
}

init();
