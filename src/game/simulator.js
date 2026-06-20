import {
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS
} from './constants.js';
import { createRNG } from './seeded-random.js';
import {
  createRulesContext,
  calculateEcosystemEffects,
  spreadPollutionWithRules,
  triggerStormWithRules,
  clampAllStatsWithRules,
  calculateScoreWithRules,
  checkWinConditionWithRules,
  getFacilityCost
} from './rules-engine.js';

function deepCloneGameState(game) {
  if (!game) return null;

  const cells = game.cells.map(cell => ({ ...cell }));

  const rngState = game.rng ? {
    seed: game.rng.seed,
    _internal: null
  } : null;

  const rulesSnapshot = game.rules ? JSON.parse(JSON.stringify(game.rules)) : null;

  const cloned = {
    turn: game.turn,
    budget: game.budget,
    water: game.water,
    larvae: game.larvae,
    bio: game.bio,
    ended: false,
    cells,
    seed: game.seed,
    seedStr: game.seedStr,
    rules: rulesSnapshot,
    gameMode: 'simulation',
    stormHitCount: game.stormHitCount || 0,
    stormDamageCount: game.stormDamageCount || 0,
    rng: null,
    _simulationLog: [],
    _simulationEvents: [],
    _turnSnapshots: []
  };

  cloned.rng = createRNG(game.seed);

  return cloned;
}

function recordSimEvent(simGame, type, message, data) {
  simGame._simulationEvents.push({
    turn: simGame.turn,
    type,
    message,
    data: data || null
  });
}

function recordSimSnapshot(simGame) {
  const oysters = simGame.cells.filter(c => c.type === 'oyster').length;
  const grass = simGame.cells.filter(c => c.type === 'grass').length;
  const piles = simGame.cells.filter(c => c.type === 'pile').length;
  const buffers = simGame.cells.filter(c => c.type === 'buffer').length;
  const pollution = simGame.cells.filter(c => c.polluted).length;

  simGame._turnSnapshots.push({
    turn: simGame.turn,
    water: Math.round(simGame.water),
    larvae: Math.round(simGame.larvae),
    bio: Math.round(simGame.bio),
    pollution,
    budget: simGame.budget,
    oysters,
    grass,
    piles,
    buffers,
    score: calculateScoreWithRules(simGame, simGame.rules)
  });
}

function simApplyEcosystemEffects(simGame) {
  const deltas = calculateEcosystemEffects(simGame, simGame.rules);
  simGame.water += deltas.waterDelta;
  simGame.larvae += deltas.larvaeDelta;
  simGame.bio += deltas.bioDelta;
  simGame.budget += deltas.budgetDelta;

  if (deltas.oysters > 0 || deltas.grass > 0 || deltas.pollution > 0) {
    recordSimEvent(simGame, 'ecosystem', `生态效果：${deltas.waterDelta >= 0 ? '+' : ''}${deltas.waterDelta.toFixed(1)}水质，${deltas.larvaeDelta >= 0 ? '+' : ''}${deltas.larvaeDelta.toFixed(1)}幼体，${deltas.bioDelta >= 0 ? '+' : ''}${deltas.bioDelta.toFixed(1)}多样性`, {
      waterDelta: deltas.waterDelta,
      larvaeDelta: deltas.larvaeDelta,
      bioDelta: deltas.bioDelta
    });
  }

  return deltas;
}

function simSpreadPollution(simGame) {
  const result = spreadPollutionWithRules(simGame, simGame.rules);
  const { newPolluted, cleanedCount } = result;

  if (newPolluted.size > 0) {
    recordSimEvent(simGame, 'pollution_spread', `污染扩散，新增${newPolluted.size}个污染格`, {
      count: newPolluted.size,
      indices: Array.from(newPolluted)
    });
  }

  if (cleanedCount > 0) {
    recordSimEvent(simGame, 'oyster_clean', `牡蛎礁净化了${cleanedCount}个污染格`, {
      count: cleanedCount
    });
  }

  return result;
}

function simTriggerStorm(simGame, stormChance) {
  if (!simGame.rules.storm.enabled || simGame.rules.effects.stormImmunity) {
    return null;
  }

  if (simGame.rng.random() >= stormChance) {
    return null;
  }

  const result = triggerStormWithRules(simGame, simGame.rules);

  let eventMsg = result.damaged
    ? `风暴潮来袭，一处${result.damagedType || '设施'}受损`
    : '风暴潮来袭，设施未受损';
  if (result.bufferSaved) {
    eventMsg = `风暴潮来袭，${result.targetType || '设施'}在缓冲带保护下免受损毁`;
  }

  recordSimEvent(simGame, 'storm', eventMsg, {
    damaged: result.damaged,
    damagedType: result.damagedType,
    bufferCount: result.bufferCount,
    targetType: result.targetType,
    bufferSaved: result.bufferSaved
  });

  return result;
}

export function simulateOneRun(originalGame, scene, options = {}) {
  const {
    prePlacements = [],
    turnsToSimulate = null,
    customSeed = null
  } = options;

  const simGame = deepCloneGameState(originalGame);
  if (customSeed != null) {
    simGame.seed = customSeed | 0;
    simGame.rng = createRNG(customSeed | 0);
  }

  const rules = simGame.rules;
  for (const placement of prePlacements) {
    const { index, type } = placement;
    if (index >= 0 && index < simGame.cells.length) {
      const cell = simGame.cells[index];
      if (cell.type === 'empty' || type === 'erase') {
        if (type === 'erase') {
          cell.type = 'empty';
        } else {
          const cost = getFacilityCost(rules, type);
          if (simGame.budget >= cost) {
            cell.type = type;
            simGame.budget -= cost;
            recordSimEvent(simGame, 'pre_place', `预放置：${type}在位置${index}`, {
              index, type, cost
            });
          }
        }
      }
    }
  }

  const stormChance = scene.stormChance || 0.2;
  const maxTurns = scene.turns || 10;
  const totalTurnsToSim = turnsToSimulate != null
    ? Math.min(turnsToSimulate, maxTurns - simGame.turn + 1)
    : (maxTurns - simGame.turn + 1);

  const startTurn = simGame.turn;
  recordSimSnapshot(simGame);

  let stormHitCount = 0;
  let stormDamageCount = 0;
  let pollutionSpreadCount = 0;
  let pollutionCleanedCount = 0;

  for (let i = 0; i < totalTurnsToSim; i++) {
    if (simGame.ended) break;

    simApplyEcosystemEffects(simGame);
    const spreadResult = simSpreadPollution(simGame);
    pollutionSpreadCount += spreadResult.newPolluted.size;
    pollutionCleanedCount += spreadResult.cleanedCount;

    const stormResult = simTriggerStorm(simGame, stormChance);
    if (stormResult) {
      stormHitCount++;
      if (stormResult.damaged) {
        stormDamageCount++;
      }
    }

    clampAllStatsWithRules(simGame, rules);
    recordSimSnapshot(simGame);

    const score = calculateScoreWithRules(simGame, rules);
    recordSimEvent(simGame, 'turn_end', `第${simGame.turn}潮结束：评分约${score}`, {
      score,
      water: Math.round(simGame.water),
      larvae: Math.round(simGame.larvae),
      bio: Math.round(simGame.bio),
      pollution: simGame.cells.filter(c => c.polluted).length
    });

    if (simGame.turn >= maxTurns) {
      simGame.ended = true;
      break;
    }
    simGame.turn += 1;
  }

  const finalScore = calculateScoreWithRules(simGame, rules);
  const winResult = checkWinConditionWithRules(simGame, scene, rules);

  return {
    finalScore,
    win: winResult.win,
    pollution: winResult.pollution,
    finalWater: Math.round(simGame.water),
    finalLarvae: Math.round(simGame.larvae),
    finalBio: Math.round(simGame.bio),
    finalBudget: simGame.budget,
    stormHitCount,
    stormDamageCount,
    pollutionSpreadCount,
    pollutionCleanedCount,
    events: simGame._simulationEvents,
    snapshots: simGame._turnSnapshots,
    turnsSimulated: simGame.turn - startTurn + (simGame.ended ? 1 : 0),
    finalCells: simGame.cells.map(c => ({ ...c }))
  };
}

export function runMonteCarloSimulation(originalGame, scene, options = {}) {
  const {
    prePlacements = [],
    runs = 100,
    turnsToSimulate = null,
    customSeed = null,
    onProgress = null
  } = options;

  const results = [];
  const baseSeed = customSeed != null ? customSeed : originalGame.seed;

  for (let i = 0; i < runs; i++) {
    const runSeed = (baseSeed + i * 2654435761) | 0;
    const result = simulateOneRun(originalGame, scene, {
      prePlacements,
      turnsToSimulate,
      customSeed: runSeed
    });
    result.runIndex = i;
    result.seedUsed = runSeed;
    results.push(result);

    if (onProgress && (i % 10 === 0 || i === runs - 1)) {
      onProgress(i + 1, runs);
    }
  }

  return analyzeSimulationResults(results, options);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function analyzeSimulationResults(results, options) {
  const n = results.length;
  if (n === 0) return null;

  const scores = results.map(r => r.finalScore);
  const pollutions = results.map(r => r.pollution);
  const waters = results.map(r => r.finalWater);
  const larvaes = results.map(r => r.finalLarvae);
  const bios = results.map(r => r.finalBio);
  const budgets = results.map(r => r.finalBudget);
  const stormHits = results.map(r => r.stormHitCount);
  const stormDamages = results.map(r => r.stormDamageCount);
  const pollutionSpreads = results.map(r => r.pollutionSpreadCount);
  const pollutionCleaneds = results.map(r => r.pollutionCleanedCount);
  const wins = results.filter(r => r.win).length;

  const scoreStats = {
    min: Math.min(...scores),
    max: Math.max(...scores),
    mean: scores.reduce((a, b) => a + b, 0) / n,
    median: percentile(scores, 50),
    p10: percentile(scores, 10),
    p25: percentile(scores, 25),
    p75: percentile(scores, 75),
    p90: percentile(scores, 90),
    stddev: Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - (scores.reduce((a, b) => a + b, 0) / n), 2), 0) / n)
  };

  const pollutionStats = {
    min: Math.min(...pollutions),
    max: Math.max(...pollutions),
    mean: pollutions.reduce((a, b) => a + b, 0) / n,
    median: percentile(pollutions, 50),
    p75: percentile(pollutions, 75),
    p90: percentile(pollutions, 90)
  };

  const trendSnapshots = aggregateSnapshots(results);

  const keyEvents = extractKeyEvents(results);

  const worstRun = results.reduce((worst, r) => r.finalScore < worst.finalScore ? r : worst, results[0]);
  const bestRun = results.reduce((best, r) => r.finalScore > best.finalScore ? r : best, results[0]);

  return {
    runCount: n,
    scoreStats,
    pollutionStats,
    baseSeed: options.customSeed != null ? options.customSeed : null,
    stats: {
      waterMean: waters.reduce((a, b) => a + b, 0) / n,
      larvaeMean: larvaes.reduce((a, b) => a + b, 0) / n,
      bioMean: bios.reduce((a, b) => a + b, 0) / n,
      budgetMean: budgets.reduce((a, b) => a + b, 0) / n,
      stormHitMean: stormHits.reduce((a, b) => a + b, 0) / n,
      stormDamageMean: stormDamages.reduce((a, b) => a + b, 0) / n,
      pollutionSpreadMean: pollutionSpreads.reduce((a, b) => a + b, 0) / n,
      pollutionCleanedMean: pollutionCleaneds.reduce((a, b) => a + b, 0) / n
    },
    winRate: wins / n,
    winCount: wins,
    loseCount: n - wins,
    trendSnapshots,
    keyEvents,
    bestCase: {
      score: bestRun.finalScore,
      win: bestRun.win,
      pollution: bestRun.pollution,
      seed: bestRun.seedUsed,
      keyEvents: summarizeRunEvents(bestRun.events)
    },
    worstCase: {
      score: worstRun.finalScore,
      win: worstRun.win,
      pollution: worstRun.pollution,
      seed: worstRun.seedUsed,
      keyEvents: summarizeRunEvents(worstRun.events)
    },
    riskAssessment: assessRisks(results, pollutionStats, scoreStats)
  };
}

function aggregateSnapshots(results) {
  if (results.length === 0) return [];
  const maxTurns = Math.max(...results.map(r => r.snapshots.length));

  const aggregated = [];
  for (let t = 0; t < maxTurns; t++) {
    const scoresAtTurn = [];
    const pollutionAtTurn = [];
    const waterAtTurn = [];
    const larvaeAtTurn = [];
    const bioAtTurn = [];
    const budgetAtTurn = [];

    for (const r of results) {
      const snap = r.snapshots[t];
      if (!snap) continue;
      scoresAtTurn.push(snap.score);
      pollutionAtTurn.push(snap.pollution);
      waterAtTurn.push(snap.water);
      larvaeAtTurn.push(snap.larvae);
      bioAtTurn.push(snap.bio);
      budgetAtTurn.push(snap.budget);
    }

    if (scoresAtTurn.length === 0) continue;

    aggregated.push({
      turn: t,
      score: {
        mean: scoresAtTurn.reduce((a, b) => a + b, 0) / scoresAtTurn.length,
        p10: percentile(scoresAtTurn, 10),
        p90: percentile(scoresAtTurn, 90)
      },
      pollution: {
        mean: pollutionAtTurn.reduce((a, b) => a + b, 0) / pollutionAtTurn.length,
        p75: percentile(pollutionAtTurn, 75),
        max: Math.max(...pollutionAtTurn)
      },
      water: waterAtTurn.reduce((a, b) => a + b, 0) / waterAtTurn.length,
      larvae: larvaeAtTurn.reduce((a, b) => a + b, 0) / larvaeAtTurn.length,
      bio: bioAtTurn.reduce((a, b) => a + b, 0) / bioAtTurn.length,
      budget: budgetAtTurn.reduce((a, b) => a + b, 0) / budgetAtTurn.length
    });
  }

  return aggregated;
}

function extractKeyEvents(results) {
  const eventCounts = new Map();
  const eventExamples = new Map();

  for (const r of results) {
    for (const ev of r.events) {
      const key = ev.type;
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
      if (!eventExamples.has(key) && Math.random() < 0.1) {
        eventExamples.set(key, ev);
      }
    }
  }

  const totalRuns = results.length;
  const events = [];

  for (const [type, count] of eventCounts.entries()) {
    events.push({
      type,
      count,
      frequency: count / totalRuns,
      percentage: Math.round((count / totalRuns) * 100),
      example: eventExamples.get(type)
    });
  }

  events.sort((a, b) => b.count - a.count);
  return events;
}

function summarizeRunEvents(events) {
  const summary = {
    storms: 0,
    stormsDamaging: 0,
    pollutionSpread: 0,
    pollutionCleaned: 0
  };

  for (const ev of events) {
    switch (ev.type) {
      case 'storm':
        summary.storms++;
        if (ev.data && ev.data.damaged) summary.stormsDamaging++;
        break;
      case 'pollution_spread':
        summary.pollutionSpread += (ev.data && ev.data.count) || 0;
        break;
      case 'oyster_clean':
        summary.pollutionCleaned += (ev.data && ev.data.count) || 0;
        break;
    }
  }

  return summary;
}

function assessRisks(results, pollutionStats, scoreStats) {
  const n = results.length;

  const highPollutionRuns = results.filter(r => r.pollution > pollutionStats.p75).length;
  const stormDamageRuns = results.filter(r => r.stormDamageCount > 0).length;
  const lowScoreRuns = results.filter(r => r.finalScore < scoreStats.p25).length;

  const stormRiskLevel = stormDamageRuns / n > 0.5 ? 'high' : stormDamageRuns / n > 0.2 ? 'medium' : 'low';
  const pollutionRiskLevel = highPollutionRuns / n > 0.4 ? 'high' : highPollutionRuns / n > 0.2 ? 'medium' : 'low';
  const scoreRiskLevel = lowScoreRuns / n > 0.4 ? 'high' : lowScoreRuns / n > 0.2 ? 'medium' : 'low';

  return {
    stormRisk: {
      level: stormRiskLevel,
      runsAffected: stormDamageRuns,
      percentage: Math.round((stormDamageRuns / n) * 100),
      description: generateStormRiskDescription(stormRiskLevel, stormDamageRuns, n)
    },
    pollutionRisk: {
      level: pollutionRiskLevel,
      runsAffected: highPollutionRuns,
      percentage: Math.round((highPollutionRuns / n) * 100),
      description: generatePollutionRiskDescription(pollutionRiskLevel, highPollutionRuns, n, pollutionStats)
    },
    scoreRisk: {
      level: scoreRiskLevel,
      runsAffected: lowScoreRuns,
      percentage: Math.round((lowScoreRuns / n) * 100),
      description: generateScoreRiskDescription(scoreRiskLevel, lowScoreRuns, n, scoreStats)
    }
  };
}

function generateStormRiskDescription(level, runs, total) {
  const pct = Math.round((runs / total) * 100);
  if (level === 'high') {
    return `高风险：${pct}%的模拟中设施被风暴损毁，强烈建议增加潮汐缓冲带或围护桩`;
  } else if (level === 'medium') {
    return `中风险：${pct}%的模拟中出现设施损毁，可考虑补充防护设施`;
  }
  return `低风险：仅${pct}%的模拟中出现设施损毁，当前防护策略基本足够`;
}

function generatePollutionRiskDescription(level, runs, total, stats) {
  const pct = Math.round((runs / total) * 100);
  if (level === 'high') {
    return `高风险：${pct}%的模拟中污染超过75分位线(${Math.ceil(stats.p75)}格)，需要加强封堵和净化`;
  } else if (level === 'medium') {
    return `中风险：${pct}%的模拟中污染偏高，建议优化污染控制布局`;
  }
  return `低风险：仅${pct}%的模拟中污染超过预期，污染控制策略有效`;
}

function generateScoreRiskDescription(level, runs, total, stats) {
  const pct = Math.round((runs / total) * 100);
  if (level === 'high') {
    return `高风险：${pct}%的模拟评分低于25分位线(${Math.floor(stats.p25)}分)，需调整核心策略`;
  } else if (level === 'medium') {
    return `中风险：${pct}%的模拟评分偏低，还有优化空间`;
  }
  return `低风险：评分分布良好，策略表现稳定`;
}

export function comparePlans(originalGame, scene, planAnalysisList) {
  if (!planAnalysisList || planAnalysisList.length === 0) return null;

  const reference = planAnalysisList[0];
  const compared = planAnalysisList.slice(1);

  const comparisons = compared.map((plan, idx) => {
    const scoreDiff = plan.analysis.scoreStats.mean - reference.analysis.scoreStats.mean;
    const winDiff = plan.analysis.winRate - reference.analysis.winRate;
    const pollutionDiff = plan.analysis.pollutionStats.mean - reference.analysis.pollutionStats.mean;

    const pros = [];
    const cons = [];

    if (scoreDiff > 2) {
      pros.push(`平均评分高出 ${scoreDiff.toFixed(1)} 分`);
    } else if (scoreDiff < -2) {
      cons.push(`平均评分低出 ${Math.abs(scoreDiff).toFixed(1)} 分`);
    }

    if (winDiff > 0.05) {
      pros.push(`胜率高出 ${Math.round(winDiff * 100)}%`);
    } else if (winDiff < -0.05) {
      cons.push(`胜率低出 ${Math.round(Math.abs(winDiff) * 100)}%`);
    }

    if (pollutionDiff < -1) {
      pros.push(`平均污染少 ${Math.abs(pollutionDiff).toFixed(1)} 格`);
    } else if (pollutionDiff > 1) {
      cons.push(`平均污染多 ${pollutionDiff.toFixed(1)} 格`);
    }

    return {
      planIndex: idx + 1,
      planName: plan.name,
      placements: plan.placements,
      scoreDifference: scoreDiff,
      winRateDifference: winDiff,
      pollutionDifference: pollutionDiff,
      pros,
      cons,
      recommendation: scoreDiff >= 0 && winDiff >= 0 ? 'better' : scoreDiff <= -5 || winDiff <= -0.1 ? 'worse' : 'similar'
    };
  });

  return {
    reference: {
      planName: reference.name,
      placements: reference.placements,
      scoreMean: reference.analysis.scoreStats.mean,
      winRate: reference.analysis.winRate,
      pollutionMean: reference.analysis.pollutionStats.mean
    },
    comparisons
  };
}

export function generateRecommendedPlan(originalGame, scene, budget) {
  const recommendations = [];
  const cells = originalGame.cells;
  const rules = originalGame.rules || createRulesContext();

  const COSTS = {
    oyster: getFacilityCost(rules, 'oyster'),
    grass: getFacilityCost(rules, 'grass'),
    pile: getFacilityCost(rules, 'pile'),
    buffer: getFacilityCost(rules, 'buffer')
  };

  const pollutionFrontier = new Map();
  cells.forEach((cell, i) => {
    if (!cell.polluted) return;
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        if (dx === 0 && dy === 0) continue;
        const x = i % GRID_COLS + dx;
        const y = Math.floor(i / GRID_COLS) + dy;
        if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
          const ni = y * GRID_COLS + x;
          if (!cells[ni].polluted && cells[ni].type === 'empty') {
            const current = pollutionFrontier.get(ni) || 0;
            pollutionFrontier.set(ni, current + 1);
          }
        }
      }
    }
  });

  const frontierSorted = Array.from(pollutionFrontier.entries()).sort((a, b) => b[1] - a[1]);
  if (frontierSorted.length > 0 && budget >= COSTS.pile) {
    const [idx] = frontierSorted[0];
    recommendations.push({
      type: 'pile',
      index: idx,
      cost: COSTS.pile,
      reason: `污染前沿位置，可阻挡多个方向的扩散`
    });
  }

  const pollutedEmpty = cells
    .map((c, i) => ({ cell: c, i }))
    .filter(({ cell }) => cell.polluted && cell.type === 'empty')
    .map(({ i }) => i);

  if (pollutedEmpty.length > 0 && budget >= COSTS.oyster + (recommendations.length > 0 ? COSTS.pile : 0)) {
    recommendations.push({
      type: 'oyster',
      index: pollutedEmpty[0],
      cost: COSTS.oyster,
      reason: `直接在污染格上净化，同时提供生态增益`
    });
  }

  const facilityCount = cells.filter(c => c.type !== 'empty' && c.type !== 'pile').length;
  if (scene.stormChance >= 0.25 && facilityCount >= 3 && budget >= COSTS.buffer + recommendations.reduce((s, r) => s + r.cost, 0)) {
    const bufferCandidates = [];
    cells.forEach((cell, i) => {
      if (cell.type !== 'empty' || cell.polluted) return;
      let protectedCount = 0;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > 2) continue;
          const x = i % GRID_COLS + dx;
          const y = Math.floor(i / GRID_COLS) + dy;
          if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
            const ni = y * GRID_COLS + x;
            if (cells[ni].type !== 'empty' && cells[ni].type !== 'pile' && cells[ni].type !== 'buffer') {
              protectedCount++;
            }
          }
        }
      }
      if (protectedCount >= 2) {
        bufferCandidates.push({ index: i, protectedCount });
      }
    });
    bufferCandidates.sort((a, b) => b.protectedCount - a.protectedCount);
    if (bufferCandidates.length > 0) {
      recommendations.push({
        type: 'buffer',
        index: bufferCandidates[0].index,
        cost: COSTS.buffer,
        reason: `可保护${bufferCandidates[0].protectedCount}处设施免受风暴损毁`
      });
    }
  }

  const cleanEmpty = cells
    .map((c, i) => ({ cell: c, i }))
    .filter(({ cell }) => !cell.polluted && cell.type === 'empty')
    .map(({ i }) => i);

  let remainingBudget = budget - recommendations.reduce((s, r) => s + r.cost, 0);
  if (cleanEmpty.length > 0 && remainingBudget >= COSTS.grass) {
    recommendations.push({
      type: 'grass',
      index: cleanEmpty[0],
      cost: COSTS.grass,
      reason: `在清洁区域种植海草床，长期提升多样性`
    });
  }

  return recommendations;
}
