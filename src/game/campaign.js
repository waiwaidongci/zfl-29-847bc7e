import { getCampaign, getChapterByOrder } from '../data/campaigns.js';
import { STATS_MAX } from './constants.js';

const STORAGE_KEY_PREFIX = 'tidal_campaign_progress_';

export function createCampaignProgress(campaignId) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return null;

  const chapters = {};
  campaign.chapters.forEach((ch, idx) => {
    if (idx === 0) {
      chapters[ch.order] = {
        status: 'unlocked',
        score: null,
        pollutionResidue: 0,
        budgetCarry: 0
      };
    } else {
      chapters[ch.order] = {
        status: 'locked',
        score: null,
        pollutionResidue: 0,
        budgetCarry: 0
      };
    }
  });

  return {
    campaignId,
    currentChapterOrder: 1,
    chapters,
    totalScore: 0,
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function calculateCarryOver(chapter, gameResult) {
  if (!chapter.carryOver) return null;

  const co = chapter.carryOver;
  const budgetCarry = Math.floor((gameResult.budget || 0) * co.budgetCarryRate);
  const pollutionResidue = Math.floor((gameResult.pollution || 0) * co.pollutionResidueRate);
  const scoreBonus = (gameResult.score || 0) >= co.scoreBonusThreshold ? co.scoreBonusBudget : 0;

  return {
    budgetCarry: budgetCarry + scoreBonus,
    pollutionResidue,
    finalScore: gameResult.score || 0,
    finalBudget: gameResult.budget || 0,
    finalPollution: gameResult.pollution || 0,
    won: gameResult.win
  };
}

export function applyCarryOverToSceneConfig(sceneConfig, carryOver) {
  if (!carryOver) return { ...sceneConfig };

  const config = { ...sceneConfig };
  config.budget = (config.budget || 0) + carryOver.budgetCarry;

  if (carryOver.pollutionResidue > 0) {
    const extraPollution = generateExtraPollutionIndices(
      carryOver.pollutionResidue,
      sceneConfig.pollutionIndices || [],
      config
    );
    config.pollutionIndices = [...(sceneConfig.pollutionIndices || []), ...extraPollution];
  }

  return config;
}

function generateExtraPollutionIndices(count, existingIndices, config) {
  const totalCells = 96;
  const existingSet = new Set(existingIndices);
  const candidates = [];
  for (let i = 0; i < totalCells; i++) {
    if (!existingSet.has(i)) candidates.push(i);
  }

  const result = [];
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    result.push(shuffled[i]);
  }
  return result;
}

export function completeChapter(progress, chapterOrder, gameResult) {
  const campaign = getCampaign(progress.campaignId);
  if (!campaign) return progress;

  const chapter = getChapterByOrder(progress.campaignId, chapterOrder);
  if (!chapter) return progress;

  const carryOver = calculateCarryOver(chapter, gameResult);

  const updated = JSON.parse(JSON.stringify(progress));
  updated.chapters[chapterOrder] = {
    status: gameResult.win ? 'completed' : 'failed',
    score: gameResult.score || 0,
    pollutionResidue: carryOver ? carryOver.pollutionResidue : 0,
    budgetCarry: carryOver ? carryOver.budgetCarry : 0,
    won: gameResult.win
  };

  updated.totalScore = Object.values(updated.chapters)
    .reduce((sum, ch) => sum + (ch.score || 0), 0);

  const nextOrder = chapterOrder + 1;
  if (nextOrder <= campaign.chapters.length) {
    if (gameResult.win) {
      updated.chapters[nextOrder] = {
        status: 'unlocked',
        score: null,
        pollutionResidue: carryOver ? carryOver.pollutionResidue : 0,
        budgetCarry: carryOver ? carryOver.budgetCarry : 0,
        carryOverFrom: chapterOrder
      };
      updated.currentChapterOrder = nextOrder;
    } else {
      if (!updated.chapters[nextOrder]) {
        updated.chapters[nextOrder] = {
          status: 'locked',
          score: null,
          pollutionResidue: 0,
          budgetCarry: 0
        };
      }
    }
  } else {
    updated.currentChapterOrder = chapterOrder;
  }

  updated.updatedAt = Date.now();
  return updated;
}

export function getCampaignSceneConfig(progress) {
  const campaign = getCampaign(progress.campaignId);
  if (!campaign) return null;

  const chapter = getChapterByOrder(progress.campaignId, progress.currentChapterOrder);
  if (!chapter) return null;

  let config = { ...chapter.sceneConfig };

  const chapterData = progress.chapters[progress.currentChapterOrder];
  if (chapterData && chapterData.carryOverFrom) {
    const prevChapterData = progress.chapters[chapterData.carryOverFrom];
    if (prevChapterData) {
      const carryOver = {
        budgetCarry: prevChapterData.budgetCarry || 0,
        pollutionResidue: prevChapterData.pollutionResidue || 0
      };
      config = applyCarryOverToSceneConfig(config, carryOver);
    }
  }

  config.id = `campaign_${progress.campaignId}_ch${progress.currentChapterOrder}`;
  config.name = chapter.name;
  config.tags = ['战役模式', `第${chapter.order}章`];
  config.desc = chapter.desc;

  return config;
}

export function getChapterCarryOverSummary(progress, chapterOrder) {
  const chapterData = progress.chapters[chapterOrder];
  if (!chapterData) return null;

  if (chapterData.carryOverFrom) {
    const prev = progress.chapters[chapterData.carryOverFrom];
    if (prev) {
      return {
        budgetCarry: prev.budgetCarry || 0,
        pollutionResidue: prev.pollutionResidue || 0,
        prevWon: prev.won,
        prevScore: prev.score
      };
    }
  }

  return null;
}

export function isCampaignComplete(progress) {
  const campaign = getCampaign(progress.campaignId);
  if (!campaign) return false;

  const lastChapter = campaign.chapters[campaign.chapters.length - 1];
  const lastData = progress.chapters[lastChapter.order];
  return lastData && lastData.status === 'completed';
}

function getStorageKey(campaignId) {
  return STORAGE_KEY_PREFIX + campaignId;
}

export function saveCampaignProgress(progress) {
  if (!progress || !progress.campaignId) return false;
  try {
    const data = JSON.stringify(progress);
    localStorage.setItem(getStorageKey(progress.campaignId), data);
    return true;
  } catch (e) {
    return false;
  }
}

export function loadCampaignProgress(campaignId) {
  if (!campaignId) return null;
  try {
    const data = localStorage.getItem(getStorageKey(campaignId));
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function deleteCampaignProgress(campaignId) {
  try {
    if (campaignId) {
      localStorage.removeItem(getStorageKey(campaignId));
    } else {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function hasSavedCampaign(campaignId) {
  const saved = loadCampaignProgress(campaignId);
  return saved !== null;
}

export function replayChapter(progress, chapterOrder) {
  const campaign = getCampaign(progress.campaignId);
  if (!campaign) return progress;

  const chapter = getChapterByOrder(progress.campaignId, chapterOrder);
  if (!chapter) return progress;

  const updated = JSON.parse(JSON.stringify(progress));

  for (let o = chapterOrder; o <= campaign.chapters.length; o++) {
    if (updated.chapters[o]) {
      if (o === chapterOrder) {
        const carryOverFrom = updated.chapters[o].carryOverFrom || null;
        const prevPollution = carryOverFrom ? (updated.chapters[carryOverFrom]?.pollutionResidue || 0) : 0;
        const prevBudget = carryOverFrom ? (updated.chapters[carryOverFrom]?.budgetCarry || 0) : 0;
        updated.chapters[o] = {
          status: 'unlocked',
          score: null,
          pollutionResidue: prevPollution,
          budgetCarry: prevBudget,
          carryOverFrom
        };
      } else {
        delete updated.chapters[o];
      }
    }
  }

  campaign.chapters.forEach((ch, idx) => {
    const order = ch.order;
    if (!updated.chapters[order]) {
      if (order <= chapterOrder) {
        updated.chapters[order] = {
          status: idx === 0 ? 'unlocked' : 'locked',
          score: null,
          pollutionResidue: 0,
          budgetCarry: 0
        };
      } else {
        updated.chapters[order] = {
          status: 'locked',
          score: null,
          pollutionResidue: 0,
          budgetCarry: 0
        };
      }
    }
  });

  updated.currentChapterOrder = chapterOrder;
  updated.updatedAt = Date.now();

  updated.totalScore = Object.values(updated.chapters)
    .filter(ch => ch.status === 'completed')
    .reduce((sum, ch) => sum + (ch.score || 0), 0);

  return updated;
}
