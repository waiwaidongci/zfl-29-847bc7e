import { getAllCampaigns, getCampaign } from '../data/campaigns.js';
import {
  createCampaignProgress,
  loadCampaignProgress,
  saveCampaignProgress,
  deleteCampaignProgress,
  hasSavedCampaign,
  getChapterCarryOverSummary,
  isCampaignComplete,
  getBranchRewardMeta,
  BRANCH_REWARD_TYPES
} from '../game/campaign.js';
import { ICONS } from '../game/constants.js';
import { renderBestComparison } from './modals.js';

let campaignReplayState = {
  currentIndex: 0,
  replayData: null,
  overlayEl: null
};

function renderBranchRewardsList(rewards, options = {}) {
  if (!rewards || rewards.length === 0) return '';

  const { title, showSources = false } = options;

  const items = rewards.map(r => {
    const meta = getBranchRewardMeta(r.type);
    const valueText = meta.format(r.value);
    const sourcesText = showSources && r.sources && r.sources.length > 0
      ? `<div class="branch-reward-sources">来源：${r.sources.join('、')}</div>`
      : '';
    const posClass = meta.positive ? 'branch-reward-positive' : 'branch-reward-negative';

    return `
      <div class="branch-reward-item ${posClass}">
        <span class="branch-reward-icon">${meta.icon}</span>
        <div class="branch-reward-info">
          <div class="branch-reward-label">${meta.label}</div>
          <div class="branch-reward-value">${valueText}</div>
          ${sourcesText}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="branch-rewards-section">
      ${title ? `<div class="branch-rewards-title">${title}</div>` : ''}
      <div class="branch-rewards-list">${items}</div>
    </div>
  `;
}

function getGradeBadgeHtml(grade) {
  if (!grade) return '';
  const gradeColors = {
    S: 'grade-s',
    A: 'grade-a',
    B: 'grade-b',
    C: 'grade-c'
  };
  return `<span class="grade-badge ${gradeColors[grade] || ''}">${grade}级</span>`;
}

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
    let earnedRewardsHtml = '';
    let appliedRewardsHtml = '';

    if (carryOver) {
      const baseInfo = [];
      if (carryOver.prevScore !== null && carryOver.prevScore !== undefined) {
        baseInfo.push(`上一章评分：${carryOver.prevScore}${getGradeBadgeHtml(carryOver.prevGrade)}`);
      }
      if (carryOver.prevWon === true) {
        baseInfo.push('✅ 上章通过');
      } else if (carryOver.prevWon === false) {
        baseInfo.push('❌ 上章未通过');
      }
      if (baseInfo.length > 0) {
        carryOverHtml = `<div class="chapter-prev-info">${baseInfo.join(' · ')}</div>`;
      }

      if (carryOver.appliedBranchRewards && carryOver.appliedBranchRewards.length > 0) {
        appliedRewardsHtml = renderBranchRewardsList(carryOver.appliedBranchRewards, {
          title: '🔮 本章开局修正',
          showSources: true
        });
      }
    }

    if (chData && chData.branchRewards && chData.branchRewards.length > 0) {
      earnedRewardsHtml = renderBranchRewardsList(chData.branchRewards, {
        title: '🎁 本章产生的分支奖励',
        showSources: true
      });
    }

    let gradeHtml = '';
    if (chData && chData.grade) {
      gradeHtml = getGradeBadgeHtml(chData.grade);
    }

    let stormInfoHtml = '';
    if (chData && chData.stormSurvived) {
      const stormText = chData.stormDamaged ? '⛈️ 遭遇风暴（有损坏）' : '⛅ 成功抵御风暴（无损坏）';
      stormInfoHtml = `<div class="chapter-storm-info">${stormText}</div>`;
    }

    const canStart = status === 'unlocked' || status === 'failed';
    const canReplay = status === 'completed' || status === 'failed';

    return `
      <div class="chapter-item ${statusClass}">
        <div class="chapter-header">
          <span class="chapter-name">${ch.name} ${gradeHtml}</span>
          <span class="chapter-status">${statusLabel}</span>
        </div>
        <div class="chapter-desc">${ch.desc}</div>
        ${chData && chData.score !== null ? `<div class="chapter-score">评分：${chData.score}</div>` : ''}
        ${stormInfoHtml}
        ${carryOverHtml}
        ${appliedRewardsHtml}
        ${earnedRewardsHtml}
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
      <div class="branch-rewards-legend">
        <div class="legend-title">📖 分支奖励说明</div>
        <div class="legend-items">
          <span class="legend-item">💰 预算奖励</span>
          <span class="legend-item">💧 水质提升</span>
          <span class="legend-item">🐚 幼体提升</span>
          <span class="legend-item">🌿 多样性提升</span>
          <span class="legend-item">⛅ 风暴概率下降</span>
          <span class="legend-item">☣️ 污染残留</span>
        </div>
        <div class="legend-hint">根据每章的评分等级、污染控制、预算节余和风暴抵御情况，获得不同的开局修正。</div>
      </div>
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

export function showCampaignResult(overlayEl, result, chapterName, isLastChapter, carryOver, actions, replayData, lbResult) {
  const resultClass = result.win ? 'campaign-result-win' : 'campaign-result-lose';
  const resultTitle = result.win ? '章节通过！' : '章节未通过';
  const resultIcon = result.win ? '🎉' : '💪';

  let nextActionHtml = '';
  if (!isLastChapter) {
    nextActionHtml = `<button class="campaign-next-btn">${result.win ? '进入下一章' : '继续下一章（含惩罚）'}</button>`;
  } else if (result.win) {
    nextActionHtml = `<button class="campaign-next-btn">查看战役总结</button>`;
  }

  let carryOverHtml = '';
  if (carryOver && !isLastChapter) {
    const items = [];

    if (carryOver.branchRewards && carryOver.branchRewards.length > 0) {
      carryOver.branchRewards.forEach(r => {
        const meta = getBranchRewardMeta(r.type);
        const posClass = meta.positive ? 'carryover-bonus' : 'carryover-penalty';
        items.push(`
          <div class="carryover-item ${posClass}">
            <span class="carryover-item-icon">${meta.icon}</span>
            <span class="carryover-item-label">${meta.label}</span>
            <span class="carryover-item-value">${meta.format(r.value)}</span>
          </div>
        `);
      });
    }

    if (carryOver.budgetCarry > 0) {
      items.push(`<div class="carryover-item carryover-bonus"><span class="carryover-item-icon">📦</span><span class="carryover-item-label">预算结转</span><span class="carryover-item-value">+${carryOver.budgetCarry}</span></div>`);
    }
    if (carryOver.pollutionResidue > 0) {
      items.push(`<div class="carryover-item carryover-penalty"><span class="carryover-item-icon">☣️</span><span class="carryover-item-label">污染残留</span><span class="carryover-item-value">+${carryOver.pollutionResidue}格</span></div>`);
    }
    if (items.length === 0) {
      items.push(`<div class="carryover-item carryover-neutral">无额外继承</div>`);
    }

    const gradeHtml = carryOver.grade ? `<div class="carryover-grade">本章评级：${getGradeBadgeHtml(carryOver.grade)}</div>` : '';

    const sourcesHtml = carryOver.branchRewards && carryOver.branchRewards.length > 0
      ? `<div class="carryover-sources">
          ${carryOver.branchRewards.map(r => {
            if (r.sources && r.sources.length > 0) {
              const meta = getBranchRewardMeta(r.type);
              return `<div class="carryover-source-row">${meta.icon} ${meta.label}：${r.sources.join('、')}</div>`;
            }
            return '';
          }).join('')}
        </div>`
      : '';

    carryOverHtml = `
      <div class="campaign-carryover-preview">
        <div class="carryover-label">🎁 下一章开局修正</div>
        ${gradeHtml}
        <div class="carryover-items-grid">${items.join('')}</div>
        ${sourcesHtml}
      </div>
    `;
  }

  const budgetValue = result.budget != null ? result.budget : 0;

  let stormStatsHtml = '';
  if (result.stormHitCount > 0) {
    const stormText = result.stormDamageCount > 0
      ? `⛈️ 遭遇 ${result.stormHitCount} 次风暴，${result.stormDamageCount} 次造成损坏`
      : `⛅ 遭遇 ${result.stormHitCount} 次风暴，全部抵御成功！`;
    stormStatsHtml = `<div class="campaign-storm-stats">${stormText}</div>`;
  }

  const bestComparisonHtml = renderBestComparison(lbResult);

  overlayEl.innerHTML = `
    <div class="modal campaign-result-modal ${resultClass}">
      <div class="result-tabs">
        <button class="result-tab active" data-tab="campaignResult">结算结果</button>
        <button class="result-tab" data-tab="campaignTurnReplay">回合回放</button>
      </div>
      <div class="result-tab-content" id="campaignResultTabContent">
        <div class="campaign-result-icon">${resultIcon}</div>
        <h2>${resultTitle}</h2>
        <div class="campaign-result-chapter">${chapterName}${carryOver && carryOver.grade ? ' · ' + getGradeBadgeHtml(carryOver.grade) : ''}</div>
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
        ${stormStatsHtml}
        ${bestComparisonHtml}
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
    const gradeHtml = chData && chData.grade ? getGradeBadgeHtml(chData.grade) : '';
    return `
      <div class="summary-chapter">
        <div class="summary-chapter-name">${ch.name} ${gradeHtml}</div>
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
    const diff = (snapshot[key] ?? 0) - (prevSnapshot[key] ?? 0);
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
    <div class="replay-stat">
      <span class="replay-stat-label">潮汐缓冲带</span>
      <span class="replay-stat-value">${snapshot.buffers || 0}${delta('buffers')}</span>
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
