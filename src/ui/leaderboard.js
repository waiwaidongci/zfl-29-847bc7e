import { getTopEntries, getCategoryStats, resetLeaderboard } from '../game/leaderboard.js';

const CATEGORY_META = {
  standard: { label: '标准场景', icon: '🌊' },
  sandbox: { label: '自定义沙盒', icon: '🏗️' },
  challenge: { label: '挑战码导入', icon: '📤' }
};

let currentCategory = 'standard';

export function showLeaderboard(overlayEl) {
  renderLeaderboardContent(overlayEl);
  overlayEl.classList.remove('hidden');
}

export function hideLeaderboard(overlayEl) {
  overlayEl.classList.add('hidden');
}

function renderLeaderboardContent(overlayEl) {
  const stats = getCategoryStats();

  overlayEl.innerHTML = `
    <div class="modal leaderboard-modal">
      <div class="leaderboard-header">
        <h2>🏅 排行榜</h2>
        <div class="leaderboard-stats">
          共 ${stats.all} 条记录
        </div>
        <button class="leaderboard-close secondary">✕</button>
      </div>
      <div class="leaderboard-tabs">
        ${Object.entries(CATEGORY_META).map(([key, meta]) => `
          <button class="leaderboard-tab ${key === currentCategory ? 'active' : ''}" data-category="${key}">
            ${meta.icon} ${meta.label} <span class="lb-count">(${stats[key]})</span>
          </button>
        `).join('')}
      </div>
      <div class="leaderboard-content" id="leaderboardContent">
        ${renderEntryList(currentCategory)}
      </div>
      <div class="leaderboard-footer">
        <div class="leaderboard-hint">同一种子下污染扩散、风暴触发和设施损毁结果一致，可输入种子重玩</div>
        <button class="secondary" id="lbResetBtn">清空记录</button>
      </div>
    </div>
  `;

  overlayEl.querySelector('.leaderboard-close').onclick = () => hideLeaderboard(overlayEl);

  overlayEl.querySelectorAll('.leaderboard-tab').forEach(tab => {
    tab.onclick = () => {
      currentCategory = tab.dataset.category;
      overlayEl.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const content = overlayEl.querySelector('#leaderboardContent');
      content.innerHTML = renderEntryList(currentCategory);
    };
  });

  const resetBtn = overlayEl.querySelector('#lbResetBtn');
  resetBtn.onclick = () => {
    if (confirm('确定要清空所有排行榜记录吗？此操作不可撤销。')) {
      resetLeaderboard();
      renderLeaderboardContent(overlayEl);
    }
  };
}

function renderEntryList(category) {
  const entries = getTopEntries(category, 20);

  if (entries.length === 0) {
    return `<div class="lb-empty">暂无${CATEGORY_META[category].label}的记录<br><span class="lb-empty-sub">完成一局对局后将自动记录</span></div>`;
  }

  return `
    <div class="lb-table">
      <div class="lb-row lb-header-row">
        <div class="lb-col lb-rank">#</div>
        <div class="lb-col lb-scene">场景</div>
        <div class="lb-col lb-seed">种子</div>
        <div class="lb-col lb-score">评分</div>
        <div class="lb-col lb-budget">预算</div>
        <div class="lb-col lb-pollution">污染</div>
        <div class="lb-col lb-facilities">设施</div>
        <div class="lb-col lb-time">用时</div>
        <div class="lb-col lb-result">结果</div>
      </div>
      ${entries.map((entry, i) => renderEntryRow(entry, i + 1)).join('')}
    </div>
  `;
}

function renderEntryRow(entry, rank) {
  const rankClass = rank <= 3 ? ` lb-rank-${rank}` : '';
  const rankDisplay = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank;
  const duration = formatDuration(entry.duration);
  const resultBadge = entry.win
    ? '<span class="lb-badge lb-badge-win">胜</span>'
    : '<span class="lb-badge lb-badge-lose">负</span>';

  return `
    <div class="lb-row${rankClass}">
      <div class="lb-col lb-rank">${rankDisplay}</div>
      <div class="lb-col lb-scene">${entry.sceneName}</div>
      <div class="lb-col lb-seed" title="种子: ${entry.seedStr}">${entry.seedStr}</div>
      <div class="lb-col lb-score">${entry.score}</div>
      <div class="lb-col lb-budget">${entry.budget}</div>
      <div class="lb-col lb-pollution">${entry.pollution}</div>
      <div class="lb-col lb-facilities">${entry.facilityCount}</div>
      <div class="lb-col lb-time">${duration}</div>
      <div class="lb-col lb-result">${resultBadge}</div>
    </div>
  `;
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return '-';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}秒`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分${sec}秒`;
}

export function updateLeaderboardButton(btnEl) {
  const stats = getCategoryStats();
  const badge = btnEl.querySelector('.lb-btn-badge');
  if (badge) {
    badge.textContent = stats.all;
  }
}
