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
  showOverlay(overlayEl);
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
