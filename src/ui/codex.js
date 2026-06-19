import { CODEX_CATEGORIES } from '../data/codex.js';
import { getEntriesByCategory } from '../data/codex.js';
import { isUnlocked, getUnlockedCount, getTotalCount } from '../game/codex.js';

let activeCategory = CODEX_CATEGORIES[0].id;

export function renderCodexModal(codexOverlayEl) {
  const total = getTotalCount();
  const unlocked = getUnlockedCount();

  codexOverlayEl.innerHTML = `
    <div class="modal codex-modal">
      <div class="codex-header">
        <h2>生态图鉴</h2>
        <span class="codex-progress">${unlocked} / ${total} 已解锁</span>
        <button class="codex-close secondary" id="codexCloseBtn">✕</button>
      </div>
      <div class="codex-tabs">
        ${CODEX_CATEGORIES.map(cat => `
          <button class="codex-tab ${cat.id === activeCategory ? 'active' : ''}" data-cat="${cat.id}">
            ${cat.icon} ${cat.name}
          </button>
        `).join('')}
      </div>
      <div class="codex-content" id="codexContent">
        ${renderCategoryContent(activeCategory)}
      </div>
    </div>
  `;

  codexOverlayEl.querySelector('#codexCloseBtn').onclick = () => {
    codexOverlayEl.classList.add('hidden');
  };

  codexOverlayEl.querySelectorAll('.codex-tab').forEach(tab => {
    tab.onclick = () => {
      activeCategory = tab.dataset.cat;
      codexOverlayEl.querySelectorAll('.codex-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const content = codexOverlayEl.querySelector('#codexContent');
      content.innerHTML = renderCategoryContent(activeCategory);
    };
  });

  codexOverlayEl.onclick = (e) => {
    if (e.target === codexOverlayEl) {
      codexOverlayEl.classList.add('hidden');
    }
  };
}

function renderCategoryContent(categoryId) {
  const entries = getEntriesByCategory(categoryId);

  return entries.map(entry => {
    const unlocked = isUnlocked(entry.id);
    return `
      <div class="codex-entry ${unlocked ? '' : 'locked'}">
        <div class="codex-entry-diagram">
          ${unlocked ? entry.diagram : renderLockedDiagram()}
        </div>
        <div class="codex-entry-info">
          <h3>${unlocked ? entry.name : '???'}</h3>
          <p>${unlocked ? entry.desc : '尚未解锁——在对局中触发对应事件后解锁说明与示意图。'}</p>
        </div>
        ${unlocked ? '' : '<div class="codex-lock-badge">🔒</div>'}
      </div>
    `;
  }).join('');
}

function renderLockedDiagram() {
  return `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="60" height="40" rx="6" fill="#e0e0e0" stroke="#bbb" stroke-width="1"/>
    <text x="40" y="35" text-anchor="middle" font-size="18" fill="#aaa">?</text>
  </svg>`;
}

export function showCodex(codexOverlayEl) {
  renderCodexModal(codexOverlayEl);
  codexOverlayEl.classList.remove('hidden');
}

export function updateCodexButton(codexBtnEl) {
  const unlocked = getUnlockedCount();
  const total = getTotalCount();
  codexBtnEl.querySelector('.codex-badge').textContent = `${unlocked}/${total}`;
}
