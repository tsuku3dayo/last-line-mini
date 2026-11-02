import { describe, expect, it } from 'vitest';
import { BLAST_GROW_STEPS, BLAST_LIFE_STEPS, BLAST_MAX_RADIUS, blastRadius } from '../../src/core/blast';
import { AMMO_PER_BASE } from '../../src/core/config';
import { createGame, NO_INPUT, step, type FireButtons, type GameState, type StepInput } from '../../src/core/game';
import { CENTER_SPEED, LAUNCH_Y, SIDE_SPEED, interceptorPosition, launch, stepInterceptors } from '../../src/core/interceptor';

const A: FireButtons = [true, false, false];
const B: FireButtons = [false, true, false];
const C: FireButtons = [false, false, true];

/** 照準を (x, y) に置いて、buttons で撃つ入力 */
const fireAt = (x: number, y: number, buttons: FireButtons): StepInput => ({ ...NO_INPUT, pointer: { x, y }, fire: buttons });

const advance = (s: GameState, n: number): GameState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = step(cur, NO_INPUT);
  return cur;
};

/** 撃ってから着く（爆風が出る）までのステップ数 */
function stepsToArrive(s: GameState): number {
  let cur = s;
  for (let i = 1; i <= 10_000; i++) {
    cur = step(cur, NO_INPUT);
    if (cur.blasts.length > 0) return i;
  }
  throw new Error('着かない');
}

describe('迎撃ミサイル', () => {
  it('LLM-TC-0001-03 発射キーで、その基地から照準の位置へ直線で飛び、着く場所の目印（目標）を持つ', () => {
    const s = step(createGame(1), fireAt(200, 300, C));
    expect(s.interceptors).toHaveLength(1);
    const m = s.interceptors[0];
    expect(m).toMatchObject({ base: 2, fromX: 440, fromY: LAUNCH_Y, toX: 200, toY: 300 });
    // 途中の位置は、発射した点と目標を結ぶ線の上
    const mid = advance(s, 30).interceptors[0];
    expect(mid).toBeDefined();
    if (!mid) return;
    const p = interceptorPosition(mid);
    const cross = (p.x - 440) * (300 - LAUNCH_Y) - (p.y - LAUNCH_Y) * (200 - 440);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
    expect(p.y).toBeLessThan(LAUNCH_Y);
  });

  it('LLM-TC-0001-03 着いたら消えて、目標の位置で爆風になる', () => {
    const s = step(createGame(1), fireAt(240, 200, B));
    const n = stepsToArrive(s);
    const arrived = advance(s, n);
    expect(arrived.interceptors).toHaveLength(0);
    expect(arrived.blasts).toEqual([{ x: 240, y: 200, age: 0 }]);
  });

  it('LLM-TC-0001-03 爆風は決まった半径まで広がってから縮み、消える', () => {
    const radii = Array.from({ length: BLAST_LIFE_STEPS + 1 }, (_, age) => blastRadius(age));
    expect(radii[0]).toBeGreaterThan(0);
    expect(Math.max(...radii)).toBe(BLAST_MAX_RADIUS);
    const peak = radii.indexOf(BLAST_MAX_RADIUS);
    expect(peak).toBe(BLAST_GROW_STEPS - 1);
    for (let i = 1; i <= peak; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1] ?? 0);
    for (let i = peak + 1; i < radii.length; i++) expect(radii[i]).toBeLessThanOrEqual(radii[i - 1] ?? 0);
    expect(radii[BLAST_LIFE_STEPS]).toBe(0);
    // 状態からも消える
    const s = advance(step(createGame(1), fireAt(240, 200, B)), 1000);
    expect(s.blasts).toHaveLength(0);
  });

  it('LLM-TC-0001-04 同じ距離なら、中央の基地のミサイルが左右より早く着く', () => {
    expect(CENTER_SPEED).toBeGreaterThan(SIDE_SPEED);
    // 基地からの距離が同じになる目標（基地の真上 300 ドット）
    const fromA = stepsToArrive(step(createGame(1), fireAt(40, LAUNCH_Y - 300, A)));
    const fromB = stepsToArrive(step(createGame(1), fireAt(240, LAUNCH_Y - 300, B)));
    const fromC = stepsToArrive(step(createGame(1), fireAt(440, LAUNCH_Y - 300, C)));
    expect(fromB).toBeLessThan(fromA);
    expect(fromA).toBe(fromC);
    // 速さどおりの時間で着く
    expect(Math.abs(stepsToArrive(step(createGame(1), fireAt(240, LAUNCH_Y - 300, B))) - 300 / CENTER_SPEED)).toBeLessThanOrEqual(1);
  });

  it('LLM-TC-0001-04 1 ステップで進む距離は基地の速さのとおり', () => {
    const side = stepInterceptors([launch(0, 40, 40, 0)]).flying[0];
    const center = stepInterceptors([launch(1, 240, 240, 0)]).flying[0];
    expect(side?.traveled).toBeCloseTo(SIDE_SPEED);
    expect(center?.traveled).toBeCloseTo(CENTER_SPEED);
  });

  it('LLM-TC-0001-05 各基地 10 発。撃つと 1 減り、0 の基地からは撃てない。ほかの基地には影響しない', () => {
    let s = createGame(1);
    expect(s.bases.map((b) => b.ammo)).toEqual([AMMO_PER_BASE, AMMO_PER_BASE, AMMO_PER_BASE]);
    for (let i = 0; i < AMMO_PER_BASE; i++) s = step(s, fireAt(100, 100, A));
    expect(s.bases.map((b) => b.ammo)).toEqual([0, 10, 10]);
    const fired = s.interceptors.length;
    s = step(s, fireAt(100, 100, A));
    expect(s.bases[0]?.ammo).toBe(0);
    expect(s.interceptors.length).toBeLessThanOrEqual(fired); // 増えない
    s = step(s, fireAt(100, 100, [true, true, true]));
    expect(s.bases.map((b) => b.ammo)).toEqual([0, 9, 9]);
  });

  it('LLM-TC-0001-05 同じステップで 3 つの基地から同時に撃てる', () => {
    const s = step(createGame(1), fireAt(240, 300, [true, true, true]));
    expect(s.interceptors.map((m) => m.base)).toEqual([0, 1, 2]);
    expect(s.bases.map((b) => b.ammo)).toEqual([9, 9, 9]);
  });
});
