import './styles/main.css';
import { DEFAULT_SCENE_ID } from './game/constants.js';
import { getScene } from './data/scenes.js';

import { loadCodexState, onUnlock } from './game/codex.js';
import { showCodex, updateCodexButton } from './ui/codex.js';

import {
  loadAchievementsState,
  onAchievementUnlock
} from './game/achievements.js';
import {
  showAchievements,
  updateAchievementsButton,
  showAchievementToast,
  onAchievementsReset
} from './ui/achievements.js';

import { loadLeaderboardState } from './game/leaderboard.js';
import {
  showLeaderboard,
  updateLeaderboardButton
} from './ui/leaderboard.js';

import {
  setHighlightCallback,
  setApplySuggestionCallback
} from './ui/advisor.js';

import {
  bindResultTabSwitcher,
  updateSceneInfo
} from './ui/modals.js';

import { hideCampaignOverlay } from './ui/campaign.js';

import dom from './ui/dom.js';

import {
  handleNextTurn,
  handleToolSelect,
  handleSeedClick,
  openSimulator,
  handleHighlight,
  handleApplySuggestion,
  getGame,
  setOnOpenSceneSelect,
  setOnRestartCampaign,
  setOnRestartDaily,
  startNewGame
} from './controllers/game-controller.js';

import {
  openSceneSelect,
  handleStartScene,
  startDailyChallenge,
  setOnOpenSandboxEditor,
  openDailyChallenge
} from './controllers/scene-controller.js';

import {
  handleLoadChallenge,
  handleStartChallenge,
  handleGenerateChallenge,
  handleCopyChallenge,
  setEditorStateGetter
} from './controllers/challenge-controller.js';

import {
  openSandboxEditor,
  closeSandboxEditor,
  saveAndStartSandbox,
  openTemplateLib,
  openDraftPanel,
  openSaveDraftPanel,
  handleSaveDraft,
  getEditorState
} from './controllers/editor-controller.js';

import {
  openCampaignSelect,
  startCampaignChapter,
  setOnExitToSceneSelect,
  initCampaignController
} from './controllers/campaign-controller.js';

import { getCurrentSceneId, getCurrentDailyChallengeDate } from './app-state.js';

function wireControllers() {
  setOnOpenSandboxEditor(openSandboxEditor);
  setEditorStateGetter(getEditorState);
  setOnExitToSceneSelect(openSceneSelect);
  initCampaignController();

  setOnOpenSceneSelect(openSceneSelect);
  setOnRestartCampaign(() => {
    const game = getGame();
    if (game && game.gameMode === 'campaign') {
      startCampaignChapter(game.campaignId, game.campaignChapterOrder);
    }
  });
  setOnRestartDaily(() => {
    const date = getCurrentDailyChallengeDate();
    if (date) {
      startDailyChallenge(date);
    }
  });
}

function setupPersistentState() {
  loadCodexState();
  onUnlock(() => updateCodexButton(dom.codexBtn));
  updateCodexButton(dom.codexBtn);

  loadAchievementsState();
  onAchievementUnlock((achievement, info) => {
    showAchievementToast(achievement, info);
    updateAchievementsButton(dom.achievementsBtn);
  });
  onAchievementsReset(() => {
    updateAchievementsButton(dom.achievementsBtn);
  });
  updateAchievementsButton(dom.achievementsBtn);

  loadLeaderboardState();
  updateLeaderboardButton(dom.leaderboardBtn);
}

function setupAdvisorCallbacks() {
  setHighlightCallback(handleHighlight);
  setApplySuggestionCallback(handleApplySuggestion);
}

function handleRestart() {
  const game = getGame();
  if (!game) return;
  if (game.gameMode === 'campaign') {
    startCampaignChapter(game.campaignId, game.campaignChapterOrder);
  } else if (game.gameMode === 'daily') {
    const date = getCurrentDailyChallengeDate();
    if (date) {
      startDailyChallenge(date);
    }
  } else {
    startNewGame(getCurrentSceneId());
  }
}

function bindGlobalEvents() {
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.onclick = () => handleToolSelect(btn.dataset.tool);
  });

  bindResultTabSwitcher();

  document.querySelector('#nextBtn').onclick = handleNextTurn;
  document.querySelector('#restartBtn').onclick = handleRestart;
  document.querySelector('#againBtn').onclick = handleRestart;

  document.querySelector('#switchSceneBtn').onclick = openSceneSelect;
  document.querySelector('#startSceneBtn').onclick = handleStartScene;
  document.querySelector('#editorCancelBtn').onclick = closeSandboxEditor;
  document.querySelector('#editorSaveBtn').onclick = saveAndStartSandbox;

  dom.codexBtn.onclick = () => showCodex(dom.codexOverlay);
  dom.achievementsBtn.onclick = () => showAchievements(dom.achievementsOverlay);
  dom.leaderboardBtn.onclick = () => showLeaderboard(dom.leaderboardOverlay);
  dom.campaignBtn.onclick = openCampaignSelect;
  dom.campaignOverlay.querySelector('.campaign-close-btn').onclick = () => hideCampaignOverlay(dom.campaignOverlay);

  dom.seedTextEl.onclick = handleSeedClick;
  dom.simulatorBtn.onclick = openSimulator;
  dom.dailyBtn.onclick = () => openDailyChallenge();

  dom.challengeLoadBtn.onclick = handleLoadChallenge;
  dom.challengeStartBtn.onclick = handleStartChallenge;
  dom.challengeStartBtn.disabled = true;
  dom.challengeStartBtn.style.opacity = '0.5';
  dom.challengeStartBtn.style.cursor = 'not-allowed';
  dom.challengeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLoadChallenge();
  });

  dom.challengeGenBtn.onclick = handleGenerateChallenge;
  dom.challengeCopyBtn.onclick = handleCopyChallenge;

  dom.templateLibBtn.onclick = openTemplateLib;
  dom.draftBtn.onclick = openDraftPanel;
  dom.saveDraftBtn.onclick = openSaveDraftPanel;
  dom.confirmSaveDraftBtn.onclick = handleSaveDraft;
  dom.draftNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSaveDraft();
  });

  bindEditorPanelCloseEvents();
}

function bindEditorPanelCloseEvents() {
  document.querySelectorAll('[data-close-panel]').forEach(btn => {
    btn.onclick = () => {
      const panelId = btn.dataset.closePanel;
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('hidden');
    };
  });
}

export function init() {
  wireControllers();
  setupPersistentState();
  setupAdvisorCallbacks();
  bindGlobalEvents();

  const defaultScene = getScene(DEFAULT_SCENE_ID);
  updateSceneInfo(dom.sceneInfoEl, defaultScene.name);
  openSceneSelect();
}
