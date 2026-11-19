import { describe, expect, it } from 'vitest';
import { BGM_NOTES, bgmShouldPlay, bgmTempo } from '../../src/app/bgm';
import { loadSoundEnabled, saveSoundEnabled, SOUND_BUTTON, soundKey, soundLabel } from '../../src/app/sound-button';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('BGM と音の ON／OFF（LLM-PBI-0014）', () => {
  it('LLM-TC-0014-02 BGM はプレイ中だけ。終わり（CLEAR・GAME OVER）とほかの画面では鳴らさない', () => {
    expect(bgmShouldPlay('play', 'break')).toBe(true);
    expect(bgmShouldPlay('play', 'playing')).toBe(true);
    expect(bgmShouldPlay('play', 'clear')).toBe(false);
    expect(bgmShouldPlay('play', 'gameover')).toBe(false);
    for (const s of ['title', 'top10', 'name', 'credits']) expect(bgmShouldPlay(s, 'playing')).toBe(false);
  });

  it('LLM-TC-0014-02 後半のウェーブほど速い（WAVE 1 が 120、5 で 152）', () => {
    expect([1, 2, 3, 4, 5].map(bgmTempo)).toEqual([120, 128, 136, 144, 152]);
    expect(BGM_NOTES.length).toBeGreaterThan(0);
  });

  it('LLM-TC-0014-04 初めは ON。OFF を選ぶと覚え、読み直しても OFF。キーは本番とプレビューで別', () => {
    const s = memory();
    const key = soundKey('preview');
    expect(loadSoundEnabled(s, key)).toBe(true);
    saveSoundEnabled(s, key, false);
    expect(loadSoundEnabled(s, key)).toBe(false);
    saveSoundEnabled(s, key, true);
    expect(loadSoundEnabled(s, key)).toBe(true);
    expect(soundKey('production')).toBe('last-line-mini-sound');
    expect(key).toBe('last-line-mini-preview-sound');
    // 保存に触れないブラウザでも ON で止まらない
    expect(loadSoundEnabled({ getItem: () => { throw new Error('x'); }, setItem: () => undefined }, key)).toBe(true);
  });

  it('LLM-TC-0014-04 ボタンの文字と位置（GUI-0003 §8）', () => {
    expect(soundLabel(true)).toBe('♪ 音 ON');
    expect(soundLabel(false)).toBe('♪ 音 OFF');
    expect(SOUND_BUTTON).toEqual({ x: 24, y: 560, width: 120, height: 60 });
  });
});
