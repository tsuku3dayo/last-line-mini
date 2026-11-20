// BGM（LLM-PBI-0014・LLM-TC-0014-02、タイトルの曲は LLM-PBI-0023）。プレイ中は短いメロディをくり返し、後半のウェーブほど少し速くする。
// タイトルとクレジットでは、別のゆっくりした低めの曲を鳴らす。
// どの曲を鳴らすかと速さを決める部分は純粋な関数にして単体テストする。音は Web Audio の合成（音のファイルを使わない）
import { WAVE_COUNT, isOver, type GameStatus } from '../core/wave';
import type { SoundPlayer } from './audio';

/** 1 分あたりの拍。WAVE 1 が 120、ウェーブが進むごとに 8 ずつ速く（WAVE 5 で 152） */
export const BGM_BASE_BPM = 120;
export const BGM_BPM_STEP = 8;

/** 短いメロディ（8 分音符の周波数。0 は休み）。暗めの短調で、くり返して聞き疲れしにくい 16 音 */
export const BGM_NOTES: readonly number[] = [
  220, 0, 262, 220, 330, 0, 294, 262,
  220, 0, 262, 294, 247, 0, 196, 0,
];

/** タイトルの曲の速さ（拍／分。プレイ中の曲よりゆっくり。LLM-TC-0023-01） */
export const TITLE_BPM = 90;

/**
 * タイトルの曲（8 分音符の周波数。0 は休み）。同じ短調（ラ）で、プレイ中の曲より低い 32 音（いちばん高い音もプレイ中のいちばん低い音より下）。
 * 間をあけた「嵐の前」の感じで、都市を守る緊張感を残す（LLM-TC-0023-01）
 */
export const TITLE_NOTES: readonly number[] = [
  110, 0, 165, 0, 131, 0, 165, 0,
  110, 0, 175, 165, 147, 0, 131, 0,
  98, 0, 147, 0, 123, 0, 147, 0,
  110, 0, 131, 147, 165, 0, 0, 0,
];

/** どの曲を鳴らすか：鳴らさない・タイトルの曲・プレイの曲 */
export type BgmTrack = 'none' | 'title' | 'play';

/**
 * 画面と状態から曲を選ぶ。プレイ中で終わっていなければプレイの曲（止めているあいだは鳴らさない。LLM-TC-0016-02）、
 * タイトルとクレジットはタイトルの曲（LLM-TC-0023-01）、ほか（名前の入力・TOP10・プレイの終わり）は鳴らさない
 */
export const bgmTrack = (screen: string, status: GameStatus, paused = false): BgmTrack => {
  if (screen === 'play') return !isOver(status) && !paused ? 'play' : 'none';
  if (screen === 'title' || screen === 'credits') return 'title';
  return 'none';
};

/** プレイの曲を鳴らすか（LLM-TC-0014-02・LLM-TC-0016-02） */
export const bgmShouldPlay = (screen: string, status: GameStatus, paused = false): boolean => bgmTrack(screen, status, paused) === 'play';

/** ウェーブの番号から速さ（拍／分） */
export const bgmTempo = (wave: number): number => BGM_BASE_BPM + BGM_BPM_STEP * (Math.min(Math.max(wave, 1), WAVE_COUNT) - 1);

/** 曲の音の並びと速さ */
export const trackNotes = (track: BgmTrack): readonly number[] => (track === 'title' ? TITLE_NOTES : BGM_NOTES);
export const trackTempo = (track: BgmTrack, wave: number): number => (track === 'title' ? TITLE_BPM : bgmTempo(wave));

/** E2E が読む `data-bgm` の値：プレイは `on:<拍>`、タイトルは `title:<拍>`、鳴らさないときは `off` */
export const bgmLabel = (track: BgmTrack, playing: boolean, tempo: number): string =>
  !playing || track === 'none' ? 'off' : track === 'title' ? `title:${tempo}` : `on:${tempo}`;

export interface Bgm {
  /** 描画のたびに呼ぶ。曲・速さを合わせ、先の音を予約する。曲が変わったら、予約した音を止めて最初から */
  update(track: BgmTrack, wave: number): void;
  /** 今鳴らしているか（OFF・始める前・曲なしは false）。E2E が読む */
  readonly playing: boolean;
  readonly track: BgmTrack;
  readonly tempo: number;
}

/** 先に予約しておく長さ（秒） */
const LOOKAHEAD = 0.25;

export function createBgm(audio: SoundPlayer): Bgm {
  let playing = false;
  let current: BgmTrack = 'none';
  let tempo = BGM_BASE_BPM;
  let nextTime = 0;
  let index = 0;
  /** 予約した音（曲が変わったら止めて、2 つの曲が重ならないようにする。LLM-TC-0023-02） */
  let scheduled: { osc: OscillatorNode; end: number }[] = [];

  const note = (ctx: AudioContext, freq: number, at: number, seconds: number) => {
    if (freq <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.035, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
    scheduled.push({ osc, end: at + seconds + 0.02 });
  };

  const cancelScheduled = () => {
    const ctx = audio.context;
    if (ctx) {
      for (const s of scheduled) {
        if (s.end <= ctx.currentTime) continue;
        try {
          s.osc.stop(ctx.currentTime);
        } catch {
          // 始まる前の音は止められないことがある。鳴っても 0.25 秒まで
        }
      }
    }
    scheduled = [];
  };

  return {
    update(track, wave) {
      const on = track !== 'none' && audio.unlocked && audio.enabled;
      tempo = trackTempo(track, wave);
      if (!on) {
        if (playing) cancelScheduled();
        playing = false;
        current = 'none';
        return;
      }
      const ctx = audio.context;
      if (!playing || track !== current) {
        if (playing) cancelScheduled();
        playing = true;
        current = track;
        index = 0;
        nextTime = ctx ? ctx.currentTime + 0.05 : 0;
      }
      if (!ctx) return; // Web Audio のないブラウザ（E2E の WebKit）では、鳴らす判断だけ
      const notes = trackNotes(current);
      const step = 60 / tempo / 2; // 8 分音符
      try {
        scheduled = scheduled.filter((s) => s.end > ctx.currentTime);
        while (nextTime < ctx.currentTime + LOOKAHEAD) {
          note(ctx, notes[index % notes.length] ?? 0, nextTime, step * 0.9);
          nextTime += step;
          index += 1;
        }
      } catch {
        // 鳴らせなくても遊ぶのは止めない
      }
    },
    get playing() {
      return playing;
    },
    get track() {
      return current;
    },
    get tempo() {
      return tempo;
    },
  };
}
