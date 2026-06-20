import { SANDBOX_SCENE_ID } from '../game/constants.js';
import {
  createEditorState,
  resetEditorState,
  renderEditorGrid,
  renderEditorTools,
  handleEditorClick,
  handleEditorHover,
  updateEditorPreview,
  validateEditorConfig,
  showEditorError,
  clearEditorError,
  buildSandboxScene,
  readParamsFromDOM,
  writeParamsToDOM
} from '../editor/sandbox.js';
import {
  getAllTemplates,
  getTemplatesByCategory,
  applyTemplateToEditor,
  validateTemplate
} from '../editor/templates.js';
import {
  loadDrafts,
  saveDraft,
  deleteDraft,
  applyDraftToEditor,
  validateDraft,
  formatDraftPreview
} from '../editor/drafts.js';
import {
  showEditor as showEditorModal,
  hideEditor as hideEditorModal,
  hideOverlay
} from '../ui/modals.js';
import dom from '../ui/dom.js';
import {
  getCurrentTemplateCategory,
  setCurrentTemplateCategory,
  getCurrentSceneId,
  getSelectedSceneId,
  setSelectedSceneId
} from '../app-state.js';
import { startNewGame } from './game-controller.js';
import { clearChallengeGenError } from './challenge-controller.js';
import { renderSceneList } from '../ui/modals.js';

let editorState = createEditorState();

export function getEditorState() {
  return editorState;
}

let _onCloseCallback = null;

export function setOnCloseCallback(callback) {
  _onCloseCallback = callback;
}

export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

export function openSandboxEditor() {
  resetEditorState(editorState);
  writeParamsToDOM(editorState.params);
  clearEditorError(dom.editorErrorEl);
  clearChallengeGenError();
  dom.challengeOutput.value = '';
  closeAllEditorPanels();
  showEditorModal(dom.editorOverlay, dom.sceneOverlay);
  renderEditor();
  bindEditorEvents();
  bindEditorPanelEvents();

  const drafts = loadDrafts();
  if (drafts.length > 0 && confirm(`发现 ${drafts.length} 个已保存的草稿。是否加载最近的草稿继续编辑？`)) {
    const latestDraft = drafts[0];
    applyDraftToEditor(editorState, latestDraft);
    writeParamsToDOM(editorState.params);
    clearEditorError(dom.editorErrorEl);
    renderEditor();
    showToast(`已加载草稿：${latestDraft.name}`);
  }
}

export function closeSandboxEditor() {
  hideEditorModal(dom.editorOverlay, dom.sceneOverlay);
  const sceneId = getCurrentSceneId();
  setSelectedSceneId(sceneId);
  renderSceneList(dom.sceneListEl, getSelectedSceneId(), handleSceneSelectFromEditor);
}

function handleSceneSelectFromEditor(sceneId) {
  if (sceneId === 'sandbox-editor') {
    return;
  }
  setSelectedSceneId(sceneId);
  renderSceneList(dom.sceneListEl, getSelectedSceneId(), handleSceneSelectFromEditor);
}

export function renderEditor() {
  renderEditorGrid(
    dom.editorGridEl,
    editorState.cells,
    i => onEditorCellClick(i),
    (i, enter) => onEditorCellHover(i, enter)
  );
  renderEditorTools(dom.editorToolsEl, editorState.editTool);
  updateEditorPreview()(editorState);
}

function onEditorCellClick(i) {
  const clearedAll = handleEditorClick(editorState, i);
  if (clearedAll) {
    writeParamsToDOM(editorState.params);
    clearEditorError(dom.editorErrorEl);
  }
  renderEditor();
}

function onEditorCellHover(i, enter) {
  handleEditorHover(dom.editorGridEl, i, enter, editorState.editTool);
}

function bindEditorEvents() {
  dom.editorToolsEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      editorState.editTool = btn.dataset.edit;
      if (editorState.editTool === 'clearAll') {
        resetEditorState(editorState);
        writeParamsToDOM(editorState.params);
        clearEditorError(dom.editorErrorEl);
      }
      renderEditor();
    };
  });

  ['paramBudget', 'paramTurns', 'paramStorm', 'paramGoal'].forEach(id => {
    const el = document.querySelector('#' + id);
    if (el) {
      el.oninput = () => {
        const params = readParamsFromDOM();
        editorState.params = params;
        updateEditorPreview()(editorState);
        clearEditorError(dom.editorErrorEl);
      };
    }
  });
}

export function closeAllEditorPanels() {
  dom.templateLibPanel.classList.add('hidden');
  dom.draftPanel.classList.add('hidden');
  dom.saveDraftPanel.classList.add('hidden');
}

export function openTemplateLib() {
  closeAllEditorPanels();
  dom.templateLibPanel.classList.remove('hidden');
  renderTemplateList();
  bindTemplateEvents();
}

export function openDraftPanel() {
  closeAllEditorPanels();
  dom.draftPanel.classList.remove('hidden');
  renderDraftList();
  bindDraftEvents();
}

export function openSaveDraftPanel() {
  closeAllEditorPanels();
  dom.saveDraftPanel.classList.remove('hidden');
  dom.draftNameInput.value = '';
  dom.draftNameInput.focus();
}

export function renderTemplateList() {
  const templates = getTemplatesByCategory(getCurrentTemplateCategory());

  dom.templateListEl.innerHTML = templates.map(template => {
    const pollutionCount = template.cells.filter(c => c.polluted).length;
    const facilityCount = template.cells.filter(c => c.type !== 'empty').length;
    const categoryLabel = template.category === 'pollution' ? '污染分布' : '设施布局';

    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <span class="template-card-name">${template.name}</span>
          <span class="template-card-category ${template.category}">${categoryLabel}</span>
        </div>
        <div class="template-card-desc">${template.desc}</div>
        <div class="template-card-stats">
          <span class="template-card-stat">污染 ${pollutionCount} 格</span>
          <span class="template-card-stat">设施 ${facilityCount} 处</span>
          <span class="template-card-stat">预算 ${template.params.budget}</span>
          <span class="template-card-stat">${template.params.turns} 回合</span>
          <span class="template-card-stat">风暴 ${Math.round(template.params.stormChance * 100)}%</span>
          <span class="template-card-stat">目标 ${template.params.goalScore}</span>
        </div>
      </div>
    `;
  }).join('');
}

function bindTemplateEvents() {
  document.querySelectorAll('.template-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.template-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      setCurrentTemplateCategory(tab.dataset.templateCategory);
      renderTemplateList();
      bindTemplateCardEvents();
    };
  });

  bindTemplateCardEvents();
}

function bindTemplateCardEvents() {
  dom.templateListEl.querySelectorAll('.template-card').forEach(card => {
    card.onclick = () => {
      const templateId = card.dataset.templateId;
      const template = getAllTemplates().find(t => t.id === templateId);
      if (!template) return;

      const errors = validateTemplate(template);
      if (errors.length > 0) {
        showToast(`模板无效：${errors.join('；')}`, 'error');
        return;
      }

      applyTemplateToEditor(editorState, template);
      writeParamsToDOM(editorState.params);
      clearEditorError(dom.editorErrorEl);
      renderEditor();
      closeAllEditorPanels();
      showToast(`已套用模板：${template.name}`);
    };
  });
}

export function renderDraftList() {
  const drafts = loadDrafts();

  if (drafts.length === 0) {
    dom.draftListEl.innerHTML = '';
    dom.draftListEl.classList.add('hidden');
    dom.draftEmptyEl.classList.remove('hidden');
    return;
  }

  dom.draftListEl.classList.remove('hidden');
  dom.draftEmptyEl.classList.add('hidden');

  dom.draftListEl.innerHTML = drafts.map(draft => {
    const preview = formatDraftPreview(draft);
    const updatedDate = new Date(draft.updatedAt).toLocaleString('zh-CN');

    return `
      <div class="draft-card" data-draft-id="${draft.id}">
        <div class="draft-card-header">
          <span class="draft-card-name">${draft.name}</span>
          <span class="draft-card-date">${updatedDate}</span>
        </div>
        <div class="draft-card-stats">
          <span class="draft-card-stat">污染 <strong>${preview.pollutionCount}</strong> 格</span>
          <span class="draft-card-stat">设施 <strong>${preview.facilityCount}</strong> 处</span>
          <span class="draft-card-stat">预算 <strong>${preview.budget}</strong></span>
          <span class="draft-card-stat"><strong>${preview.turns}</strong> 回合</span>
          <span class="draft-card-stat">风暴 <strong>${Math.round(preview.stormChance * 100)}%</strong></span>
          <span class="draft-card-stat">目标 <strong>${preview.goalScore}</strong></span>
        </div>
        <div class="draft-card-actions">
          <button class="load-draft-btn" data-draft-id="${draft.id}">加载</button>
          <button class="delete-btn delete-draft-btn" data-draft-id="${draft.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function bindDraftEvents() {
  dom.draftListEl.querySelectorAll('.load-draft-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const draftId = btn.dataset.draftId;
      const drafts = loadDrafts();
      const draft = drafts.find(d => d.id === draftId);
      if (!draft) return;

      const errors = validateDraft(draft);
      if (errors.length > 0) {
        showToast(`草稿已损坏：${errors.join('；')}`, 'error');
        return;
      }

      applyDraftToEditor(editorState, draft);
      writeParamsToDOM(editorState.params);
      clearEditorError(dom.editorErrorEl);
      renderEditor();
      closeAllEditorPanels();
      showToast(`已加载草稿：${draft.name}`);
    };
  });

  dom.draftListEl.querySelectorAll('.delete-draft-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const draftId = btn.dataset.draftId;
      const drafts = loadDrafts();
      const draft = drafts.find(d => d.id === draftId);
      if (!draft) return;

      if (confirm(`确定要删除草稿"${draft.name}"吗？此操作不可撤销。`)) {
        deleteDraft(draftId);
        renderDraftList();
        bindDraftEvents();
        showToast(`已删除草稿：${draft.name}`);
      }
    };
  });
}

export function handleSaveDraft() {
  const params = readParamsFromDOM();
  editorState.params = params;

  const errors = validateEditorConfig(editorState);
  if (errors.length > 0) {
    showToast(`配置有误：${errors[0]}`, 'error');
    return;
  }

  const draftName = dom.draftNameInput.value.trim();
  const draft = saveDraft(editorState, draftName);

  closeAllEditorPanels();
  showToast(`草稿已保存：${draft.name}`);
}

function bindEditorPanelEvents() {
  document.querySelectorAll('[data-close-panel]').forEach(btn => {
    btn.onclick = () => {
      const panelId = btn.dataset.closePanel;
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('hidden');
    };
  });
}

export function saveAndStartSandbox() {
  const params = readParamsFromDOM();
  editorState.params = params;

  const errors = validateEditorConfig(editorState);
  if (errors.length > 0) {
    showEditorError(dom.editorErrorEl, errors.join('\n'));
    return;
  }

  clearEditorError(dom.editorErrorEl);
  buildSandboxScene(editorState);
  startNewGame(SANDBOX_SCENE_ID);
  hideOverlay(dom.editorOverlay);
}
