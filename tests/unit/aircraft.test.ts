import { describe, expect, it } from 'vitest';
import {
  aircraftFirstStep,
  aircraftInWave,
  aircraftPath,
  aircraftPlan,
  aircraftSpeed,
  dropsDue,
  isHitByBlast,
  launchAircraft,
  stepAircraft,
  targetBelow,
  type Aircraft,
} from '../../src/core/aircraft';
import { BLAST_GROW_STEPS } from '../../src/core/blast';
import { AMMO_PER_BASE, BOMBER, LOGICAL_WIDTH, SATELLITE, SCORE_PER_AIRCRAFT, STEPS_PER_SECOND, WAVE_ENEMY_COUNTS } from '../../src/core/config';
import { cannotStop } from '../../src/core/end';
import { TARGETS } from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';
import { seedState } from '../../src/core/random';
import { parseRanking } from '../../src/storage/ranking-store';
import { beginStep, type WaveProgress } from '../../src/core/wave';

const SEEDS = Array.from({ length: 40 }, (_, k) => seedState(k + 1));

/** 飛び終わるまで（または上限まで）進め、落とした弾と最後の状態を集める */
function fly(a: Aircraft, maxSteps = 5000): { drops: { atAge: number; x: number; toX: number }[]; lastAge: number } {
  let list: Aircraft[] = [a];
  const drops: { atAge: number; x: number; toX: number }[] = [];
  let lastAge = 0;
  for (let i = 0; i < maxSteps && list.length > 0; i++) {
    const r = stepAircraft(list, [], 2);
    for (const d of r.drops) drops.push({ atAge: (list[0]?.age ?? 0) + 1, x: d.fromX, toX: d.toX });
    lastAge = (list[0]?.age ?? 0) + 1;
    list = r.flying;
  }
  return { drops, lastAge };
}

/** WAVE n が始まったところ（ウェーブのあいだを飛ばす） */
function waveStarted(n: number, seed = 1): GameState {
  const s = createGame(seed);
  const w: WaveProgress = { number: n, status: 'break', phaseStep: 10_000, spawned: 0 };
  const begun = beginStep(w, s.bases, s.rng);
  return { ...s, wave: begun.wave, bases: begun.bases };
}

describe('爆撃機と衛星（LLM-PBI-0009）', () => {
  it('LLM-TC-0009-01 WAVE 1 には出ない。WAVE 2 に爆撃機、WAVE 3 に衛星、WAVE 4・5 に爆撃機と衛星', () => {
    expect(aircraftInWave(1)).toEqual([]);
    expect(aircraftInWave(2)).toEqual(['bomber']);
    expect(aircraftInWave(3)).toEqual(['satellite']);
    expect(aircraftInWave(4)).toEqual(['bomber', 'satellite']);
    expect(aircraftInWave(5)).toEqual(['bomber', 'satellite']);
    // ウェーブの始めに計画が決まり、地上の敵の半分が出たときに出る。2 機目は 4 秒あと
    const w4 = waveStarted(4).wave;
    expect(w4.airPlan?.map((p) => p.kind)).toEqual(['bomber', 'satellite']);
    expect(w4.airPlan?.[0]?.atStep).toBe(aircraftFirstStep(4));
    expect((w4.airPlan?.[1]?.atStep ?? 0) - (w4.airPlan?.[0]?.atStep ?? 0)).toBe(4 * STEPS_PER_SECOND);
    expect(waveStarted(1).wave.airPlan).toEqual([]);
  });

  it('LLM-TC-0009-01 ゲームを進めると、WAVE 2 の決まったステップに爆撃機が出る（WAVE 1 の地上の敵の乱数の並びは変わらない）', () => {
    let s = waveStarted(2);
    const at = s.wave.airPlan?.[0]?.atStep ?? 0;
    for (let i = 0; i < at; i++) s = step(s, NO_INPUT);
    expect(s.aircraft).toHaveLength(0);
    s = step(s, NO_INPUT);
    expect(s.aircraft.map((a) => a.kind)).toEqual(['bomber']);
    expect(s.wave.airLaunched).toBe(1);
  });

  it('LLM-TC-0009-02 爆撃機：左右の端から y 100〜140 を 1 秒 40 ドットで横切り、反対の端から出る', () => {
    const plans = SEEDS.map((r) => aircraftPlan(2, r)[0]);
    expect(plans.every((p) => p !== undefined && p.y >= BOMBER.minY && p.y <= BOMBER.maxY)).toBe(true);
    expect(new Set(plans.map((p) => p?.dir))).toEqual(new Set([1, -1]));
    expect(aircraftSpeed('bomber') * STEPS_PER_SECOND).toBeCloseTo(40, 9);
    const left = launchAircraft({ kind: 'bomber', dir: 1, y: 120, atStep: 0 });
    expect(left.x).toBe(-BOMBER.width / 2);
    const right = launchAircraft({ kind: 'bomber', dir: -1, y: 120, atStep: 0 });
    expect(right.x).toBe(LOGICAL_WIDTH + BOMBER.width / 2);
    // 道のり（480 ＋ 幅）を 1 秒 40 ドットで：約 13 秒で出ていく
    const { lastAge } = fly(left);
    expect(lastAge).toBe(Math.ceil(aircraftPath('bomber') / aircraftSpeed('bomber') - 1e-9));
    expect(lastAge / STEPS_PER_SECOND).toBeGreaterThan(12.5);
    expect(lastAge / STEPS_PER_SECOND).toBeLessThan(13.5);
  });

  it('LLM-TC-0009-02 爆撃機は、道のりの 3 分の 1 と 3 分の 2 で、真下にいちばん近い都市・基地へ 1 発ずつ落とす', () => {
    const { drops } = fly(launchAircraft({ kind: 'bomber', dir: 1, y: 120, atStep: 0 }));
    expect(drops).toHaveLength(BOMBER.drops);
    const third = aircraftPath('bomber') / 3;
    expect(drops[0]?.x).toBeCloseTo(-BOMBER.width / 2 + third, 0);
    expect(drops[1]?.x).toBeCloseTo(-BOMBER.width / 2 + 2 * third, 0);
    for (const d of drops) expect(d.toX).toBe(targetBelow(d.x).x);
    // 真下にいちばん近い：x 155 なら都市 4（x 140）、x 330 なら都市 5（340）
    expect(targetBelow(155).x).toBe(140);
    expect(targetBelow(330).x).toBe(340);
    expect(TARGETS.some((t) => t.x === targetBelow(0).x)).toBe(true);
  });

  it('LLM-TC-0009-03 衛星：y 50〜80 を 1 秒 60 ドットで横切り、出てから 2.5 秒ごとに 3 発落とす', () => {
    const plans = SEEDS.map((r) => aircraftPlan(3, r)[0]);
    expect(plans.every((p) => p !== undefined && p.kind === 'satellite' && p.y >= SATELLITE.minY && p.y <= SATELLITE.maxY)).toBe(true);
    expect(aircraftSpeed('satellite') * STEPS_PER_SECOND).toBeCloseTo(60, 9);
    const { drops, lastAge } = fly(launchAircraft({ kind: 'satellite', dir: -1, y: 60, atStep: 0 }));
    expect(drops.map((d) => d.atAge)).toEqual([1, 2, 3].map((k) => k * 2.5 * STEPS_PER_SECOND));
    expect(lastAge / STEPS_PER_SECOND).toBeGreaterThan(8);
    expect(lastAge / STEPS_PER_SECOND).toBeLessThan(9);
    expect(dropsDue('satellite', 100_000)).toBe(3);
  });

  it('LLM-TC-0009-04 機体の四角に爆風の円が重なると壊れ、100 点・その場に爆風。壊れたあとは落とさない', () => {
    const bomber: Aircraft = { kind: 'bomber', dir: 1, x: 200, y: 120, age: 0, dropped: 0 };
    const r = BLAST_GROW_STEPS; // いちばん大きい（半径 36）
    // 四角の右の端（x 218）から 36 ちょうど外：重なる。もう 1 ドット外：重ならない（1 ステップで機体が 1/3 ドット進む分を足す）
    const edge = 200 + BOMBER.width / 2 + 36;
    expect(isHitByBlast(bomber, [{ x: edge, y: 120, age: r }])).toBe(true);
    expect(isHitByBlast(bomber, [{ x: edge + 1, y: 120, age: r }])).toBe(false);
    // ゲームの中で：100 点、その場に爆風、機体は消える
    const s0 = waveStarted(2);
    const s: GameState = { ...s0, aircraft: [bomber], blasts: [{ x: 200, y: 120, age: 10 }] };
    const after = step(s, NO_INPUT);
    expect(after.aircraft).toHaveLength(0);
    expect(after.score - s.score).toBe(SCORE_PER_AIRCRAFT);
    expect(after.blasts.some((b) => b.age === 0 && Math.abs(b.x - 200) < 1 && b.y === 120)).toBe(true);
    // 壊れたあとは落とさない：落とす直前でも、弾は増えない
    const third = aircraftPath('bomber') / 3;
    const ageBefore = Math.ceil(third / aircraftSpeed('bomber')) - 1;
    const aboutToDrop: Aircraft = { ...bomber, x: -BOMBER.width / 2 + ageBefore * aircraftSpeed('bomber'), age: ageBefore };
    const hit = stepAircraft([aboutToDrop], [{ x: aboutToDrop.x, y: 120, age: r }], 2);
    expect(hit.destroyed).toHaveLength(1);
    expect(hit.drops).toHaveLength(0);
  });

  it('LLM-TC-0009-04 落とした弾は通常の弾と同じ：爆風で 25 点、着くと都市を壊す', () => {
    const s0 = waveStarted(2);
    const sat: Aircraft = { kind: 'satellite', dir: 1, x: 140, y: 60, age: 2.5 * STEPS_PER_SECOND - 1, dropped: 0 };
    let s = step({ ...s0, aircraft: [sat] }, NO_INPUT);
    expect(s.enemies.some((m) => m.toX === 140 && m.fromY === 60 + SATELLITE.height / 2)).toBe(true);
    // 落ちるまで進める：都市 2（x 140）が壊れる
    for (let i = 0; i < 40 * STEPS_PER_SECOND && s.cities[1]?.alive; i++) s = step({ ...s, aircraft: [] }, NO_INPUT);
    expect(s.cities[1]?.alive).toBe(false);
  });

  it('LLM-TC-0009-05 空の敵がいるあいだ、まだ出ていないあいだは、地上の敵がいなくてもウェーブは終わらない', () => {
    const s0 = waveStarted(2);
    const total = WAVE_ENEMY_COUNTS[1] ?? 0;
    // 地上の敵はすべて出し終えて、画面にいない。爆撃機はまだ出ていない
    const pending: GameState = { ...s0, wave: { ...s0.wave, spawned: total, phaseStep: 0 }, enemies: [] };
    expect(step(pending, NO_INPUT).wave.status).toBe('playing');
    // 爆撃機が飛んでいる
    const flying: GameState = { ...pending, wave: { ...pending.wave, airLaunched: 1 }, aircraft: [{ kind: 'bomber', dir: 1, x: 100, y: 120, age: 0, dropped: 0 }] };
    expect(step(flying, NO_INPUT).wave.status).toBe('playing');
    // 出ていったあと：次のウェーブのあいだへ
    const gone: GameState = { ...flying, aircraft: [] };
    expect(step(gone, NO_INPUT).wave).toMatchObject({ number: 3, status: 'break' });
  });

  it('LLM-TC-0009-05 弾切れの判定：まだ落とす弾のある空の敵は、残っている都市を狙うものとして数える', () => {
    const s = { ...createGame(1), bases: createGame(1).bases.map((b) => ({ ...b, ammo: 0 })), enemies: [] };
    const bomber: Aircraft = { kind: 'bomber', dir: 1, x: 100, y: 120, age: 0, dropped: 0 };
    expect(cannotStop({ ...s, aircraft: [bomber] })).toBe(true);
    expect(cannotStop({ ...s, aircraft: [{ ...bomber, dropped: BOMBER.drops }] })).toBe(false);
    expect(cannotStop({ ...s, aircraft: [] })).toBe(false);
  });

  it('LLM-TC-0009-06 基地の弾は 15 発。ウェーブの始めに 15 に戻る', () => {
    expect(AMMO_PER_BASE).toBe(15);
    const s = createGame(1);
    const used = { ...s, bases: s.bases.map((b) => ({ ...b, ammo: 2 })) };
    expect(beginStep({ number: 2, status: 'break', phaseStep: 10_000, spawned: 0 }, used.bases).bases.map((b) => b.ammo)).toEqual([15, 15, 15]);
  });

  it('LLM-TC-0009-06 保存は残弾 0〜45 の記録を読む（今までの 30 までの記録も読める）。46 は形が違う', () => {
    const rec = (missiles: number) => ({ name: 'AAA', score: 100, cities: 6, missiles, status: 'CLEARED', createdAt: '2026-11-01T00:00:00.000Z' });
    expect(parseRanking(JSON.stringify([rec(45)]))).toHaveLength(1);
    expect(parseRanking(JSON.stringify([rec(30)]))).toHaveLength(1);
    expect(parseRanking(JSON.stringify([rec(46)]))).toEqual([]);
  });
});
