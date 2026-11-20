import { describe, expect, it } from 'vitest';
import { bgmShouldPlay } from '../../src/app/bgm';
import { canPause, isPauseKey, PAUSE_BUTTON, QUIT_BUTTON, RESUME_BUTTON } from '../../src/app/pause';

describe('一時停止（LLM-PBI-0016）', () => {
  it('LLM-TC-0016-01 止められるのはプレイ中（ウェーブのあいだを含む）だけ。終わりの表示・ほかの画面では止められない', () => {
    expect(canPause('play', 'playing')).toBe(true);
    expect(canPause('play', 'break')).toBe(true);
    expect(canPause('play', 'clear')).toBe(false);
    expect(canPause('play', 'gameover')).toBe(false);
    for (const s of ['title', 'top10', 'name', 'credits']) expect(canPause(s, 'playing')).toBe(false);
  });

  it('LLM-TC-0016-01 ボタンの位置（GUI-0003 §9）：「II」は HUD のあいだ、止めた画面の 2 つは中央。どれも高さ 60（iPhone SE で約 45 ポイント）', () => {
    expect(PAUSE_BUTTON).toEqual({ x: 210, y: 0, width: 60, height: 60 });
    expect(RESUME_BUTTON).toEqual({ x: 120, y: 300, width: 240, height: 60 });
    expect(QUIT_BUTTON).toEqual({ x: 120, y: 390, width: 240, height: 60 });
    // 「II」は 1P（左）と TOP（右）の文字に重ならない（HUD は x 8 から 9 文字・右端 472 まで 10 文字、1 文字 12）
    expect(PAUSE_BUTTON.x).toBeGreaterThan(8 + 9 * 12);
    expect(PAUSE_BUTTON.x + PAUSE_BUTTON.width).toBeLessThan(472 - 10 * 12);
  });

  it('LLM-TC-0016-03・04 止める・続けるキーは Esc と P（キーの位置で見る）。ほかのキーではない', () => {
    expect(isPauseKey({ key: 'Escape', code: 'Escape' })).toBe(true);
    expect(isPauseKey({ key: 'p', code: 'KeyP' })).toBe(true);
    expect(isPauseKey({ key: 'P', code: 'KeyP' })).toBe(true);
    expect(isPauseKey({ key: 'Process', code: 'KeyP' })).toBe(true); // 日本語入力が入っていても
    const others: readonly { key: string; code: string }[] = [
      { key: ' ', code: 'Space' },
      { key: 'Enter', code: 'Enter' },
      { key: 'g', code: 'KeyG' },
      { key: 'o', code: 'KeyO' },
    ];
    for (const k of others) expect(isPauseKey(k)).toBe(false);
  });

  it('LLM-TC-0016-02 止めているあいだは BGM を鳴らさない（続けると鳴る）', () => {
    expect(bgmShouldPlay('play', 'playing', true)).toBe(false);
    expect(bgmShouldPlay('play', 'break', true)).toBe(false);
    expect(bgmShouldPlay('play', 'playing', false)).toBe(true);
  });
});
