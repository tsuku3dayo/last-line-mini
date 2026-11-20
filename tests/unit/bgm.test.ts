import { describe, expect, it } from 'vitest';
import { BGM_NOTES, TITLE_BPM, TITLE_NOTES, bgmLabel, bgmShouldPlay, bgmTempo, bgmTrack, createBgm, trackNotes, trackTempo } from '../../src/app/bgm';
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

describe('タイトルの曲（LLM-PBI-0023）', () => {
  it('LLM-TC-0023-01 タイトルとクレジットはタイトルの曲。名前の入力・TOP10 は鳴らさない', () => {
    expect(bgmTrack('title', 'playing')).toBe('title');
    expect(bgmTrack('credits', 'playing')).toBe('title');
    // 前のプレイが終わったままの状態でも、タイトルに戻ればタイトルの曲
    expect(bgmTrack('title', 'gameover')).toBe('title');
    expect(bgmTrack('name', 'gameover')).toBe('none');
    expect(bgmTrack('top10', 'clear')).toBe('none');
  });

  it('LLM-TC-0023-01 タイトルの曲は 90 拍・32 音で、プレイ中の曲より低い', () => {
    expect(TITLE_BPM).toBe(90);
    expect(trackTempo('title', 5)).toBe(90); // ウェーブで速くならない
    expect(TITLE_NOTES).toHaveLength(32);
    expect(trackNotes('title')).toBe(TITLE_NOTES);
    const titleHigh = Math.max(...TITLE_NOTES);
    const playLow = Math.min(...BGM_NOTES.filter((n) => n > 0));
    expect(titleHigh).toBeLessThan(playLow);
    expect(TITLE_NOTES.filter((n) => n > 0).length).toBeGreaterThan(0);
  });

  it('LLM-TC-0023-02 プレイ中はプレイの曲。終わり・止めた画面は鳴らさない（今までどおり）', () => {
    expect(bgmTrack('play', 'playing')).toBe('play');
    expect(bgmTrack('play', 'break')).toBe('play');
    expect(bgmTrack('play', 'clear')).toBe('none');
    expect(bgmTrack('play', 'gameover')).toBe('none');
    expect(bgmTrack('play', 'playing', true)).toBe('none');
    expect(trackNotes('play')).toBe(BGM_NOTES);
    expect(trackTempo('play', 3)).toBe(136);
  });

  it('LLM-TC-0023-02 曲が変わったら、予約したタイトルの音を止めてプレイの曲を最初から鳴らす（重ならない）', () => {
    // にせものの AudioContext：作った音の高さ・始まり・止めた時刻を覚える
    const oscs: { freq: number; start: number; stoppedAt: number[] }[] = [];
    const ctx = {
      currentTime: 0,
      destination: {},
      createOscillator() {
        const o = { freq: 0, start: 0, stoppedAt: [] as number[] };
        oscs.push(o);
        return {
          type: 'sine',
          frequency: { setValueAtTime: (f: number) => void (o.freq = f) },
          connect: (g: unknown) => g,
          start: (t: number) => void (o.start = t),
          stop: (t: number) => void o.stoppedAt.push(t),
        };
      },
      createGain() {
        return { gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: (d: unknown) => d };
      },
    };
    const audio = { unlocked: true, enabled: true, context: ctx as unknown as AudioContext, unlock: () => undefined, play: () => undefined, setEnabled: () => undefined, counts: {} };
    const bgm = createBgm(audio);
    bgm.update('title', 1);
    expect(bgm.track).toBe('title');
    expect(oscs.length).toBeGreaterThan(0);
    expect(oscs[0]?.freq).toBe(TITLE_NOTES[0]);
    const titleCount = oscs.length;
    ctx.currentTime = 0.06; // まだ鳴り終わっていない音がある
    bgm.update('play', 1);
    expect(bgm.track).toBe('play');
    // 予約したタイトルの音は、今の時刻で止めた（鳴り終わったもの以外）
    expect(oscs.slice(0, titleCount).some((o) => o.stoppedAt.includes(0.06))).toBe(true);
    // プレイの曲は最初の音から
    expect(oscs[titleCount]?.freq).toBe(BGM_NOTES[0]);
    // OFF にすると鳴らさない
    audio.enabled = false;
    bgm.update('play', 1);
    expect(bgm.playing).toBe(false);
    expect(bgmLabel(bgm.track, bgm.playing, bgm.tempo)).toBe('off');
  });

  it('LLM-TC-0023-02 LLM-TC-0023-03 E2E が読む data-bgm：プレイは on:拍、タイトルは title:拍、鳴らさないときは off', () => {
    expect(bgmLabel('play', true, 120)).toBe('on:120');
    expect(bgmLabel('title', true, 90)).toBe('title:90');
    expect(bgmLabel('title', false, 90)).toBe('off'); // OFF・最初に触る前
    expect(bgmLabel('none', false, 120)).toBe('off');
  });
});
