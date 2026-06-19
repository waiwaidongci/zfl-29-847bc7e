import { ICONS, COSTS } from '../game/constants.js';

let currentHighlightedCells = new Set();
let activeSuggestionId = null;
let onHighlightCallback = null;
let onApplySuggestionCallback = null;

const typeIcons = {
  oyster: '🦪',
  grass: '🌿',
  pile: '🛡️'
};

const typeNames = {
  oyster: '牡蛎礁',
  grass: '海草床',
  pile: '围护桩'
};

const priorityColors = {
  high: '#c0392b',
  medium: '#c08d2d',
  low: '#237070'
};

const priorityLabels = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级'
};

export function setHighlightCallback(callback) {
  onHighlightCallback = callback;
}

export function setApplySuggestionCallback(callback) {
  onApplySuggestionCallback = callback;
}

export function renderAdvisor(advisorEl, advice, game) {
  if (!advice || !advice.suggestions || advice.suggestions.length === 0) {
    advisorEl.innerHTML = `
      <div class="advisor-empty">
        <div class="advisor-icon">💡</div>
        <div class="advisor-empty-text">当前无需特别操作</div>
        <div class="advisor-empty-sub">可以推进潮汐观察变化</div>
      </div>
    `;
    clearHighlights();
    return;
  }

  const urgencyClass = advice.urgency === 'critical' ? 'urgent' : 
                       advice.urgency === 'warning' ? 'warning' : 'normal';

  const suggestionsHtml = advice.suggestions.map((suggestion, index) => {
    const isActive = activeSuggestionId === suggestion.id;
    const canAfford = game.budget >= suggestion.cost;
    const targetIndices = suggestion.targetIndices || [suggestion.targetIndex];
    
    return `
      <div class="suggestion-card ${isActive ? 'active' : ''} ${canAfford ? '' : 'disabled'}" 
           data-suggestion-id="${suggestion.id}"
           data-priority="${suggestion.priority}">
        <div class="suggestion-header">
          <div class="suggestion-number">${index + 1}</div>
          <div class="suggestion-icon">${typeIcons[suggestion.type]}</div>
          <div class="suggestion-title">
            <span class="suggestion-title-text">${suggestion.title}</span>
            <span class="suggestion-priority" style="color: ${priorityColors[suggestion.priority]}">
              ${priorityLabels[suggestion.priority]}
            </span>
          </div>
        </div>
        <div class="suggestion-description">${suggestion.description}</div>
        <div class="suggestion-detail">${suggestion.detail}</div>
        <div class="suggestion-footer">
          <div class="suggestion-cost">
            <span class="cost-icon">💰</span>
            <span class="cost-text">${suggestion.cost} 预算</span>
            <span class="cost-count">×${targetIndices.length} ${typeNames[suggestion.type]}</span>
          </div>
          <div class="suggestion-actions">
            <button class="highlight-btn" data-action="highlight" title="高亮相关格子">
              ${isActive ? '取消高亮' : '查看位置'}
            </button>
            <button class="apply-btn" data-action="apply" title="应用此建议" ${canAfford ? '' : 'disabled'}>
              应用建议
            </button>
          </div>
        </div>
        <div class="suggestion-targets">
          ${targetIndices.map(idx => {
            const x = (idx % 12) + 1;
            const y = Math.floor(idx / 12) + 1;
            return `<span class="target-badge" data-index="${idx}">(${x},${y})</span>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  advisorEl.innerHTML = `
    <div class="advisor-summary ${urgencyClass}">
      <span class="advisor-summary-text">${advice.summary}</span>
      <button class="refresh-btn" id="refreshAdviceBtn" title="刷新建议">🔄</button>
    </div>
    <div class="suggestions-list">
      ${suggestionsHtml}
    </div>
  `;

  bindAdvisorEvents(advisorEl, advice, game);
}

function bindAdvisorEvents(advisorEl, advice, game) {
  advisorEl.querySelectorAll('.suggestion-card').forEach(card => {
    const suggestionId = card.dataset.suggestionId;
    const suggestion = advice.suggestions.find(s => s.id === suggestionId);
    
    if (!suggestion) return;

    card.querySelector('.highlight-btn').onclick = (e) => {
      e.stopPropagation();
      toggleHighlight(suggestion);
    };

    const applyBtn = card.querySelector('.apply-btn');
    if (!applyBtn.disabled) {
      applyBtn.onclick = (e) => {
        e.stopPropagation();
        applySuggestion(suggestion);
      };
    }

    card.onclick = () => {
      toggleHighlight(suggestion);
    };
  });

  const refreshBtn = advisorEl.querySelector('#refreshAdviceBtn');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      if (onApplySuggestionCallback) {
        onApplySuggestionCallback('refresh');
      }
    };
  }
}

function toggleHighlight(suggestion) {
  if (activeSuggestionId === suggestion.id) {
    clearHighlights();
  } else {
    clearHighlights();
    activeSuggestionId = suggestion.id;
    currentHighlightedCells = new Set(suggestion.relatedCells || []);
    
    if (onHighlightCallback) {
      onHighlightCallback(Array.from(currentHighlightedCells), suggestion);
    }
  }

  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.classList.toggle('active', card.dataset.suggestionId === activeSuggestionId);
    const highlightBtn = card.querySelector('.highlight-btn');
    if (highlightBtn) {
      highlightBtn.textContent = card.classList.contains('active') ? '取消高亮' : '查看位置';
    }
  });
}

function applySuggestion(suggestion) {
  if (onApplySuggestionCallback) {
    onApplySuggestionCallback(suggestion);
  }
}

export function clearHighlights() {
  activeSuggestionId = null;
  currentHighlightedCells = new Set();
  
  if (onHighlightCallback) {
    onHighlightCallback([], null);
  }

  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.classList.remove('active');
    const highlightBtn = card.querySelector('.highlight-btn');
    if (highlightBtn) {
      highlightBtn.textContent = '查看位置';
    }
  });
}

export function getHighlightedCells() {
  return Array.from(currentHighlightedCells);
}

export function isCellHighlighted(index) {
  return currentHighlightedCells.has(index);
}
