export const ACHIEVEMENT_CATEGORIES = [
  { id: 'general', name: '综合成就', icon: '🏆' },
  { id: 'scene', name: '场景挑战', icon: '🌊' },
  { id: 'special', name: '特殊挑战', icon: '⭐' }
];

function getFacilityUseHistory(game) {
  const initial = game.replay?.snapshots?.[0] || {};
  const placeEvents = game.replay?.events?.filter(e => e.type === 'place' && e.data) || [];

  return {
    oyster: (initial.oysters || 0) + placeEvents.filter(e => e.data.type === 'oyster').length,
    grass: (initial.grass || 0) + placeEvents.filter(e => e.data.type === 'grass').length,
    pile: (initial.piles || 0) + placeEvents.filter(e => e.data.type === 'pile').length,
    buffer: (initial.buffers || 0) + placeEvents.filter(e => e.data.type === 'buffer').length
  };
}

export const achievements = [
  {
    id: 'first_win',
    category: 'general',
    name: '初露锋芒',
    desc: '首次完成任意一局修复并获得胜利。',
    icon: '🌱',
    type: 'cumulative',
    check: (stats) => stats.totalWins >= 1
  },
  {
    id: 'win_5',
    category: 'general',
    name: '守护先锋',
    desc: '累计赢得 5 局修复挑战。',
    icon: '🌿',
    type: 'cumulative',
    check: (stats) => stats.totalWins >= 5
  },
  {
    id: 'win_10',
    category: 'general',
    name: '生态守护者',
    desc: '累计赢得 10 局修复挑战。',
    icon: '🌳',
    type: 'cumulative',
    check: (stats) => stats.totalWins >= 10
  },
  {
    id: 'play_10',
    category: 'general',
    name: '勤耕不辍',
    desc: '累计进行 10 局修复（无论胜负）。',
    icon: '📅',
    type: 'cumulative',
    check: (stats) => stats.totalGames >= 10
  },
  {
    id: 'oyster_50',
    category: 'general',
    name: '牡蛎匠人',
    desc: '累计放置 50 处牡蛎礁。',
    icon: '🦪',
    type: 'cumulative',
    check: (stats) => stats.totalOysters >= 50
  },
  {
    id: 'grass_50',
    category: 'general',
    name: '海草园丁',
    desc: '累计放置 50 处海草床。',
    icon: '🌾',
    type: 'cumulative',
    check: (stats) => stats.totalGrass >= 50
  },
  {
    id: 'pile_50',
    category: 'general',
    name: '围桩能手',
    desc: '累计放置 50 处围护桩。',
    icon: '🏗️',
    type: 'cumulative',
    check: (stats) => stats.totalPiles >= 50
  },
  {
    id: 'buffer_30',
    category: 'general',
    name: '缓冲卫士',
    desc: '累计放置 30 处潮汐缓冲带。',
    icon: '🌿',
    type: 'cumulative',
    check: (stats) => stats.totalBuffers >= 30
  },
  {
    id: 'clean_100',
    category: 'general',
    name: '净化大师',
    desc: '通过牡蛎礁累计净化 100 个污染格。',
    icon: '💧',
    type: 'cumulative',
    check: (stats) => stats.totalCleaned >= 100
  },
  {
    id: 'storm_survive_10',
    category: 'general',
    name: '风暴常客',
    desc: '累计在风暴中保护设施未受损 10 次。',
    icon: '⛵',
    type: 'cumulative',
    check: (stats) => stats.stormsSurvived >= 10
  },

  {
    id: 'scene_beginner_win',
    category: 'scene',
    name: '滩涂新星',
    desc: '在「入门滩涂」场景中取得胜利。',
    icon: '🏖️',
    type: 'scene',
    sceneId: 'beginner',
    check: (stats, game, scene) => scene.id === 'beginner' && game && game.ended && stats.lastWin
  },
  {
    id: 'scene_polluted_win',
    category: 'scene',
    name: '湾口清道夫',
    desc: '在「污染湾口」场景中取得胜利。',
    icon: '♻️',
    type: 'scene',
    sceneId: 'polluted',
    check: (stats, game, scene) => scene.id === 'polluted' && game && game.ended && stats.lastWin
  },
  {
    id: 'scene_storm_win',
    category: 'scene',
    name: '风暴挺立者',
    desc: '在「风暴前线」场景中取得胜利。',
    icon: '⚓',
    type: 'scene',
    sceneId: 'storm',
    check: (stats, game, scene) => scene.id === 'storm' && game && game.ended && stats.lastWin
  },
  {
    id: 'all_scenes_win',
    category: 'scene',
    name: '全域修复',
    desc: '在所有三个官方场景中均取得胜利。',
    icon: '🗺️',
    type: 'cumulative',
    check: (stats) => stats.wonScenes && stats.wonScenes.includes('beginner') && stats.wonScenes.includes('polluted') && stats.wonScenes.includes('storm')
  },

  {
    id: 'pollution_zero',
    category: 'special',
    name: '污染清零',
    desc: '在任意场景胜利时，污染格数为 0。',
    icon: '✨',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      const pollution = game.cells.filter(c => c.polluted).length;
      return pollution === 0;
    }
  },
  {
    id: 'pollution_suppression',
    category: 'special',
    name: '污染压制',
    desc: '在「污染湾口」胜利时，污染格数不超过初始数量的 30%。',
    icon: '🛡️',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin || scene.id !== 'polluted') return false;
      const pollution = game.cells.filter(c => c.polluted).length;
      const initialPollution = scene.pollutionIndices ? scene.pollutionIndices.length : 10;
      return pollution <= Math.ceil(initialPollution * 0.3);
    }
  },
  {
    id: 'low_budget',
    category: 'special',
    name: '低预算通关',
    desc: '在任意场景胜利时，剩余预算不超过初始预算的 15%。',
    icon: '💰',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      return game.budget <= scene.budget * 0.15;
    }
  },
  {
    id: 'thrifty',
    category: 'special',
    name: '精打细算',
    desc: '在任意场景胜利时，剩余预算超过初始预算的 35%。',
    icon: '💎',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      return game.budget >= scene.budget * 0.35;
    }
  },
  {
    id: 'no_oyster',
    category: 'special',
    name: '无牡蛎礁通关',
    desc: '在任意场景胜利时，全程未放置任何牡蛎礁。',
    icon: '🚫',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      const used = getFacilityUseHistory(game);
      return used.oyster === 0;
    }
  },
  {
    id: 'storm_all_metrics',
    category: 'special',
    name: '风暴前线全指标达标',
    desc: '在「风暴前线」胜利时，水质、幼体、多样性均不低于 50。',
    icon: '🌟',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin || scene.id !== 'storm') return false;
      return game.water >= 50 && game.larvae >= 50 && game.bio >= 50;
    }
  },
  {
    id: 'no_damage_storm',
    category: 'special',
    name: '固若金汤',
    desc: '在「风暴前线」胜利时，全程未发生任何设施损坏。',
    icon: '🏰',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin || scene.id !== 'storm') return false;
      const damageEvents = game.replay.events.filter(e => e.type === 'storm' && e.data && e.data.damaged);
      return damageEvents.length === 0;
    }
  },
  {
    id: 'high_score',
    category: 'special',
    name: '高分修复',
    desc: '在任意场景胜利时，最终评分达到 90 或以上。',
    icon: '🎯',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      return stats.lastScore >= 90;
    }
  },
  {
    id: 'only_oysters',
    category: 'special',
    name: '牡蛎独苗',
    desc: '在任意场景胜利时，仅使用牡蛎礁（无海草床、无围护桩）。',
    icon: '🦪',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      const used = getFacilityUseHistory(game);
      return used.oyster > 0 && used.grass === 0 && used.pile === 0;
    }
  },
  {
    id: 'buffer_master',
    category: 'special',
    name: '缓冲大师',
    desc: '在任意场景胜利时，放置了至少 5 处潮汐缓冲带。',
    icon: '🌊',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      const used = getFacilityUseHistory(game);
      return used.buffer >= 5;
    }
  },
  {
    id: 'buffer_saves_day',
    category: 'special',
    name: '缓冲救场',
    desc: '在风暴中，潮汐缓冲带成功保护设施免受损毁至少 3 次。',
    icon: '🛡️',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin) return false;
      const savedEvents = game.replay.events.filter(e => e.type === 'storm' && e.data && e.data.bufferSaved);
      return savedEvents.length >= 3;
    }
  },
  {
    id: 'buffer_defense_line',
    category: 'special',
    name: '缓冲防线',
    desc: '在「风暴前线」胜利时，全程未发生任何设施损坏，且至少放置了 3 处潮汐缓冲带。',
    icon: '🏰',
    type: 'game',
    check: (stats, game, scene) => {
      if (!game || !game.ended || !stats.lastWin || scene.id !== 'storm') return false;
      const used = getFacilityUseHistory(game);
      const damageEvents = game.replay.events.filter(e => e.type === 'storm' && e.data && e.data.damaged);
      return used.buffer >= 3 && damageEvents.length === 0;
    }
  }
];

export function getAchievementById(id) {
  return achievements.find(a => a.id === id);
}

export function getAchievementsByCategory(categoryId) {
  return achievements.filter(a => a.category === categoryId);
}

export function getTotalAchievements() {
  return achievements.length;
}
