// BGM（LLM-PBI-0014・LLM-TC-0014-02）。プレイ中だけ短いメロディをくり返し、後半のウェーブほど少し速くする。
// 鳴らすかと速さを決める部分は純粋な関数にして単体テストする。音は Web Audio の合成（音のファイルを使わない）
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

/** BGM を鳴らすか：プレイ中で、終わっていない（CLEAR・GAME OVER で止まる。タイトルなどでは鳴らさない）。止めているあいだも鳴らさない（LLM-TC-0016-02） */
export const bgmShouldPlay = (screen: string, status: GameStatus, paused = false): boolean => screen === 'play' && !isOver(status) && !paused;

/** ウェーブの番号から速さ（拍／分） */
export const bgmTempo = (wave: number): number => BGM_BASE_BPM + BGM_BPM_STEP * (Math.min(Math.max(wave, 1), WAVE_COUNT) - 1);

export interface Bgm {
  /** 描画のたびに呼ぶ。鳴らすか・速さを合わせ、先の音を予約する */
  update(play: boolean, wave: number): void;
  /** 今鳴らしているか（OFF・始める前は false）。E2E が読む */
  readonly playing: boolean;
  readonly tempo: number;
}

/** 先に予約しておく長さ（秒） */
const LOOKAHEAD = 0.25;

export function createBgm(audio: SoundPlayer): Bgm {
  let playing = false;
  let tempo = BGM_BASE_BPM;
  let nextTime = 0;
  let index = 0;

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
  };

  return {
    update(play, wave) {
      const on = play && audio.unlocked && audio.enabled;
      tempo = bgmTempo(wave);
      if (!on) {
        playing = false;
        return;
      }
      const ctx = audio.context;
      if (!playing) {
        playing = true;
        index = 0;
        nextTime = ctx ? ctx.currentTime + 0.05 : 0;
      }
      if (!ctx) return; // Web Audio のないブラウザ（E2E の WebKit）では、鳴らす判断だけ
      const step = 60 / tempo / 2; // 8 分音符
      try {
        while (nextTime < ctx.currentTime + LOOKAHEAD) {
          note(ctx, BGM_NOTES[index % BGM_NOTES.length] ?? 0, nextTime, step * 0.9);
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
    get tempo() {
      return tempo;
    },
  };
}
