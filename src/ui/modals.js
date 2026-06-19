import { getAllScenes } from '../data/scenes.js';
import { SANDBOX_EDITOR_ID } from '../game/constants.js';

export function renderSceneList(sceneListEl, selectedSceneId, onSelect) {
  const regularScenes = getAllScenes()
    .filter(s => s.id !== 'sandbox')
    .map(s => `
      <div class="scene-card ${s.id === selectedSceneId ? 'selected' : ''}" data-id="${s.id}">
        <h3>${s.name}</h3>
        <div class="desc">${s.desc}</div>
        <div class="tags">
          ${s.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        <div style="margin-top:10px; font-size:12px; color:#4a5f5d;">
          预算：${s.budget} | 回合：${s.turns} | 目标：${s.goalDesc}
        </div>
      </div>
    `).join('');

  const sandboxCard = `
    <div class="scene-card ${selectedSceneId === SANDBOX_EDITOR_ID ? 'selected' : ''}" data-id="${SANDBOX_EDITOR_ID}">
      <h3>沙盒编辑器</h3>
      <div class="desc">自由配置污染格、初始设施和游戏参数，打造你的专属修复挑战。</div>
      <div class="tags">
        <span class="tag sandbox-tag">自定义</span>
        <span class="tag">自由配置</span>
        <span class="tag">创意挑战</span>
      </div>
      <div style="margin-top:10px; font-size:12px; color:#4a5f5d;">
        点击进入编辑器配置地图和参数
      </div>
    </div>
  `;

  sceneListEl.innerHTML = regularScenes + sandboxCard;

  sceneListEl.querySelectorAll('.scene-card').forEach(card => {
    card.onclick = () => {
      onSelect(card.dataset.id);
    };
  });
}

export function showOverlay(overlayEl) {
  overlayEl.classList.remove('hidden');
}

export function hideOverlay(overlayEl) {
  overlayEl.classList.add('hidden');
}

export function showSceneSelect(sceneOverlayEl, resultOverlayEl) {
  hideOverlay(resultOverlayEl);
  showOverlay(sceneOverlayEl);
}

export function showResult(resultTitleEl, resultTextEl, overlayEl, title, text) {
  resultTitleEl.textContent = title;
  resultTextEl.textContent = text;
  switchResultTab('result');
  showOverlay(overlayEl);
}

export function switchResultTab(tabName) {
  document.querySelectorAll('.result-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.result-tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== tabName + 'TabContent');
  });
}

export function bindResultTabSwitcher(onSwitch) {
  document.querySelectorAll('.result-tab').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      switchResultTab(tab);
      if (onSwitch) onSwitch(tab);
    };
  });
}

export function updateSceneInfo(sceneInfoEl, sceneName) {
  sceneInfoEl.textContent = `当前场景：${sceneName}`;
}

export function showEditor(editorOverlayEl, sceneOverlayEl) {
  hideOverlay(sceneOverlayEl);
  showOverlay(editorOverlayEl);
}

export function hideEditor(editorOverlayEl, sceneOverlayEl) {
  hideOverlay(editorOverlayEl);
  showOverlay(sceneOverlayEl);
}

const CHART_METRICS = [
  { key: 'water', label: '水质', color: '#237070' },
  { key: 'larvae', label: '幼体', color: '#c08d2d' },
  { key: 'bio', label: '多样性', color: '#6eb77a' },
  { key: 'pollution', label: '污染格', color: '#8b5a3c' }
];

export function renderReplayView(game) {
  renderTrendChart(game.replay);
  renderStrategySummary(game.replay);
  renderEventTimeline(game.replay);
}

function renderTrendChart(replay) {
  const svg = document.querySelector('#trendChart');
  const legendEl = document.querySelector('#chartLegend');
  if (!svg || !legendEl) return;

  const snapshots = replay.snapshots;
  if (snapshots.length < 2) {
    svg.innerHTML = '<text x="300" y="130" text-anchor="middle" fill="#8a9a98" font-size="14">对局回合过少，暂无可视化数据</text>';
    legendEl.innerHTML = '';
    return;
  }

  const W = 600, H = 260;
  const paddingL = 44, paddingR = 16, paddingT = 16, paddingB = 36;
  const chartW = W - paddingL - paddingR;
  const chartH = H - paddingT - paddingB;

  const maxTurn = Math.max(...snapshots.map(s => s.turn));
  const maxVal = 100;

  const xFor = turn => paddingL + (turn - 1) * chartW / Math.max(1, maxTurn - 1);
  const yFor = val => paddingT + chartH - (val / maxVal) * chartH;

  let parts = [];

  parts.push(`<line x1="${paddingL}" y1="${paddingT}" x2="${paddingL}" y2="${paddingT + chartH}" stroke="#c9dbd8" stroke-width="1"/>`);
  parts.push(`<line x1="${paddingL}" y1="${paddingT + chartH}" x2="${paddingL + chartW}" y2="${paddingT + chartH}" stroke="#c9dbd8" stroke-width="1"/>`);

  for (let v = 0; v <= maxVal; v += 25) {
    const y = yFor(v);
    parts.push(`<line x1="${paddingL}" y1="${y}" x2="${paddingL + chartW}" y2="${y}" stroke="#eaf3f1" stroke-width="1"/>`);
    parts.push(`<text x="${paddingL - 6}" y="${y + 4}" text-anchor="end" fill="#8a9a98" font-size="10">${v}</text>`);
  }

  for (let t = 1; t <= maxTurn; t++) {
    const x = xFor(t);
    parts.push(`<text x="${x}" y="${paddingT + chartH + 18}" text-anchor="middle" fill="#8a9a98" font-size="10">潮${t}</text>`);
  }

  CHART_METRICS.forEach(metric => {
    const points = snapshots.map(s => {
      const val = Math.max(0, Math.min(maxVal, s[metric.key]));
      return `${xFor(s.turn).toFixed(1)},${yFor(val).toFixed(1)}`;
    }).join(' ');
    parts.push(`<polyline points="${points}" fill="none" stroke="${metric.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`);

    snapshots.forEach(s => {
      const val = Math.max(0, Math.min(maxVal, s[metric.key]));
      const cx = xFor(s.turn);
      const cy = yFor(val);
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="#fff" stroke="${metric.color}" stroke-width="1.8"/>`);
    });
  });

  svg.innerHTML = parts.join('');

  legendEl.innerHTML = CHART_METRICS.map(m => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${m.color}"></span>
      <span>${m.label}</span>
    </div>
  `).join('');
}

function renderStrategySummary(replay) {
  const el = document.querySelector('#strategySummary');
  if (!el) return;

  const snapshots = replay.snapshots;
  const events = replay.events;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  const placeEvents = events.filter(e => e.type === 'place');
  const removeEvents = events.filter(e => e.type === 'remove');
  const stormEvents = events.filter(e => e.type === 'storm');
  const spreadEvents = events.filter(e => e.type === 'pollution_spread');
  const cleanEvents = events.filter(e => e.type === 'oyster_clean');

  const oysterPlaced = placeEvents.filter(e => e.data && e.data.type === 'oyster').length;
  const grassPlaced = placeEvents.filter(e => e.data && e.data.type === 'grass').length;
  const pilePlaced = placeEvents.filter(e => e.data && e.data.type === 'pile').length;
  const totalSpent = placeEvents.reduce((sum, e) => sum + (e.data ? e.data.cost || 0 : 0), 0);

  const stormDamageCount = stormEvents.filter(e => e.data && e.data.damaged).length;
  const totalSpread = spreadEvents.reduce((sum, e) => sum + (e.data ? e.data.count || 0 : 0), 0);
  const totalCleaned = cleanEvents.reduce((sum, e) => sum + (e.data ? e.data.count || 0 : 0), 0);

  const waterDelta = last.water - first.water;
  const larvaeDelta = last.larvae - first.larvae;
  const bioDelta = last.bio - first.bio;
  const pollutionDelta = last.pollution - first.pollution;

  const deltaText = (v) => v > 0 ? `<span class="delta-pos">+${v}</span>` : v < 0 ? `<span class="delta-neg">${v}</span>` : `<span class="delta-zero">${v}</span>`;

  const strategyInsights = [];

  if (last.oysters === 0 && last.grass === 0) {
    strategyInsights.push('本局未放置任何生态设施，建议先建立基础修复体系。');
  }
  if (last.pollution > first.pollution && pilePlaced === 0) {
    strategyInsights.push('污染持续扩散且未建造围护桩，建议在污染源周边设置围护桩减缓扩散。');
  }
  if (oysterPlaced > 0 && last.water < first.water) {
    strategyInsights.push('已放置牡蛎礁但水质仍下降，可能需要增加密度或配合其他设施。');
  }
  if (grassPlaced === 0 && last.bio < 50) {
    strategyInsights.push('多样性偏低，海草床对提升多样性效果显著，建议增加。');
  }
  if (stormDamageCount > 0) {
    strategyInsights.push(`本局共遭遇${stormEvents.length}次风暴，${stormDamageCount}次造成设施损坏，可考虑分散设施布局。`);
  }
  if (totalCleaned > 0) {
    strategyInsights.push(`牡蛎礁共净化${totalCleaned}个污染格，净化效果已触发。`);
  }
  if (strategyInsights.length === 0) {
    strategyInsights.push('策略较为均衡，继续优化设施布局和投放时机。');
  }

  el.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">场景</div>
        <div class="summary-value">${replay.sceneName}</div>
        <div class="summary-sub">目标：${replay.goalDesc}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">最终指标变化</div>
        <div class="summary-deltas">
          <div>水质 ${deltaText(waterDelta)}</div>
          <div>幼体 ${deltaText(larvaeDelta)}</div>
          <div>多样性 ${deltaText(bioDelta)}</div>
          <div>污染格 ${deltaText(pollutionDelta)}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-label">设施投入</div>
        <div class="summary-value">共 ${placeEvents.length} 处 / ${totalSpent} 预算</div>
        <div class="summary-sub">牡蛎礁${oysterPlaced} · 海草床${grassPlaced} · 围护桩${pilePlaced}</div>
        ${removeEvents.length > 0 ? `<div class="summary-sub">移除 ${removeEvents.length} 处</div>` : ''}
      </div>
      <div class="summary-card">
        <div class="summary-label">关键事件</div>
        <div class="summary-sub">风暴 ${stormEvents.length} 次${stormDamageCount > 0 ? `（损坏${stormDamageCount}处）` : ''}</div>
        <div class="summary-sub">污染扩散 ${spreadEvents.length} 次（新增${totalSpread}格）</div>
        <div class="summary-sub">牡蛎净化 ${cleanEvents.length} 次（净化${totalCleaned}格）</div>
      </div>
    </div>
    <div class="strategy-insights">
      <h4>策略分析</h4>
      <ul>
        ${strategyInsights.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderEventTimeline(replay) {
  const el = document.querySelector('#eventTimeline');
  if (!el) return;

  const importantTypes = {
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

  const displayEvents = replay.events.filter(e => e.type !== 'turn_end').slice(-30);

  if (displayEvents.length === 0) {
    el.innerHTML = '<div class="timeline-empty">暂无事件记录</div>';
    return;
  }

  el.innerHTML = displayEvents.map(ev => {
    const meta = importantTypes[ev.type] || { icon: '📌', label: ev.type };
    return `
      <div class="timeline-item timeline-${ev.type}">
        <div class="timeline-dot">${meta.icon}</div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-tag">第${ev.turn}潮 · ${meta.label}</span>
          </div>
          <div class="timeline-message">${ev.message}</div>
        </div>
      </div>
    `;
  }).join('');
}
