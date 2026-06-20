import { describe, it, expect } from 'vitest';
import { GRID_SIZE, CELL_TYPES } from '../src/game/constants.js';
import {
  createGameState,
  recordReplaySnapshot,
  recordReplayEvent,
  getFacilityCounts
} from '../src/game/state.js';
import {
  createTestScene,
  createTestGame,
  TEST_SEED
} from './helpers.js';
import { advanceTurn, finishGame } from '../src/game/tide.js';

describe('state - Replay 快照', () => {
  it('初始状态包含第0回合快照', () => {
    const scene = createTestScene({
      pollutionIndices: [0, 1, 2],
      budget: 150,
      water: 55,
      larvae: 30,
      bio: 30
    });
    const game = createGameState(scene, { seed: TEST_SEED });

    expect(game.replay.snapshots.length).toBe(1);
    const initial = game.replay.snapshots[0];
    expect(initial.turn).toBe(0);
    expect(initial.water).toBe(55);
    expect(initial.larvae).toBe(30);
    expect(initial.bio).toBe(30);
    expect(initial.pollution).toBe(3);
    expect(initial.budget).toBe(150);
    expect(initial.oysters).toBe(0);
    expect(initial.grass).toBe(0);
    expect(initial.piles).toBe(0);
    expect(initial.buffers).toBe(0);
    expect(initial.cells.length).toBe(GRID_SIZE);
    expect(initial.cells[0].polluted).toBe(true);
  });

  it('recordReplaySnapshot正确记录当前状态', () => {
    const game = createTestGame({
      pollutionIndices: [0],
      budget: 100
    });

    game.turn = 3;
    game.water = 70;
    game.larvae = 40;
    game.bio = 45;
    game.budget = 120;
    game.cells[5].type = 'oyster';
    game.cells[6].type = 'grass';
    game.cells[7].type = 'pile';
    game.cells[8].type = 'buffer';

    const initialCount = game.replay.snapshots.length;
    recordReplaySnapshot(game);

    expect(game.replay.snapshots.length).toBe(initialCount + 1);
    const snapshot = game.replay.snapshots[game.replay.snapshots.length - 1];
    expect(snapshot.turn).toBe(3);
    expect(snapshot.water).toBe(70);
    expect(snapshot.larvae).toBe(40);
    expect(snapshot.bio).toBe(45);
    expect(snapshot.pollution).toBe(1);
    expect(snapshot.budget).toBe(120);
    expect(snapshot.oysters).toBe(1);
    expect(snapshot.grass).toBe(1);
    expect(snapshot.piles).toBe(1);
    expect(snapshot.buffers).toBe(1);
  });

  it('快照包含完整cells序列化数据', () => {
    const game = createTestGame({ pollutionIndices: [10, 20] });
    game.cells[10].type = 'oyster';
    game.cells[15].type = 'grass';

    recordReplaySnapshot(game);
    const snap = game.replay.snapshots[game.replay.snapshots.length - 1];

    expect(snap.cells.length).toBe(GRID_SIZE);
    expect(snap.cells[10].type).toBe('oyster');
    expect(snap.cells[10].polluted).toBe(true);
    expect(snap.cells[15].type).toBe('grass');
    expect(snap.cells[15].polluted).toBe(false);
    expect(snap.cells[0].type).toBe('empty');
  });
});

describe('state - Replay 事件记录', () => {
  it('初始状态包含start事件', () => {
    const scene = createTestScene({ name: '测试场', goalDesc: '测试目标' });
    const game = createGameState(scene, { seed: TEST_SEED });

    expect(game.replay.events.length).toBeGreaterThanOrEqual(1);
    const startEvent = game.replay.events.find(e => e.type === 'start');
    expect(startEvent).toBeDefined();
    expect(startEvent.turn).toBe(0);
    expect(startEvent.message).toContain('测试场');
    expect(startEvent.message).toContain('测试目标');
  });

  it('recordReplayEvent记录自定义事件', () => {
    const game = createTestGame();
    const initialCount = game.replay.events.length;

    recordReplayEvent(game, 'custom', '自定义消息', { foo: 'bar' });

    expect(game.replay.events.length).toBe(initialCount + 1);
    const lastEvent = game.replay.events[game.replay.events.length - 1];
    expect(lastEvent.type).toBe('custom');
    expect(lastEvent.message).toBe('自定义消息');
    expect(lastEvent.data).toEqual({ foo: 'bar' });
    expect(lastEvent.turn).toBe(game.turn);
  });

  it('recordReplayEvent无data时data为null', () => {
    const game = createTestGame();
    recordReplayEvent(game, 'simple', '简单消息');
    const lastEvent = game.replay.events[game.replay.events.length - 1];
    expect(lastEvent.data).toBeNull();
  });

  it('Replay metadata包含场景信息', () => {
    const scene = createTestScene({
      id: 'test-scene-1',
      name: '测试场景A',
      goalScore: 75
    });
    const game = createGameState(scene, { seed: TEST_SEED });

    expect(game.replay.sceneId).toBe('test-scene-1');
    expect(game.replay.sceneName).toBe('测试场景A');
    expect(game.replay.goalScore).toBe(75);
    expect(game.replay.seed).toBe(TEST_SEED);
    expect(game.replay.rulesSnapshot).toBeDefined();
  });
});

describe('tide - 潮汐推进与Replay', () => {
  it('advanceTurn每回合记录快照和事件', () => {
    const scene = createTestScene({
      pollutionIndices: [],
      turns: 5,
      stormChance: 0
    });
    const game = createGameState(scene, { seed: TEST_SEED });

    const initialSnapshots = game.replay.snapshots.length;
    const initialEvents = game.replay.events.length;

    advanceTurn(game, scene);

    expect(game.replay.snapshots.length).toBe(initialSnapshots + 1);
    expect(game.replay.events.length).toBeGreaterThan(initialEvents);

    const turnEndEvent = game.replay.events.find(e => e.type === 'turn_end');
    expect(turnEndEvent).toBeDefined();
    expect(turnEndEvent.turn).toBe(1);
    expect(turnEndEvent.data).toHaveProperty('score');
    expect(turnEndEvent.data).toHaveProperty('water');
    expect(turnEndEvent.data).toHaveProperty('larvae');
    expect(turnEndEvent.data).toHaveProperty('bio');
    expect(turnEndEvent.data).toHaveProperty('pollution');
  });

  it('finishGame记录胜负事件', () => {
    const scene = createTestScene({ goalScore: 1000, turns: 1 });
    const game = createGameState(scene, { seed: TEST_SEED });
    game.water = 0;
    game.larvae = 0;
    game.bio = 0;
    game.budget = 0;

    const initialEvents = game.replay.events.length;
    const result = finishGame(game, scene);

    expect(game.replay.events.length).toBeGreaterThan(initialEvents);
    const finalEvent = game.replay.events[game.replay.events.length - 1];
    expect(finalEvent.type).toBe('lose');
    expect(finalEvent.data).toHaveProperty('score');
    expect(finalEvent.data).toHaveProperty('pollution');
    expect(finalEvent.data).toHaveProperty('water');
    expect(finalEvent.data).toHaveProperty('larvae');
    expect(finalEvent.data).toHaveProperty('bio');
    expect(finalEvent.data).toHaveProperty('budget');
    expect(result.ended).toBe(true);
    expect(game.ended).toBe(true);
  });

  it('相同seed+相同操作序列产生相同回放', () => {
    const scene = createTestScene({
      pollutionIndices: [0, 1],
      turns: 3,
      stormChance: 0
    });

    const gameA = createGameState(scene, { seed: TEST_SEED });
    const gameB = createGameState(scene, { seed: TEST_SEED });

    gameA.cells[10].type = 'oyster';
    gameB.cells[10].type = 'oyster';

    for (let i = 0; i < 2; i++) {
      advanceTurn(gameA, scene);
      advanceTurn(gameB, scene);
    }

    expect(gameA.replay.snapshots.length).toBe(gameB.replay.snapshots.length);
    expect(gameA.replay.events.length).toBe(gameB.replay.events.length);

    for (let i = 0; i < gameA.replay.snapshots.length; i++) {
      expect(gameA.replay.snapshots[i].turn).toBe(gameB.replay.snapshots[i].turn);
      expect(gameA.replay.snapshots[i].water).toBe(gameB.replay.snapshots[i].water);
      expect(gameA.replay.snapshots[i].pollution).toBe(gameB.replay.snapshots[i].pollution);
    }

    for (let i = 0; i < gameA.replay.events.length; i++) {
      expect(gameA.replay.events[i].type).toBe(gameB.replay.events[i].type);
      expect(gameA.replay.events[i].turn).toBe(gameB.replay.events[i].turn);
    }
  });
});
