import {
  GRID_COLS,
  GRID_ROWS,
  CELL_TYPES,
  ICONS
} from '../game/constants.js';
import {
  runMonteCarloSimulation,
  comparePlans,
  generateRecommendedPlan
} from '../game/simulator.js';
import {
  createRulesContext,
  getFacilityCost,
  getFacilityName
} from '../game/rules-engine.js';

const FACILITY_TYPES = ['oyster', 'grass', 'pile', 'buffer'];
const FACILITY_COLORS = {
  oyster: '#e67e22',
  grass: '#27ae60',
  pile: '#7f8c8d',
  buffer: '#9b59b6'
};

let simState = null;

function createInitialSimState(game, scene) {
  const rules = game.rules || createRulesContext();
  const remainingTurns = scene.turns - game.turn + 1;

  return {
    game,
    scene,
    rules,
    currentTool: 'oyster',
    candidatePlans: [
      {
        id: 'current',
        name: '当前方案（不放置）',
        placements: [],
        analysis: null,
        isCurrent: true
      }
    ],
    activePlanIndex: 0,
    simulationRuns: 100,
    simulationTurns: remainingTurns,
    isSimulating: false,
    progress: 0,
    selectedCellForPlacement: -1,
    tempPlacements: [],
    comparison: null,
    recommendedPlacements: null,
    showRecommended: true
  };
}

function getXY(index) {
  return {
    x: index % GRID_COLS,
    y: Math.floor(index / GRID_COLS)
  };
}

function renderSimulator(container, game, scene) {
  if (!simState || simState.game !== game) {
    simState = createInitialSimState(game, scene);
  }

  const rules = simState.rules;
  const remainingBudget = game.budget - simState.tempPlacements.reduce((s, p) => s + getFacilityCost(rules, p.type), 0);

  container.innerHTML = `
    <div class="simulator-header">
      <h2>🔮 策略模拟器</h2>
      <div class="simulator-header-hint">
        在不推进对局的情况下预演未来若干潮，比较不同方案的预测结果
      </div>
      <button class="simulator-close-btn" data-sim-action="close">×</button>
    </div>

    <div class="simulator-body">
      <div class="simulator-config">
        <div class="config-section">
          <h4>⚙️ 模拟配置</h4>
          <div class="config-row">
            <label>模拟次数</label>
            <select id="simRunsSelect">
              <option value="50">快速（50次）</option>
              <option value="100" selected>标准（100次）</option>
              <option value="200">精细（200次）</option>
              <option value="500">高精度（500次）</option>
            </select>
          </div>
          <div class="config-row">
            <label>预测潮数</label>
            <select id="simTurnsSelect">
              ${generateTurnOptions(scene.turns - game.turn + 1)}
            </select>
          </div>
          <div class="config-info">
            <div>当前预算：<strong>${game.budget}</strong></div>
            <div>方案预算：<strong class="${remainingBudget < 0 ? 'danger' : ''}">${remainingBudget}</strong></div>
            <div>剩余回合：<strong>${scene.turns - game.turn + 1}</strong> 潮</div>
          </div>
        </div>

        <div class="config-section">
          <h4>🏗️ 选择放置方案</h4>
          <div class="placement-tools">
            ${FACILITY_TYPES.map(type => `
              <button class="placement-tool-btn ${simState.currentTool === type ? 'active' : ''}" 
                      data-tool="${type}"
                      style="--tool-color: ${FACILITY_COLORS[type]}">
                <span class="tool-icon">${ICONS[type]}</span>
                <span class="tool-name">${getFacilityName(rules, type)}</span>
                <span class="tool-cost">${getFacilityCost(rules, type)}💰</span>
              </button>
            `).join('')}
            <button class="placement-tool-btn ${simState.currentTool === 'erase' ? 'active' : ''}" 
                    data-tool="erase"
                    style="--tool-color: #e74c3c">
              <span class="tool-icon">✕</span>
              <span class="tool-name">移除</span>
              <span class="tool-cost">免费</span>
            </button>
          </div>

          <div class="placement-actions">
            <button class="secondary" data-sim-action="add-recommended">
              💡 添加推荐方案
            </button>
            <button class="secondary" data-sim-action="save-plan">
              ➕ 保存为候选方案
            </button>
            <button class="secondary danger" data-sim-action="clear-placements">
              🗑️ 清空当前布局
            </button>
          </div>

          <div class="temp-placements-list">
            <h5>当前布局（${simState.tempPlacements.length}项）</h5>
            ${simState.tempPlacements.length === 0 
              ? '<div class="empty-hint">点击下方网格选择位置放置设施</div>'
              : simState.tempPlacements.map((p, i) => {
                  const pos = getXY(p.index);
                  return `
                    <div class="placement-item" data-placement-index="${i}">
                      <span class="placement-type-badge" style="background: ${FACILITY_COLORS[p.type]}">
                        ${ICONS[p.type]}${getFacilityName(rules, p.type)}
                      </span>
                      <span>位置 (${pos.x + 1},${pos.y + 1})</span>
                      <span class="placement-cost">-${getFacilityCost(rules, p.type)}💰</span>
                      <button class="remove-placement" data-placement-index="${i}">×</button>
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>

        <div class="config-section">
          <h4>📋 候选方案列表</h4>
          <div class="candidate-plans">
            ${simState.candidatePlans.map((plan, idx) => `
              <div class="candidate-plan ${simState.activePlanIndex === idx ? 'active' : ''}"
                   data-plan-index="${idx}">
                <div class="plan-header">
                  <span class="plan-name">${idx === 0 ? '⭐ ' : ''}${plan.name}</span>
                  ${!plan.isCurrent ? `<button class="remove-plan-btn" data-plan-index="${idx}">×</button>` : ''}
                </div>
                <div class="plan-meta">
                  ${plan.placements.length} 项放置
                  ${plan.analysis ? ` · 胜率 ${Math.round(plan.analysis.winRate * 100)}%` : ' · 未模拟'}
                </div>
                ${plan.analysis ? `
                  <div class="plan-quick-stats">
                    <span title="平均评分">📊 ${plan.analysis.scoreStats.mean.toFixed(0)}</span>
                    <span title="评分区间">${plan.analysis.scoreStats.p25.toFixed(0)}~${plan.analysis.scoreStats.p75.toFixed(0)}</span>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="sim-run-section">
          <button id="runSimulationBtn" class="primary full-width" ${simState.isSimulating ? 'disabled' : ''}>
            ${simState.isSimulating 
              ? `⏳ 模拟中 ${simState.progress}%...` 
              : '🚀 开始模拟所有方案'}
          </button>
          ${simState.candidatePlans.length > 1 ? `
            <button id="comparePlansBtn" class="full-width" ${!simState.candidatePlans.every(p => p.analysis) ? 'disabled' : ''}>
              📊 对比方案
            </button>
          ` : ''}
        </div>
      </div>

      <div class="simulator-preview">
        <div class="config-section">
          <h4>🗺️ 放置预览网格</h4>
          <div class="sim-grid-container">
            ${renderSimGrid(game, simState)}
          </div>
          <div class="grid-legend">
            <span><span class="legend-color" style="background:#f39c12"></span>污染</span>
            <span><span class="legend-color" style="background:${FACILITY_COLORS.oyster}"></span>牡蛎礁</span>
            <span><span class="legend-color" style="background:${FACILITY_COLORS.grass}"></span>海草床</span>
            <span><span class="legend-color" style="background:${FACILITY_COLORS.pile}"></span>围护桩</span>
            <span><span class="legend-color" style="background:${FACILITY_COLORS.buffer}"></span>缓冲带</span>
            <span><span class="legend-color" style="background:#3498db;border:2px dashed #2980b9"></span>预放置</span>
          </div>
        </div>
      </div>

      <div class="simulator-results">
        ${renderResultsSection()}
      </div>
    </div>
  `;

  bindSimulatorEvents(container);
}

function generateTurnOptions(maxTurns) {
  const options = [];
  for (let t = 1; t <= maxTurns; t++) {
    const selected = t === maxTurns ? 'selected' : '';
    options.push(`<option value="${t}" ${selected}>${t} 潮${t === maxTurns ? '（全部）' : ''}</option>`);
  }
  return options.join('');
}

function renderSimGrid(game, state) {
  const cells = game.cells;
  const tempMap = new Map();
  state.tempPlacements.forEach(p => tempMap.set(p.index, p.type));

  const rows = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    const rowCells = [];
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = y * GRID_COLS + x;
      const cell = cells[idx];
      const tempType = tempMap.get(idx);

      let content = '';
      let cellClass = 'sim-grid-cell';
      let style = '';

      if (tempType) {
        cellClass += ' temp-placement';
        style = `background: ${FACILITY_COLORS[tempType]}aa; border: 2px solid ${FACILITY_COLORS[tempType]};`;
        content = ICONS[tempType];
      } else if (cell.polluted && cell.type === CELL_TYPES.EMPTY) {
        cellClass += ' polluted';
        content = '污';
      } else if (cell.type !== CELL_TYPES.EMPTY) {
        style = `background: ${FACILITY_COLORS[cell.type]}cc;`;
        content = ICONS[cell.type];
        if (cell.polluted) {
          cellClass += ' polluted-under';
        }
      } else if (cell.polluted) {
        cellClass += ' polluted';
      }

      rowCells.push(`
        <div class="${cellClass}" 
             style="${style}"
             data-cell-index="${idx}"
             title="(${x + 1},${y + 1})${tempType ? ` 预放置:${getFacilityName(state.rules, tempType)}` : cell.type !== CELL_TYPES.EMPTY ? ` ${getFacilityName(state.rules, cell.type)}` : ''}${cell.polluted ? ' 污染' : ''}">
          ${content}
        </div>
      `);
    }
    rows.push(`<div class="sim-grid-row">${rowCells.join('')}</div>`);
  }

  return rows.join('');
}

function renderResultsSection() {
  const state = simState;
  const activePlan = state.candidatePlans[state.activePlanIndex];

  if (!activePlan || !activePlan.analysis) {
    return `
      <div class="config-section">
        <h4>📈 模拟结果</h4>
        <div class="results-empty">
          <div class="results-empty-icon">🔍</div>
          <div>选择方案后点击"开始模拟"查看预测结果</div>
          <div class="results-tips">
            <p>💡 <strong>可以做什么：</strong></p>
            <ul>
              <li>比较不同放置策略的预期评分</li>
              <li>查看未来污染扩散趋势</li>
              <li>评估风暴损毁风险</li>
              <li>计算各方案的胜率</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  const analysis = activePlan.analysis;
  const score = analysis.scoreStats;
  const poll = analysis.pollutionStats;
  const risks = analysis.riskAssessment;

  return `
    ${state.comparison ? renderComparisonSection(state.comparison) : ''}

    <div class="config-section">
      <h4>📊 ${activePlan.name} - 预测概览</h4>
      <div class="overview-cards">
        <div class="overview-card win-rate">
          <div class="card-label">胜率预测</div>
          <div class="card-value ${analysis.winRate >= 0.7 ? 'good' : analysis.winRate >= 0.4 ? 'warning' : 'danger'}">
            ${Math.round(analysis.winRate * 100)}%
          </div>
          <div class="card-sub">胜 ${analysis.winCount} / 负 ${analysis.loseCount}</div>
        </div>
        <div class="overview-card score">
          <div class="card-label">平均评分</div>
          <div class="card-value">${score.mean.toFixed(0)}</div>
          <div class="card-sub">区间 ${score.p10.toFixed(0)} ~ ${score.p90.toFixed(0)}</div>
        </div>
        <div class="overview-card pollution">
          <div class="card-label">平均污染</div>
          <div class="card-value">${poll.mean.toFixed(0)} 格</div>
          <div class="card-sub">75分位 ${Math.ceil(poll.p75)} 格</div>
        </div>
        <div class="overview-card storm">
          <div class="card-label">风暴损毁风险</div>
          <div class="card-value risk-${risks.stormRisk.level}">${risks.stormRisk.percentage}%</div>
          <div class="card-sub">${getRiskLabel(risks.stormRisk.level)}</div>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h4>📉 评分与污染走势</h4>
      <div class="trend-charts">
        ${renderTrendChart(analysis)}
      </div>
    </div>

    <div class="config-section">
      <h4>🎯 评分分布区间</h4>
      <div class="score-distribution">
        ${renderScoreDistribution(score)}
      </div>
      <div class="distribution-labels">
        <span>最差 10%</span>
        <span>较低</span>
        <span>中位数</span>
        <span>较高</span>
        <span>最佳 10%</span>
      </div>
    </div>

    <div class="config-section">
      <h4>⚠️ 风险评估</h4>
      <div class="risk-list">
        ${renderRiskItem('风暴风险', risks.stormRisk)}
        ${renderRiskItem('污染失控', risks.pollutionRisk)}
        ${renderRiskItem('评分不足', risks.scoreRisk)}
      </div>
    </div>

    <div class="config-section">
      <h4>📋 模拟统计</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span>平均水质</span>
          <strong>${analysis.stats.waterMean.toFixed(0)}</strong>
        </div>
        <div class="stat-item">
          <span>平均幼体</span>
          <strong>${analysis.stats.larvaeMean.toFixed(0)}</strong>
        </div>
        <div class="stat-item">
          <span>平均多样性</span>
          <strong>${analysis.stats.bioMean.toFixed(0)}</strong>
        </div>
        <div class="stat-item">
          <span>平均剩余预算</span>
          <strong>${analysis.stats.budgetMean.toFixed(0)}</strong>
        </div>
        <div class="stat-item">
          <span>风暴来袭频次</span>
          <strong>${analysis.stats.stormHitMean.toFixed(1)}次</strong>
        </div>
        <div class="stat-item">
          <span>设施损毁均值</span>
          <strong>${analysis.stats.stormDamageMean.toFixed(1)}次</strong>
        </div>
        <div class="stat-item">
          <span>污染扩散次数</span>
          <strong>${analysis.stats.pollutionSpreadMean.toFixed(1)}格</strong>
        </div>
        <div class="stat-item">
          <span>牡蛎净化次数</span>
          <strong>${analysis.stats.pollutionCleanedMean.toFixed(1)}格</strong>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h4>🔍 关键事件解释</h4>
      <div class="key-events">
        ${analysis.keyEvents.slice(0, 6).map(ev => renderKeyEvent(ev)).join('')}
      </div>
    </div>

    <div class="config-section">
      <h4>🌅 极端情况</h4>
      <div class="extreme-cases">
        <div class="extreme-case best">
          <h5>🏆 最佳情况</h5>
          <div class="case-row"><span>评分</span><strong>${analysis.bestCase.score}</strong></div>
          <div class="case-row"><span>结果</span><strong>${analysis.bestCase.win ? '✅ 胜利' : '❌ 失败'}</strong></div>
          <div class="case-row"><span>污染</span><strong>${analysis.bestCase.pollution} 格</strong></div>
          <div class="case-events">
            <span>风暴: ${analysis.bestCase.keyEvents.storms}次</span>
            <span>损毁: ${analysis.bestCase.keyEvents.stormsDamaging}次</span>
            <span>净化: ${analysis.bestCase.keyEvents.pollutionCleaned}格</span>
          </div>
        </div>
        <div class="extreme-case worst">
          <h5>💥 最差情况</h5>
          <div class="case-row"><span>评分</span><strong>${analysis.worstCase.score}</strong></div>
          <div class="case-row"><span>结果</span><strong>${analysis.worstCase.win ? '✅ 胜利' : '❌ 失败'}</strong></div>
          <div class="case-row"><span>污染</span><strong>${analysis.worstCase.pollution} 格</strong></div>
          <div class="case-events">
            <span>风暴: ${analysis.worstCase.keyEvents.storms}次</span>
            <span>损毁: ${analysis.worstCase.keyEvents.stormsDamaging}次</span>
            <span>净化: ${analysis.worstCase.keyEvents.pollutionCleaned}格</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderComparisonSection(comparison) {
  if (!comparison.comparisons || comparison.comparisons.length === 0) return '';

  const rows = comparison.comparisons.map(c => {
    const badge = c.recommendation === 'better' 
      ? '<span class="badge better">更优</span>'
      : c.recommendation === 'worse' 
        ? '<span class="badge worse">较差</span>'
        : '<span class="badge similar">相似</span>';
    return `
      <div class="comparison-row">
        <div class="comparison-head">
          <span class="comparison-name">${c.planName}</span>
          ${badge}
        </div>
        <div class="comparison-metrics">
          <div class="metric">
            <span>评分差</span>
            <strong class="${c.scoreDifference >= 0 ? 'good' : 'danger'}">
              ${c.scoreDifference >= 0 ? '+' : ''}${c.scoreDifference.toFixed(1)}
            </strong>
          </div>
          <div class="metric">
            <span>胜率差</span>
            <strong class="${c.winRateDifference >= 0 ? 'good' : 'danger'}">
              ${c.winRateDifference >= 0 ? '+' : ''}${Math.round(c.winRateDifference * 100)}%
            </strong>
          </div>
          <div class="metric">
            <span>污染差</span>
            <strong class="${c.pollutionDifference <= 0 ? 'good' : 'danger'}">
              ${c.pollutionDifference <= 0 ? '' : '+'}${c.pollutionDifference.toFixed(1)}
            </strong>
          </div>
        </div>
        ${c.pros.length > 0 ? `<div class="comparison-pros">✅ ${c.pros.join('；')}</div>` : ''}
        ${c.cons.length > 0 ? `<div class="comparison-cons">⚠️ ${c.cons.join('；')}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="config-section comparison-section">
      <h4>⚖️ 方案对比（基准：${comparison.reference.planName}）</h4>
      <div class="comparison-reference">
        <span>基准平均评分：<strong>${comparison.reference.scoreMean.toFixed(0)}</strong></span>
        <span>基准胜率：<strong>${Math.round(comparison.reference.winRate * 100)}%</strong></span>
        <span>基准污染：<strong>${comparison.reference.pollutionMean.toFixed(0)}格</strong></span>
      </div>
      ${rows}
    </div>
  `;
}

function renderTrendChart(analysis) {
  const snapshots = analysis.trendSnapshots;
  if (!snapshots || snapshots.length === 0) {
    return '<div class="empty-hint">暂无走势数据</div>';
  }

  const maxScore = Math.max(...snapshots.map(s => s.score.p90), 80);
  const minScore = Math.min(...snapshots.map(s => s.score.p10), 0);
  const scoreRange = maxScore - minScore || 1;

  const maxPollution = Math.max(...snapshots.map(s => s.pollution.max), 1);

  const width = 500;
  const height = 200;
  const padding = 30;

  const xScale = (i) => padding + (i / (snapshots.length - 1 || 1)) * (width - padding * 2);
  const yScore = (v) => height - padding - ((v - minScore) / scoreRange) * (height - padding * 2);
  const yPoll = (v) => height - padding - (v / maxPollution) * (height - padding * 2);

  const scoreMeanPath = snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScore(s.score.mean)}`).join(' ');
  const scoreAreaTop = snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScore(s.score.p90)}`).join(' ');
  const scoreAreaBot = snapshots.map((s, i) => `${i === 0 ? 'L' : ''}${xScale(i)},${yScore(s.score.p10)}`).join(' ');
  const pollMeanPath = snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yPoll(s.pollution.mean)}`).join(' ');

  const xLabels = snapshots.map((s, i) => {
    if (i % Math.ceil(snapshots.length / 6) === 0 || i === snapshots.length - 1) {
      return `<text x="${xScale(i)}" y="${height - 8}" text-anchor="middle" fill="#888" font-size="10">潮${s.turn}</text>`;
    }
    return '';
  }).join('');

  const yScoreLabels = [];
  for (let p = 0; p <= 4; p++) {
    const v = minScore + (scoreRange * p / 4);
    yScoreLabels.push(`<text x="${padding - 4}" y="${yScore(v) + 3}" text-anchor="end" fill="#e67e22" font-size="10">${Math.round(v)}</text>`);
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" class="trend-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e67e22" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#e67e22" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      <path d="${scoreAreaTop} L${xScale(snapshots.length - 1)},${yScore(snapshots[snapshots.length - 1].score.p10)} ${snapshots.slice().reverse().map((s, i) => `L${xScale(snapshots.length - 1 - i)},${yScore(s.score.p10)}`).join(' ')} Z"
            fill="url(#scoreGradient)"/>
      <path d="${scoreMeanPath}" fill="none" stroke="#e67e22" stroke-width="2.5"/>
      <path d="${pollMeanPath}" fill="none" stroke="#e74c3c" stroke-width="2" stroke-dasharray="4,3"/>
      ${snapshots.map((s, i) => `<circle cx="${xScale(i)}" cy="${yScore(s.score.mean)}" r="3" fill="#e67e22"/>`).join('')}
      ${xLabels}
      ${yScoreLabels.join('')}
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
    </svg>
    <div class="chart-legend-inline">
      <span><span class="legend-dot" style="background:#e67e22"></span>评分均值</span>
      <span><span class="legend-dot" style="background:#e67e2233;border:1px solid #e67e22"></span>评分 10-90 分位</span>
      <span><span class="legend-line" style="border-color:#e74c3c"></span>污染均值</span>
    </div>
  `;
}

function renderScoreDistribution(score) {
  const segments = [
    { label: 'P0-P10', from: score.min, to: score.p10, color: '#e74c3c' },
    { label: 'P10-P25', from: score.p10, to: score.p25, color: '#e67e22' },
    { label: 'P25-P50', from: score.p25, to: score.median, color: '#f1c40f' },
    { label: 'P50-P75', from: score.median, to: score.p75, color: '#2ecc71' },
    { label: 'P75-P90', from: score.p75, to: score.p90, color: '#27ae60' },
    { label: 'P90-P100', from: score.p90, to: score.max, color: '#16a085' }
  ];

  const range = score.max - score.min || 1;

  return segments.map(seg => {
    const width = ((seg.to - seg.from) / range) * 100;
    return `
      <div class="dist-segment" style="width: ${Math.max(width, 2)}%; background: ${seg.color}"
           title="${seg.label}: ${Math.round(seg.from)} ~ ${Math.round(seg.to)}">
        <span class="dist-value">${Math.round(seg.to)}</span>
      </div>
    `;
  }).join('');
}

function renderRiskItem(label, risk) {
  return `
    <div class="risk-item risk-${risk.level}">
      <div class="risk-label">${label}</div>
      <div class="risk-level-badge">${getRiskLabel(risk.level)}</div>
      <div class="risk-bar">
        <div class="risk-bar-fill" style="width: ${risk.percentage}%"></div>
      </div>
      <div class="risk-percentage">${risk.percentage}% 运行受影响</div>
      <div class="risk-description">${risk.description}</div>
    </div>
  `;
}

function renderKeyEvent(ev) {
  const typeLabels = {
    turn_end: '📈 回合结束',
    storm: '🌪️ 风暴来袭',
    pollution_spread: '☢️ 污染扩散',
    oyster_clean: '✨ 牡蛎净化',
    ecosystem: '🌿 生态效果',
    pre_place: '🏗️ 预放置',
    place: '🏗️ 设施放置'
  };

  return `
    <div class="key-event-item">
      <div class="event-type">${typeLabels[ev.type] || ev.type}</div>
      <div class="event-frequency">
        <div class="event-freq-bar">
          <div class="event-freq-fill" style="width: ${Math.min(ev.percentage, 100)}%"></div>
        </div>
        <span>${ev.percentage}% 模拟出现</span>
      </div>
      ${ev.example ? `<div class="event-example">示例：${ev.example.message}</div>` : ''}
    </div>
  `;
}

function getRiskLabel(level) {
  return { high: '🔴 高风险', medium: '🟡 中风险', low: '🟢 低风险' }[level] || level;
}

function bindSimulatorEvents(container) {
  container.querySelectorAll('[data-tool]').forEach(btn => {
    btn.onclick = () => {
      simState.currentTool = btn.dataset.tool;
      container.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  container.querySelectorAll('.sim-grid-cell').forEach(cell => {
    cell.onclick = () => {
      const idx = parseInt(cell.dataset.cellIndex);
      handleGridClick(idx);
      renderSimulator(container, simState.game, simState.scene);
    };
  });

  container.querySelectorAll('[data-sim-action]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      handleSimAction(btn.dataset.simAction, container);
    };
  });

  const runsSelect = container.querySelector('#simRunsSelect');
  if (runsSelect) {
    runsSelect.onchange = () => {
      simState.simulationRuns = parseInt(runsSelect.value);
    };
  }

  const turnsSelect = container.querySelector('#simTurnsSelect');
  if (turnsSelect) {
    turnsSelect.onchange = () => {
      simState.simulationTurns = parseInt(turnsSelect.value);
    };
  }

  const runBtn = container.querySelector('#runSimulationBtn');
  if (runBtn) {
    runBtn.onclick = () => runAllSimulations(container);
  }

  const compareBtn = container.querySelector('#comparePlansBtn');
  if (compareBtn) {
    compareBtn.onclick = () => handleComparePlans(container);
  }

  container.querySelectorAll('[data-plan-index]').forEach(el => {
    const idx = parseInt(el.dataset.planIndex);
    if (el.classList.contains('candidate-plan')) {
      el.onclick = () => {
        simState.activePlanIndex = idx;
        renderSimulator(container, simState.game, simState.scene);
      };
    }
  });

  container.querySelectorAll('.remove-plan-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.planIndex);
      removePlan(idx);
      if (simState.activePlanIndex >= simState.candidatePlans.length) {
        simState.activePlanIndex = simState.candidatePlans.length - 1;
      }
      renderSimulator(container, simState.game, simState.scene);
    };
  });

  container.querySelectorAll('.remove-placement').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.placementIndex);
      simState.tempPlacements.splice(idx, 1);
      renderSimulator(container, simState.game, simState.scene);
    };
  });

  const closeBtn = container.querySelector('[data-sim-action="close"]');
  if (closeBtn) {
    closeBtn.onclick = () => {
      container.classList.add('hidden');
      simState = null;
    };
  }
}

function handleGridClick(index) {
  const tool = simState.currentTool;
  const cells = simState.game.cells;
  const rules = simState.rules;
  const cell = cells[index];

  const existingIdx = simState.tempPlacements.findIndex(p => p.index === index);

  if (tool === 'erase') {
    if (existingIdx >= 0) {
      simState.tempPlacements.splice(existingIdx, 1);
    }
    return;
  }

  if (existingIdx >= 0) {
    simState.tempPlacements.splice(existingIdx, 1);
    return;
  }

  if (cell.type !== CELL_TYPES.EMPTY) {
    return;
  }

  const cost = getFacilityCost(rules, tool);
  const currentUsed = simState.tempPlacements.reduce((s, p) => s + getFacilityCost(rules, p.type), 0);
  if (simState.game.budget - currentUsed < cost) {
    return;
  }

  simState.tempPlacements.push({ index, type: tool, cost });
}

function handleSimAction(action, container) {
  switch (action) {
    case 'add-recommended':
      addRecommendedPlan();
      renderSimulator(container, simState.game, simState.scene);
      break;
    case 'save-plan':
      saveCurrentAsPlan();
      renderSimulator(container, simState.game, simState.scene);
      break;
    case 'clear-placements':
      simState.tempPlacements = [];
      renderSimulator(container, simState.game, simState.scene);
      break;
    case 'close':
      container.classList.add('hidden');
      simState = null;
      break;
  }
}

function addRecommendedPlan() {
  const budget = simState.game.budget;
  const recommended = generateRecommendedPlan(simState.game, simState.scene, budget);

  const existingIdx = simState.candidatePlans.findIndex(p => p.name === '💡 AI推荐方案');
  if (existingIdx >= 0) {
    simState.candidatePlans[existingIdx] = {
      id: `rec-${Date.now()}`,
      name: '💡 AI推荐方案',
      placements: recommended.map(r => ({ index: r.index, type: r.type, cost: r.cost })),
      analysis: null,
      isCurrent: false,
      reason: recommended.map(r => r.reason)
    };
    simState.activePlanIndex = existingIdx;
  } else {
    simState.candidatePlans.push({
      id: `rec-${Date.now()}`,
      name: '💡 AI推荐方案',
      placements: recommended.map(r => ({ index: r.index, type: r.type, cost: r.cost })),
      analysis: null,
      isCurrent: false,
      reason: recommended.map(r => r.reason)
    });
    simState.activePlanIndex = simState.candidatePlans.length - 1;
  }

  simState.tempPlacements = recommended.map(r => ({ index: r.index, type: r.type, cost: r.cost }));
}

function saveCurrentAsPlan() {
  if (simState.tempPlacements.length === 0) {
    simState.candidatePlans[0].analysis = null;
    return;
  }

  const planNum = simState.candidatePlans.filter(p => p.name.startsWith('方案')).length + 1;
  const rules = simState.rules;
  const cost = simState.tempPlacements.reduce((s, p) => s + getFacilityCost(rules, p.type), 0);

  simState.candidatePlans.push({
    id: `plan-${Date.now()}`,
    name: `方案 ${planNum}（${simState.tempPlacements.length}项，-${cost}💰）`,
    placements: [...simState.tempPlacements],
    analysis: null,
    isCurrent: false
  });
  simState.activePlanIndex = simState.candidatePlans.length - 1;
}

function removePlan(index) {
  if (index <= 0) return;
  simState.candidatePlans.splice(index, 1);
  simState.comparison = null;
}

async function runAllSimulations(container) {
  simState.isSimulating = true;
  simState.progress = 0;
  simState.comparison = null;
  renderSimulator(container, simState.game, simState.scene);

  const runs = simState.simulationRuns;
  const turns = simState.simulationTurns;

  const totalPlans = simState.candidatePlans.length;
  let completedPlans = 0;

  for (let i = 0; i < simState.candidatePlans.length; i++) {
    const plan = simState.candidatePlans[i];
    simState.activePlanIndex = i;

    const placements = plan.isCurrent ? [] : plan.placements.map(p => ({ index: p.index, type: p.type }));

    try {
      const analysis = runMonteCarloSimulation(simState.game, simState.scene, {
        prePlacements: placements,
        runs,
        turnsToSimulate: turns,
        onProgress: (done, total) => {
          simState.progress = Math.round(((completedPlans * 100) + (done / total * 100)) / totalPlans);
          if (container.querySelector('#runSimulationBtn')) {
            container.querySelector('#runSimulationBtn').textContent = 
              `⏳ 模拟中 (${completedPlans + 1}/${totalPlans}) ${simState.progress}%...`;
          }
        }
      });
      plan.analysis = analysis;
    } catch (err) {
      console.error('Simulation error:', err);
    }

    completedPlans++;
  }

  simState.isSimulating = false;
  simState.progress = 100;
  renderSimulator(container, simState.game, simState.scene);
}

function handleComparePlans(container) {
  const analyzed = simState.candidatePlans.filter(p => p.analysis);
  if (analyzed.length < 2) return;

  const planList = analyzed.map(p => ({
    name: p.name,
    placements: p.placements,
    analysis: p.analysis
  }));

  simState.comparison = comparePlans(simState.game, simState.scene, planList);
  renderSimulator(container, simState.game, simState.scene);
}

export function showSimulatorOverlay(overlay, game, scene) {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal simulator-modal">
      <div id="simulatorContent"></div>
    </div>
  `;
  const content = overlay.querySelector('#simulatorContent');
  renderSimulator(content, game, scene);
}

export { renderSimulator };
