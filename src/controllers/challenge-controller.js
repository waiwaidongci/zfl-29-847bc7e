import { SANDBOX_SCENE_ID, COSTS } from '../game/constants.js';
import {
  generateChallengeCode,
  parseChallengeCode,
  validateChallengeConfig,
  buildChallengeScene
} from '../editor/challenge.js';
import {
  readParamsFromDOM,
  validateEditorConfig
} from '../editor/sandbox.js';
import {
  hideOverlay
} from '../ui/modals.js';
import dom from '../ui/dom.js';
import { startNewGame, getActiveScene } from './game-controller.js';

let parsedChallenge = null;

export function getParsedChallenge() {
  return parsedChallenge;
}

export function setParsedChallenge(value) {
  parsedChallenge = value;
}

export function clearChallengeImportState() {
  parsedChallenge = null;
  dom.challengeInput.value = '';
  dom.challengePreviewEl.textContent = '解析成功后，此处将显示挑战配置预览。';
  dom.challengePreviewEl.classList.add('empty');
  clearChallengeError();
  dom.challengeStartBtn.disabled = true;
  dom.challengeStartBtn.style.opacity = '0.5';
  dom.challengeStartBtn.style.cursor = 'not-allowed';
}

export function clearChallengeError() {
  dom.challengeErrorEl.textContent = '';
  dom.challengeErrorEl.classList.remove('show');
}

export function showChallengeError(message) {
  dom.challengeErrorEl.textContent = message;
  dom.challengeErrorEl.classList.add('show');
}

export function clearChallengeGenError() {
  dom.challengeGenErrorEl.textContent = '';
  dom.challengeGenErrorEl.classList.remove('show');
}

export function showChallengeGenError(message) {
  dom.challengeGenErrorEl.textContent = message;
  dom.challengeGenErrorEl.classList.add('show');
}

export function formatChallengePreview(decoded) {
  const pollutionCount = decoded.cells.filter(c => c.polluted).length;
  const facilities = decoded.cells.filter(c => c.type !== 'empty');
  const facilityCount = facilities.length;
  const facilityCost = facilities.reduce((sum, c) => sum + COSTS[c.type], 0);
  const oysterCount = facilities.filter(c => c.type === 'oyster').length;
  const grassCount = facilities.filter(c => c.type === 'grass').length;
  const pileCount = facilities.filter(c => c.type === 'pile').length;
  const remainingBudget = decoded.params.budget - facilityCost;

  const validateErrors = validateChallengeConfig(decoded);
  let statusHtml = '';
  if (validateErrors.length > 0) {
    statusHtml = `<div style="color:#c0392b; margin-top:6px;">⚠️ 警告：${validateErrors.join('；')}</div>`;
  } else {
    statusHtml = `<div style="color:#237070; margin-top:6px;">✅ 配置有效，可以开始挑战。</div>`;
  }

  return `
    <div><strong>预算：</strong>${decoded.params.budget}（初始设施花费 ${facilityCost}，剩余 ${remainingBudget}）</div>
    <div><strong>回合：</strong>${decoded.params.turns} 潮</div>
    <div><strong>风暴概率：</strong>${Math.round(decoded.params.stormChance * 100)}%</div>
    <div><strong>目标评分：</strong>${decoded.params.goalScore}</div>
    <div><strong>污染格：</strong>${pollutionCount} 格</div>
    <div><strong>初始设施：</strong>${facilityCount} 处（牡蛎礁 ${oysterCount} · 海草床 ${grassCount} · 围护桩 ${pileCount}）</div>
    ${statusHtml}
  `;
}

export function handleLoadChallenge() {
  clearChallengeError();
  parsedChallenge = null;
  dom.challengeStartBtn.disabled = true;
  dom.challengeStartBtn.style.opacity = '0.5';
  dom.challengeStartBtn.style.cursor = 'not-allowed';

  const code = dom.challengeInput.value;
  if (!code.trim()) {
    showChallengeError('请输入挑战码。');
    dom.challengePreviewEl.textContent = '解析成功后，此处将显示挑战配置预览。';
    dom.challengePreviewEl.classList.add('empty');
    return;
  }

  try {
    const decoded = parseChallengeCode(code);
    parsedChallenge = decoded;

    const validateErrors = validateChallengeConfig(decoded);
    dom.challengePreviewEl.innerHTML = formatChallengePreview(decoded);
    dom.challengePreviewEl.classList.remove('empty');

    if (validateErrors.length === 0) {
      dom.challengeStartBtn.disabled = false;
      dom.challengeStartBtn.style.opacity = '1';
      dom.challengeStartBtn.style.cursor = 'pointer';
    } else {
      showChallengeError(validateErrors.join('\n'));
    }
  } catch (e) {
    showChallengeError(e.message);
    dom.challengePreviewEl.textContent = '解析失败，请检查挑战码是否正确完整。';
    dom.challengePreviewEl.classList.add('empty');
  }
}

export function handleStartChallenge() {
  if (!parsedChallenge) {
    showChallengeError('请先成功解析一段挑战码。');
    return;
  }

  const validateErrors = validateChallengeConfig(parsedChallenge);
  if (validateErrors.length > 0) {
    showChallengeError(validateErrors.join('\n'));
    return;
  }

  try {
    buildChallengeScene(parsedChallenge);
    startNewGame(SANDBOX_SCENE_ID);
    hideOverlay(dom.sceneOverlay);
  } catch (e) {
    showChallengeError('启动场景失败：' + e.message);
  }
}

let _getEditorState = null;

export function setEditorStateGetter(getter) {
  _getEditorState = getter;
}

export function handleGenerateChallenge() {
  clearChallengeGenError();
  dom.challengeOutput.value = '';

  const editorState = _getEditorState ? _getEditorState() : null;
  if (!editorState) return;

  const params = readParamsFromDOM();
  editorState.params = params;

  const errors = validateEditorConfig(editorState);
  if (errors.length > 0) {
    showChallengeGenError(errors.join('\n'));
    return;
  }

  try {
    const code = generateChallengeCode(editorState);
    dom.challengeOutput.value = code;
  } catch (e) {
    showChallengeGenError('生成失败：' + e.message);
  }
}

export function handleCopyChallenge() {
  clearChallengeGenError();
  const code = dom.challengeOutput.value;
  if (!code) {
    showChallengeGenError('请先点击"生成"创建挑战码。');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => {
        const originalText = dom.challengeCopyBtn.textContent;
        dom.challengeCopyBtn.textContent = '已复制 ✓';
        dom.challengeCopyBtn.style.background = '#6eb77a';
        setTimeout(() => {
          dom.challengeCopyBtn.textContent = originalText;
          dom.challengeCopyBtn.style.background = '';
        }, 1500);
      })
      .catch(() => {
        fallbackCopy(code);
      });
  } else {
    fallbackCopy(code);
  }
}

function fallbackCopy(text) {
  dom.challengeOutput.select();
  dom.challengeOutput.setSelectionRange(0, text.length);
  try {
    document.execCommand('copy');
    const originalText = dom.challengeCopyBtn.textContent;
    dom.challengeCopyBtn.textContent = '已复制 ✓';
    dom.challengeCopyBtn.style.background = '#6eb77a';
    setTimeout(() => {
      dom.challengeCopyBtn.textContent = originalText;
      dom.challengeCopyBtn.style.background = '';
    }, 1500);
  } catch (e) {
    showChallengeGenError('复制失败，请手动选中复制。');
  }
  window.getSelection().removeAllRanges();
}
