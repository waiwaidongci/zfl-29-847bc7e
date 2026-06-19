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

export function showCampaignResult(overlayEl, result, chapterName, isLastChapter, actions) {
  const resultClass = result.win ? 'campaign-result-win' : 'campaign-result-lose';
  const resultTitle = result.win ? '章节通过！' : '章节未通过';
  const resultIcon = result.win ? '🎉' : '💪';

  let nextActionHtml = '';
  if (result.win && !isLastChapter) {
    nextActionHtml = `<button class="campaign-next-btn">进入下一章</button>`;
  } else if (result.win && isLastChapter) {
    nextActionHtml = `<button class="campaign-next-btn">查看战役总结</button>`;
  }

  overlayEl.innerHTML = `
    <div class="modal campaign-result-modal ${resultClass}">
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
          <strong>${result.budget}</strong>
        </div>
      </div>
      <p class="campaign-result-text">${result.text}</p>
      <div class="campaign-result-actions">
        ${nextActionHtml}
        <button class="campaign-retry-btn secondary">重玩本章</button>
        <button class="campaign-exit-btn secondary">退出战役</button>
      </div>
    </div>
  `;

  overlayEl.classList.remove('hidden');

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
