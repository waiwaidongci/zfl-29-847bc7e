export const scenes = {
  beginner: {
    id: 'beginner',
    name: '入门滩涂',
    desc: '平缓开阔的泥质滩涂，污染较轻，适合新手熟悉修复流程。',
    budget: 150,
    water: 55,
    larvae: 25,
    bio: 25,
    turns: 10,
    stormChance: 0.18,
    pollutionIndices: [11, 23, 47, 71],
    goalScore: 60,
    goalDesc: '生态评分 ≥ 60',
    tags: ['低难度', '预算充裕', '污染较少'],
    winText: '滩涂生态恢复喜人！招潮蟹在泥穴间穿梭，白鹭翩然而至，这片湿地重新焕发了生机。',
    loseText: '滩涂生态有所改善，但仍有提升空间。继续守护这片湿地，让更多生物回归。'
  },
  polluted: {
    id: 'polluted',
    name: '污染湾口',
    desc: '毗邻排污口的淤塞湾口，污染密集且扩散迅速，预算紧张。',
    budget: 100,
    water: 35,
    larvae: 12,
    bio: 12,
    turns: 12,
    stormChance: 0.22,
    pollutionIndices: [2, 5, 14, 27, 38, 45, 53, 62, 78, 89],
    goalScore: 55,
    goalPollutionMax: 18,
    goalDesc: '评分 ≥ 55 且污染 ≤ 18格',
    tags: ['高难度', '预算紧张', '污染密集'],
    winText: '湾口水质显著改善！排污口治理成效显现，曾经浑浊的海水重现清澈，鱼群开始回游。',
    loseText: '污染压力依然沉重，治理成效有限。需要更科学的设施布局和更大力度的投入。'
  },
  storm: {
    id: 'storm',
    name: '风暴前线',
    desc: '直面外海的风暴潮通道，设施易被损毁，考验快速恢复能力。',
    budget: 130,
    water: 48,
    larvae: 20,
    bio: 18,
    turns: 10,
    stormChance: 0.45,
    pollutionIndices: [7, 19, 35, 50, 68, 82],
    goalScore: 50,
    goalMinStats: 35,
    goalDesc: '评分 ≥ 50 且所有指标 ≥ 35',
    tags: ['中难度', '风暴频发', '设施易损'],
    winText: '经受住风暴考验！潮间带防线固若金汤，即使风暴潮来袭，生态系统依然稳定运转。',
    loseText: '风暴破坏超出预期，设施损失严重。需要更多围护桩构建可靠的防波防线。'
  }
};

export function getScene(id) {
  return scenes[id];
}

export function getAllScenes() {
  return Object.values(scenes);
}

export function addScene(id, sceneData) {
  scenes[id] = sceneData;
  return scenes[id];
}
