import { describe, expect, it } from 'vitest';
import type { WaveProgress } from '../../src/core/wave';
import { bonusLine, canRestart, overlayTexts, RESTART_DELAY_STEPS, showCursor } from '../../src/render/overlay';

const w = (status: WaveProgress['status'], phaseStep = 0, number = 1): WaveProgress => ({ number, status, phaseStep, spawned: 0 });
const texts = (x: WaveProgress) => overlayTexts(x).map((o) => o.text);

describe('ウェーブと終わりの表示（LLM-GUI-0001 §5）', () => {
  it('LLM-TC-0004-01 ウェーブのあいだは「WAVE n」（白・4 倍）、遊んでいるあいだは何も出さない', () => {
    expect(overlayTexts(w('break', 0, 2))).toEqual([{ text: 'WAVE 2', y: 280, scale: 4, color: '#e0e0e0' }]);
    expect(texts(w('playing', 500, 3))).toEqual([]);
  });

  it('LLM-TC-0004-03 CLEAR のときは「DEFENSE COMPLETE」（緑・3 倍）', () => {
    expect(overlayTexts(w('clear'))[0]).toEqual({ text: 'DEFENSE COMPLETE', y: 280, scale: 3, color: '#6cff8a' });
  });

  it('LLM-TC-0004-04 GAME OVER のときは「THE END」（赤橙・4 倍）', () => {
    expect(overlayTexts(w('gameover'))[0]).toEqual({ text: 'THE END', y: 280, scale: 4, color: '#ff5a3c' });
  });

  it('LLM-TC-0004-06 終わって約 1 秒たつまでは、やり直しを受け付けず「TAP OR PRESS ANY KEY」も出さない', () => {
    for (const s of ['clear', 'gameover'] as const) {
      expect(canRestart(w(s, RESTART_DELAY_STEPS - 1))).toBe(false);
      expect(texts(w(s, RESTART_DELAY_STEPS - 1))).not.toContain('TAP OR PRESS ANY KEY');
      expect(canRestart(w(s, RESTART_DELAY_STEPS))).toBe(true);
      expect(texts(w(s, RESTART_DELAY_STEPS))).toContain('TAP OR PRESS ANY KEY');
    }
    // 遊んでいるあいだ・ウェーブのあいだは、やり直さない
    expect(canRestart(w('playing', 9999))).toBe(false);
    expect(canRestart(w('break', 9999))).toBe(false);
  });

  it('LLM-TC-0004-06 「TAP OR PRESS ANY KEY」は 0.5 秒ごとに点滅する', () => {
    const shown = (step: number) => texts(w('gameover', RESTART_DELAY_STEPS + step)).includes('TAP OR PRESS ANY KEY');
    expect(shown(0)).toBe(true);
    expect(shown(59)).toBe(true);
    expect(shown(60)).toBe(false);
    expect(shown(119)).toBe(false);
    expect(shown(120)).toBe(true);
  });

  it('LLM-TC-0005-03 終わりの画面に、ボーナスの内訳が 2 行（MISSILES・CITIES）で出る（白・2 倍、y 330・354）', () => {
    const bonus = { missiles: 12, cities: 4 };
    for (const s of ['clear', 'gameover'] as const) {
      const out = overlayTexts(w(s, 0), bonus);
      expect(out[1]).toEqual({ text: 'MISSILES 12 X 5     60', y: 330, scale: 2, color: '#e0e0e0' });
      expect(out[2]).toEqual({ text: 'CITIES    4 X 100  400', y: 354, scale: 2, color: '#e0e0e0' });
    }
    // GAME OVER で都市 0 のとき
    expect(overlayTexts(w('gameover', 0), { missiles: 30, cities: 0 }).map((o) => o.text)).toEqual(['THE END', 'MISSILES 30 X 5    150', 'CITIES    0 X 100    0']);
    // 終わる前は出さない（内訳があっても）
    expect(texts(w('playing', 500))).toEqual([]);
    expect(overlayTexts(w('playing', 500), bonus)).toEqual([]);
  });

  it('LLM-TC-0005-03 内訳の 2 行は同じ長さで、いちばん大きい数でも画面の幅に収まる', () => {
    expect(bonusLine('MISSILES', 30, 5)).toHaveLength(22);
    expect(bonusLine('CITIES', 6, 100)).toHaveLength(22);
    expect(bonusLine('MISSILES', 0, 5)).toHaveLength(22);
    // 5 × 7 ドットの文字は 1 文字 6 ドット（すき間 1）。2 倍で 22 文字 = 264 ドット < 480
    expect(22 * 6 * 2).toBeLessThan(480);
  });

  it('LLM-TC-0005-03 「TAP OR PRESS ANY KEY」は内訳の下（y 400）。内訳の 2 行目（y 354〜368）と重ならない', () => {
    const out = overlayTexts(w('clear', RESTART_DELAY_STEPS), { missiles: 0, cities: 6 });
    const tap = out.find((o) => o.text === 'TAP OR PRESS ANY KEY');
    expect(tap?.y).toBe(400);
    expect(354 + 7 * 2).toBeLessThan(400);
  });

  it('LLM-TC-0004-08 CLEAR・GAME OVER のあいだは照準を描かない。WAVE 1 からやり直すと描く', () => {
    for (const s of ['clear', 'gameover'] as const) {
      expect(showCursor(w(s, 0))).toBe(false);
      expect(showCursor(w(s, RESTART_DELAY_STEPS))).toBe(false);
    }
    // やり直したあと（WAVE 1 のあいだ）と、遊んでいるあいだは描く
    expect(showCursor(w('break', 0, 1))).toBe(true);
    expect(showCursor(w('playing', 500, 3))).toBe(true);
  });
});
