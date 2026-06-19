import {
  GRID_COLS,
  GRID_ROWS,
  GRID_SIZE,
  COSTS,
  POLLUTION_SPREAD_BASE,
  POLLUTION_SPREAD_MIN,
  POLLUTION_SPREAD_PILE_REDUCTION,
  OYSTER_CLEAN_CHANCE,
  OYSTER_WATER_BONUS,
  OYSTER_LARVAE_BONUS,
  OYSTER_BIO_BONUS,
  GRASS_LARVAE_BONUS,
  GRASS_BIO_BONUS,
  POLLUTION_WATER_PENALTY,
  POLLUTION_LARVAE_PENALTY,
  POLLUTION_BIO_PENALTY,
  TURN_BUDGET_BONUS,
  STORM_DAMAGE_CHANCE,
  STORM_WATER_PENALTY,
  SCORE_WATER_WEIGHT,
  SCORE_LARVAE_WEIGHT,
  SCORE_BIO_WEIGHT,
  SCORE_BUDGET_WEIGHT,
  SCORE_POLLUTION_PENALTY
} from './constants.js';
import { getNeighbors, getFacilityCounts } from './state.js';

function getIndex(x, y) {
  return y * GRID_COLS + x;
}

function getXY(index) {
  return {
    x: index % GRID_COLS,
    y: Math.floor(index / GRID_COLS)
  };
}

function calculatePollutionSpreadRisk(cells, piles) {
  const riskMap = new Map();
  const spreadChance = Math.max(
    POLLUTION_SPREAD_MIN,
    POLLUTION_SPREAD_BASE - piles * POLLUTION_SPREAD_PILE_REDUCTION
  );

  cells.forEach((cell, i) => {
    if (!cell.polluted) return;
    for (const n of getNeighbors(i)) {
      if (cells[n].polluted) continue;
      if (cells[n].type === 'pile') continue;
      const currentRisk = riskMap.get(n) || 0;
      riskMap.set(n, currentRisk + spreadChance);
    }
  });

  return riskMap;
}

function calculatePileBlockingValue(cells, pollutionIndex) {
  const blockedRisks = new Map();
  const pollutedCell = cells[pollutionIndex];
  if (!pollutedCell || !pollutedCell.polluted) return blockedRisks;

  for (const n of getNeighbors(pollutionIndex)) {
    if (cells[n].type !== 'empty' || cells[n].polluted) continue;
    
    let blockedCount = 0;
    for (const nn of getNeighbors(n)) {
      if (cells[nn].polluted) blockedCount++;
    }
    
    if (blockedCount > 0) {
      blockedRisks.set(n, blockedCount);
    }
  }

  return blockedRisks;
}

function calculateOysterValue(cells, index, remainingTurns) {
  const cell = cells[index];
  if (cell.type !== 'empty') return { value: 0, reason: '' };

  let value = 0;
  let reasonParts = [];

  if (cell.polluted) {
    const cleanValue = OYSTER_CLEAN_CHANCE * remainingTurns * 
      (POLLUTION_WATER_PENALTY + POLLUTION_LARVAE_PENALTY + POLLUTION_BIO_PENALTY);
    value += cleanValue;
    reasonParts.push(`净化污染可挽回约${Math.round(cleanValue)}点属性损失`);
  }

  const neighborPollution = getNeighbors(index).filter(n => cells[n].polluted).length;
  if (neighborPollution > 0) {
    const futureCleanValue = neighborPollution * 0.3 * remainingTurns *
      (POLLUTION_WATER_PENALTY + POLLUTION_LARVAE_PENALTY + POLLUTION_BIO_PENALTY);
    value += futureCleanValue;
    reasonParts.push(`周围${neighborPollution}个污染格，未来有机会净化扩散`);
  }

  const ecoValue = remainingTurns * (OYSTER_WATER_BONUS + OYSTER_LARVAE_BONUS + OYSTER_BIO_BONUS);
  value += ecoValue;
  reasonParts.push(`每回合提供${(OYSTER_WATER_BONUS + OYSTER_LARVAE_BONUS + OYSTER_BIO_BONUS).toFixed(1)}点生态增益`);

  return {
    value,
    reason: reasonParts.join('；'),
    relatedCells: [index, ...getNeighbors(index).filter(n => cells[n].polluted)]
  };
}

function calculateGrassValue(cells, index, remainingTurns) {
  const cell = cells[index];
  if (cell.type !== 'empty' || cell.polluted) return { value: 0, reason: '' };

  const ecoValue = remainingTurns * (GRASS_LARVAE_BONUS + GRASS_BIO_BONUS);
  const neighborGrass = getNeighbors(index).filter(n => cells[n].type === 'grass').length;
  const clusterBonus = neighborGrass * remainingTurns * 0.5;
  
  const value = ecoValue + clusterBonus;
  
  let reason = `每回合提供${(GRASS_LARVAE_BONUS + GRASS_BIO_BONUS).toFixed(1)}点生态增益`;
  if (neighborGrass > 0) {
    reason += `；与${neighborGrass}处海草床相邻，形成群落额外加分`;
  }

  return {
    value,
    reason,
    relatedCells: [index, ...getNeighbors(index).filter(n => cells[n].type === 'grass')]
  };
}

function calculateBestPilePositions(cells) {
  const pileValues = new Map();
  const relatedCellsMap = new Map();

  cells.forEach((cell, pollutionIndex) => {
    if (!cell.polluted) return;
    
    const blockedRisks = calculatePileBlockingValue(cells, pollutionIndex);
    blockedRisks.forEach((blockedCount, pileIndex) => {
      const currentValue = pileValues.get(pileIndex) || 0;
      pileValues.set(pileIndex, currentValue + blockedCount);
      
      if (!relatedCellsMap.has(pileIndex)) {
        relatedCellsMap.set(pileIndex, new Set());
      }
      relatedCellsMap.get(pileIndex).add(pollutionIndex);
      getNeighbors(pileIndex).forEach(n => {
        if (cells[n].polluted || cells[n].type === 'empty') {
          relatedCellsMap.get(pileIndex).add(n);
        }
      });
    });
  });

  return { pileValues, relatedCellsMap };
}

function analyzeUrgency(cells, remainingTurns, budget) {
  const pollutedCount = cells.filter(c => c.polluted).length;
  const emptyCount = cells.filter(c => c.type === 'empty').length;
  const totalCells = cells.length;

  const pollutionRatio = pollutedCount / totalCells;
  const turnPressure = remainingTurns <= 3 ? 'high' : remainingTurns <= 5 ? 'medium' : 'low';
  
  let urgency = 'normal';
  if (pollutionRatio > 0.3 || turnPressure === 'high') {
    urgency = 'critical';
  } else if (pollutionRatio > 0.15 || turnPressure === 'medium') {
    urgency = 'warning';
  }

  return {
    urgency,
    pollutedCount,
    remainingTurns,
    budget,
    maxAffordable: {
      oyster: Math.floor(budget / COSTS.oyster),
      grass: Math.floor(budget / COSTS.grass),
      pile: Math.floor(budget / COSTS.pile)
    }
  };
}

export function generateAdvice(game, scene) {
  const { cells, budget, turn } = game;
  const remainingTurns = scene.turns - turn + 1;
  const { oysters, grass, piles, pollution } = getFacilityCounts(game);
  
  const urgency = analyzeUrgency(cells, remainingTurns, budget);
  const riskMap = calculatePollutionSpreadRisk(cells, piles);
  const { pileValues, relatedCellsMap } = calculateBestPilePositions(cells);
  
  const suggestions = [];

  const highRiskPositions = Array.from(riskMap.entries())
    .filter(([index, risk]) => risk >= POLLUTION_SPREAD_BASE * 0.8)
    .sort((a, b) => b[1] - a[1]);

  if (highRiskPositions.length > 0 && budget >= COSTS.pile) {
    const [targetIndex, risk] = highRiskPositions[0];
    const pileRelated = relatedCellsMap.get(targetIndex) || new Set([targetIndex]);
    
    let pileValue = pileValues.get(targetIndex) || 0;
    if (pileValue === 0) {
      getNeighbors(targetIndex).forEach(n => {
        if (cells[n].polluted) pileValue++;
      });
    }

    if (pileValue > 0) {
      const pollutedNeighbors = getNeighbors(targetIndex).filter(n => cells[n].polluted);
      suggestions.push({
        id: 'pile_block',
        type: 'pile',
        priority: 'high',
        title: '紧急封堵',
        targetIndex,
        cost: COSTS.pile,
        description: `在(${getXY(targetIndex).x + 1},${getXY(targetIndex).y + 1})放置围护桩，可阻挡${pileValue}个方向的污染扩散`,
        detail: `污染扩散风险${Math.round(risk * 100)}%，剩余${remainingTurns}回合需要优先控制污染蔓延`,
        relatedCells: Array.from(new Set([targetIndex, ...pollutedNeighbors, ...pileRelated]))
      });
    }
  }

  const pollutedEmptyIndices = cells
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell }) => cell.polluted && cell.type === 'empty')
    .map(({ i }) => i);

  if (pollutedEmptyIndices.length > 0 && budget >= COSTS.oyster) {
    let bestOysterIndex = -1;
    let bestOysterValue = -1;
    let bestOysterInfo = null;

    pollutedEmptyIndices.forEach(index => {
      const info = calculateOysterValue(cells, index, remainingTurns);
      if (info.value > bestOysterValue) {
        bestOysterValue = info.value;
        bestOysterIndex = index;
        bestOysterInfo = info;
      }
    });

    if (bestOysterIndex >= 0) {
      suggestions.push({
        id: 'oyster_clean',
        type: 'oyster',
        priority: urgency.urgency === 'critical' ? 'high' : 'medium',
        title: '净化修复',
        targetIndex: bestOysterIndex,
        cost: COSTS.oyster,
        description: `在(${getXY(bestOysterIndex).x + 1},${getXY(bestOysterIndex).y + 1})放置牡蛎礁，有${Math.round(OYSTER_CLEAN_CHANCE * 100)}%概率每回合净化该格`,
        detail: bestOysterInfo.reason,
        relatedCells: bestOysterInfo.relatedCells
      });
    }
  }

  if (urgency.urgency !== 'critical' && budget >= COSTS.grass) {
    let bestGrassIndex = -1;
    let bestGrassValue = -1;
    let bestGrassInfo = null;

    cells.forEach((cell, index) => {
      if (cell.type !== 'empty' || cell.polluted) return;
      const info = calculateGrassValue(cells, index, remainingTurns);
      if (info.value > bestGrassValue) {
        bestGrassValue = info.value;
        bestGrassIndex = index;
        bestGrassInfo = info;
      }
    });

    if (bestGrassIndex >= 0) {
      suggestions.push({
        id: 'grass_biodiversity',
        type: 'grass',
        priority: 'low',
        title: '生态提升',
        targetIndex: bestGrassIndex,
        cost: COSTS.grass,
        description: `在(${getXY(bestGrassIndex).x + 1},${getXY(bestGrassIndex).y + 1})种植海草床，提升生物多样性`,
        detail: bestGrassInfo.reason + `，剩余${remainingTurns}回合预计贡献${Math.round(bestGrassValue)}点生态值`,
        relatedCells: bestGrassInfo.relatedCells
      });
    }
  }

  if (pollution > 0 && budget >= COSTS.pile * 2 && remainingTurns >= 3) {
    const frontierPositions = [];
    
    cells.forEach((cell, i) => {
      if (!cell.polluted) return;
      for (const n of getNeighbors(i)) {
        if (cells[n].type === 'empty' && !cells[n].polluted) {
          const alreadyFound = frontierPositions.some(p => p.index === n);
          if (!alreadyFound) {
            const pollutedNeighbors = getNeighbors(n).filter(nn => cells[nn].polluted).length;
            frontierPositions.push({ index: n, pollutedNeighbors });
          }
        }
      }
    });

    frontierPositions.sort((a, b) => b.pollutedNeighbors - a.pollutedNeighbors);
    
    if (frontierPositions.length >= 2) {
      const positions = frontierPositions.slice(0, 2);
      const totalCost = positions.length * COSTS.pile;
      
      if (budget >= totalCost) {
        const relatedCells = new Set();
        positions.forEach(p => {
          relatedCells.add(p.index);
          getNeighbors(p.index).forEach(n => relatedCells.add(n));
        });

        suggestions.push({
          id: 'defense_line',
          type: 'pile',
          priority: 'medium',
          title: '构建防线',
          targetIndices: positions.map(p => p.index),
          cost: totalCost,
          description: `在污染前沿放置${positions.length}个围护桩，建立防御线减缓扩散`,
          detail: `这${positions.length}个位置各连接${positions.map(p => p.pollutedNeighbors).join('、')}个污染格，能有效阻挡污染向内陆蔓延`,
          relatedCells: Array.from(relatedCells)
        });
      }
    }
  }

  const futureBudget = budget + (remainingTurns - 1) * TURN_BUDGET_BONUS;
  if (urgency.urgency === 'critical' && futureBudget >= COSTS.oyster * 2 && pollutedEmptyIndices.length >= 2) {
    const topOysterIndices = pollutedEmptyIndices
      .map(index => ({ index, info: calculateOysterValue(cells, index, remainingTurns) }))
      .sort((a, b) => b.info.value - a.info.value)
      .slice(0, 2);

    if (topOysterIndices.length >= 2) {
      const totalCost = topOysterIndices.length * COSTS.oyster;
      const relatedCells = new Set();
      topOysterIndices.forEach(({ index, info }) => {
        relatedCells.add(index);
        info.relatedCells.forEach(c => relatedCells.add(c));
      });

      suggestions.push({
        id: 'emergency_purify',
        type: 'oyster',
        priority: 'high',
        title: '紧急净化',
        targetIndices: topOysterIndices.map(t => t.index),
        cost: totalCost,
        description: `在${topOysterIndices.length}个重污染区放置牡蛎礁，控制污染并逐步净化`,
        detail: `剩余${remainingTurns}回合，结合未来${(remainingTurns - 1) * TURN_BUDGET_BONUS}预算收入可完成部署，每回合有机会净化${topOysterIndices.length}个污染格`,
        relatedCells: Array.from(relatedCells)
      });
    }
  }

  suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    urgency: urgency.urgency,
    summary: generateSummary(urgency, pollution, remainingTurns, budget),
    suggestions: suggestions.slice(0, 3),
    roadmap: generateRoadmap(game, scene)
  };
}

function generateSummary(urgency, pollution, remainingTurns, budget) {
  const parts = [];
  
  if (urgency.urgency === 'critical') {
    parts.push('⚠️ 局势危急');
  } else if (urgency.urgency === 'warning') {
    parts.push('⚠️ 需要关注');
  } else {
    parts.push('✅ 局势稳定');
  }

  parts.push(`污染${pollution}格`);
  parts.push(`剩余${remainingTurns}回合`);
  parts.push(`预算${budget}`);

  return parts.join(' · ');
}

function cloneCells(cells) {
  return cells.map(cell => ({ ...cell }));
}

function projectScore(cells, budget, water, larvae, bio) {
  const pollution = cells.filter(c => c.polluted).length;
  return Math.round(
    water * SCORE_WATER_WEIGHT +
    larvae * SCORE_LARVAE_WEIGHT +
    bio * SCORE_BIO_WEIGHT +
    budget * SCORE_BUDGET_WEIGHT -
    pollution * SCORE_POLLUTION_PENALTY
  );
}

function simulatePollutionSpread(cells) {
  const piles = cells.filter(c => c.type === 'pile').length;
  const spreadChance = Math.max(
    POLLUTION_SPREAD_MIN,
    POLLUTION_SPREAD_BASE - piles * POLLUTION_SPREAD_PILE_REDUCTION
  );

  const newPolluted = new Set();
  cells.forEach((cell, i) => {
    if (!cell.polluted) return;
    for (const n of getNeighbors(i)) {
      if (cells[n].type === 'pile' || cells[n].polluted) continue;
      newPolluted.add(n);
    }
  });

  newPolluted.forEach(i => {
    cells[i].polluted = true;
  });

  cells.forEach(cell => {
    if (cell.type === 'oyster' && cell.polluted) {
      cell.polluted = false;
    }
  });

  return newPolluted.size;
}

function simulateEcosystem(cells, water, larvae, bio) {
  const oysters = cells.filter(c => c.type === 'oyster').length;
  const grass = cells.filter(c => c.type === 'grass').length;
  const pollution = cells.filter(c => c.polluted).length;

  water += oysters * OYSTER_WATER_BONUS - pollution * POLLUTION_WATER_PENALTY;
  larvae += oysters * OYSTER_LARVAE_BONUS + grass * GRASS_LARVAE_BONUS - pollution * POLLUTION_LARVAE_PENALTY;
  bio += grass * GRASS_BIO_BONUS + oysters * OYSTER_BIO_BONUS - pollution * POLLUTION_BIO_PENALTY;

  water = Math.max(0, Math.min(100, water));
  larvae = Math.max(0, Math.min(100, larvae));
  bio = Math.max(0, Math.min(100, bio));

  return { water, larvae, bio };
}

function pickBestDeployment(cells, budget, remainingTurns, urgency) {
  const candidates = evaluateAllCandidates(cells, budget, remainingTurns, urgency);
  if (candidates.length === 0) return null;
  return candidates[0].deployment;
}

function evaluateAllCandidates(cells, budget, remainingTurns, urgency) {
  const piles = cells.filter(c => c.type === 'pile').length;
  const riskMap = calculatePollutionSpreadRisk(cells, piles);
  const { pileValues } = calculateBestPilePositions(cells);
  const candidates = [];

  const highRiskPositions = Array.from(riskMap.entries())
    .filter(([, risk]) => risk >= POLLUTION_SPREAD_BASE * 0.8)
    .sort((a, b) => b[1] - a[1]);

  if (highRiskPositions.length > 0) {
    for (let i = 0; i < Math.min(2, highRiskPositions.length); i++) {
      const [targetIndex, risk] = highRiskPositions[i];
      let pileValue = pileValues.get(targetIndex) || 0;
      if (pileValue === 0) {
        getNeighbors(targetIndex).forEach(n => {
          if (cells[n].polluted) pileValue++;
        });
      }
      if (pileValue > 0) {
        const score = pileValue * 10 + risk * 100 + (urgency === 'critical' ? 50 : 0);
        const pos = getXY(targetIndex);
        candidates.push({
          type: 'pile',
          score,
          scoreBreakdown: {
            blockValue: pileValue * 10,
            riskBonus: Math.round(risk * 100),
            urgencyBonus: urgency === 'critical' ? 50 : 0
          },
          deployment: {
            type: 'pile',
            targetIndex,
            cost: COSTS.pile,
            benefit: `阻挡${pileValue}个方向的污染扩散，预计减少${Math.round(risk * 100)}%扩散风险`,
            detailedBenefit: {
              blockedDirections: pileValue,
              riskReduction: Math.round(risk * 100),
              estimatedScoreGain: Math.round(score)
            },
            reason: `位置(${pos.x + 1},${pos.y + 1})扩散风险${Math.round(risk * 100)}%，封堵后可保护${pileValue}个相邻格`,
            relatedCells: Array.from(new Set([targetIndex, ...getNeighbors(targetIndex).filter(n => cells[n].polluted)]))
          }
        });
      }
    }
  }

  const pollutedEmptyIndices = cells
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell }) => cell.polluted && cell.type === 'empty')
    .map(({ i }) => i);

  if (pollutedEmptyIndices.length > 0) {
    const oysterCandidates = pollutedEmptyIndices
      .map(index => ({ index, info: calculateOysterValue(cells, index, remainingTurns) }))
      .sort((a, b) => b.info.value - a.info.value)
      .slice(0, 2);

    oysterCandidates.forEach(({ index, info }) => {
      const pos = getXY(index);
      candidates.push({
        type: 'oyster',
        score: info.value,
        scoreBreakdown: {
          cleanValue: Math.round(info.value * 0.6),
          ecoBonus: Math.round(info.value * 0.4)
        },
        deployment: {
          type: 'oyster',
          targetIndex: index,
          cost: COSTS.oyster,
          benefit: `预计挽回${Math.round(info.value)}点属性损失，有${Math.round(OYSTER_CLEAN_CHANCE * 100)}%概率每回合净化该格`,
          detailedBenefit: {
            pollutionCleaned: Math.round(OYSTER_CLEAN_CHANCE * remainingTurns),
            ecoGainPerTurn: (OYSTER_WATER_BONUS + OYSTER_LARVAE_BONUS + OYSTER_BIO_BONUS).toFixed(1),
            totalEcoGain: Math.round(info.value)
          },
          reason: info.reason,
          relatedCells: info.relatedCells
        }
      });
    });
  }

  if (urgency !== 'critical') {
    const grassCandidates = [];
    cells.forEach((cell, index) => {
      if (cell.type !== 'empty' || cell.polluted) return;
      const info = calculateGrassValue(cells, index, remainingTurns);
      if (info.value > 0) {
        grassCandidates.push({ index, info });
      }
    });

    grassCandidates
      .sort((a, b) => b.info.value - a.info.value)
      .slice(0, 2)
      .forEach(({ index, info }) => {
        const pos = getXY(index);
        candidates.push({
          type: 'grass',
          score: info.value * 0.8,
          scoreBreakdown: {
            ecoValue: Math.round(info.value * 0.7),
            clusterBonus: Math.round(info.value * 0.1)
          },
          deployment: {
            type: 'grass',
            targetIndex: index,
            cost: COSTS.grass,
            benefit: `预计贡献${Math.round(info.value)}点生态值，提升生物多样性`,
            detailedBenefit: {
              ecoGainPerTurn: (GRASS_LARVAE_BONUS + GRASS_BIO_BONUS).toFixed(1),
              totalEcoGain: Math.round(info.value)
            },
            reason: info.reason,
            relatedCells: info.relatedCells
          }
        });
      });
  }

  candidates.sort((a, b) => b.score - a.score);

  candidates.forEach((c, idx) => {
    if (idx === 0) {
      c.deployment.rejectionReason = null;
    } else {
      const best = candidates[0];
      const scoreDiff = Math.round(best.score - c.score);
      const reasons = [];

      if (c.type !== best.type) {
        const typePriority = { pile: 3, oyster: 2, grass: 1 };
        if (typePriority[c.type] < typePriority[best.type]) {
          if (urgency === 'critical' && c.type === 'grass') {
            reasons.push('当前局势危急，需优先控制污染而非发展生态');
          } else if (best.type === 'pile' && c.type !== 'pile') {
            reasons.push('污染扩散风险过高，封堵优先级高于净化/生态建设');
          } else if (best.type === 'oyster' && c.type === 'grass') {
            reasons.push('存在未处理的污染格，净化优先级高于生态建设');
          }
        }
      }

      if (c.deployment.cost > best.deployment.cost) {
        reasons.push(`成本更高(多${c.deployment.cost - best.deployment.cost}预算)`);
      }

      reasons.push(`综合评分低${scoreDiff}分`);
      c.deployment.rejectionReason = reasons.join('；');
    }

    c.deployment.comparativeScore = {
      self: Math.round(c.score),
      best: Math.round(candidates[0].score),
      difference: idx === 0 ? 0 : Math.round(candidates[0].score - c.score)
    };
  });

  return candidates;
}

export function generateRoadmap(game, scene) {
  const { cells, budget, turn, water, larvae, bio } = game;
  const remainingTurns = scene.turns - turn + 1;
  const { pollution } = getFacilityCounts(game);

  const maxSteps = Math.min(3, remainingTurns);
  if (maxSteps <= 0) return [];

  const roadmap = [];
  let simCells = cloneCells(cells);
  let simBudget = budget;
  let simWater = water;
  let simLarvae = larvae;
  let simBio = bio;

  const initialScore = projectScore(cells, budget, water, larvae, bio);
  const totalProjectedGain = { water: 0, larvae: 0, bio: 0 };

  for (let step = 0; step < maxSteps; step++) {
    const tideNumber = turn + step;
    const futureRemainingTurns = scene.turns - tideNumber + 1;
    const piles = simCells.filter(c => c.type === 'pile').length;
    const currentPollution = simCells.filter(c => c.polluted).length;
    const urgencyInfo = analyzeUrgency(simCells, futureRemainingTurns, simBudget);
    const riskMap = calculatePollutionSpreadRisk(simCells, piles);
    const maxRisk = Math.max(0, ...Array.from(riskMap.values()));

    const currentScore = projectScore(simCells, simBudget, simWater, simLarvae, simBio);
    const goalGap = Math.max(0, scene.goalScore - currentScore);

    const allCandidates = evaluateAllCandidates(simCells, simBudget, futureRemainingTurns, urgencyInfo.urgency);
    if (allCandidates.length === 0) break;

    const deployment = allCandidates[0].deployment;
    const alternatives = allCandidates.slice(1, 4).map(c => ({
      type: c.deployment.type,
      targetIndex: c.deployment.targetIndex,
      cost: c.deployment.cost,
      benefit: c.deployment.benefit,
      rejectionReason: c.deployment.rejectionReason,
      comparativeScore: c.deployment.comparativeScore
    }));

    const canAfford = simBudget >= deployment.cost;
    const executable = step === 0 && canAfford;

    const stormRisk = evaluateStormRisk(simCells, scene.stormChance, deployment);
    const budgetProjection = projectBudget(simBudget, step, maxSteps, deployment.cost, canAfford);
    const goalAnalysis = analyzeGoalProgress(scene, currentScore, goalGap, deployment, step, maxSteps);

    const planHint = step === 0
      ? (canAfford ? '当前潮可立即执行' : '预算不足，需等待后续收入')
      : (canAfford ? '预测该潮预算充足，计划执行' : '预计该潮预算不足，需等待后续收入');

    roadmap.push({
      tide: tideNumber,
      stepIndex: step,
      executable,
      canAfford,
      planHint,
      type: deployment.type,
      targetIndex: deployment.targetIndex,
      cost: deployment.cost,
      benefit: deployment.benefit,
      detailedBenefit: deployment.detailedBenefit,
      reason: deployment.reason,
      projectedBudget: simBudget,
      budgetAfter: canAfford ? simBudget - deployment.cost : simBudget + TURN_BUDGET_BONUS - deployment.cost,
      budgetProjection,
      pollutionRisk: maxRisk,
      pollutionCount: currentPollution,
      stormProbability: scene.stormChance,
      stormRisk,
      goalGap,
      goalAnalysis,
      urgency: urgencyInfo.urgency,
      relatedCells: deployment.relatedCells,
      alternatives,
      comparativeScore: deployment.comparativeScore,
      projectedStats: {
        water: Math.round(simWater),
        larvae: Math.round(simLarvae),
        bio: Math.round(simBio)
      },
      sceneGoals: extractSceneGoals(scene)
    });

    if (canAfford) {
      simCells[deployment.targetIndex].type = deployment.type;
      simBudget -= deployment.cost;
    }

    if (step < maxSteps - 1) {
      const beforePollution = simCells.filter(c => c.polluted).length;
      simulatePollutionSpread(simCells);
      const afterPollution = simCells.filter(c => c.polluted).length;

      const ecoResult = simulateEcosystem(simCells, simWater, simLarvae, simBio);
      totalProjectedGain.water += ecoResult.water - simWater;
      totalProjectedGain.larvae += ecoResult.larvae - simLarvae;
      totalProjectedGain.bio += ecoResult.bio - simBio;
      simWater = ecoResult.water;
      simLarvae = ecoResult.larvae;
      simBio = ecoResult.bio;
      simBudget += TURN_BUDGET_BONUS;
    }
  }

  if (roadmap.length > 0) {
    const finalProjectedScore = projectScore(simCells, simBudget, simWater, simLarvae, simBio);
    roadmap._summary = {
      totalSteps: roadmap.length,
      initialScore,
      projectedFinalScore: finalProjectedScore,
      projectedScoreGain: finalProjectedScore - initialScore,
      totalCost: roadmap.reduce((sum, s) => sum + s.cost, 0),
      budgetRemaining: simBudget,
      projectedPollution: simCells.filter(c => c.polluted).length,
      goalReached: finalProjectedScore >= scene.goalScore,
      goalGapRemaining: Math.max(0, scene.goalScore - finalProjectedScore),
      sceneGoalDesc: scene.goalDesc,
      warnings: generateRoadmapWarnings(roadmap, scene, simCells)
    };
  }

  return roadmap;
}

function evaluateStormRisk(cells, stormChance, deployment) {
  const vulnerableTypes = ['oyster', 'grass'];
  const isVulnerable = vulnerableTypes.includes(deployment.type);
  const currentFacilities = cells.filter(c => c.type !== 'empty').length;

  return {
    facilityVulnerable: isVulnerable,
    damageChance: isVulnerable ? Math.round(stormChance * STORM_DAMAGE_CHANCE * 100) : 0,
    protectionLevel: cells.filter(c => c.type === 'pile').length,
    recommendation: stormChance > 0.35 && isVulnerable
      ? `风暴概率${Math.round(stormChance * 100)}%，该设施有损毁风险，建议配合围护桩使用`
      : stormChance > 0.35 && deployment.type === 'pile'
        ? '围护桩可抵御风暴，适合当前高风暴风险环境'
        : '风暴风险可控'
  };
}

function projectBudget(currentBudget, stepIndex, totalSteps, cost, executable) {
  const futureTurns = totalSteps - stepIndex - 1;
  const futureIncome = futureTurns * TURN_BUDGET_BONUS;
  const totalAvailable = currentBudget + futureIncome;
  const remainingAfterThis = executable
    ? currentBudget - cost + futureIncome
    : currentBudget + TURN_BUDGET_BONUS - cost + (futureTurns - 1) * TURN_BUDGET_BONUS;

  return {
    futureIncome,
    totalAvailableBudget: totalAvailable,
    remainingAfterDeployment: Math.max(0, remainingAfterThis),
    canAffordFutureSteps: remainingAfterThis >= Math.min(COSTS.pile, COSTS.grass),
    budgetPerTurn: TURN_BUDGET_BONUS
  };
}

function analyzeGoalProgress(scene, currentScore, goalGap, deployment, stepIndex, totalSteps) {
  const estimatedGain = deployment.detailedBenefit
    ? (deployment.detailedBenefit.estimatedScoreGain || deployment.detailedBenefit.totalEcoGain || 0)
    : 0;
  const remainingSteps = totalSteps - stepIndex;
  const requiredGainPerStep = remainingSteps > 0 ? Math.ceil(goalGap / remainingSteps) : goalGap;

  return {
    currentScore,
    goalScore: scene.goalScore,
    goalGap,
    estimatedGainFromThis: estimatedGain,
    requiredPerRemainingStep: requiredGainPerStep,
    onTrack: estimatedGain >= requiredGainPerStep * 0.8,
    paceAssessment: estimatedGain >= requiredGainPerStep
      ? '此步收益达标，按进度可达成目标'
      : estimatedGain >= requiredGainPerStep * 0.5
        ? '此步收益基本达标，后续需持续高效部署'
        : '此步收益偏低，后续需更优策略'
  };
}

function extractSceneGoals(scene) {
  const goals = [];
  goals.push({
    type: 'score',
    label: '目标评分',
    target: scene.goalScore,
    description: `评分 ≥ ${scene.goalScore}`
  });
  if (scene.goalPollutionMax !== undefined) {
    goals.push({
      type: 'pollution',
      label: '污染上限',
      target: scene.goalPollutionMax,
      description: `污染 ≤ ${scene.goalPollutionMax}格`
    });
  }
  if (scene.goalMinStats !== undefined) {
    goals.push({
      type: 'minStats',
      label: '最低属性',
      target: scene.goalMinStats,
      description: `水质/幼体/生物 ≥ ${scene.goalMinStats}`
    });
  }
  return goals;
}

function generateRoadmapWarnings(roadmap, scene, finalCells) {
  const warnings = [];
  const finalPollution = finalCells.filter(c => c.polluted).length;

  if (scene.goalPollutionMax !== undefined && finalPollution > scene.goalPollutionMax) {
    warnings.push(`预计最终污染${finalPollution}格，超出目标${scene.goalPollutionMax}格上限，需加强封堵和净化`);
  }

  const hasPlannedSteps = roadmap.some(s => !s.executable);
  if (hasPlannedSteps) {
    warnings.push('部分步骤需等待后续预算收入，建议按计划推进');
  }

  const highStormRisk = roadmap.some(s => s.stormProbability > 0.35 && s.stormRisk.facilityVulnerable);
  if (highStormRisk && roadmap.filter(s => s.type === 'pile').length < 1) {
    warnings.push('风暴风险较高，建议适当增加围护桩保护设施');
  }

  if (roadmap._summary && !roadmap._summary.goalReached) {
    warnings.push(`按当前路线预计仍差${roadmap._summary.goalGapRemaining}分，需要寻找更优部署方案`);
  }

  return warnings;
}
