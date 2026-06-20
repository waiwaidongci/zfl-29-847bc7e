import { describe, it, expect, beforeEach } from 'vitest';
import { GRID_SIZE } from '../src/game/constants.js';
import {
  getDateStr,
  isToday,
  generateDailySeed,
  generateDailyChallenge,
  getTodayDailyChallenge,
  getDailyChallengeByDate,
  getAvailableDailyChallengeDates,
  recordDailyChallengePlayed,
  getDailyChallengeBestScore,
  setDailyChallengeBestScore,
  formatDateDisplay,
  getDifficultyColor
} from '../src/game/daily-challenge.js';

beforeEach(() => {
  localStorage.clear();
});

describe('daily-challenge - 日期工具', () => {
  it('getDateStr返回YYYY-MM-DD格式', () => {
    const d = new Date(2024, 0, 15);
    expect(getDateStr(d)).toBe('2024-01-15');

    const d2 = new Date(2024, 11, 5);
    expect(getDateStr(d2)).toBe('2024-12-05');
  });

  it('isToday正确判断是否为今天', () => {
    const today = getDateStr();
    expect(isToday(today)).toBe(true);
    expect(isToday('1999-01-01')).toBe(false);
  });

  it('formatDateDisplay格式化中文日期', () => {
    expect(formatDateDisplay('2024-01-15')).toBe('2024年1月15日');
    expect(formatDateDisplay('2024-12-05')).toBe('2024年12月5日');
  });

  it('formatDateDisplay异常输入原样返回', () => {
    expect(formatDateDisplay('invalid')).toBe('invalid');
  });
});

describe('daily-challenge - 种子生成', () => {
  it('generateDailySeed同一天产生相同种子', () => {
    const seed1 = generateDailySeed('2024-06-15');
    const seed2 = generateDailySeed('2024-06-15');
    expect(seed1).toBe(seed2);
  });

  it('generateDailySeed不同天产生不同种子', () => {
    const seed1 = generateDailySeed('2024-06-15');
    const seed2 = generateDailySeed('2024-06-16');
    expect(seed1).not.toBe(seed2);
  });
});

describe('daily-challenge - 挑战生成', () => {
  it('generateDailyChallenge返回完整场景对象', () => {
    const scene = generateDailyChallenge('2024-06-15');
    expect(scene).toBeDefined();
    expect(scene.id).toBe('daily-challenge-2024-06-15');
    expect(scene.dateStr).toBe('2024-06-15');
    expect(scene.name).toBe('每日挑战 · 2024-06-15');
    expect(['easy', 'medium', 'hard']).toContain(scene.difficulty);
    expect(scene.difficultyLabel).toBeDefined();
    expect(scene.difficultyIcon).toBeDefined();
    expect(scene.desc).toBeDefined();
    expect(typeof scene.budget).toBe('number');
    expect(typeof scene.water).toBe('number');
    expect(typeof scene.larvae).toBe('number');
    expect(typeof scene.bio).toBe('number');
    expect(typeof scene.turns).toBe('number');
    expect(typeof scene.stormChance).toBe('number');
    expect(Array.isArray(scene.pollutionIndices)).toBe(true);
    expect(typeof scene.goalScore).toBe('number');
    expect(scene.initialCells).toBeDefined();
    expect(scene.initialCells.length).toBe(GRID_SIZE);
    expect(scene.seed).toBeDefined();
    expect(scene.seedStr).toBeDefined();
    expect(scene.fromDailyChallenge).toBe(true);
  });

  it('generateDailyChallenge同一日期产生相同结果', () => {
    const scene1 = generateDailyChallenge('2024-03-20');
    const scene2 = generateDailyChallenge('2024-03-20');
    expect(scene1.budget).toBe(scene2.budget);
    expect(scene1.turns).toBe(scene2.turns);
    expect(scene1.goalScore).toBe(scene2.goalScore);
    expect(scene1.difficulty).toBe(scene2.difficulty);
    expect(scene1.seed).toBe(scene2.seed);
    expect(scene1.pollutionIndices).toEqual(scene2.pollutionIndices);
    for (let i = 0; i < GRID_SIZE; i++) {
      expect(scene1.initialCells[i].type).toBe(scene2.initialCells[i].type);
      expect(scene1.initialCells[i].polluted).toBe(scene2.initialCells[i].polluted);
    }
  });

  it('generateDailyChallenge不同日期产生不同结果', () => {
    const scene1 = generateDailyChallenge('2024-01-01');
    const scene2 = generateDailyChallenge('2024-12-31');
    expect(scene1.seed).not.toBe(scene2.seed);
  });

  it('generateDailyChallenge参数在合理范围内', () => {
    for (let i = 0; i < 30; i++) {
      const dateStr = `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`;
      const scene = generateDailyChallenge(dateStr);
      expect(scene.budget).toBeGreaterThanOrEqual(80);
      expect(scene.budget).toBeLessThanOrEqual(160);
      expect(scene.turns).toBeGreaterThanOrEqual(10);
      expect(scene.turns).toBeLessThanOrEqual(16);
      expect(scene.stormChance).toBeGreaterThanOrEqual(0.15);
      expect(scene.stormChance).toBeLessThanOrEqual(0.45);
      expect(scene.goalScore).toBeGreaterThanOrEqual(45);
      expect(scene.goalScore).toBeLessThanOrEqual(75);
      expect(scene.water).toBeGreaterThanOrEqual(30);
      expect(scene.water).toBeLessThanOrEqual(60);
      expect(scene.larvae).toBeGreaterThanOrEqual(10);
      expect(scene.larvae).toBeLessThanOrEqual(35);
      expect(scene.bio).toBeGreaterThanOrEqual(10);
      expect(scene.bio).toBeLessThanOrEqual(35);
    }
  });

  it('easy难度参数范围合理', () => {
    const easyDate = '2024-01-01';
    let foundEasy = false;
    for (let d = 1; d <= 31 && !foundEasy; d++) {
      const dateStr = `2024-01-${String(d).padStart(2, '0')}`;
      const scene = generateDailyChallenge(dateStr);
      if (scene.difficulty === 'easy') {
        foundEasy = true;
        const totalBudget = scene.budget + scene.prebuiltCost;
        expect(totalBudget).toBeGreaterThanOrEqual(120);
        expect(totalBudget).toBeLessThanOrEqual(160);
        expect(scene.turns).toBeGreaterThanOrEqual(10);
        expect(scene.turns).toBeLessThanOrEqual(12);
      }
    }
  });

  it('hard难度参数范围合理', () => {
    let foundHard = false;
    for (let m = 1; m <= 12 && !foundHard; m++) {
      for (let d = 1; d <= 28 && !foundHard; d++) {
        const dateStr = `2024-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const scene = generateDailyChallenge(dateStr);
        if (scene.difficulty === 'hard') {
          foundHard = true;
          expect(scene.budget).toBeGreaterThanOrEqual(80);
          expect(scene.budget).toBeLessThanOrEqual(120);
          expect(scene.turns).toBeGreaterThanOrEqual(12);
          expect(scene.turns).toBeLessThanOrEqual(16);
          expect(scene.goalScore).toBeGreaterThanOrEqual(55);
        }
      }
    }
  });

  it('getTodayDailyChallenge返回今日挑战', () => {
    const today = getDateStr();
    const scene = getTodayDailyChallenge();
    expect(scene.dateStr).toBe(today);
  });

  it('getDailyChallengeByDate按日期获取', () => {
    const scene = getDailyChallengeByDate('2024-07-04');
    expect(scene.dateStr).toBe('2024-07-04');
  });

  it('初始设施成本不超过预算的30%', () => {
    for (let i = 0; i < 10; i++) {
      const dateStr = `2024-05-${String(i + 1).padStart(2, '0')}`;
      const scene = generateDailyChallenge(dateStr);
      expect(scene.prebuiltCost).toBeLessThanOrEqual((scene.budget + scene.prebuiltCost) * 0.3);
    }
  });
});

describe('daily-challenge - 本地存储', () => {
  it('初始可用挑战日期为空', () => {
    expect(getAvailableDailyChallengeDates()).toEqual([]);
  });

  it('recordDailyChallengePlayed记录挑战日期', () => {
    recordDailyChallengePlayed('2024-06-01');
    recordDailyChallengePlayed('2024-06-02');
    const dates = getAvailableDailyChallengeDates();
    expect(dates).toContain('2024-06-01');
    expect(dates).toContain('2024-06-02');
  });

  it('recordDailyChallengePlayed不重复记录', () => {
    recordDailyChallengePlayed('2024-06-01');
    recordDailyChallengePlayed('2024-06-01');
    const dates = getAvailableDailyChallengeDates();
    expect(dates.filter(d => d === '2024-06-01').length).toBe(1);
  });

  it('recordDailyChallengePlayed按倒序排列', () => {
    recordDailyChallengePlayed('2024-06-01');
    recordDailyChallengePlayed('2024-06-03');
    recordDailyChallengePlayed('2024-06-02');
    const dates = getAvailableDailyChallengeDates();
    expect(dates[0]).toBe('2024-06-03');
    expect(dates[1]).toBe('2024-06-02');
    expect(dates[2]).toBe('2024-06-01');
  });

  it('getDailyChallengeBestScore初始为null', () => {
    expect(getDailyChallengeBestScore('2024-06-01')).toBe(null);
  });

  it('setDailyChallengeBestScore保存最高分', () => {
    setDailyChallengeBestScore('2024-06-01', 75);
    expect(getDailyChallengeBestScore('2024-06-01')).toBe(75);
  });

  it('setDailyChallengeBestScore只保留更高分', () => {
    setDailyChallengeBestScore('2024-06-01', 60);
    setDailyChallengeBestScore('2024-06-01', 80);
    setDailyChallengeBestScore('2024-06-01', 70);
    expect(getDailyChallengeBestScore('2024-06-01')).toBe(80);
  });

  it('不同日期分数独立存储', () => {
    setDailyChallengeBestScore('2024-06-01', 60);
    setDailyChallengeBestScore('2024-06-02', 80);
    expect(getDailyChallengeBestScore('2024-06-01')).toBe(60);
    expect(getDailyChallengeBestScore('2024-06-02')).toBe(80);
  });
});

describe('daily-challenge - 难度颜色', () => {
  it('getDifficultyColor返回对应颜色', () => {
    expect(getDifficultyColor('easy')).toBe('#6eb77a');
    expect(getDifficultyColor('medium')).toBe('#c08d2d');
    expect(getDifficultyColor('hard')).toBe('#c0392b');
  });

  it('未知难度返回默认颜色', () => {
    expect(getDifficultyColor('unknown')).toBe('#4a5f5d');
  });
});
