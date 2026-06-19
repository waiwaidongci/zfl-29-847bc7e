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
  TURN_BUDGET_BONUS
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
    suggestions: suggestions.slice(0, 3)
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
