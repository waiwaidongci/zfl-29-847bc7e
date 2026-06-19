import { ICONS } from '../game/constants.js';

export function renderGrid(gridEl, cells, onClick) {
  gridEl.innerHTML = cells
    .map(
      (cell, i) =>
        `<div class="cell ${cell.type}${cell.polluted ? ' polluted' : ''}" data-i="${i}"><span>${ICONS[cell.type]}</span></div>`
    )
    .join('');

  gridEl.querySelectorAll('.cell').forEach(cell => {
    cell.onclick = () => onClick(Number(cell.dataset.i));
  });
}

export function renderStats(game, scene) {
  document.querySelector('#turnText').textContent = `${game.turn} / ${scene.turns}`;
  document.querySelector('#budgetText').textContent = game.budget;
  document.querySelector('#waterText').textContent = Math.round(game.water);
  document.querySelector('#larvaeText').textContent = Math.round(game.larvae);
  document.querySelector('#bioText').textContent = Math.round(game.bio);
  document.querySelector('#pollutionText').textContent = game.cells.filter(c => c.polluted).length;
}

export function renderLog(logEl, log) {
  logEl.innerHTML = log.map(item => `<div class="entry">${item}</div>`).join('');
}

export function renderToolButtons(currentTool) {
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === currentTool);
  });
}
