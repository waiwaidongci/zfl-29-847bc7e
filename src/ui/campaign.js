import { getAllCampaigns, getCampaign } from '../data/campaigns.js';
import {
  createCampaignProgress,
  loadCampaignProgress,
  saveCampaignProgress,
  deleteCampaignProgress,
  hasSavedCampaign,
  getChapterCarryOverSummary,
  isCampaignComplete
} from '../game/campaign.js';
import { ICONS } from '../game/constants.js';

let campaignReplayState = {
  currentIndex: 0,
  replayData: null,
  overlayEl: null
};

export function renderCampaignList(containerEl, onSelect) {
  const campaigns = getAllCampaigns();

  containerEl.innerHTML = campaigns.map(c => {
    const hasSave = hasSavedCampaign(c.id);
    const saved = loadCampaignProgress(c.id);
    const chapterCount = c.chapters.length;
    let progressText = '';
    if (saved) {
      const completedCount = Object.values(saved.chapters).filter(ch => ch.status === 'completed').length;
      progressText = `进度：${completedCount}/${chapterCount}章`;
    }

    return `
      <div class="campaign-card" data-id="${c.id}">
        <h3>${c.name}</h3>
        <div class="campaign-desc">${c.desc}</div>
        <div class="campaign-meta">
          <span class="campaign-chapters">共${chapterCount}章</span>
          ${progressText ? `<span class="campaign-progress-tag">${progressText}</span>` : ''}
          ${hasSave ? '<span class="campaign-saved-tag">有存档</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  containerEl.querySelectorAll('.campaign-card').forEach(card => {
    card.onclick = () => onSelect(card.dataset.id);
  });
}

export function renderCampaignDetail(containerEl, campaignId, actions) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return;

  const saved = loadCampaignProgress(campaignId);
  const hasSave = saved !== null;

  let chaptersHtml = campaign.chapters.map(ch => {
    const chData = hasSave ? saved.chapters[ch.order] : null;
    const status = chData ? chData.status : 'locked';
    const statusLabel = { locked: '🔒 未解锁', unlocked: '🔓 可挑战', completed: '✅ 已完成', failed: '❌ 未通过' }[status] || status;
    const statusClass = `chapter-${status}`;

    const carryOver = hasSave ? getChapterCarryOverSummary(saved, ch.order) : null;
    let carryOverHtml = '';
    if (carryOver) {
      carryOverHtml = `
        <div class="chapter-carryover">
          <span>上一章结余：预算+${carryOver.budgetCarry}</span>
          <span>污染残留：${carryOver.pollutionResidue}格</span>
        </div>
      `;
    }

    const canStart = status === 'unlocked' || status === 'failed';
    const canReplay = status === 'completed' || status === 'failed';

    return `
      <div class="chapter-item ${statusClass}">
        <div class="chapter-header">
          <span class="chapter-name">${ch.name}</span>
          <span class="chapter-status">${statusLabel}</span>
        </div>
        <div class="chapter-desc">${ch.desc}</div>
        ${chData && chData.score !== null ? `<div class="chapter-score">评分：${chData.score}</div>` : ''}
        ${carryOverHtml}
        <div class="chapter-goals">目标：${ch.sceneConfig.goalDesc}</div>
        <div class="chapter-actions">
          ${canStart ? `<button class="chapter-start-btn" data-chapter="${ch.order}">开始本章</button>` : ''}
          ${canReplay ? `<button class="chapter-replay-btn secondary" data-chapter="${ch.order}">重玩本章</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const campaignComplete = hasSave && isCampaignComplete(saved);
  const totalScore = hasSave ? saved.totalScore : 0;

  containerEl.innerHTML = `
    <div class="campaign-detail">
      <button class="campaign-back-btn secondary">← 返回战役列表</button>
      <h2>${campaign.name}</h2>
      <div class="campaign-desc">${campaign.desc}</div>
      ${campaignComplete ? `<div class="campaign-complete-banner">🎉 战役通关！总评分：${totalScore}</div>` : ''}
      <div class="chapter-list">
        ${chaptersHtml}
      </div>
      <div class="campaign-actions">
        ${!hasSave ? `<button class="campaign-new-btn">开始新战役</button>` : ''}
        ${hasSave && !campaignComplete ? `<button class="campaign-continue-btn">继续战役</button>` : ''}
        ${hasSave ? `<button class="campaign-abandon-btn secondary">放弃战役</button>` : ''}
        ${campaignComplete ? `<button class="campaign-restart-btn">重新开始</button>` : ''}
      </div>
    </div>
  `;

  containerEl.querySelector('.campaign-back-btn').onclick = () => actions.back();

  containerEl.querySelectorAll('.chapter-start-btn').forEach(btn => {
    btn.onclick = () => actions.startChapter(Number(btn.dataset.chapter));
  });

  containerEl.querySelectorAll('.chapter-replay-btn').forEach(btn => {
    btn.onclick = () => actions.replayChapter(Number(btn.dataset.chapter));
  });

  const newBtn = containerEl.querySelector('.campaign-new-btn');
  if (newBtn) newBtn.onclick = () => actions.newCampaign(campaignId);

  const continueBtn = containerEl.querySelector('.campaign-continue-btn');
  if (continueBtn) continueBtn.onclick = () => actions.continueCampaign(campaignId);

  const abandonBtn = containerEl.querySelector('.campaign-abandon-btn');
  if (abandonBtn) abandonBtn.onclick = () => {
    if (confirm('确定要放弃当前战役进度吗？此操作不可撤销。')) {
      deleteCampaignProgress(campaignId);
      actions.back();
    }
  };

  const restartBtn = containerEl.querySelector('.campaign-restart-btn');
  if (restartBtn) restartBtn.onclick = () => actions.newCampaign(campaignId);
}

export function renderStoryDialog(overlayEl, title, text, buttonText, onClose) {
  overlayEl.innerHTML = `
    <div class="modal story-modal">
      <div class="story-icon">📜</div>
      <h2>${title}</h2>
      <div class="story-text">${text}</div>
      <div class="story-actions">
        <button class="story-continue-btn">${buttonText || '继续'}</button>
      </div>
    </div>
  `;

  overlayEl.classList.remove('hidden');

  overlayEl.querySelector('.story-continue-btn').onclick = () => {
    overlayEl.classList.add('hidden');
    if (onClose) onClose();
  };
}

export function showCampaignOverlay(overlayEl) {
  overlayEl.classList.remove('hidden');
}

export function hideCampaignOverlay(overlayEl) {
  overlayEl.classList.add('hidden');
}

export function showCampaignResult(overlayEl, result, chapterName, isLastChapter, carryOver, actions, replayData) {
  const resultClass = result.win ? 'campaign-result-win' : 'campaign-result-lose';
  const resultTitle = result.win ? '章节通过！' : '章节未通过';
  const resultIcon = result.win ? '🎉' : '💪';

  let nextActionHtml = '';
  if (result.win && !isLastChapter) {
    nextActionHtml = `<button class="campaign-next-btn">进入下一章</button>`;
  } else if (result.win && isLastChapter) {
    nextActionHtml = `<button class="campaign-next-btn">查看战役总结</button>`;
  }

  let carryOverHtml = '';
  if (carryOver && result.win && !isLastChapter) {
    const items = [];
    if (carryOver.budgetCarry > 0) {
      items.push(`<span class="carryover-item carryover-bonus">预算结转 +${carryOver.budgetCarry}</span>`);
    }
    if (carryOver.pollutionResidue > 0) {
      items.push(`<span class="carryover-item carryover-penalty">污染残留 +${carryOver.pollutionResidue}格</span>`);
    }
    if (carryOver.budgetCarry <= 0 && carryOver.pollutionResidue <= 0) {
      items.push(`<span class="carryover-item carryover-neutral">无额外继承</span>`);
    }
    carryOverHtml = `
      <div class="campaign-carryover-preview">
        <div class="carryover-label">下一章继承</div>
        <div class="carryover-items">${items.join('')}</div>
      </div>
    `;
  }

  const budgetValue = result.budget != null ? result.budget : 0;

  overlayEl.innerHTML = `
    <div class="modal campaign-result-modal ${resultClass}">
      <div class="result-tabs">
        <button class="result-tab active" data-tab="campaignResult">结算结果</button>
        <button class="result-tab" data-tab="campaignTurnReplay">回合回放</button>
      </div>
      <div class="result-tab-content" id="campaignResultTabContent">
        <div class="campaign-result-icon">${resultIcon}</div>
        <h2>${resultTitle}</h2>
        <div class="campaign-result-chapter">${chapterName}</div>
        <div class="campaign-result-stats">
          <div class="campaign-result-stat">
            <span>最终评分</span>
            <strong>${result.score}</strong>
          </div>
          <div class="campaign-result-stat">
            <span>污染格</span>
            <strong>${result.pollution}</strong>
          </div>
          <div class="campaign-result-stat">
            <span>剩余预算</span>
            <strong>${budgetValue}</strong>
          </div>
        </div>
        ${carryOverHtml}
        <p class="campaign-result-text">${result.text}</p>
      </div>
      <div class="result-tab-content hidden" id="campaignTurnReplayTabContent">
        <div class="turn-replay-container">
          <div class="turn-replay-header">
            <div class="turn-replay-title">🔄 回合回放</div>
            <div class="turn-replay-controls">
              <button class="turn-replay-btn" id="campaignReplayFirstBtn" title="第一潮">⏮</button>
              <button class="turn-replay-btn" id="campaignReplayPrevBtn" title="上一潮">◀</button>
              <div class="turn-replay-turn-info">
                <select id="campaignReplayTurnSelect"></select>
                <span>/ 共 <strong id="campaignReplayTotalTurns">0</strong> 潮</span>
              </div>
              <button class="turn-replay-btn" id="campaignReplayNextBtn" title="下一潮">▶</button>
              <button class="turn-replay-btn" id="campaignReplayLastBtn" title="最后潮">⏭</button>
            </div>
          </div>
          <div class="turn-replay-content">
            <div class="turn-replay-board-section">
              <div class="turn-replay-section-title">棋盘状态</div>
              <div class="turn-replay-grid" id="campaignReplayBoard"></div>
            </div>
            <div class="turn-replay-info-section">
              <div class="turn-replay-section">
                <div class="turn-replay-section-title">生态指标</div>
                <div class="turn-replay-stats" id="campaignReplayStats"></div>
              </div>
              <div class="turn-replay-section">
                <div class="turn-replay-section-title">本潮关键事件</div>
                <div class="turn-replay-events" id="campaignReplayTurnEvents"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="campaign-result-actions">
        ${nextActionHtml}
        <button class="campaign-retry-btn secondary">重玩本章</button>
        <button class="campaign-exit-btn secondary">退出战役</button>
      </div>
    </div>
  `;

  overlayEl.classList.remove('hidden');

  overlayEl.querySelectorAll('.result-tab').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      overlayEl.querySelectorAll('.result-tab').forEach(b => b.classList.toggle('active', b === btn));
      overlayEl.querySelectorAll('.result-tab-content').forEach(el => {
        el.classList.toggle('hidden', el.id !== tab + 'TabContent');
      });
    };
  });

  if (replayData) {
    initCampaignTurnReplay(overlayEl, replayData);
  }

  const nextBtn = overlayEl.querySelector('.campaign-next-btn');
  if (nextBtn) nextBtn.onclick = () => actions.next();

  const retryBtn = overlayEl.querySelector('.campaign-retry-btn');
  if (retryBtn) retryBtn.onclick = () => actions.retry();

  const exitBtn = overlayEl.querySelector('.campaign-exit-btn');
  if (exitBtn) exitBtn.onclick = () => actions.exit();
}

export function showCampaignSummary(overlayEl, campaignId, progress, callbacks) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return;

  const chapters = campaign.chapters.map(ch => {
    const chData = progress.chapters[ch.order];
    return `
      <div class="summary-chapter">
        <div class="summary-chapter-name">${ch.name}</div>
        <div class="summary-chapter-score">${chData && chData.score !== null ? chData.score + '分' : '—'}</div>
        <div class="summary-chapter-status">${chData && chData.won ? '✅' : '❌'}</div>
      </div>
    `;
  }).join('');

  overlayEl.innerHTML = `
    <div class="modal campaign-summary-modal">
      <div class="campaign-result-icon">🏆</div>
      <h2>战役通关！</h2>
      <div class="campaign-summary-name">${campaign.name}</div>
      <div class="campaign-summary-total">总评分：<strong>${progress.totalScore}</strong></div>
      <div class="campaign-summary-chapters">${chapters}</div>
      <div class="campaign-result-actions">
        <button class="campaign-restart-btn">重新挑战</button>
        <button class="campaign-exit-btn secondary">退出</button>
      </div>
    </div>
  `;

  overlayEl.classList.remove('hidden');

  overlayEl.querySelector('.campaign-restart-btn').onclick = () => {
    deleteCampaignProgress(campaignId);
    overlayEl.classList.add('hidden');
    if (callbacks && callbacks.restart) callbacks.restart(campaignId);
  };

  overlayEl.querySelector('.campaign-exit-btn').onclick = () => {
    overlayEl.classList.add('hidden');
    if (callbacks && callbacks.exit) callbacks.exit();
  };
}

function initCampaignTurnReplay(overlayEl, replayData) {
  campaignReplayState = {
    currentIndex: 0,
    replayData,
    overlayEl
  };

  const snapshots = replayData.snapshots;
  if (!snapshots || snapshots.length === 0) return;

  const turnSelect = overlayEl.querySelector('#campaignReplayTurnSelect');
  const totalTurnsEl = overlayEl.querySelector('#campaignReplayTotalTurns');

  if (turnSelect) {
    turnSelect.innerHTML = snapshots.map((s, i) => {
      const label = s.turn === 0 ? '初始' : `第${s.turn}潮`;
      return `<option value="${i}">${label}</option>`;
    }).join('');
    turnSelect.onchange = () => {
      campaignReplayState.currentIndex = parseInt(turnSelect.value, 10);
      renderCampaignTurnReplay();
    };
  }

  if (totalTurnsEl) {
    const actualTurns = snapshots.length - 1;
    totalTurnsEl.textContent = actualTurns > 0 ? actualTurns : snapshots.length;
  }

  bindCampaignTurnReplayControls();
  renderCampaignTurnReplay();
}

function bindCampaignTurnReplayControls() {
  const { overlayEl } = campaignReplayState;

  const firstBtn = overlayEl.querySelector('#campaignReplayFirstBtn');
  const prevBtn = overlayEl.querySelector('#campaignReplayPrevBtn');
  const nextBtn = overlayEl.querySelector('#campaignReplayNextBtn');
  const lastBtn = overlayEl.querySelector('#campaignReplayLastBtn');

  if (firstBtn) {
    firstBtn.onclick = () => {
      campaignReplayState.currentIndex = 0;
      updateCampaignTurnSelectAndRender();
    };
  }
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (campaignReplayState.currentIndex > 0) {
        campaignReplayState.currentIndex--;
        updateCampaignTurnSelectAndRender();
      }
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      const maxIndex = campaignReplayState.replayData.snapshots.length - 1;
      if (campaignReplayState.currentIndex < maxIndex) {
        campaignReplayState.currentIndex++;
        updateCampaignTurnSelectAndRender();
      }
    };
  }
  if (lastBtn) {
    lastBtn.onclick = () => {
      campaignReplayState.currentIndex = campaignReplayState.replayData.snapshots.length - 1;
      updateCampaignTurnSelectAndRender();
    };
  }
}

function updateCampaignTurnSelectAndRender() {
  const { overlayEl } = campaignReplayState;
  const turnSelect = overlayEl.querySelector('#campaignReplayTurnSelect');
  if (turnSelect) {
    turnSelect.value = campaignReplayState.currentIndex;
  }
  renderCampaignTurnReplay();
}

function renderCampaignTurnReplay() {
  const { overlayEl, replayData, currentIndex } = campaignReplayState;
  if (!replayData) return;

  const snapshot = replayData.snapshots[currentIndex];
  if (!snapshot) return;

  renderCampaignReplayBoard(snapshot);
  renderCampaignReplayStats(snapshot);
  renderCampaignReplayTurnEvents(snapshot.turn);
  updateCampaignReplayButtonStates();
}

function renderCampaignReplayBoard(snapshot) {
  const { overlayEl } = campaignReplayState;
  const boardEl = overlayEl.querySelector('#campaignReplayBoard');
  if (!boardEl || !snapshot.cells) return;

  boardEl.innerHTML = snapshot.cells
    .map(
      (cell, i) =>
        `<div class="cell ${cell.type}${cell.polluted ? ' polluted' : ''}" data-i="${i}"><span>${ICONS[cell.type]}</span></div>`
    )
    .join('');
}

function renderCampaignReplayStats(snapshot) {
  const { overlayEl, replayData, currentIndex } = campaignReplayState;
  const statsEl = overlayEl.querySelector('#campaignReplayStats');
  if (!statsEl) return;

  const prevSnapshot = currentIndex > 0 
    ? replayData.snapshots[currentIndex - 1] 
    : null;

  const delta = (key) => {
    if (!prevSnapshot) return '';
    const diff = snapshot[key] - prevSnapshot[key];
    if (diff === 0) return '';
    const sign = diff > 0 ? '+' : '';
    const colorClass = diff > 0 ? 'delta-pos' : 'delta-neg';
    return ` <span class="${colorClass}">(${sign}${diff})</span>`;
  };

  statsEl.innerHTML = `
    <div class="replay-stat">
      <span class="replay-stat-label">回合</span>
      <span class="replay-stat-value">${snapshot.turn === 0 ? '初始' : '第' + snapshot.turn + '潮'}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">预算</span>
      <span class="replay-stat-value">${snapshot.budget}${delta('budget')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">水质</span>
      <span class="replay-stat-value">${snapshot.water}${delta('water')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">幼体</span>
      <span class="replay-stat-value">${snapshot.larvae}${delta('larvae')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">多样性</span>
      <span class="replay-stat-value">${snapshot.bio}${delta('bio')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">污染格</span>
      <span class="replay-stat-value">${snapshot.pollution}${delta('pollution')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">牡蛎礁</span>
      <span class="replay-stat-value">${snapshot.oysters}${delta('oysters')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">海草床</span>
      <span class="replay-stat-value">${snapshot.grass}${delta('grass')}</span>
    </div>
    <div class="replay-stat">
      <span class="replay-stat-label">围护桩</span>
      <span class="replay-stat-value">${snapshot.piles}${delta('piles')}</span>
    </div>
  `;
}

function renderCampaignReplayTurnEvents(turn) {
  const { overlayEl, replayData } = campaignReplayState;
  const eventsEl = overlayEl.querySelector('#campaignReplayTurnEvents');
  if (!eventsEl || !replayData.events) return;

  const turnEvents = replayData.events.filter(e => e.turn === turn);

  const eventIcons = {
    start: { icon: '🌊', label: '开局' },
    place: { icon: '🔧', label: '放置' },
    remove: { icon: '🗑️', label: '移除' },
    storm: { icon: '⛈️', label: '风暴' },
    pollution_spread: { icon: '☣️', label: '扩散' },
    oyster_clean: { icon: '💧', label: '净化' },
    turn_end: { icon: '🌙', label: '结算' },
    win: { icon: '🏆', label: '胜利' },
    lose: { icon: '📉', label: '失败' }
  };

  if (turnEvents.length === 0) {
    eventsEl.innerHTML = '<div class="replay-events-empty">本潮无关键事件</div>';
    return;
  }

  eventsEl.innerHTML = turnEvents.map(ev => {
    const meta = eventIcons[ev.type] || { icon: '📌', label: ev.type };
    return `
      <div class="replay-event-item replay-event-${ev.type}">
        <span class="replay-event-icon">${meta.icon}</span>
        <span class="replay-event-label">${meta.label}</span>
        <span class="replay-event-message">${ev.message}</span>
      </div>
    `;
  }).join('');
}

function updateCampaignReplayButtonStates() {
  const { overlayEl, replayData, currentIndex } = campaignReplayState;

  const firstBtn = overlayEl.querySelector('#campaignReplayFirstBtn');
  const prevBtn = overlayEl.querySelector('#campaignReplayPrevBtn');
  const nextBtn = overlayEl.querySelector('#campaignReplayNextBtn');
  const lastBtn = overlayEl.querySelector('#campaignReplayLastBtn');

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === replayData.snapshots.length - 1;

  if (firstBtn) firstBtn.disabled = isFirst;
  if (prevBtn) prevBtn.disabled = isFirst;
  if (nextBtn) nextBtn.disabled = isLast;
  if (lastBtn) lastBtn.disabled = isLast;
}
