import { getCampaign, getChapterByOrder } from '../data/campaigns.js';
import { STATS_MAX } from './constants.js';

const STORAGE_KEY_PREFIX = 'tidal_campaign_progress_';

export const BRANCH_REWARD_TYPES = {
  BUDGET_BONUS: 'budgetBonus',
  WATER_BONUS: 'waterBonus',
  LARVAE_BONUS: 'larvaeBonus',
  BIO_BONUS: 'bioBonus',
  STORM_CHANCE_REDUCTION: 'stormChanceReduction',
  POLLUTION_RESIDUE: 'pollutionResidue',
  BUDGET_CARRY: 'budgetCarry'
};

export const BRANCH_REWARD_META = {
  [BRANCH_REWARD_TYPES.BUDGET_BONUS]: {
    label: '预算奖励',
    icon: '💰',
    description: '卓越表现带来的额外预算',
    positive: true,
    format: (v) => `+${v}`
  },
  [BRANCH_REWARD_TYPES.WATER_BONUS]: {
    label: '初始水质提升',
    icon: '💧',
    description: '生态基础改善，开局水质更好',
    positive: true,
    format: (v) => `+${v}`
  },
  [BRANCH_REWARD_TYPES.LARVAE_BONUS]: {
    label: '初始幼体提升',
    icon: '🐚',
    description: '修复区生物活性增强',
    positive: true,
    format: (v) => `+${v}`
  },
  [BRANCH_REWARD_TYPES.BIO_BONUS]: {
    label: '初始多样性提升',
    icon: '🌿',
    description: '生态多样性基础更好',
    positive: true,
    format: (v) => `+${v}`
  },
  [BRANCH_REWARD_TYPES.STORM_CHANCE_REDUCTION]: {
    label: '风暴概率下降',
    icon: '⛅',
    description: '积累的气象数据降低风暴风险',
    positive: true,
    format: (v) => `-${Math.round(v * 100)}%`
  },
  [BRANCH_REWARD_TYPES.POLLUTION_RESIDUE]: {
    label: '污染残留',
    icon: '☣️',
    description: '上一章未完全清除的污染',
    positive: false,
    format: (v) => `+${v}格`
  },
  [BRANCH_REWARD_TYPES.BUDGET_CARRY]: {
    label: '预算结转',
    icon: '📦',
    description: '上一章结余的预算',
    positive: true,
    format: (v) => `+${v}`
  }
};

export function getBranchRewardMeta(type) {
  return BRANCH_REWARD_META[type] || { label: type, icon: '📌', description: '', positive: true, format: (v) => String(v) };
}

function getScoreGrade(score, goalScore) {
  const ratio = score / Math.max(1, goalScore);
  if (ratio >= 1.5) return 'S';
  if (ratio >= 1.25) return 'A';
  if (ratio >= 1.0) return 'B';
  return 'C';
}

export function calculateBranchRewards(chapter, gameResult) {
  const rewards = [];
  const sceneConfig = chapter.sceneConfig;
  const goalScore = sceneConfig.goalScore || 50;
  const grade = getScoreGrade(gameResult.score || 0, goalScore);
  const baseBudget = sceneConfig.budget || 100;

  if (gameResult.win) {
    if (grade === 'S') {
      rewards.push({ type: BRANCH_REWARD_TYPES.BUDGET_BONUS, value: 35, source: '评分S级' });
      rewards.push({ type: BRANCH_REWARD_TYPES.WATER_BONUS, value: 8, source: '评分S级' });
      rewards.push({ type: BRANCH_REWARD_TYPES.LARVAE_BONUS, value: 5, source: '评分S级' });
      rewards.push({ type: BRANCH_REWARD_TYPES.BIO_BONUS, value: 5, source: '评分S级' });
    } else if (grade === 'A') {
      rewards.push({ type: BRANCH_REWARD_TYPES.BUDGET_BONUS, value: 20, source: '评分A级' });
      rewards.push({ type: BRANCH_REWARD_TYPES.WATER_BONUS, value: 5, source: '评分A级' });
      rewards.push({ type: BRANCH_REWARD_TYPES.LARVAE_BONUS, value: 3, source: '评分A级' });
    } else if (grade === 'B') {
      rewards.push({ type: BRANCH_REWARD_TYPES.BUDGET_BONUS, value: 10, source: '评分B级' });
      rewards.push({ type: BRANCH_REWARD_TYPES.WATER_BONUS, value: 3, source: '评分B级' });
    }

    const pollutionRatio = (gameResult.pollution || 0) / Math.max(1, (sceneConfig.pollutionIndices || []).length);
    if (pollutionRatio <= 0.1) {
      rewards.push({ type: BRANCH_REWARD_TYPES.STORM_CHANCE_REDUCTION, value: 0.08, source: '几乎零污染' });
      rewards.push({ type: BRANCH_REWARD_TYPES.BIO_BONUS, value: 4, source: '几乎零污染' });
    } else if (pollutionRatio <= 0.3) {
      rewards.push({ type: BRANCH_REWARD_TYPES.STORM_CHANCE_REDUCTION, value: 0.05, source: '低污染残留' });
    }

    if (gameResult.budget >= baseBudget * 0.5) {
      rewards.push({ type: BRANCH_REWARD_TYPES.BUDGET_BONUS, value: 15, source: '预算充足' });
    } else if (gameResult.budget >= baseBudget * 0.25) {
      rewards.push({ type: BRANCH_REWARD_TYPES.BUDGET_BONUS, value: 8, source: '预算有结余' });
    }

    if (gameResult.stormSurvived && !gameResult.stormDamaged) {
      rewards.push({ type: BRANCH_REWARD_TYPES.STORM_CHANCE_REDUCTION, value: 0.06, source: '风暴无损' });
      rewards.push({ type: BRANCH_REWARD_TYPES.WATER_BONUS, value: 4, source: '风暴无损' });
    } else if (gameResult.stormSurvived) {
      rewards.push({ type: BRANCH_REWARD_TYPES.STORM_CHANCE_REDUCTION, value: 0.03, source: '承受风暴' });
    }
  } else {
    if (gameResult.pollution > 0) {
      const residue = Math.ceil((gameResult.pollution || 0) * 0.4);
      if (residue > 0) {
        rewards.push({ type: BRANCH_REWARD_TYPES.POLLUTION_RESIDUE, value: residue, source: '修复失败污染蔓延' });
      }
    }
    rewards.push({ type: BRANCH_REWARD_TYPES.BUDGET_BONUS, value: 5, source: '支援预算' });
  }

  const consolidated = {};
  rewards.forEach(r => {
    if (consolidated[r.type]) {
      consolidated[r.type].value += r.value;
      consolidated[r.type].sources.push(r.source);
    } else {
      consolidated[r.type] = {
        type: r.type,
        value: r.value,
        sources: [r.source]
      };
    }
  });

  return Object.values(consolidated).map(r => ({
    type: r.type,
    value: r.value,
    sources: r.sources
  }));
}

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
        budgetCarry: 0,
        branchRewards: [],
        appliedBranchRewards: []
      };
    } else {
      chapters[ch.order] = {
        status: 'locked',
        score: null,
        pollutionResidue: 0,
        budgetCarry: 0,
        branchRewards: [],
        appliedBranchRewards: []
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

  const branchRewards = calculateBranchRewards(chapter, gameResult);

  return {
    budgetCarry: budgetCarry + scoreBonus,
    pollutionResidue,
    finalScore: gameResult.score || 0,
    finalBudget: gameResult.budget || 0,
    finalPollution: gameResult.pollution || 0,
    won: gameResult.win,
    branchRewards,
    grade: getScoreGrade(gameResult.score || 0, chapter.sceneConfig.goalScore || 50)
  };
}

export function applyBranchRewardsToSceneConfig(sceneConfig, branchRewards) {
  const config = { ...sceneConfig };

  if (!branchRewards || branchRewards.length === 0) return config;

  branchRewards.forEach(reward => {
    switch (reward.type) {
      case BRANCH_REWARD_TYPES.BUDGET_BONUS:
      case BRANCH_REWARD_TYPES.BUDGET_CARRY:
        config.budget = (config.budget || 0) + reward.value;
        break;
      case BRANCH_REWARD_TYPES.WATER_BONUS:
        config.water = Math.min(STATS_MAX, (config.water || 0) + reward.value);
        break;
      case BRANCH_REWARD_TYPES.LARVAE_BONUS:
        config.larvae = Math.min(STATS_MAX, (config.larvae || 0) + reward.value);
        break;
      case BRANCH_REWARD_TYPES.BIO_BONUS:
        config.bio = Math.min(STATS_MAX, (config.bio || 0) + reward.value);
        break;
      case BRANCH_REWARD_TYPES.STORM_CHANCE_REDUCTION:
        config.stormChance = Math.max(0, (config.stormChance || 0) - reward.value);
        break;
      case BRANCH_REWARD_TYPES.POLLUTION_RESIDUE:
        if (reward.value > 0) {
          const extraPollution = generateExtraPollutionIndices(
            reward.value,
            config.pollutionIndices || [],
            config
          );
          config.pollutionIndices = [...(config.pollutionIndices || []), ...extraPollution];
        }
        break;
    }
  });

  return config;
}

export function applyCarryOverToSceneConfig(sceneConfig, carryOver) {
  if (!carryOver) return { ...sceneConfig };

  let config = { ...sceneConfig };
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
  const branchRewards = carryOver ? carryOver.branchRewards : [];

  const updated = JSON.parse(JSON.stringify(progress));
  updated.chapters[chapterOrder] = {
    status: gameResult.win ? 'completed' : 'failed',
    score: gameResult.score || 0,
    pollutionResidue: carryOver ? carryOver.pollutionResidue : 0,
    budgetCarry: carryOver ? carryOver.budgetCarry : 0,
    won: gameResult.win,
    grade: carryOver ? carryOver.grade : null,
    branchRewards: branchRewards,
    stormSurvived: gameResult.stormSurvived || false,
    stormDamaged: gameResult.stormDamaged || false,
    appliedBranchRewards: updated.chapters[chapterOrder]?.appliedBranchRewards || []
  };

  updated.totalScore = Object.values(updated.chapters)
    .reduce((sum, ch) => sum + (ch.score || 0), 0);

  const nextOrder = chapterOrder + 1;
  if (nextOrder <= campaign.chapters.length) {
    if (gameResult.win) {
      const carryBudget = carryOver ? carryOver.budgetCarry : 0;
      const carryPollution = carryOver ? carryOver.pollutionResidue : 0;

      const appliedRewards = [...branchRewards];
      if (carryBudget > 0) {
        appliedRewards.push({
          type: BRANCH_REWARD_TYPES.BUDGET_CARRY,
          value: carryBudget,
          sources: ['预算结转']
        });
      }
      if (carryPollution > 0) {
        const existing = appliedRewards.find(r => r.type === BRANCH_REWARD_TYPES.POLLUTION_RESIDUE);
        if (existing) {
          existing.value += carryPollution;
          existing.sources.push('污染残留结转');
        } else {
          appliedRewards.push({
            type: BRANCH_REWARD_TYPES.POLLUTION_RESIDUE,
            value: carryPollution,
            sources: ['污染残留结转']
          });
        }
      }

      updated.chapters[nextOrder] = {
        status: 'unlocked',
        score: null,
        pollutionResidue: carryPollution,
        budgetCarry: carryBudget,
        carryOverFrom: chapterOrder,
        branchRewards: [],
        appliedBranchRewards: appliedRewards
      };
      updated.currentChapterOrder = nextOrder;
    } else {
      if (!updated.chapters[nextOrder]) {
        updated.chapters[nextOrder] = {
          status: 'locked',
          score: null,
          pollutionResidue: 0,
          budgetCarry: 0,
          branchRewards: [],
          appliedBranchRewards: []
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
  if (chapterData) {
    if (chapterData.appliedBranchRewards && chapterData.appliedBranchRewards.length > 0) {
      config = applyBranchRewardsToSceneConfig(config, chapterData.appliedBranchRewards);
    } else if (chapterData.carryOverFrom) {
      const prevChapterData = progress.chapters[chapterData.carryOverFrom];
      if (prevChapterData) {
        const carryOver = {
          budgetCarry: prevChapterData.budgetCarry || 0,
          pollutionResidue: prevChapterData.pollutionResidue || 0
        };
        config = applyCarryOverToSceneConfig(config, carryOver);
      }
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

  const result = {
    budgetCarry: 0,
    pollutionResidue: 0,
    prevWon: null,
    prevScore: null,
    prevGrade: null,
    branchRewards: [],
    appliedBranchRewards: chapterData.appliedBranchRewards || []
  };

  if (chapterData.appliedBranchRewards && chapterData.appliedBranchRewards.length > 0) {
    chapterData.appliedBranchRewards.forEach(r => {
      if (r.type === BRANCH_REWARD_TYPES.BUDGET_BONUS || r.type === BRANCH_REWARD_TYPES.BUDGET_CARRY) {
        result.budgetCarry += r.value;
      }
      if (r.type === BRANCH_REWARD_TYPES.POLLUTION_RESIDUE) {
        result.pollutionResidue += r.value;
      }
    });
  }

  if (chapterData.carryOverFrom) {
    const prev = progress.chapters[chapterData.carryOverFrom];
    if (prev) {
      result.prevWon = prev.won;
      result.prevScore = prev.score;
      result.prevGrade = prev.grade;
      result.branchRewards = prev.branchRewards || [];
    }
  }

  return result;
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

  const currentChapterAppliedRewards = updated.chapters[chapterOrder]?.appliedBranchRewards || [];
  const carryOverFrom = updated.chapters[chapterOrder]?.carryOverFrom || null;

  for (let o = chapterOrder; o <= campaign.chapters.length; o++) {
    if (updated.chapters[o]) {
      if (o === chapterOrder) {
        updated.chapters[o] = {
          status: 'unlocked',
          score: null,
          pollutionResidue: 0,
          budgetCarry: 0,
          carryOverFrom,
          branchRewards: [],
          appliedBranchRewards: currentChapterAppliedRewards,
          stormSurvived: false,
          stormDamaged: false,
          grade: null,
          won: null
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
        if (order === 1) {
          updated.chapters[order] = {
            status: 'unlocked',
            score: null,
            pollutionResidue: 0,
            budgetCarry: 0,
            branchRewards: [],
            appliedBranchRewards: []
          };
        } else {
          updated.chapters[order] = {
            status: 'locked',
            score: null,
            pollutionResidue: 0,
            budgetCarry: 0,
            branchRewards: [],
            appliedBranchRewards: []
          };
        }
      } else {
        updated.chapters[order] = {
          status: 'locked',
          score: null,
          pollutionResidue: 0,
          budgetCarry: 0,
          branchRewards: [],
          appliedBranchRewards: []
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
