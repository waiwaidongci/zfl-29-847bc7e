import { getCampaign, getChapterByOrder } from '../data/campaigns.js';
import {
  createCampaignProgress,
  loadCampaignProgress,
  saveCampaignProgress,
  deleteCampaignProgress,
  getCampaignSceneConfig,
  completeChapter,
  replayChapter,
  isCampaignComplete,
  calculateCarryOver
} from '../game/campaign.js';
import { createGameState } from '../game/state.js';
import {
  renderCampaignList,
  renderCampaignDetail,
  renderStoryDialog,
  showCampaignOverlay,
  hideCampaignOverlay,
  showCampaignResult,
  showCampaignSummary
} from '../ui/campaign.js';
import { updateSceneInfo, hideOverlay } from '../ui/modals.js';
import { clearHighlights as clearAdvisorHighlights } from '../ui/advisor.js';
import dom from '../ui/dom.js';
import {
  getCampaignProgress as getAppCampaignProgress,
  setCampaignProgress,
  getCampaignCurrentSceneConfig,
  setCampaignCurrentSceneConfig,
  setHighlightedCells,
  setLastEventCount,
  setCurrentSceneId
} from '../app-state.js';
import { getGame, setGame, fullRender, setOnGameEnd } from './game-controller.js';

let _onExitToSceneSelect = null;

export function setOnExitToSceneSelect(callback) {
  _onExitToSceneSelect = callback;
}

export function initCampaignController() {
  setOnGameEnd(handleCampaignChapterEnd);
}

export function startCampaignChapter(campaignId, chapterOrder) {
  let campaignProgress = getAppCampaignProgress();
  if (!campaignProgress || campaignProgress.campaignId !== campaignId) {
    campaignProgress = createCampaignProgress(campaignId);
    saveCampaignProgress(campaignProgress);
    setCampaignProgress(campaignProgress);
  }

  campaignProgress.currentChapterOrder = chapterOrder;
  const sceneConfig = getCampaignSceneConfig(campaignProgress);
  if (!sceneConfig) return;

  setCampaignCurrentSceneConfig(sceneConfig);
  setCampaignProgress(campaignProgress);

  const chapter = getChapterByOrder(campaignId, chapterOrder);
  if (!chapter) return;

  hideCampaignOverlay(dom.campaignOverlay);

  renderStoryDialog(dom.storyOverlay, chapter.name, chapter.storyIntro, '开始修复', () => {
    const game = createGameState(sceneConfig, {
      campaignMode: true,
      campaignProgress: campaignProgress,
      campaignId: campaignId,
      campaignChapterOrder: chapterOrder
    });
    setGame(game);
    setLastEventCount(game.replay.events.length);
    setCurrentSceneId(sceneConfig.id);
    updateSceneInfo(dom.sceneInfoEl, sceneConfig.name);
    hideOverlay(dom.overlay);
    clearAdvisorHighlights();
    setHighlightedCells([]);
    fullRender();
  });
}

export function handleCampaignChapterEnd(result) {
  const game = getGame();
  const chapterOrder = game.campaignChapterOrder;
  const campaignId = game.campaignId;
  const campaign = getCampaign(campaignId);
  const chapter = getChapterByOrder(campaignId, chapterOrder);
  let campaignProgress = getAppCampaignProgress();

  campaignProgress = completeChapter(campaignProgress, chapterOrder, {
    win: result.win,
    score: result.score,
    pollution: result.pollution,
    budget: result.budget
  });
  saveCampaignProgress(campaignProgress);
  setCampaignProgress(campaignProgress);

  const isLastChapter = chapter.order >= campaign.chapters.length;
  const carryOver = calculateCarryOver(chapter, {
    win: result.win,
    score: result.score,
    pollution: result.pollution,
    budget: result.budget
  });

  showCampaignResult(dom.campaignResultOverlay, result, chapter.name, isLastChapter, carryOver, {
    next: () => {
      dom.campaignResultOverlay.classList.add('hidden');

      const proceedToNext = () => {
        if (isLastChapter && result.win) {
          showCampaignSummary(dom.campaignResultOverlay, campaignId, campaignProgress, {
            restart: (cId) => {
              const newProgress = createCampaignProgress(cId);
              saveCampaignProgress(newProgress);
              setCampaignProgress(newProgress);
              openCampaignSelect();
            },
            exit: () => {
              setCampaignProgress(null);
              setCampaignCurrentSceneConfig(null);
              setGame(null);
              if (_onExitToSceneSelect) {
                _onExitToSceneSelect();
              }
            }
          });
          return;
        }

        const nextChapter = getChapterByOrder(campaignId, chapterOrder + 1);
        if (nextChapter) {
          renderStoryDialog(dom.storyOverlay, nextChapter.name, nextChapter.storyIntro, '开始修复', () => {
            startCampaignChapter(campaignId, chapterOrder + 1);
          });
        }
      };

      if (chapter.storyOutro) {
        renderStoryDialog(dom.storyOverlay, chapter.name, chapter.storyOutro, '继续', () => {
          proceedToNext();
        });
      } else {
        proceedToNext();
      }
    },
    retry: () => {
      dom.campaignResultOverlay.classList.add('hidden');
      let progress = getAppCampaignProgress();
      progress = replayChapter(progress, chapterOrder);
      saveCampaignProgress(progress);
      setCampaignProgress(progress);
      startCampaignChapter(campaignId, chapterOrder);
    },
    exit: () => {
      dom.campaignResultOverlay.classList.add('hidden');
      setCampaignProgress(null);
      setCampaignCurrentSceneConfig(null);
      setGame(null);
      if (_onExitToSceneSelect) {
        _onExitToSceneSelect();
      }
    }
  }, game.replay);
}

export function openCampaignSelect() {
  renderCampaignList(dom.campaignContentEl, campaignId => {
    const saved = loadCampaignProgress(campaignId);
    if (saved) {
      renderCampaignDetail(dom.campaignContentEl, campaignId, {
        back: () => openCampaignSelect(),
        startChapter: (chapterOrder) => {
          setCampaignProgress(saved);
          startCampaignChapter(campaignId, chapterOrder);
        },
        replayChapter: (chapterOrder) => {
          let progress = replayChapter(saved, chapterOrder);
          saveCampaignProgress(progress);
          setCampaignProgress(progress);
          startCampaignChapter(campaignId, chapterOrder);
        },
        newCampaign: (cId) => {
          const progress = createCampaignProgress(cId);
          saveCampaignProgress(progress);
          setCampaignProgress(progress);
          startCampaignChapter(cId, 1);
        },
        continueCampaign: (cId) => {
          setCampaignProgress(saved);
          startCampaignChapter(cId, saved.currentChapterOrder);
        }
      });
    } else {
      const progress = createCampaignProgress(campaignId);
      saveCampaignProgress(progress);
      setCampaignProgress(progress);
      startCampaignChapter(campaignId, 1);
    }
  });
  showCampaignOverlay(dom.campaignOverlay);
}
