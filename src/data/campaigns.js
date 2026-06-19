export const campaigns = {
  coastal_restoration: {
    id: 'coastal_restoration',
    name: '海岸线守护战',
    desc: '一段从滩涂到深海湾口的连续修复征程。每一章的成果都将影响下一章的起点，你的每一个决策都在书写海岸的命运。',
    chapters: [
      {
        id: 'ch1_shoreline',
        order: 1,
        name: '第一章：初现曙光',
        desc: '近海滩涂遭遇轻度污染，当地环保团队启动首轮修复。污染尚不严重，但时间紧迫。',
        storyIntro: '清晨，海雾尚未散去。你站在滩涂边，看到零星的污染斑块正在蔓延。这是修复的起点——把握住这片滩涂，才能为后续的深海修复赢得基础。',
        storyOutro: '滩涂修复初见成效，海水逐渐清澈，螃蟹开始在泥穴间出没。但你发现，更深处的湾口传来了令人不安的消息……',
        sceneConfig: {
          budget: 150,
          water: 55,
          larvae: 25,
          bio: 25,
          turns: 10,
          stormChance: 0.18,
          pollutionIndices: [11, 23, 47, 71],
          goalScore: 55,
          goalDesc: '生态评分 ≥ 55',
          goalPollutionMax: 6,
          winText: '滩涂生态恢复喜人！为后续修复打下了坚实基础。',
          loseText: '滩涂修复效果有限，污染仍在扩散。下一章将面临更严峻的挑战。'
        },
        carryOver: {
          budgetCarryRate: 0.4,
          pollutionResidueRate: 0.5,
          scoreBonusThreshold: 70,
          scoreBonusBudget: 20
        }
      },
      {
        id: 'ch2_estuary',
        order: 2,
        name: '第二章：湾口危机',
        desc: '滩涂污染已扩散至湾口，密集的排污口让水质急剧恶化，预算更加紧张。',
        storyIntro: '滩涂的修复尚未巩固，湾口的污染已经到了临界点。排污口持续释放有害物质，如果不在这一章堵住源头，整个海岸线都将沦陷。',
        storyOutro: '湾口治理取得突破！排污口得到有效控制。然而，风暴季节即将来临，外海的防线仍在等待……',
        sceneConfig: {
          budget: 110,
          water: 35,
          larvae: 15,
          bio: 15,
          turns: 12,
          stormChance: 0.25,
          pollutionIndices: [2, 5, 14, 27, 38, 45, 53, 62, 78, 89],
          goalScore: 50,
          goalPollutionMax: 12,
          goalDesc: '评分 ≥ 50 且污染 ≤ 12格',
          winText: '湾口水质显著改善！排污治理成效显现，浑浊的海水重现清澈。',
          loseText: '污染压力依然沉重，风暴季节将更加凶险。'
        },
        carryOver: {
          budgetCarryRate: 0.35,
          pollutionResidueRate: 0.45,
          scoreBonusThreshold: 65,
          scoreBonusBudget: 25
        }
      },
      {
        id: 'ch3_stormfront',
        order: 3,
        name: '第三章：风暴前线',
        desc: '风暴潮通道直指修复区，设施频遭损毁，考验你的快速恢复与防御部署能力。',
        storyIntro: '前两章的修复成果即将接受最严酷的考验——风暴季节正式到来。狂风巨浪随时可能冲毁一切，你必须构建坚固的防线。',
        storyOutro: '风暴退去，海岸线依然屹立！你的修复体系经受住了大自然的考验，整个海岸生态正在复苏。',
        sceneConfig: {
          budget: 120,
          water: 45,
          larvae: 20,
          bio: 18,
          turns: 10,
          stormChance: 0.45,
          pollutionIndices: [7, 19, 35, 50, 68, 82],
          goalScore: 45,
          goalMinStats: 35,
          goalDesc: '评分 ≥ 45 且所有指标 ≥ 35',
          winText: '风暴防线固若金汤！潮间带在风暴潮中依然稳定运转，海岸生态全面复苏。',
          loseText: '风暴破坏超出预期，但修复的努力不会白费。海岸终将重生。'
        },
        carryOver: null
      }
    ]
  },
  deep_sea_saga: {
    id: 'deep_sea_saga',
    name: '深海远征',
    desc: '从近岸湿地出发，逐步深入远海，面对逐步升级的生态危机。每一次胜利都让你离深海更近一步。',
    chapters: [
      {
        id: 'ds_ch1_wetland',
        order: 1,
        name: '第一章：湿地觉醒',
        desc: '近岸湿地的生态警报刚刚拉响，趁污染尚未失控，迅速建立修复体系。',
        storyIntro: '卫星图像显示近岸湿地出现异常的污染信号。作为第一批响应者，你需要在污染扩散前控制住局面。',
        storyOutro: '湿地的第一道防线已经建立，但监测数据显示，更深的水域也受到了波及……',
        sceneConfig: {
          budget: 140,
          water: 50,
          larvae: 22,
          bio: 22,
          turns: 8,
          stormChance: 0.15,
          pollutionIndices: [15, 28, 42, 65, 80],
          goalScore: 50,
          goalDesc: '生态评分 ≥ 50',
          goalPollutionMax: 5,
          winText: '湿地防线建立成功！近岸生态趋于稳定。',
          loseText: '湿地修复起步不顺，远海污染正在加速扩散。'
        },
        carryOver: {
          budgetCarryRate: 0.45,
          pollutionResidueRate: 0.5,
          scoreBonusThreshold: 65,
          scoreBonusBudget: 15
        }
      },
      {
        id: 'ds_ch2_reef',
        order: 2,
        name: '第二章：珊瑚暗流',
        desc: '深海珊瑚礁区遭受暗流污染，生态多样性急剧下降，需要在复杂水流中精准部署。',
        storyIntro: '暗流将深层污染物带入了珊瑚礁区。这些脆弱的生态系统需要你的精确干预——每一步都必须算无遗策。',
        storyOutro: '珊瑚礁区的生态开始恢复，但远海的信号越来越强烈。终极挑战在前方等待……',
        sceneConfig: {
          budget: 100,
          water: 30,
          larvae: 10,
          bio: 10,
          turns: 14,
          stormChance: 0.30,
          pollutionIndices: [1, 8, 16, 24, 33, 41, 52, 60, 71, 83, 90],
          goalScore: 45,
          goalPollutionMax: 15,
          goalMinStats: 30,
          goalDesc: '评分 ≥ 45 且污染 ≤ 15格 且所有指标 ≥ 30',
          winText: '珊瑚礁生态重建成功！多样性指标稳步回升。',
          loseText: '暗流污染太过顽固，珊瑚礁仍需更多修复。'
        },
        carryOver: {
          budgetCarryRate: 0.3,
          pollutionResidueRate: 0.4,
          scoreBonusThreshold: 60,
          scoreBonusBudget: 30
        }
      },
      {
        id: 'ds_ch3_abyss',
        order: 3,
        name: '第三章：深渊之光',
        desc: '远海深渊区的终极挑战——极端风暴、密集污染、有限预算。所有之前的积累都在此刻汇聚。',
        storyIntro: '这是最后的战场。远海深渊区汇聚了所有残留的污染物，风暴比以往任何时候都更加猛烈。你此前所有的修复成果，都将在这里得到最终的检验。',
        storyOutro: '深渊中亮起了希望之光。从湿地到深海，你守护了一整片海洋的生态。这不仅仅是一次修复，而是一段传奇。',
        sceneConfig: {
          budget: 100,
          water: 25,
          larvae: 8,
          bio: 8,
          turns: 12,
          stormChance: 0.50,
          pollutionIndices: [0, 5, 11, 18, 26, 34, 43, 51, 59, 67, 76, 85, 93],
          goalScore: 40,
          goalMinStats: 28,
          goalDesc: '评分 ≥ 40 且所有指标 ≥ 28',
          winText: '深渊重获光明！从近岸到远海，整片海域生态全面复苏，你的名字将被铭刻在海岸守护者的史册中。',
          loseText: '深渊的挑战太过艰巨，但你一路走来的努力并非徒劳。海洋终将重生。'
        },
        carryOver: null
      }
    ]
  }
};

export function getCampaign(id) {
  return campaigns[id];
}

export function getAllCampaigns() {
  return Object.values(campaigns);
}

export function getChapter(campaignId, chapterId) {
  const campaign = campaigns[campaignId];
  if (!campaign) return null;
  return campaign.chapters.find(ch => ch.id === chapterId) || null;
}

export function getChapterByOrder(campaignId, order) {
  const campaign = campaigns[campaignId];
  if (!campaign) return null;
  return campaign.chapters.find(ch => ch.order === order) || null;
}
