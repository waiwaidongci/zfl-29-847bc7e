export const CODEX_CATEGORIES = [
  { id: 'facility', name: '设施', icon: '🏗' },
  { id: 'pollution', name: '污染', icon: '☢' },
  { id: 'storm', name: '风暴', icon: '🌊' },
  { id: 'result', name: '修复结果', icon: '🏅' }
];

export const CODEX_ENTRIES = {
  oyster: {
    id: 'oyster',
    category: 'facility',
    name: '牡蛎礁',
    unlockEvent: 'place_oyster',
    desc: '牡蛎礁是潮间带的关键生态工程师。每座牡蛎礁可提升水质2.1点、幼体1.2点、多样性0.4点，并有45%概率自行清除所在格的污染。造价12预算，是改善水质的首选设施。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="30" width="70" height="25" rx="6" fill="#d4d4c8" stroke="#a0a090" stroke-width="1.5"/>
      <ellipse cx="25" cy="32" rx="14" ry="10" fill="#c8c8b8" stroke="#909080" stroke-width="1"/>
      <ellipse cx="50" cy="30" rx="16" ry="12" fill="#c8c8b8" stroke="#909080" stroke-width="1"/>
      <ellipse cx="40" cy="28" rx="10" ry="7" fill="#bfbfae" stroke="#909080" stroke-width="1"/>
      <circle cx="25" cy="28" r="2" fill="#7a7a6a"/>
      <circle cx="50" cy="26" r="2.5" fill="#7a7a6a"/>
      <path d="M10 35 Q40 20 70 35" fill="none" stroke="#5a8a86" stroke-width="1.2" stroke-dasharray="3,2"/>
    </svg>`
  },
  grass: {
    id: 'grass',
    category: 'facility',
    name: '海草床',
    unlockEvent: 'place_grass',
    desc: '海草床为幼体和底栖生物提供庇护与食物。每片海草床增加幼体0.6点、多样性1.8点，是提升生物多样性的核心设施。造价10预算，适合大面积铺设。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="45" width="70" height="10" rx="3" fill="#b8a878"/>
      <path d="M20 45 Q18 25 22 10" stroke="#4a9e56" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M30 45 Q28 20 33 8" stroke="#5ab868" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M40 45 Q42 22 38 6" stroke="#4a9e56" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M50 45 Q48 18 52 10" stroke="#5ab868" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M60 45 Q62 25 58 12" stroke="#4a9e56" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="22" cy="12" r="1.5" fill="#3a8e46"/>
      <circle cx="33" cy="10" r="1.5" fill="#3a8e46"/>
      <circle cx="52" cy="12" r="1.5" fill="#3a8e46"/>
    </svg>`
  },
  pile: {
    id: 'pile',
    category: 'facility',
    name: '围护桩',
    unlockEvent: 'place_pile',
    desc: '围护桩构筑物理屏障，有效阻断污染向相邻格扩散。每根围护桩使全局污染扩散概率降低1.5%，是防守型策略的关键。造价8预算，性价比高。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="15" width="8" height="40" rx="2" fill="#b89568" stroke="#8a6d40" stroke-width="1.2"/>
      <rect x="36" y="10" width="8" height="45" rx="2" fill="#b89568" stroke="#8a6d40" stroke-width="1.2"/>
      <rect x="57" y="18" width="8" height="37" rx="2" fill="#b89568" stroke="#8a6d40" stroke-width="1.2"/>
      <path d="M19 15 L40 10 L61 18" stroke="#8a6d40" stroke-width="1.5" fill="none" stroke-dasharray="4,3"/>
      <path d="M19 35 L40 32 L61 38" stroke="#c0392b" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="2,3"/>
      <text x="40" y="6" text-anchor="middle" font-size="7" fill="#c0392b" opacity="0.6">STOP</text>
    </svg>`
  },
  pollution_spread: {
    id: 'pollution_spread',
    category: 'pollution',
    name: '污染扩散',
    unlockEvent: 'pollution_spread',
    desc: '污染会以28%的基础概率向相邻格扩散，围护桩可将扩散概率降低至最低8%。扩散方向为上下左右四邻域，不受地形阻挡。合理布设围护桩是遏制污染蔓延的核心策略。',
    diagram: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-spread" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#c0392b"/>
        </marker>
      </defs>
      <rect x="30" y="30" width="20" height="20" rx="3" fill="rgba(104,82,58,0.6)" stroke="#68423a" stroke-width="1.2"/>
      <rect x="5" y="30" width="20" height="20" rx="3" fill="rgba(104,82,58,0.25)" stroke="#9a7a6a" stroke-width="0.8" stroke-dasharray="3,2"/>
      <rect x="55" y="30" width="20" height="20" rx="3" fill="rgba(104,82,58,0.25)" stroke="#9a7a6a" stroke-width="0.8" stroke-dasharray="3,2"/>
      <rect x="30" y="5" width="20" height="20" rx="3" fill="rgba(104,82,58,0.25)" stroke="#9a7a6a" stroke-width="0.8" stroke-dasharray="3,2"/>
      <rect x="30" y="55" width="20" height="20" rx="3" fill="rgba(104,82,58,0.25)" stroke="#9a7a6a" stroke-width="0.8" stroke-dasharray="3,2"/>
      <path d="M28 40 L20 40" stroke="#c0392b" stroke-width="1.5" marker-end="url(#arr-spread)"/>
      <path d="M52 40 L60 40" stroke="#c0392b" stroke-width="1.5" marker-end="url(#arr-spread)"/>
      <path d="M40 28 L40 20" stroke="#c0392b" stroke-width="1.5" marker-end="url(#arr-spread)"/>
      <path d="M40 52 L40 60" stroke="#c0392b" stroke-width="1.5" marker-end="url(#arr-spread)"/>
      <text x="40" y="44" text-anchor="middle" font-size="8" fill="#68423a" font-weight="bold">污</text>
      <text x="15" y="44" text-anchor="middle" font-size="7" fill="#9a7a6a">?</text>
      <text x="65" y="44" text-anchor="middle" font-size="7" fill="#9a7a6a">?</text>
      <text x="40" y="19" text-anchor="middle" font-size="7" fill="#9a7a6a">?</text>
      <text x="40" y="69" text-anchor="middle" font-size="7" fill="#9a7a6a">?</text>
    </svg>`
  },
  pollution_damage: {
    id: 'pollution_damage',
    category: 'pollution',
    name: '污染损害',
    unlockEvent: 'pollution_damage',
    desc: '每格污染持续损害生态指标：水质-0.8、幼体-0.4、多样性-0.5。污染格越多，累积损害越严重。及时放置牡蛎礁净化和围护桩阻断扩散，是控制损害的关键。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-damage" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#c0392b"/>
        </marker>
      </defs>
      <rect x="10" y="10" width="60" height="40" rx="5" fill="#f3f8f7" stroke="#c9dbd8" stroke-width="1"/>
      <rect x="15" y="16" width="20" height="12" rx="2" fill="rgba(104,82,58,0.5)"/>
      <text x="25" y="25" text-anchor="middle" font-size="6" fill="#fff">污</text>
      <path d="M38 22 L45 22" stroke="#c0392b" stroke-width="1.5" marker-end="url(#arr-damage)"/>
      <rect x="48" y="15" width="18" height="14" rx="2" fill="#9ed1d0" stroke="#5a8a86" stroke-width="0.8"/>
      <text x="57" y="25" text-anchor="middle" font-size="6" fill="#1c2b2c">↓</text>
      <line x1="15" y1="36" x2="65" y2="36" stroke="#ddd" stroke-width="0.5"/>
      <text x="15" y="45" font-size="5" fill="#237070">水质 -0.8</text>
      <text x="15" y="51" font-size="5" fill="#237070">幼体 -0.4</text>
      <text x="48" y="45" font-size="5" fill="#237070">多样性 -0.5</text>
    </svg>`
  },
  oyster_clean: {
    id: 'oyster_clean',
    category: 'pollution',
    name: '生物净化',
    unlockEvent: 'oyster_clean',
    desc: '牡蛎礁具有天然净水能力。每回合结束时，位于污染格上的牡蛎礁有45%概率清除该格的污染。这是游戏中唯一能主动净化已污染格的机制，配合围护桩形成"净化+阻断"组合尤为有效。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-clean" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#237070"/>
        </marker>
      </defs>
      <rect x="10" y="15" width="25" height="25" rx="4" fill="rgba(104,82,58,0.5)" stroke="#68423a" stroke-width="1"/>
      <ellipse cx="22" cy="28" rx="8" ry="6" fill="#d4d4c8" stroke="#909080" stroke-width="1"/>
      <text x="22" y="31" text-anchor="middle" font-size="7" fill="#5a5a4a">礁</text>
      <path d="M38 28 L48 28" stroke="#237070" stroke-width="2" marker-end="url(#arr-clean)"/>
      <rect x="50" y="15" width="25" height="25" rx="4" fill="#9ed1d0" stroke="#5a8a86" stroke-width="1"/>
      <ellipse cx="62" cy="28" rx="8" ry="6" fill="#d4d4c8" stroke="#909080" stroke-width="1"/>
      <text x="62" y="31" text-anchor="middle" font-size="7" fill="#5a5a4a">礁</text>
      <text x="40" y="52" text-anchor="middle" font-size="6" fill="#237070">45% 概率净化</text>
    </svg>`
  },
  storm: {
    id: 'storm',
    category: 'storm',
    name: '风暴潮',
    unlockEvent: 'storm',
    desc: '风暴潮是潮间带修复的最大威胁。触发时，55%概率随机摧毁一座已建设施，同时水质下降8点。风暴概率由场景决定，风暴前线场景概率高达45%。设施被毁后需要重新投入预算修复。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 20 Q25 10 40 20 Q55 30 70 20" stroke="#3a6a9a" stroke-width="2" fill="none"/>
      <path d="M10 28 Q25 18 40 28 Q55 38 70 28" stroke="#3a6a9a" stroke-width="2" fill="none"/>
      <path d="M10 36 Q25 26 40 36 Q55 46 70 36" stroke="#3a6a9a" stroke-width="2" fill="none"/>
      <rect x="30" y="40" width="14" height="14" rx="2" fill="#b89568" stroke="#8a6d40" stroke-width="1" opacity="0.5"/>
      <text x="37" y="50" text-anchor="middle" font-size="7" fill="#5a4a3a">桩</text>
      <line x1="37" y1="40" x2="37" y2="32" stroke="#c0392b" stroke-width="1.5"/>
      <line x1="37" y1="32" x2="42" y2="28" stroke="#c0392b" stroke-width="1.5"/>
      <line x1="37" y1="32" x2="32" y2="28" stroke="#c0392b" stroke-width="1.5"/>
      <text x="60" y="50" font-size="6" fill="#c0392b">55%摧毁</text>
      <text x="60" y="57" font-size="6" fill="#c0392b">水质-8</text>
    </svg>`
  },
  storm_resist: {
    id: 'storm_resist',
    category: 'storm',
    name: '风暴考验',
    unlockEvent: 'storm_survive',
    desc: '并非每次风暴都会造成设施损毁。当风暴触发但设施未被摧毁时，说明生态防线经受住了考验。多建设施可分散风险，即使部分被毁也能维持生态指标。合理的冗余布局是应对风暴的关键。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 15 Q25 5 40 15 Q55 25 70 15" stroke="#3a6a9a" stroke-width="1.5" fill="none" opacity="0.5"/>
      <path d="M10 22 Q25 12 40 22 Q55 32 70 22" stroke="#3a6a9a" stroke-width="1.5" fill="none" opacity="0.5"/>
      <rect x="15" y="35" width="14" height="14" rx="2" fill="#d4d4c8" stroke="#909080" stroke-width="1"/>
      <text x="22" y="45" text-anchor="middle" font-size="7" fill="#5a5a4a">礁</text>
      <rect x="33" y="35" width="14" height="14" rx="2" fill="#6eb77a" stroke="#4a8a56" stroke-width="1"/>
      <text x="40" y="45" text-anchor="middle" font-size="7" fill="#fff">草</text>
      <rect x="51" y="35" width="14" height="14" rx="2" fill="#b89568" stroke="#8a6d40" stroke-width="1"/>
      <text x="58" y="45" text-anchor="middle" font-size="7" fill="#5a4a3a">桩</text>
      <text x="40" y="56" text-anchor="middle" font-size="6" fill="#237070">设施完好 ✓</text>
    </svg>`
  },
  repair_success: {
    id: 'repair_success',
    category: 'result',
    name: '修复成功',
    unlockEvent: 'repair_win',
    desc: '当最终评分达到场景目标（且满足附加条件）时，修复宣告成功。评分由水质、幼体、多样性、预算加权计算，扣除污染惩罚。不同场景的胜利条件各异，需要针对性地调整策略。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="28" r="20" fill="#e8f5e9" stroke="#4caf50" stroke-width="2"/>
      <path d="M30 28 L37 35 L52 20" stroke="#4caf50" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="40" y="55" text-anchor="middle" font-size="7" fill="#2e7d32">生态修复成功</text>
    </svg>`
  },
  repair_fail: {
    id: 'repair_fail',
    category: 'result',
    name: '修复未竟',
    unlockEvent: 'repair_lose',
    desc: '未能达到修复目标时，修复宣告失败。常见原因包括：预算不足导致设施覆盖不够、污染扩散失控、风暴损毁关键设施。失败并非终局——调整策略、优化布局后可以再次挑战。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="28" r="20" fill="#fce4ec" stroke="#e57373" stroke-width="2"/>
      <path d="M32 20 L48 36" stroke="#e57373" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M48 20 L32 36" stroke="#e57373" stroke-width="3" fill="none" stroke-linecap="round"/>
      <text x="40" y="55" text-anchor="middle" font-size="7" fill="#c62828">继续努力</text>
    </svg>`
  },
  pollution_clear: {
    id: 'pollution_clear',
    category: 'result',
    name: '大面积净化',
    unlockEvent: 'pollution_cleared',
    desc: '当单局游戏中污染格数降至0时，达成大面积净化成就。这通常需要在关键位置布设牡蛎礁进行净化，同时用围护桩封锁污染源。零污染时所有生态指标将不再受到损害。',
    diagram: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="25" height="25" rx="4" fill="rgba(104,82,58,0.5)" stroke="#68423a" stroke-width="1"/>
      <path d="M38 22 L48 22" stroke="#4caf50" stroke-width="2"/>
      <rect x="50" y="10" width="25" height="25" rx="4" fill="#9ed1d0" stroke="#5a8a86" stroke-width="1"/>
      <text x="62" y="26" text-anchor="middle" font-size="9" fill="#2e7d32">0</text>
      <text x="40" y="50" text-anchor="middle" font-size="6" fill="#2e7d32">污染格归零！</text>
    </svg>`
  }
};

export function getAllCodexEntries() {
  return Object.values(CODEX_ENTRIES);
}

export function getCodexEntry(id) {
  return CODEX_ENTRIES[id];
}

export function getEntriesByCategory(categoryId) {
  return getAllCodexEntries().filter(e => e.category === categoryId);
}
