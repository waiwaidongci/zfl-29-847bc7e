import {
  getFacilityCounts,
  applyEcosystemEffects,
  spreadPollution,
  triggerStorm,
  clampAllStats,
  checkWinCondition,
  recordReplaySnapshot,
  recordReplayEvent,
  calculateScore,
  getGameRules
} from './state.js';
import { getFacilityName } from './rules-engine.js';
import { unlockByEvent } from './codex.js';

export function advanceTurn(game, scene) {
  if (game.ended) return { ended: false };

  const { oysters, grass, piles, buffers, pollution } = getFacilityCounts(game);
  const rules = getGameRules(game);

  applyEcosystemEffects(game);
  spreadPollution(game, piles);

  if (game.rng.random() < scene.stormChance) {
    triggerStorm(game);
  }

  clampAllStats(game);

  const score = calculateScore(game);
  recordReplaySnapshot(game);
  recordReplayEvent(game, 'turn_end', `第${game.turn}潮结束：评分约${score}，水质${Math.round(game.water)}，幼体${Math.round(game.larvae)}，多样性${Math.round(game.bio)}，污染${game.cells.filter(c => c.polluted).length}格`, {
    score,
    water: Math.round(game.water),
    larvae: Math.round(game.larvae),
    bio: Math.round(game.bio),
    pollution: game.cells.filter(c => c.polluted).length
  });

  const oysterName = getFacilityName(rules, 'oyster');
  const grassName = getFacilityName(rules, 'grass');
  const pileName = getFacilityName(rules, 'pile');
  const bufferName = getFacilityName(rules, 'buffer');
  game.log.unshift(
    `第${game.turn}潮结束：${oysterName}${oysters}处，${grassName}${grass}处，${pileName}${piles}处，${bufferName}${buffers}处。`
  );

  if (game.turn >= scene.turns) {
    return finishGame(game, scene);
  }

  game.turn += 1;
  return { ended: false };
}

export function finishGame(game, scene) {
  game.ended = true;
  const { win, score, pollution } = checkWinCondition(game, scene);

  if (pollution === 0) {
    unlockByEvent('pollution_cleared');
  }

  unlockByEvent(win ? 'repair_win' : 'repair_lose');

  const stormSurvived = (game.stormHitCount || 0) > 0;
  const stormDamaged = (game.stormDamageCount || 0) > 0;

  recordReplayEvent(game, win ? 'win' : 'lose', win ? '修复成功！' : '修复仍需加力', {
    score,
    pollution,
    water: Math.round(game.water),
    larvae: Math.round(game.larvae),
    bio: Math.round(game.bio),
    budget: game.budget,
    stormSurvived,
    stormDamaged
  });

  const resultText =
    scene[win ? 'winText' : 'loseText'] +
    ` 最终评分：${score}（水质${Math.round(game.water)}，幼体${Math.round(game.larvae)}，多样性${Math.round(game.bio)}，污染${pollution}格）。`;

  return {
    ended: true,
    win,
    score,
    pollution,
    budget: game.budget,
    title: win ? '修复成功' : '修复仍需加力',
    text: resultText,
    stormSurvived,
    stormDamaged,
    stormHitCount: game.stormHitCount || 0,
    stormDamageCount: game.stormDamageCount || 0,
    finalWater: Math.round(game.water),
    finalLarvae: Math.round(game.larvae),
    finalBio: Math.round(game.bio)
  };
}
