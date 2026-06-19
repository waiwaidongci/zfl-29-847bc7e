import { ACHIEVEMENT_CATEGORIES, getAchievementsByCategory } from '../data/achievements.js';
import {
  isUnlocked,
  getUnlockInfo,
  getUnlockedCount,
  getTotalCount,
  resetAchievements
} from '../game/achievements.js';
import { getAllScenes } from '../data/scenes.js';

let activeCategory = ACHIEVEMENT_CATEGORIES[0].id;
let onResetCallback = null;

function getSceneName(sceneId) {
  if (!sceneId) return '通用';
  const scenes = getAllScenes();
  const scene = scenes.find(s => s.id === sceneId);
  return scene ? scene.name : sceneId === 'sandbox' ? '沙盒' : sceneId;
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function renderAchievementsModal(achievementsOverlayEl) {
  const total = getTotalCount();
  const unlocked = getUnlockedCount();
  const progress = Math.round((unlocked / total) * 100);

  achievementsOverlayEl.innerHTML = `
    <div class="modal achievements-modal">
      <div class="achievements-header">
        <h2>🏆 成就面板</h2>
        <div class="achievements-progress-wrap">
          <div class="achievements-progress-bar">
            <div class="achievements-progress-fill" style="width:${progress}%"></div>
          </div>
          <span class="achievements-progress-text">${unlocked} / ${total} (${progress}%)</span>
        </div>
        <button class="achievements-close secondary" id="achievementsCloseBtn">✕</button>
      </div>
      <div class="achievements-tabs">
        ${ACHIEVEMENT_CATEGORIES.map(cat => `
          <button class="achievements-tab ${cat.id === activeCategory ? 'active' : ''}" data-cat="${cat.id}">
            ${cat.icon} ${cat.name}
          </button>
        `).join('')}
      </div>
      <div class="achievements-content" id="achievementsContent">
        ${renderCategoryContent(activeCategory)}
      </div>
      <div class="achievements-footer">
        <button class="secondary" id="resetAchievementsBtn">🔄 重置所有成就</button>
      </div>
    </div>
  `;

  achievementsOverlayEl.querySelector('#achievementsCloseBtn').onclick = () => {
    achievementsOverlayEl.classList.add('hidden');
  };

  achievementsOverlayEl.querySelectorAll('.achievements-tab').forEach(tab => {
    tab.onclick = () => {
      activeCategory = tab.dataset.cat;
      achievementsOverlayEl.querySelectorAll('.achievements-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const content = achievementsOverlayEl.querySelector('#achievementsContent');
      content.innerHTML = renderCategoryContent(activeCategory);
    };
  });

  achievementsOverlayEl.querySelector('#resetAchievementsBtn').onclick = () => {
    if (confirm('确定要重置所有成就吗？此操作不可撤销。')) {
      resetAchievements();
      activeCategory = ACHIEVEMENT_CATEGORIES[0].id;
      renderAchievementsModal(achievementsOverlayEl);
      if (onResetCallback) onResetCallback();
    }
  };

  achievementsOverlayEl.onclick = (e) => {
    if (e.target === achievementsOverlayEl) {
      achievementsOverlayEl.classList.add('hidden');
    }
  };
}

function renderCategoryContent(categoryId) {
  const entries = getAchievementsByCategory(categoryId);
  const unlockedInCat = entries.filter(e => isUnlocked(e.id)).length;

  return `
    <div class="achievements-cat-header">
      本分类已解锁：<strong>${unlockedInCat} / ${entries.length}</strong>
    </div>
    <div class="achievements-list">
      ${entries.map(entry => renderAchievementEntry(entry)).join('')}
    </div>
  `;
}

function renderAchievementEntry(entry) {
  const unlocked = isUnlocked(entry.id);
  const info = getUnlockInfo(entry.id);
  const sceneName = info ? getSceneName(info.sceneId) : '';
  const unlockTime = info ? formatDate(info.unlockedAt) : '';

  return `
    <div class="achievement-entry ${unlocked ? '' : 'locked'}">
      <div class="achievement-icon">${unlocked ? entry.icon : '🔒'}</div>
      <div class="achievement-info">
        <h3>${unlocked ? entry.name : '???'}</h3>
        <p>${unlocked ? entry.desc : '尚未解锁——完成对应挑战后解锁详情。'}</p>
        ${unlocked ? `
          <div class="achievement-meta">
            <span>✓ ${sceneName}</span>
            <span>🕒 ${unlockTime}</span>
          </div>
        ` : ''}
      </div>
      ${unlocked ? '<div class="achievement-unlocked-badge">已达成</div>' : '<div class="achievement-locked-badge">未达成</div>'}
    </div>
  `;
}

export function showAchievements(achievementsOverlayEl) {
  renderAchievementsModal(achievementsOverlayEl);
  achievementsOverlayEl.classList.remove('hidden');
}

export function updateAchievementsButton(btnEl) {
  const unlocked = getUnlockedCount();
  const total = getTotalCount();
  const badge = btnEl.querySelector('.achievements-badge');
  if (badge) {
    badge.textContent = `${unlocked}/${total}`;
  }
}

export function onAchievementsReset(callback) {
  onResetCallback = callback;
}

export function showAchievementToast(achievement, info) {
  const container = document.querySelector('#achievementToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-toast-icon">${achievement.icon}</div>
    <div class="achievement-toast-content">
      <div class="achievement-toast-title">成就解锁！</div>
      <div class="achievement-toast-name">${achievement.name}</div>
      <div class="achievement-toast-desc">${achievement.desc}</div>
    </div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }, 3800);
}
