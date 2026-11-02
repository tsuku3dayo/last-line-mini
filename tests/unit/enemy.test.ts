import { describe, expect, it } from 'vitest';
import { BASE_XS, CITY_XS, LOGICAL_WIDTH, STEPS_PER_SECOND } from '../../src/core/config';
import {
  ENEMY_FIRST_SPAWN_STEP,
  ENEMY_MAX_SPEED,
  ENEMY_MIN_SPEED,
  ENEMY_SPAWN_INTERVAL,
  IMPACT_STEPS,
  TARGETS,
  enemyHead,
  spawnEnemy,
  stepEnemies,
  stepImpacts,
  type EnemyMissile,
} from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';
import { seedState } from '../../src/core/random';
import { groundYAt } from '../../src/core/terrain';

const run = (s: GameState, n: number): GameState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = step(cur, NO_INPUT);
  return cur;
};

describe('敵の通常弾', () => {
  it('LLM-TC-0001-07 目標は都市 6 つと基地 3 つの地面の上', () => {
    expect(TARGETS.map((t) => t.x).sort((a, b) => a - b)).toEqual([...CITY_XS, ...BASE_XS].sort((a, b) => a - b));
    for (const t of TARGETS) expect(t.y).toBe(groundYAt(t.x));
  });

  it('LLM-TC-0001-07 決まった間隔で、画面の上端から、都市か基地を目指して出る', () => {
    let rng = seedState(5);
    const spawned: EnemyMissile[] = [];
    for (let st = 0; st < ENEMY_FIRST_SPAWN_STEP + ENEMY_SPAWN_INTERVAL * 40; st++) {
      const r = spawnEnemy(st, rng);
      rng = r.rng;
      if (r.enemy) {
        expect((st - ENEMY_FIRST_SPAWN_STEP) % ENEMY_SPAWN_INTERVAL).toBe(0);
        spawned.push(r.enemy);
      }
    }
    expect(spawned).toHaveLength(40);
    for (const m of spawned) {
      expect(m.fromY).toBe(0);
      expect(m.fromX).toBeGreaterThanOrEqual(0);
      expect(m.fromX).toBeLessThanOrEqual(LOGICAL_WIDTH);
      expect(TARGETS.some((t) => t.x === m.toX && t.y === m.toY)).toBe(true);
      expect(m.speed).toBeGreaterThanOrEqual(ENEMY_MIN_SPEED);
      expect(m.speed).toBeLessThanOrEqual(ENEMY_MAX_SPEED);
    }
    // 目標と出る位置はばらける
    expect(new Set(spawned.map((m) => m.toX)).size).toBeGreaterThan(4);
  });

  it('LLM-TC-0001-07 同じ種なら同じ敵が出る', () => {
    const a = run(createGame(9), ENEMY_FIRST_SPAWN_STEP + ENEMY_SPAWN_INTERVAL * 3 + 1);
    const b = run(createGame(9), ENEMY_FIRST_SPAWN_STEP + ENEMY_SPAWN_INTERVAL * 3 + 1);
    expect(a.enemies).toEqual(b.enemies);
    expect(a.enemies.length).toBeGreaterThan(0);
  });

  it('LLM-TC-0001-07 弾頭は出た点と目標を結ぶ直線の上を進む（航跡は出た点から弾頭まで）', () => {
    let m: EnemyMissile = { fromX: 50, fromY: 0, toX: 340, toY: 592, speed: 0.4, traveled: 0 };
    for (let i = 0; i < 500; i++) {
      m = stepEnemies([m], []).flying[0] ?? m;
      const h = enemyHead(m);
      const cross = (h.x - m.fromX) * (m.toY - m.fromY) - (h.y - m.fromY) * (m.toX - m.fromX);
      expect(Math.abs(cross)).toBeLessThan(1e-6);
    }
    expect(enemyHead(m).y).toBeGreaterThan(100);
  });

  it('LLM-TC-0001-07 目標（地面）に着くと消え、そこに閃光が 0.2 秒出る', () => {
    const near: EnemyMissile = { fromX: 100, fromY: 0, toX: 100, toY: 592, speed: 0.4, traveled: 591.9 };
    const r = stepEnemies([near], []);
    expect(r.landed).toHaveLength(1);
    expect(r.flying).toHaveLength(0);

    let s: GameState = { ...createGame(1), enemies: [near] };
    s = step(s, NO_INPUT);
    expect(s.enemies.filter((m) => m.toX === 100 && m.fromX === 100)).toHaveLength(0);
    expect(s.impacts).toEqual([{ x: 100, y: 592, age: 0 }]);
    expect(IMPACT_STEPS).toBe(Math.round(0.2 * STEPS_PER_SECOND));
    let impacts = s.impacts;
    for (let i = 0; i < IMPACT_STEPS - 1; i++) impacts = stepImpacts(impacts);
    expect(impacts).toHaveLength(1);
    expect(stepImpacts(impacts)).toHaveLength(0);
  });

  it('LLM-TC-0001-07 上端から地面まで、速い敵で約 12.3 秒・遅い敵で約 18.5 秒かかる', () => {
    const fall = (speed: number) => 592 / speed / STEPS_PER_SECOND;
    expect(fall(ENEMY_MAX_SPEED)).toBeCloseTo(12.33, 2);
    expect(fall(ENEMY_MIN_SPEED)).toBeCloseTo(18.5, 2);
  });
});
