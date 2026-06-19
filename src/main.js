import './styles/main.css';
import { DEFAULT_SCENE_ID, SANDBOX_EDITOR_ID, SANDBOX_SCENE_ID } from './game/constants.js';
import { getScene } from './data/scenes.js';
import { createGameState, placeFacility } from './game/state.js';
import { advanceTurn } from './game/tide.js';
import { loadCodexState, onUnlock } from './game/codex.js';
import { showCodex, updateCodexButton } from './ui/codex.js';
import {
  renderGrid,
  renderStats,
  renderLog,
  renderToolButtons
} from './renderer/board.js';
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
  renderSceneList,
  showSceneSelect,
  showResult,
  updateSceneInfo,
  showEditor as showEditorModal,
  hideEditor as hideEditorModal,
  hideOverlay
} from './ui/modals.js';

const gridEl = document.querySelector('#grid');
const logEl = document.querySelector('#log');
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

let currentSceneId = DEFAULT_SCENE_ID;
let selectedSceneId = DEFAULT_SCENE_ID;
let currentTool = 'oyster';
let game = null;
let editorState = createEditorState();

function fullRender() {
  const scene = getScene(currentSceneId);
  renderGrid(gridEl, game.cells, i => handlePlace(i));
  renderStats(game, scene);
  renderLog(logEl, game.log);
  renderToolButtons(currentTool);
}

function handlePlace(index) {
  if (placeFacility(game, index, currentTool)) {
    fullRender();
  }
}

function startNewGame(sceneId) {
  currentSceneId = sceneId;
  const scene = getScene(sceneId);
  game = createGameState(scene);
  updateSceneInfo(sceneInfoEl, scene.name);
  hideOverlay(overlay);
  fullRender();
}

function handleNextTurn() {
  if (game.ended) return;
  const scene = getScene(currentSceneId);
  const result = advanceTurn(game, scene);

  if (result.ended) {
    showResult(resultTitle, resultText, overlay, result.title, result.text);
  }

  fullRender();
}

function handleToolSelect(tool) {
  currentTool = tool;
  renderToolButtons(currentTool);
}

function openSceneSelect() {
  selectedSceneId = currentSceneId;
  renderSceneList(sceneListEl, selectedSceneId, id => {
    selectedSceneId = id;
    renderSceneList(sceneListEl, selectedSceneId, handleSceneSelect);
  });
  showSceneSelect(sceneOverlay, overlay);
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

  document.querySelector('#nextBtn').onclick = handleNextTurn;
  document.querySelector('#restartBtn').onclick = () => startNewGame(currentSceneId);
  document.querySelector('#againBtn').onclick = () => startNewGame(currentSceneId);
  document.querySelector('#switchSceneBtn').onclick = openSceneSelect;
  document.querySelector('#startSceneBtn').onclick = handleStartScene;
  document.querySelector('#editorCancelBtn').onclick = closeSandboxEditor;
  document.querySelector('#editorSaveBtn').onclick = saveAndStartSandbox;
  codexBtn.onclick = () => showCodex(codexOverlay);
}

function init() {
  loadCodexState();
  onUnlock(() => updateCodexButton(codexBtn));
  updateCodexButton(codexBtn);
  bindGlobalEvents();
  const defaultScene = getScene(DEFAULT_SCENE_ID);
  updateSceneInfo(sceneInfoEl, defaultScene.name);
  openSceneSelect();
}

init();
