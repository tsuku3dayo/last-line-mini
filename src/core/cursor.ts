import { LOGICAL_WIDTH, STEPS_PER_SECOND } from './config';

/** 照準の位置と速さ（論理座標、速さは 1 ステップあたり） */
export interface Cursor {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

/** 方向キーの向き（-1・0・1） */
export interface MoveDir {
  readonly x: -1 | 0 | 1;
  readonly y: -1 | 0 | 1;
}

// 慣性の値（LLM-PBI-0001 TC-0001-01）。秒で考えてステップに直す
/** いちばん速いとき：1 秒に 360 ドット（画面の幅を約 1.3 秒） */
export const CURSOR_MAX_SPEED = 360 / STEPS_PER_SECOND;
/** 止まった状態から最高速まで 0.25 秒 */
export const CURSOR_ACCEL = CURSOR_MAX_SPEED / (0.25 * STEPS_PER_SECOND);
/** 最高速から止まるまで 0.2 秒 */
export const CURSOR_DECEL = CURSOR_MAX_SPEED / (0.2 * STEPS_PER_SECOND);

/** 照準が動ける範囲：HUD の下から、基地の丘の少し上まで */
export const CURSOR_MIN_X = 4;
export const CURSOR_MAX_X = LOGICAL_WIDTH - 4;
export const CURSOR_MIN_Y = 32;
export const CURSOR_MAX_Y = 556;

export const INITIAL_CURSOR: Cursor = { x: LOGICAL_WIDTH / 2, y: 300, vx: 0, vy: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 1 つの軸の速さを、押している向きに合わせて変える */
function nextVelocity(v: number, dir: -1 | 0 | 1): number {
  if (dir === 0) {
    // 離したら、なめらかに遅くなって止まる
    return Math.abs(v) <= CURSOR_DECEL ? 0 : v - Math.sign(v) * CURSOR_DECEL;
  }
  // 逆向きに動いているときは、止める力も足して早く向きを変える
  const extra = Math.sign(v) === -dir ? CURSOR_DECEL : 0;
  return clamp(v + dir * (CURSOR_ACCEL + extra), -CURSOR_MAX_SPEED, CURSOR_MAX_SPEED);
}

/**
 * 照準を 1 ステップ進める。
 * - pointer（マウス・トラックボールの代わり）があれば、その位置へすぐ動き、速さは 0 にする
 * - なければ、方向キーの向きで加速・減速する
 * どちらも動ける範囲の外には出ない。端に当たった向きの速さは 0 にする
 */
export function stepCursor(c: Cursor, move: MoveDir, pointer: { x: number; y: number } | null): Cursor {
  if (pointer) {
    return { x: clamp(pointer.x, CURSOR_MIN_X, CURSOR_MAX_X), y: clamp(pointer.y, CURSOR_MIN_Y, CURSOR_MAX_Y), vx: 0, vy: 0 };
  }
  const vx = nextVelocity(c.vx, move.x);
  const vy = nextVelocity(c.vy, move.y);
  const x = clamp(c.x + vx, CURSOR_MIN_X, CURSOR_MAX_X);
  const y = clamp(c.y + vy, CURSOR_MIN_Y, CURSOR_MAX_Y);
  return {
    x,
    y,
    vx: x === CURSOR_MIN_X || x === CURSOR_MAX_X ? 0 : vx,
    vy: y === CURSOR_MIN_Y || y === CURSOR_MAX_Y ? 0 : vy,
  };
}
