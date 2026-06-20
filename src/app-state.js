import { DEFAULT_SCENE_ID } from './game/constants.js';

const state = {
  game: null,
  currentSceneId: DEFAULT_SCENE_ID,
  selectedSceneId: DEFAULT_SCENE_ID,
  currentTool: 'oyster',
  highlightedCells: [],
  currentAdvice: null,
  lastEventCount: 0,
  currentDailyChallenge: null,
  currentDailyChallengeDate: null,
  campaignProgress: null,
  campaignCurrentSceneConfig: null,
  currentTemplateCategory: 'pollution'
};

export function getGame() {
  return state.game;
}

export function setGame(game) {
  state.game = game;
}

export function getCurrentSceneId() {
  return state.currentSceneId;
}

export function setCurrentSceneId(id) {
  state.currentSceneId = id;
}

export function getSelectedSceneId() {
  return state.selectedSceneId;
}

export function setSelectedSceneId(id) {
  state.selectedSceneId = id;
}

export function getCurrentTool() {
  return state.currentTool;
}

export function setCurrentTool(tool) {
  state.currentTool = tool;
}

export function getHighlightedCells() {
  return state.highlightedCells;
}

export function setHighlightedCells(cells) {
  state.highlightedCells = cells || [];
}

export function getCurrentAdvice() {
  return state.currentAdvice;
}

export function setCurrentAdvice(advice) {
  state.currentAdvice = advice;
}

export function getLastEventCount() {
  return state.lastEventCount;
}

export function setLastEventCount(count) {
  state.lastEventCount = count;
}

export function getCurrentDailyChallenge() {
  return state.currentDailyChallenge;
}

export function setCurrentDailyChallenge(challenge) {
  state.currentDailyChallenge = challenge;
}

export function getCurrentDailyChallengeDate() {
  return state.currentDailyChallengeDate;
}

export function setCurrentDailyChallengeDate(date) {
  state.currentDailyChallengeDate = date;
}

export function getCampaignProgress() {
  return state.campaignProgress;
}

export function setCampaignProgress(progress) {
  state.campaignProgress = progress;
}

export function getCampaignCurrentSceneConfig() {
  return state.campaignCurrentSceneConfig;
}

export function setCampaignCurrentSceneConfig(config) {
  state.campaignCurrentSceneConfig = config;
}

export function getCurrentTemplateCategory() {
  return state.currentTemplateCategory;
}

export function setCurrentTemplateCategory(category) {
  state.currentTemplateCategory = category;
}

export default state;
