import { describe, expect, it } from 'vitest';
import { CURSOR_MAX_X, CURSOR_MAX_Y, CURSOR_MIN_X, CURSOR_MIN_Y, INITIAL_CURSOR, stepCursor } from '../../src/core/cursor';
import { createGame, NO_FIRE, NO_INPUT, step } from '../../src/core/game';

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

// 方向キーの慣性（LLM-TC-0001-01）は、キーボードの操作をなくしたので確かめない（LLM-PBI-0019。TC-0001 v1.2）

describe('照準（マウス）', () => {
  it('LLM-TC-0001-02 マウスの位置へ 1 ステップで動き、速さは 0 のまま', () => {
    expect(stepCursor(INITIAL_CURSOR, { x: 100, y: 200 })).toEqual({ x: 100, y: 200, vx: 0, vy: 0 });
  });

  it('LLM-TC-0001-02 マウスがゲーム画面の外でも、照準は動ける範囲の端で止まる', () => {
    expect(stepCursor(INITIAL_CURSOR, { x: -50, y: 900 })).toEqual({ x: CURSOR_MIN_X, y: CURSOR_MAX_Y, vx: 0, vy: 0 });
    expect(stepCursor(INITIAL_CURSOR, { x: 9999, y: -10 })).toEqual({ x: CURSOR_MAX_X, y: CURSOR_MIN_Y, vx: 0, vy: 0 });
  });

  it('LLM-TC-0001-02 ゲームの 1 ステップで、マウスの位置が照準に入る', () => {
    const s = step(createGame(1), { pointer: { x: 300, y: 150 }, fire: NO_FIRE });
    expect(s.cursor).toMatchObject({ x: 300, y: 150 });
  });

  it('LLM-TC-0019-03 マウスを動かさなければ、照準はそのまま（キーボードで動かす入力はない）', () => {
    const moved = stepCursor(INITIAL_CURSOR, { x: 123, y: 321 });
    expect(stepCursor(moved, null)).toBe(moved);
    let s = step(createGame(1), { pointer: { x: 123, y: 321 }, fire: NO_FIRE });
    for (let i = 0; i < 60; i++) s = step(s, NO_INPUT);
    expect(s.cursor).toEqual({ x: 123, y: 321, vx: 0, vy: 0 });
  });
});
