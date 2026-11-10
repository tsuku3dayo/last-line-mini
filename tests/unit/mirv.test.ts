import { describe, expect, it } from 'vitest';
import { LOGICAL_HEIGHT, MIRV_MAX_CHILDREN, MIRV_MIN_CHILDREN, SCORE_PER_ENEMY, WAVE_ENEMY_COUNTS, WAVE_MIRV_COUNTS } from '../../src/core/config';
import {
  ENEMY_FIRST_SPAWN_STEP,
  ENEMY_SPAWN_INTERVAL,
  MIRV_SPLIT_MAX_Y,
  MIRV_SPLIT_MIN_Y,
  TARGETS,
  enemyAims,
  enemyHead,
  spawnEnemy,
  stepEnemies,
  type EnemyMissile,
} from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';
import { seedState } from '../../src/core/random';
import { isMirvSpawn } from '../../src/core/wave';

// 多弾頭ミサイル（LLM-PBI-0008）

/** 真下の x へ落ちる多弾頭。traveled の深さにいて、atY で分かれ、子は targets へ */
const mirv = (x: number, traveled: number, atY: number, targets: readonly number[], speed = 1): EnemyMissile => ({
  fromX: x,
  fromY: 0,
  toX: x,
  toY: 592,
  speed,
  traveled,
  split: { atY, targets: targets.map((tx) => TARGETS.find((t) => t.x === tx) ?? { x: tx, y: 592 }) },
});

/** ウェーブ n の途中（まだ敵を出し切っていない）に置く。狙う物以外は消す（TEAM 5.6） */
function playing(n: number, over: Partial<GameState> = {}): GameState {
  const s = createGame(1);
  return { ...s, wave: { number: n, status: 'playing', phaseStep: 1, spawned: 1 }, ...over };
}

/** 種 seed で、ウェーブ n に出る敵をすべて集める（出る順に） */
function spawnsOfWave(n: number, seed: number): EnemyMissile[] {
  let rng = seedState(seed);
  const out: EnemyMissile[] = [];
  for (let st = 0; out.length < (WAVE_ENEMY_COUNTS[n - 1] ?? 0); st++) {
    const r = spawnEnemy(st, rng, isMirvSpawn(n, out.length));
    rng = r.rng;
    if (r.enemy) out.push(r.enemy);
  }
  return out;
}

describe('どの弾が多弾頭か', () => {
  it('LLM-TC-0008-01 WAVE 1 は通常の弾だけ。WAVE 2〜4 は 3・4・5 発が多弾頭', () => {
    expect(WAVE_MIRV_COUNTS).toEqual([0, 3, 4, 5]);
    for (const [i, total] of WAVE_ENEMY_COUNTS.entries()) {
      const n = i + 1;
      const flags = Array.from({ length: total }, (_, k) => isMirvSpawn(n, k));
      expect(flags.filter(Boolean).length).toBe(WAVE_MIRV_COUNTS[i]);
      expect(spawnsOfWave(n, 7).filter((m) => m.split).length).toBe(WAVE_MIRV_COUNTS[i]);
    }
    // 固まらずに均して置く（9 発に 3 発なら 3・6・9 発目）
    expect(Array.from({ length: 9 }, (_, k) => isMirvSpawn(2, k))).toEqual([false, false, true, false, false, true, false, false, true]);
    // ウェーブの外の番号では多弾頭にしない
    expect(isMirvSpawn(2, 9)).toBe(false);
    expect(isMirvSpawn(5, 0)).toBe(false);
  });

  it('LLM-TC-0008-01 通常の弾だけのときの乱数の並びは変わらない（WAVE 1 は前と同じ敵が出る）', () => {
    const rng = seedState(3);
    expect(spawnEnemy(ENEMY_FIRST_SPAWN_STEP, rng, false)).toEqual(spawnEnemy(ENEMY_FIRST_SPAWN_STEP, rng));
    // 多弾頭でも、出る位置・狙い・速さは同じ乱数で決まり、分かれ方だけが足される
    const plain = spawnEnemy(ENEMY_FIRST_SPAWN_STEP, rng).enemy;
    const m = spawnEnemy(ENEMY_FIRST_SPAWN_STEP, rng, true).enemy;
    expect(m).toMatchObject({ ...plain });
    expect(m?.split).toBeDefined();
    // 出る間隔でないステップでは、多弾頭でも出ない
    expect(spawnEnemy(ENEMY_FIRST_SPAWN_STEP + 1, rng, true).enemy).toBeNull();
  });
});

describe('分かれ方', () => {
  it('LLM-TC-0008-02 上から 4〜6 割の高さで、2〜3 発に分かれ、子の狙いはすべて別の都市・基地', () => {
    expect(MIRV_SPLIT_MIN_Y).toBe(0.4 * LOGICAL_HEIGHT);
    expect(MIRV_SPLIT_MAX_Y).toBe(0.6 * LOGICAL_HEIGHT);
    const counts = new Set<number>();
    let rng = seedState(11);
    for (let i = 0; i < 200; i++) {
      const r = spawnEnemy(ENEMY_FIRST_SPAWN_STEP, rng, true);
      rng = r.rng;
      const s = r.enemy?.split;
      if (!s) throw new Error('多弾頭が出ない');
      expect(s.atY).toBeGreaterThanOrEqual(MIRV_SPLIT_MIN_Y);
      expect(s.atY).toBeLessThan(MIRV_SPLIT_MAX_Y);
      expect(s.targets.length).toBeGreaterThanOrEqual(MIRV_MIN_CHILDREN);
      expect(s.targets.length).toBeLessThanOrEqual(MIRV_MAX_CHILDREN);
      expect(new Set(s.targets.map((t) => t.x)).size).toBe(s.targets.length);
      for (const t of s.targets) expect(TARGETS).toContainEqual(t);
      counts.add(s.targets.length);
    }
    expect([...counts].sort()).toEqual([2, 3]); // 2 発も 3 発も出る
  });

  it('LLM-TC-0008-02 分かれる高さを越えたステップで、弾頭の点から子の弾が出る。速さは親と同じ', () => {
    // 弾頭は y=299.5 にいて、次のステップで y=300.5（分かれる高さ 300 を越える）
    const parent = mirv(200, 299.5, 300, [100, 380], 1);
    const before = stepEnemies([{ ...parent, traveled: 298 }], []);
    expect(before.flying).toHaveLength(1); // まだ分かれない
    expect(before.flying[0]?.split).toBeDefined();
    const r = stepEnemies([parent], []);
    expect(r.destroyed).toHaveLength(0);
    expect(r.flying).toHaveLength(2);
    for (const [i, c] of r.flying.entries()) {
      expect(c.split).toBeUndefined();
      expect(c).toMatchObject({ fromX: 200, fromY: 300.5, speed: 1, traveled: 0, trailFrom: { x: 200, y: 0 } });
      expect(c.toX).toBe([100, 380][i]);
    }
  });
});

describe('点・誘爆・被害', () => {
  it('LLM-TC-0008-03 分かれる前に爆風で落とすと 25 点で、子の弾は出ない', () => {
    const parent = mirv(200, 200, 300, [100, 380]);
    const s = step(playing(2, { enemies: [parent], blasts: [{ x: 200, y: 201, age: 10 }] }), NO_INPUT);
    expect(s.score).toBe(SCORE_PER_ENEMY);
    expect(s.enemies).toHaveLength(0);
  });

  it('LLM-TC-0008-03 分かれたあとは子の弾 1 発ごとに 25 点。子も誘爆する', () => {
    // 子は同じ点から出るので、少し進めて離してから（爆風が 1 つの子だけにかかるように。TEAM 5.6）
    const split = stepEnemies([mirv(200, 299.5, 300, [100, 140, 380])], []).flying.map((c) => ({ ...c, traveled: 150 }));
    expect(split).toHaveLength(3);
    // 2 発を爆風の中に置く（次のステップの弾頭の点）
    const heads = split.map((c) => enemyHead({ ...c, traveled: c.traveled + c.speed }));
    // 前提：3 発目の弾頭は、どちらの爆風からも離れている
    for (const h of heads.slice(0, 2)) expect(Math.hypot((heads[2]?.x ?? 0) - h.x, (heads[2]?.y ?? 0) - h.y)).toBeGreaterThan(60);
    const blasts = heads.slice(0, 2).map((h) => ({ x: h.x, y: h.y, age: 10 }));
    const s = step(playing(2, { enemies: split, blasts }), NO_INPUT);
    expect(s.score).toBe(2 * SCORE_PER_ENEMY);
    expect(s.enemies).toHaveLength(1);
    // 壊れた子の場所に誘爆の爆風が足される（LLM-PBI-0003 と同じ）
    expect(s.blasts.filter((b) => b.age === 0)).toHaveLength(2);
  });

  it('LLM-TC-0008-03 子の弾が着くと、狙った都市が壊れる', () => {
    const child: EnemyMissile = { fromX: 140, fromY: 300, toX: 140, toY: 592, speed: 1, traveled: 291.5, trailFrom: { x: 200, y: 0 } };
    const s = step(playing(2, { enemies: [child] }), NO_INPUT);
    expect(s.cities.find((c) => c.x === 140)?.alive).toBe(false);
  });
});

describe('ウェーブの数え方と弾切れの判定', () => {
  it('LLM-TC-0008-05 ウェーブの敵の数は親で数え、子の弾がすべて消えるまでウェーブは終わらない', () => {
    const total = WAVE_ENEMY_COUNTS[1];
    const split = stepEnemies([mirv(200, 299.5, 300, [100, 380], 0.001)], []).flying;
    // 出し切った（spawned = 9）が、子が 2 発残っている
    const s = step(playing(2, { wave: { number: 2, status: 'playing', phaseStep: 999, spawned: total }, enemies: split }), NO_INPUT);
    expect(s.wave).toMatchObject({ number: 2, status: 'playing', spawned: total });
    // 子がいなくなると、次のウェーブのあいだへ
    const done = step({ ...s, enemies: [] }, NO_INPUT);
    expect(done.wave).toMatchObject({ number: 3, status: 'break' });
  });

  it('LLM-TC-0008-05 弾切れの判定に、分かれる前の多弾頭の子の狙いも入る', () => {
    const base = playing(2);
    const empty = base.bases.map((b) => ({ ...b, ammo: 0 }));
    // 親は基地（x=240）を狙っているが、子の狙いに残っている都市（x=140）がある → 止められない
    const parent = { ...mirv(240, 100, 300, [140, 440]), speed: 0.001 };
    expect(enemyAims(parent).map((t) => t.x)).toEqual([140, 440]);
    expect(step({ ...base, bases: empty, enemies: [parent] }, NO_INPUT).wave.status).toBe('gameover');
    // 子の狙いが基地と壊れた都市だけなら続く
    const cityGone = base.cities.map((c) => (c.x === 140 ? { ...c, alive: false } : c));
    expect(step({ ...base, bases: empty, cities: cityGone, enemies: [parent] }, NO_INPUT).wave.status).toBe('playing');
  });
});

describe('出る間隔は変わらない', () => {
  it('LLM-TC-0008-01 多弾頭も通常の弾と同じ間隔で出る', () => {
    const steps: number[] = [];
    let rng = seedState(2);
    for (let st = 0; steps.length < 3; st++) {
      const r = spawnEnemy(st, rng, true);
      rng = r.rng;
      if (r.enemy) steps.push(st);
    }
    expect(steps).toEqual([0, 1, 2].map((k) => ENEMY_FIRST_SPAWN_STEP + k * ENEMY_SPAWN_INTERVAL));
  });
});
