import { describe, expect, it } from 'vitest';
import { STEPS_PER_SECOND } from '../../src/core/config';
import {
  CURSOR_MAX_SPEED,
  CURSOR_MAX_X,
  CURSOR_MAX_Y,
  CURSOR_MIN_X,
  CURSOR_MIN_Y,
  INITIAL_CURSOR,
  stepCursor,
  type Cursor,
  type MoveDir,
} from '../../src/core/cursor';
import { createGame, NO_FIRE, step } from '../../src/core/game';

const RIGHT: MoveDir = { x: 1, y: 0 };
const NONE: MoveDir = { x: 0, y: 0 };

/** 同じ入力で n ステップ進め、途中の状態をすべて返す */
function run(c: Cursor, move: MoveDir, n: number): Cursor[] {
  const out: Cursor[] = [];
  let cur = c;
  for (let i = 0; i < n; i++) {
    cur = stepCursor(cur, move, null);
    out.push(cur);
  }
  return out;
}

describe('照準の始めの位置（LLM-PBI-0005）', () => {
  it('LLM-TC-0005-05 始めは (240, 420) で、「WAVE 1」の文字（y 280〜308）と重ならない', () => {
    expect(INITIAL_CURSOR).toEqual({ x: 240, y: 420, vx: 0, vy: 0 });
    expect(createGame(1).cursor).toEqual(INITIAL_CURSOR);
    // 照準の「＋」は中心から上下 6 ドット。上端 414 は文字の下端 308 より下
    expect(INITIAL_CURSOR.y - 6).toBeGreaterThan(280 + 7 * 4);
    // 動ける範囲の中
    expect(INITIAL_CURSOR.y).toBeGreaterThanOrEqual(CURSOR_MIN_Y);
    expect(INITIAL_CURSOR.y).toBeLessThanOrEqual(CURSOR_MAX_Y);
  });
});

describe('照準（方向キーの慣性）', () => {
  it('LLM-TC-0001-01 押し続けるとだんだん速くなり、最高速で止まる', () => {
    const trace = run(INITIAL_CURSOR, RIGHT, 30);
    const speeds = trace.map((c) => c.vx);
    // 最初はゆっくり（最高速の 1/4 未満）
    expect(speeds[0]).toBeGreaterThan(0);
    expect(speeds[0]).toBeLessThan(CURSOR_MAX_SPEED / 4);
    // 速さは減らない
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThanOrEqual(speeds[i - 1] ?? 0);
    // 0.25 秒（30 ステップ）で最高速。それより速くならない
    expect(speeds.at(-1)).toBeCloseTo(CURSOR_MAX_SPEED);
    const more = run(trace.at(-1) ?? INITIAL_CURSOR, RIGHT, 10);
    for (const c of more) expect(c.vx).toBeLessThanOrEqual(CURSOR_MAX_SPEED + 1e-9);
  });

  it('LLM-TC-0001-01 離すとすぐには止まらず、なめらかに遅くなって止まる', () => {
    const atMax = run(INITIAL_CURSOR, RIGHT, 30).at(-1) ?? INITIAL_CURSOR;
    const trace = run(atMax, NONE, Math.round(0.3 * STEPS_PER_SECOND));
    // 離した次のステップでは、まだ動いている
    expect(trace[0]?.vx).toBeGreaterThan(CURSOR_MAX_SPEED / 2);
    expect((trace[0]?.x ?? 0) - atMax.x).toBeGreaterThan(0);
    // 速さは減り続け、0.2 秒あまりで 0 になって、そこで止まる
    for (let i = 1; i < trace.length; i++) expect(trace[i]?.vx).toBeLessThanOrEqual(trace[i - 1]?.vx ?? 0);
    expect(trace.at(-1)?.vx).toBe(0);
    const stopped = trace.at(-1) ?? atMax;
    expect(run(stopped, NONE, 10).every((c) => c.x === stopped.x && c.y === stopped.y)).toBe(true);
  });

  it('LLM-TC-0001-01 逆向きに押すと、止まってから逆へ動く', () => {
    const atMax = run(INITIAL_CURSOR, RIGHT, 30).at(-1) ?? INITIAL_CURSOR;
    const trace = run(atMax, { x: -1, y: 0 }, 60);
    expect(trace.at(-1)?.vx).toBeLessThan(0);
    expect(trace.findIndex((c) => c.vx < 0)).toBeGreaterThan(0);
  });

  it('LLM-TC-0001-01 縦も同じに動き、ななめは両方の向きに動く', () => {
    const c = run(INITIAL_CURSOR, { x: 1, y: -1 }, 20).at(-1) ?? INITIAL_CURSOR;
    expect(c.x).toBeGreaterThan(INITIAL_CURSOR.x);
    expect(c.y).toBeLessThan(INITIAL_CURSOR.y);
    expect(c.vx).toBeCloseTo(-c.vy);
  });

  it('LLM-TC-0001-01 ゲーム画面の外（動ける範囲の外）に出ない。端では速さが 0 になる', () => {
    const corners: [MoveDir, number, number][] = [
      [{ x: 1, y: 1 }, CURSOR_MAX_X, CURSOR_MAX_Y],
      [{ x: -1, y: -1 }, CURSOR_MIN_X, CURSOR_MIN_Y],
    ];
    for (const [dir, ex, ey] of corners) {
      const trace = run(INITIAL_CURSOR, dir, 5 * STEPS_PER_SECOND);
      for (const c of trace) {
        expect(c.x).toBeGreaterThanOrEqual(CURSOR_MIN_X);
        expect(c.x).toBeLessThanOrEqual(CURSOR_MAX_X);
        expect(c.y).toBeGreaterThanOrEqual(CURSOR_MIN_Y);
        expect(c.y).toBeLessThanOrEqual(CURSOR_MAX_Y);
      }
      const last = trace.at(-1);
      expect(last).toEqual({ x: ex, y: ey, vx: 0, vy: 0 });
    }
  });
});

describe('照準（マウス）', () => {
  it('LLM-TC-0001-02 マウスの位置へ 1 ステップで動き、速さは 0 になる', () => {
    const moving = run(INITIAL_CURSOR, RIGHT, 10).at(-1) ?? INITIAL_CURSOR;
    expect(stepCursor(moving, NONE, { x: 100, y: 200 })).toEqual({ x: 100, y: 200, vx: 0, vy: 0 });
  });

  it('LLM-TC-0001-02 マウスがゲーム画面の外でも、照準は動ける範囲の端で止まる', () => {
    expect(stepCursor(INITIAL_CURSOR, NONE, { x: -50, y: 900 })).toEqual({ x: CURSOR_MIN_X, y: CURSOR_MAX_Y, vx: 0, vy: 0 });
  });

  it('LLM-TC-0001-02 ゲームの 1 ステップで、マウスの位置が照準に入る', () => {
    const s = step(createGame(1), { move: NONE, pointer: { x: 300, y: 150 }, fire: NO_FIRE });
    expect(s.cursor).toMatchObject({ x: 300, y: 150 });
  });
});
