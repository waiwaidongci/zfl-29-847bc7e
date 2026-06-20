import { SANDBOX_EDITOR_ID, DEFAULT_SCENE_ID } from '../game/constants.js';
import { getScene } from '../data/scenes.js';
import { createGameState } from '../game/state.js';
import { getTodayDailyChallenge, getDateStr } from '../game/daily-challenge.js';
import {
  renderSceneList,
  showSceneSelect,
  showDailyChallengeInfo,
  updateSceneInfo,
  hideOverlay
} from '../ui/modals.js';
import { clearHighlights as clearAdvisorHighlights } from '../ui/advisor.js';
import dom from '../ui/dom.js';
import {
  getCurrentSceneId,
  setCurrentSceneId,
  getSelectedSceneId,
  setSelectedSceneId,
  setHighlightedCells,
  setLastEventCount,
  setCurrentDailyChallenge,
  setCurrentDailyChallengeDate
} from '../app-state.js';
import { setGame, fullRender, startNewGame } from './game-controller.js';
import { clearChallengeImportState } from './challenge-controller.js';

let onOpenSandboxEditorCallback = null;

export function setOnOpenSandboxEditor(callback) {
  onOpenSandboxEditorCallback = callback;
}

export function openSceneSelect() {
  setSelectedSceneId(getCurrentSceneId());
  clearChallengeImportState();
  if (dom.seedInputEl) dom.seedInputEl.value = '';
  renderSceneList(dom.sceneListEl, getSelectedSceneId(), id => {
    setSelectedSceneId(id);
    renderSceneList(dom.sceneListEl, getSelectedSceneId(), handleSceneSelect, handleDailySelect);
  }, handleDailySelect);
  showSceneSelect(dom.sceneOverlay, dom.overlay);
}

export function handleDailySelect() {
  hideOverlay(dom.sceneOverlay);
  openDailyChallenge(() => openSceneSelect());
}

export function openDailyChallenge(onCloseFallback) {
  showDailyChallengeInfo(dom.dailyInfoOverlay, () => {
    const todayStr = getDateStr();
    hideOverlay(dom.dailyInfoOverlay);
    startDailyChallenge(todayStr);
  }, () => {
    hideOverlay(dom.dailyInfoOverlay);
    if (onCloseFallback) onCloseFallback();
  });
}

export function startDailyChallenge(dateStr) {
  const challenge = getTodayDailyChallenge();
  if (!challenge) return;

  setCurrentSceneId(challenge.id);
  setCurrentDailyChallengeDate(dateStr);
  setCurrentDailyChallenge(challenge);

  const game = createGameState(challenge, { seed: challenge.seed });
  game.gameMode = 'daily';
  game.dailyDate = dateStr;
  setGame(game);
  setLastEventCount(game.replay.events.length);

  hideOverlay(dom.sceneOverlay);
  hideOverlay(dom.dailyInfoOverlay);
  hideOverlay(dom.overlay);
  updateSceneInfo(dom.sceneInfoEl, challenge.name);
  clearAdvisorHighlights();
  setHighlightedCells([]);
  fullRender();
}

export function handleSceneSelect(sceneId) {
  if (sceneId === SANDBOX_EDITOR_ID) {
    if (onOpenSandboxEditorCallback) {
      onOpenSandboxEditorCallback();
    }
    return;
  }
  startGameWithScene(sceneId);
}

export function handleStartScene() {
  if (getSelectedSceneId() === SANDBOX_EDITOR_ID) {
    if (onOpenSandboxEditorCallback) {
      onOpenSandboxEditorCallback();
    }
    return;
  }
  startGameWithScene(getSelectedSceneId());
}

export function startGameWithScene(sceneId) {
  if (sceneId === SANDBOX_EDITOR_ID) {
    if (onOpenSandboxEditorCallback) {
      onOpenSandboxEditorCallback();
    }
    return;
  }
  startNewGame(sceneId);
  hideOverlay(dom.sceneOverlay);
}
