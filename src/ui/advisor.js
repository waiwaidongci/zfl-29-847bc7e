import { ICONS, COSTS, GRID_COLS } from '../game/constants.js';

let currentHighlightedCells = new Set();
let activeSuggestionId = null;
let activeRoadmapStep = null;
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

const urgencyLabels = {
  critical: '危急',
  warning: '警告',
  normal: '稳定'
};

const urgencyColors = {
  critical: '#c0392b',
  warning: '#c08d2d',
  normal: '#237070'
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
            const x = (idx % GRID_COLS) + 1;
            const y = Math.floor(idx / GRID_COLS) + 1;
            return `<span class="target-badge" data-index="${idx}">(${x},${y})</span>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  const roadmapHtml = buildRoadmapHtml(advice.roadmap, game);

  advisorEl.innerHTML = `
    <div class="advisor-summary ${urgencyClass}">
      <span class="advisor-summary-text">${advice.summary}</span>
      <button class="refresh-btn" id="refreshAdviceBtn" title="刷新建议">🔄</button>
    </div>
    <div class="suggestions-list">
      ${suggestionsHtml}
    </div>
    ${roadmapHtml}
  `;

  bindAdvisorEvents(advisorEl, advice, game);
  bindRoadmapEvents(advisorEl, advice, game);
}

function buildRoadmapHtml(roadmap, game) {
  if (!roadmap || roadmap.length === 0) return '';

  const summary = roadmap._summary;
  const summaryHtml = buildRoadmapSummaryHtml(summary);

  const stepsHtml = roadmap.map((step, index) => {
    const isLast = index === roadmap.length - 1;
    const connectorClass = isLast ? '' : 'roadmap-connector';
    const stepClass = step.executable ? 'roadmap-step-executable' : 'roadmap-step-planned';
    const isActive = activeRoadmapStep === index;

    return `
      <div class="roadmap-step-wrap">
        <div class="roadmap-step ${stepClass} ${isActive ? 'active' : ''}" data-roadmap-index="${index}">
          ${buildStepHeader(step)}
          ${buildStepBody(step)}
          ${buildStepDetailedInfo(step)}
          ${buildAlternativesHtml(step)}
          ${buildStepActions(step, index, isActive)}
        </div>
        ${!isLast ? `<div class="${connectorClass}"></div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="roadmap-section">
      <div class="roadmap-header">
        <span class="roadmap-title">🗺️ 部署路线</span>
        <span class="roadmap-subtitle">未来${roadmap.length}潮建议 · 综合考量预算/污染/风暴/目标</span>
      </div>
      ${summaryHtml}
      <div class="roadmap-timeline">
        ${stepsHtml}
      </div>
    </div>
  `;
}

function buildRoadmapSummaryHtml(summary) {
  if (!summary) return '';

  const warningsHtml = summary.warnings && summary.warnings.length > 0
    ? `<div class="roadmap-warnings">
        ${summary.warnings.map(w => `<div class="roadmap-warning-item">⚠️ ${w}</div>`).join('')}
      </div>`
    : '';

  return `
    <div class="roadmap-overview">
      <div class="roadmap-overview-grid">
        <div class="roadmap-overview-item">
          <span class="roadmap-overview-label">预计得分</span>
          <span class="roadmap-overview-value ${summary.goalReached ? 'meta-ok' : 'meta-gap'}">
            ${summary.initialScore} → ${summary.projectedFinalScore}
            <span class="roadmap-overview-gain">(${summary.projectedScoreGain >= 0 ? '+' : ''}${summary.projectedScoreGain})</span>
          </span>
        </div>
        <div class="roadmap-overview-item">
          <span class="roadmap-overview-label">目标达成</span>
          <span class="roadmap-overview-value ${summary.goalReached ? 'meta-ok' : 'meta-warning'}">
            ${summary.goalReached ? '✓ 预计达成' : `还差 ${summary.goalGapRemaining} 分`}
          </span>
        </div>
        <div class="roadmap-overview-item">
          <span class="roadmap-overview-label">总投入</span>
          <span class="roadmap-overview-value">${summary.totalCost} 预算</span>
        </div>
        <div class="roadmap-overview-item">
          <span class="roadmap-overview-label">剩余预算</span>
          <span class="roadmap-overview-value">${summary.budgetRemaining}</span>
        </div>
      </div>
      <div class="roadmap-goal-desc">🎯 ${summary.sceneGoalDesc}</div>
      ${warningsHtml}
    </div>
  `;
}

function buildStepHeader(step) {
  const pos = { x: (step.targetIndex % GRID_COLS) + 1, y: Math.floor(step.targetIndex / GRID_COLS) + 1 };
  return `
    <div class="roadmap-step-header">
      <div class="roadmap-tide-badge">
        <span class="roadmap-tide-label">第${step.tide}潮</span>
        ${step.executable
          ? '<span class="roadmap-status-badge roadmap-status-now">可执行</span>'
          : '<span class="roadmap-status-badge roadmap-status-plan">计划</span>'
        }
      </div>
      <div class="roadmap-urgency" style="color: ${urgencyColors[step.urgency]}">
        ${urgencyLabels[step.urgency]}
      </div>
    </div>
    <div class="roadmap-deployment">
      <span class="roadmap-facility-icon">${typeIcons[step.type]}</span>
      <span class="roadmap-facility-name">${typeNames[step.type]}</span>
      <span class="roadmap-target-pos">→ (${pos.x},${pos.y})</span>
      <span class="roadmap-cost-badge">💰 ${step.cost}</span>
    </div>
  `;
}

function buildStepBody(step) {
  const goalAnalysis = step.goalAnalysis || {};
  const paceClass = goalAnalysis.onTrack ? 'pace-ok' : (goalAnalysis.estimatedGainFromThis >= goalAnalysis.requiredPerRemainingStep * 0.5 ? 'pace-warn' : 'pace-bad');

  return `
    <div class="roadmap-step-body">
      <div class="roadmap-benefit">📈 ${step.benefit}</div>
      <div class="roadmap-reason">💡 ${step.reason}</div>
      ${step.detailedBenefit ? buildDetailedBenefitHtml(step.detailedBenefit, step.type) : ''}
      ${goalAnalysis.paceAssessment ? `
        <div class="roadmap-goal-pace ${paceClass}">
          🎯 ${goalAnalysis.paceAssessment}（此步约+${goalAnalysis.estimatedGainFromThis}分，需每步+${goalAnalysis.requiredPerRemainingStep}分）
        </div>
      ` : ''}
    </div>
  `;
}

function buildDetailedBenefitHtml(detailedBenefit, type) {
  const items = [];

  if (type === 'pile') {
    if (detailedBenefit.blockedDirections) items.push(`阻挡${detailedBenefit.blockedDirections}个扩散方向`);
    if (detailedBenefit.riskReduction) items.push(`降低${detailedBenefit.riskReduction}%扩散风险`);
  } else if (type === 'oyster') {
    if (detailedBenefit.pollutionCleaned) items.push(`预计净化${detailedBenefit.pollutionCleaned}次污染`);
    if (detailedBenefit.ecoGainPerTurn) items.push(`每回合+${detailedBenefit.ecoGainPerTurn}生态值`);
    if (detailedBenefit.totalEcoGain) items.push(`累计生态增益约${detailedBenefit.totalEcoGain}`);
  } else if (type === 'grass') {
    if (detailedBenefit.ecoGainPerTurn) items.push(`每回合+${detailedBenefit.ecoGainPerTurn}生态值`);
    if (detailedBenefit.totalEcoGain) items.push(`累计生态增益约${detailedBenefit.totalEcoGain}`);
  }

  if (items.length === 0) return '';

  return `
    <div class="roadmap-detailed-benefit">
      <span class="roadmap-benefit-label">效益明细：</span>
      ${items.map(i => `<span class="roadmap-benefit-tag">${i}</span>`).join('')}
    </div>
  `;
}

function buildStepDetailedInfo(step) {
  const budgetProj = step.budgetProjection || {};
  const stormRisk = step.stormRisk || {};
  const stats = step.projectedStats || {};

  return `
    <div class="roadmap-step-meta">
      <div class="roadmap-meta-row">
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">当前预算</span>
          <span class="roadmap-meta-value">${step.projectedBudget} → ${step.budgetAfter}</span>
        </span>
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">后续收入</span>
          <span class="roadmap-meta-value">+${budgetProj.futureIncome || 0} (${budgetProj.budgetPerTurn || TURN_BUDGET_BONUS}/潮)</span>
        </span>
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">可用总额</span>
          <span class="roadmap-meta-value">${budgetProj.totalAvailableBudget || step.projectedBudget}</span>
        </span>
      </div>
      <div class="roadmap-meta-row">
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">污染</span>
          <span class="roadmap-meta-value">${step.pollutionCount}格</span>
        </span>
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">扩散风险</span>
          <span class="roadmap-meta-value ${step.pollutionRisk > 0.5 ? 'meta-warning' : ''}">${Math.round(step.pollutionRisk * 100)}%</span>
        </span>
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">风暴概率</span>
          <span class="roadmap-meta-value ${step.stormProbability > 0.3 ? 'meta-warning' : ''}">${Math.round(step.stormProbability * 100)}%</span>
        </span>
        <span class="roadmap-meta-item">
          <span class="roadmap-meta-label">目标差距</span>
          <span class="roadmap-meta-value ${step.goalGap > 0 ? 'meta-gap' : 'meta-ok'}">${step.goalGap > 0 ? step.goalGap + '分' : '✓'}</span>
        </span>
      </div>
      ${stats.water !== undefined ? `
        <div class="roadmap-meta-row">
          <span class="roadmap-meta-item">
            <span class="roadmap-meta-label">水质</span>
            <span class="roadmap-meta-value">${stats.water}</span>
          </span>
          <span class="roadmap-meta-item">
            <span class="roadmap-meta-label">幼体</span>
            <span class="roadmap-meta-value">${stats.larvae}</span>
          </span>
          <span class="roadmap-meta-item">
            <span class="roadmap-meta-label">生物</span>
            <span class="roadmap-meta-value">${stats.bio}</span>
          </span>
          ${stormRisk.recommendation ? `
            <span class="roadmap-meta-item roadmap-storm-hint ${stormRisk.damageChance > 20 ? 'meta-warning' : ''}">
              <span class="roadmap-meta-label">风暴提示</span>
              <span class="roadmap-meta-value">${stormRisk.damageChance > 0 ? '损毁率' + stormRisk.damageChance + '% · ' : ''}${stormRisk.recommendation}</span>
            </span>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function buildAlternativesHtml(step) {
  if (!step.alternatives || step.alternatives.length === 0) return '';

  const alternativesHtml = step.alternatives.map((alt, altIdx) => {
    const pos = { x: (alt.targetIndex % GRID_COLS) + 1, y: Math.floor(alt.targetIndex / GRID_COLS) + 1 };
    return `
      <div class="roadmap-alternative-item">
        <div class="roadmap-alt-header">
          <span class="roadmap-alt-icon">${typeIcons[alt.type]}</span>
          <span class="roadmap-alt-name">${typeNames[alt.type]}</span>
          <span class="roadmap-alt-pos">(${pos.x},${pos.y})</span>
          <span class="roadmap-alt-cost">💰${alt.cost}</span>
          ${alt.comparativeScore ? `
            <span class="roadmap-alt-score">评分 ${alt.comparativeScore.self} (-${alt.comparativeScore.difference})</span>
          ` : ''}
        </div>
        <div class="roadmap-alt-benefit">${alt.benefit}</div>
        ${alt.rejectionReason ? `
          <div class="roadmap-alt-rejection">❌ 未选原因：${alt.rejectionReason}</div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="roadmap-alternatives">
      <div class="roadmap-alternatives-title">🔄 其他候选方案（点击展开/收起）</div>
      <div class="roadmap-alternatives-list">
        ${alternativesHtml}
      </div>
    </div>
  `;
}

function buildStepActions(step, index, isActive) {
  return `
    <div class="roadmap-step-actions">
      ${step.executable
        ? `<button class="roadmap-apply-btn" data-roadmap-apply="${index}">⚡ 一键应用此步</button>
           <button class="roadmap-highlight-btn" data-roadmap-highlight="${index}">
             ${isActive ? '取消高亮' : '📍 查看位置'}
           </button>`
        : `<span class="roadmap-plan-hint">⏳ 预算 ${step.projectedBudget} < ${step.cost}，下潮收入 +${TURN_BUDGET_BONUS} 后可执行</span>
           <button class="roadmap-highlight-btn" data-roadmap-highlight="${index}">
             ${isActive ? '取消高亮' : '📍 查看位置'}
           </button>`
      }
    </div>
  `;
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

function bindRoadmapEvents(advisorEl, advice, game) {
  if (!advice || !advice.roadmap || advice.roadmap.length === 0) return;

  advisorEl.querySelectorAll('[data-roadmap-apply]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const stepIndex = parseInt(btn.dataset.roadmapApply, 10);
      const step = advice.roadmap[stepIndex];
      if (!step || !step.executable) return;
      applyRoadmapStep(step);
    };
  });

  advisorEl.querySelectorAll('[data-roadmap-highlight]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const stepIndex = parseInt(btn.dataset.roadmapHighlight, 10);
      const step = advice.roadmap[stepIndex];
      if (!step) return;
      toggleRoadmapHighlight(stepIndex, step);
    };
  });

  advisorEl.querySelectorAll('.roadmap-alternatives-title').forEach(title => {
    title.onclick = (e) => {
      e.stopPropagation();
      const alternativesEl = title.nextElementSibling;
      if (alternativesEl) {
        alternativesEl.classList.toggle('expanded');
        title.classList.toggle('expanded');
      }
    };
  });
}

function toggleRoadmapHighlight(stepIndex, step) {
  if (activeRoadmapStep === stepIndex) {
    activeRoadmapStep = null;
    currentHighlightedCells = new Set();
    if (onHighlightCallback) {
      onHighlightCallback([], null);
    }
  } else {
    activeRoadmapStep = stepIndex;
    activeSuggestionId = null;
    currentHighlightedCells = new Set(step.relatedCells || [step.targetIndex]);
    if (onHighlightCallback) {
      onHighlightCallback(Array.from(currentHighlightedCells), {
        id: 'roadmap_' + stepIndex,
        type: step.type,
        targetIndex: step.targetIndex,
        relatedCells: step.relatedCells
      });
    }
  }

  document.querySelectorAll('.roadmap-step').forEach(el => {
    const idx = parseInt(el.dataset.roadmapIndex, 10);
    el.classList.toggle('active', idx === activeRoadmapStep);
    const hlBtn = el.querySelector('.roadmap-highlight-btn');
    if (hlBtn) {
      hlBtn.textContent = idx === activeRoadmapStep ? '取消高亮' : '📍 查看位置';
    }
  });

  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.classList.remove('active');
    const hlBtn = card.querySelector('.highlight-btn');
    if (hlBtn) {
      hlBtn.textContent = '📍 查看位置';
    }
  });
}

function applyRoadmapStep(step) {
  if (onApplySuggestionCallback) {
    onApplySuggestionCallback({
      type: step.type,
      targetIndex: step.targetIndex,
      cost: step.cost
    });
  }
}

function toggleHighlight(suggestion) {
  if (activeSuggestionId === suggestion.id) {
    clearHighlights();
  } else {
    clearHighlights();
    activeSuggestionId = suggestion.id;
    activeRoadmapStep = null;
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

  document.querySelectorAll('.roadmap-step').forEach(el => {
    el.classList.remove('active');
    const hlBtn = el.querySelector('.roadmap-highlight-btn');
    if (hlBtn) {
      hlBtn.textContent = '📍 查看位置';
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
  activeRoadmapStep = null;
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

  document.querySelectorAll('.roadmap-step').forEach(el => {
    el.classList.remove('active');
    const hlBtn = el.querySelector('.roadmap-highlight-btn');
    if (hlBtn) {
      hlBtn.textContent = '📍 查看位置';
    }
  });
}

export function getHighlightedCells() {
  return Array.from(currentHighlightedCells);
}

export function isCellHighlighted(index) {
  return currentHighlightedCells.has(index);
}
