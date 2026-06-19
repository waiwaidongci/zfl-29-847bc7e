import { getTopEntries, getCategoryStats, resetLeaderboard, getDistinctSceneIds } from '../game/leaderboard.js';
import { getAllScenes } from '../data/scenes.js';
import { getAllCampaigns } from '../data/campaigns.js';

const MODE_META = {
  all: { label: '全部模式', icon: '📊' },
  standard: { label: '标准场景', icon: '🌊' },
  sandbox: { label: '自定义沙盒', icon: '🏗️' },
  challenge: { label: '挑战码导入', icon: '📤' },
  campaign: { label: '战役模式', icon: '⚔️' }
};

const RESULT_META = {
  all: { label: '全部结果' },
  win: { label: '仅胜利' },
  lose: { label: '仅失败' }
};

let currentFilters = {
  gameMode: 'all',
  sceneId: 'all',
  win: 'all'
};

export function showLeaderboard(overlayEl) {
  renderLeaderboardContent(overlayEl);
  overlayEl.classList.remove('hidden');
}

export function hideLeaderboard(overlayEl) {
  overlayEl.classList.add('hidden');
}

function getAllSceneOptions() {
  const options = [{ id: 'all', name: '全部场景' }];

  const standardScenes = getAllScenes().filter(s => s.id !== 'sandbox');
  for (const s of standardScenes) {
    options.push({ id: s.id, name: s.name, category: 'standard' });
  }

  const campaigns = getAllCampaigns();
  for (const c of campaigns) {
    for (const ch of c.chapters) {
      const sceneId = `campaign_${c.id}_ch${ch.order}`;
      options.push({ id: sceneId, name: `${c.name} - ${ch.name}`, category: 'campaign' });
    }
  }

  const distinctScenes = getDistinctSceneIds();
  for (const ds of distinctScenes) {
    if (!options.find(o => o.id === ds.id)) {
      options.push({ id: ds.id, name: ds.name, category: 'other' });
    }
  }

  return options;
}

function renderLeaderboardContent(overlayEl) {
  const stats = getCategoryStats();
  const sceneOptions = getAllSceneOptions();

  overlayEl.innerHTML = `
    <div class="modal leaderboard-modal">
      <div class="leaderboard-header">
        <h2>🏅 排行榜</h2>
        <div class="leaderboard-stats">
          共 ${stats.all} 条记录
        </div>
        <button class="leaderboard-close secondary">✕</button>
      </div>
      <div class="leaderboard-filters">
        <div class="lb-filter-group">
          <div class="lb-filter-label">游戏模式</div>
          <div class="lb-filter-buttons" data-filter="gameMode">
            ${Object.entries(MODE_META).map(([key, meta]) => `
              <button class="lb-filter-btn ${currentFilters.gameMode === key ? 'active' : ''}" data-value="${key}">
                ${meta.icon} ${meta.label}
                ${key !== 'all' && stats[key] != null ? `<span class="lb-count">(${stats[key]})</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="lb-filter-row">
          <div class="lb-filter-item">
            <div class="lb-filter-label">胜负结果</div>
            <select class="lb-filter-select" data-filter="win">
              ${Object.entries(RESULT_META).map(([key, meta]) => `
                <option value="${key}" ${currentFilters.win === key ? 'selected' : ''}>${meta.label}</option>
              `).join('')}
            </select>
          </div>
          <div class="lb-filter-item">
            <div class="lb-filter-label">具体场景</div>
            <select class="lb-filter-select" data-filter="sceneId">
              ${sceneOptions.map(s => `
                <option value="${s.id}" ${currentFilters.sceneId === s.id ? 'selected' : ''}>${s.name}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="leaderboard-content" id="leaderboardContent">
        ${renderEntryList(currentFilters)}
      </div>
      <div class="leaderboard-footer">
        <div class="leaderboard-hint">同一种子下污染扩散、风暴触发和设施损毁结果一致，可输入种子重玩。同场景同种子仅保留最佳成绩。</div>
        <button class="secondary" id="lbResetBtn">清空记录</button>
      </div>
    </div>
  `;

  overlayEl.querySelector('.leaderboard-close').onclick = () => hideLeaderboard(overlayEl);

  overlayEl.querySelectorAll('[data-filter="gameMode"] .lb-filter-btn').forEach(btn => {
    btn.onclick = () => {
      currentFilters.gameMode = btn.dataset.value;
      renderLeaderboardContent(overlayEl);
    };
  });

  overlayEl.querySelectorAll('.lb-filter-select').forEach(sel => {
    sel.onchange = () => {
      currentFilters[sel.dataset.filter] = sel.value;
      const content = overlayEl.querySelector('#leaderboardContent');
      content.innerHTML = renderEntryList(currentFilters);
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

function getFiltersForQuery(filters) {
  const q = { gameMode: filters.gameMode, sceneId: filters.sceneId };
  if (filters.win === 'win') q.win = true;
  else if (filters.win === 'lose') q.win = false;
  else q.win = 'all';
  return q;
}

function renderEntryList(filters) {
  const query = getFiltersForQuery(filters);
  const entries = getTopEntries(query, 50);

  if (entries.length === 0) {
    return `<div class="lb-empty">暂无符合筛选条件的记录<br><span class="lb-empty-sub">调整筛选条件或完成一局对局后查看</span></div>`;
  }

  return `
    <div class="lb-table">
      <div class="lb-row lb-header-row">
        <div class="lb-col lb-rank">#</div>
        <div class="lb-col lb-mode">模式</div>
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
  const modeIcon = MODE_META[entry.gameMode] ? MODE_META[entry.gameMode].icon : '📌';
  const modeLabel = MODE_META[entry.gameMode] ? MODE_META[entry.gameMode].label : entry.gameMode;

  return `
    <div class="lb-row${rankClass}">
      <div class="lb-col lb-rank">${rankDisplay}</div>
      <div class="lb-col lb-mode" title="${modeLabel}">${modeIcon}</div>
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
