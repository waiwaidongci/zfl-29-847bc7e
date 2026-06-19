import {
  getFacilityCounts,
  applyEcosystemEffects,
  spreadPollution,
  triggerStorm,
  clampAllStats,
  checkWinCondition
} from './state.js';
import { unlockByEvent } from './codex.js';

export function advanceTurn(game, scene) {
  if (game.ended) return { ended: false };

  const { oysters, grass, piles, pollution } = getFacilityCounts(game);

  applyEcosystemEffects(game);
  spreadPollution(game, piles);

  if (Math.random() < scene.stormChance) {
    triggerStorm(game);
  }

  clampAllStats(game);

  game.log.unshift(
    `第${game.turn}潮结束：牡蛎礁${oysters}处，海草床${grass}处，围护桩${piles}处。`
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

  const resultText =
    scene[win ? 'winText' : 'loseText'] +
    ` 最终评分：${score}（水质${Math.round(game.water)}，幼体${Math.round(game.larvae)}，多样性${Math.round(game.bio)}，污染${pollution}格）。`;

  return {
    ended: true,
    win,
    score,
    pollution,
    title: win ? '修复成功' : '修复仍需加力',
    text: resultText
  };
}
