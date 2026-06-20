import { getScene } from '../data/scenes.js';
import { createGameState, placeFacility } from '../game/state.js';
import { advanceTurn } from '../game/tide.js';
import { seedFromString } from '../game/seeded-random.js';
import { COSTS } from '../game/constants.js';
import {
  recordPlaceFacility,
  recordCleanPollution,
  recordStormSurvived,
  checkGameEndAchievements,
  checkCumulativeAchievements
} from '../game/achievements.js';
import { updateAchievementsButton } from '../ui/achievements.js';
import {
  renderGrid,
  renderStats,
  renderLog,
  renderToolButtons,
  renderGridWithHighlights
} from '../renderer/board.js';
import { generateAdvice } from '../game/advisor.js';
import {
  renderAdvisor,
  clearHighlights as clearAdvisorHighlights
} from '../ui/advisor.js';
import {
  addEntry,
  getCategoryStats
} from '../game/leaderboard.js';
import { updateLeaderboardButton } from '../ui/leaderboard.js';
import {
  showResult,
  updateSceneInfo,
  hideOverlay,
  renderReplayView
} from '../ui/modals.js';
import { showSimulatorOverlay } from '../ui/simulator.js';
import dom from '../ui/dom.js';
import {
  getGame,
  setGame,
  getCurrentSceneId,
  setCurrentSceneId,
  getCurrentTool,
  setCurrentTool,
  getHighlightedCells,
  setHighlightedCells,
  getCurrentAdvice,
  setCurrentAdvice,
  getLastEventCount,
  setLastEventCount,
  getCurrentDailyChallenge,
  getCampaignCurrentSceneConfig
} from '../app-state.js';

let onGameEndCallback = null;

export function setOnGameEnd(callback) {
  onGameEndCallback = callback;
}

export function getActiveScene() {
  const game = getGame();
  if (game && game.gameMode === 'campaign') {
    const config = getCampaignCurrentSceneConfig();
    if (config) return config;
  }
  if (game && game.gameMode === 'daily') {
    const daily = getCurrentDailyChallenge();
    if (daily) return daily;
  }
  return getScene(getCurrentSceneId());
}

export function fullRender() {
  const game = getGame();
  const scene = getActiveScene();
  const highlightedCells = getHighlightedCells();
  if (highlightedCells.length > 0) {
    renderGridWithHighlights(dom.gridEl, game.cells, highlightedCells, i => handlePlace(i));
  } else {
    renderGrid(dom.gridEl, game.cells, i => handlePlace(i));
  }
  renderStats(game, scene);
  dom.seedTextEl.textContent = game.seedStr;
  renderLog(dom.logEl, game.log);
  renderToolButtons(getCurrentTool());
  updateAdvisor();
}

export function updateAdvisor() {
  const game = getGame();
  if (!game || game.ended) {
    renderAdvisor(dom.advisorEl, null, game);
    return;
  }
  const scene = getActiveScene();
  const advice = generateAdvice(game, scene);
  setCurrentAdvice(advice);
  renderAdvisor(dom.advisorEl, advice, game);
}

export function handlePlace(index) {
  const game = getGame();
  const tool = getCurrentTool();
  if (placeFacility(game, index, tool)) {
    if (tool !== 'erase') {
      recordPlaceFacility(tool);
      checkCumulativeAchievements(getCurrentSceneId());
      updateAchievementsButton(dom.achievementsBtn);
    }
    clearAdvisorHighlights();
    setHighlightedCells([]);
    fullRender();
  }
}

export function handleHighlight(cells, suggestion) {
  setHighlightedCells(cells || []);
  const game = getGame();
  const highlightedCells = getHighlightedCells();
  if (highlightedCells.length > 0) {
    renderGridWithHighlights(dom.gridEl, game.cells, highlightedCells, i => handlePlace(i));
  } else {
    renderGrid(dom.gridEl, game.cells, i => handlePlace(i));
  }
}

export function handleApplySuggestion(suggestion) {
  if (suggestion === 'refresh') {
    updateAdvisor();
    return;
  }

  if (!suggestion || !suggestion.targetIndices && !suggestion.targetIndex) return;

  const targetIndices = suggestion.targetIndices || [suggestion.targetIndex];
  const tool = suggestion.type;
  const toolCost = COSTS[tool];
  const game = getGame();

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
    checkCumulativeAchievements(getCurrentSceneId());
    updateAchievementsButton(dom.achievementsBtn);
    clearAdvisorHighlights();
    setHighlightedCells([]);
    fullRender();
  }
}

export function startNewGame(sceneId) {
  setCurrentSceneId(sceneId);
  const scene = getScene(sceneId);

  let seed = undefined;
  if (dom.seedInputEl && dom.seedInputEl.value.trim()) {
    const parsed = seedFromString(dom.seedInputEl.value.trim());
    if (parsed !== null) {
      seed = parsed;
    }
  }
  if (dom.seedInputEl) dom.seedInputEl.value = '';

  const game = createGameState(scene, { seed });
  setGame(game);
  setLastEventCount(game.replay.events.length);
  updateSceneInfo(dom.sceneInfoEl, scene.name);
  hideOverlay(dom.overlay);
  clearAdvisorHighlights();
  setHighlightedCells([]);
  fullRender();
}

export function handleNextTurn() {
  const game = getGame();
  if (game.ended) return;
  clearAdvisorHighlights();
  setHighlightedCells([]);
  const scene = getActiveScene();
  const result = advanceTurn(game, scene);

  const newEvents = game.replay.events.slice(getLastEventCount());
  for (const ev of newEvents) {
    if (ev.type === 'storm' && ev.data && !ev.data.damaged) {
      recordStormSurvived();
    }
    if (ev.type === 'oyster_clean' && ev.data && ev.data.count) {
      recordCleanPollution(ev.data.count);
    }
  }
  setLastEventCount(game.replay.events.length);
  checkCumulativeAchievements(getCurrentSceneId());
  updateAchievementsButton(dom.achievementsBtn);

  if (result.ended) {
    const newlyUnlocked = checkGameEndAchievements(game, scene, result.win, result.score);
    if (newlyUnlocked.length > 0) {
      updateAchievementsButton(dom.achievementsBtn);
    }
    recordToLeaderboard(game, scene, result);

    if (game.gameMode === 'campaign') {
      if (onGameEndCallback) {
        onGameEndCallback(result);
      }
    } else {
      showResult(dom.resultTitle, dom.resultText, dom.overlay, result.title, result.text);
      renderReplayView(game);
    }
  }

  fullRender();
}

export function handleToolSelect(tool) {
  setCurrentTool(tool);
  renderToolButtons(getCurrentTool());
}

export function recordToLeaderboard(game, scene, result) {
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

  updateLeaderboardButton(dom.leaderboardBtn);
}

export function handleSeedClick() {
  const game = getGame();
  if (!game || !game.seedStr) return;
  const seedStr = game.seedStr;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(seedStr).catch(() => {});
  }
  dom.seedTextEl.textContent = '已复制!';
  setTimeout(() => {
    const currentGame = getGame();
    if (currentGame) {
      dom.seedTextEl.textContent = currentGame.seedStr;
    }
  }, 1200);
}

export function openSimulator() {
  const game = getGame();
  if (!game) {
    if (onOpenSceneSelectCallback) {
      onOpenSceneSelectCallback();
    }
    return;
  }
  if (game.ended) {
    if (!confirm('当前对局已结束，是否重新开始当前场景以使用模拟器？')) return;
    if (game.gameMode === 'campaign') {
      if (onRestartCampaignCallback) {
        onRestartCampaignCallback();
      }
    } else if (game.gameMode === 'daily' && getCurrentDailyChallengeDate()) {
      if (onRestartDailyCallback) {
        onRestartDailyCallback();
      }
    } else {
      startNewGame(getCurrentSceneId());
    }
    return;
  }
  const scene = getActiveScene();
  showSimulatorOverlay(dom.simulatorOverlay, game, scene);
}

let onOpenSceneSelectCallback = null;
let onRestartCampaignCallback = null;
let onRestartDailyCallback = null;

export function setOnOpenSceneSelect(callback) {
  onOpenSceneSelectCallback = callback;
}

export function setOnRestartCampaign(callback) {
  onRestartCampaignCallback = callback;
}

export function setOnRestartDaily(callback) {
  onRestartDailyCallback = callback;
}

export { getGame, setGame };
