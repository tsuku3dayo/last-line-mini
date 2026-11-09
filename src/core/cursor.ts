import { LOGICAL_WIDTH } from './config';

/**
 * 照準の位置と速さ（論理座標）。速さは、方向キーの慣性（LLM-PBI-0001）の名残で、
 * キーボードの操作をなくした（LLM-PBI-0019）ので今はいつも 0
 */
export interface Cursor {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

/** 照準が動ける範囲：HUD の下から、基地の丘の少し上まで */
export const CURSOR_MIN_X = 4;
export const CURSOR_MAX_X = LOGICAL_WIDTH - 4;
export const CURSOR_MIN_Y = 32;
export const CURSOR_MAX_Y = 556;

/** 始めの位置（LLM-GUI-0001 v1.5 §5）：「WAVE 1」の文字（y 280〜308）と重ならないよう、y 420 */
export const INITIAL_CURSOR: Cursor = { x: LOGICAL_WIDTH / 2, y: 420, vx: 0, vy: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 照準を 1 ステップ進める。pointer（マウスの位置）があれば、その位置へすぐ動く（動ける範囲の外には出ない）。
 * なければ、そのまま。方向キーの慣性は、キーボードの操作をなくしたのでない（LLM-PBI-0019）
 */
export function stepCursor(c: Cursor, pointer: { x: number; y: number } | null): Cursor {
  if (!pointer) return c;
  return { x: clamp(pointer.x, CURSOR_MIN_X, CURSOR_MAX_X), y: clamp(pointer.y, CURSOR_MIN_Y, CURSOR_MAX_Y), vx: 0, vy: 0 };
}
