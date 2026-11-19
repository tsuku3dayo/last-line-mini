// 効果音（LLM-PBI-0014・LLM-GUI-0003 §8）。Web Audio の合成で作り、音のファイルは使わない（LLM-TC-0014-03）。
// 鳴らす音を決める部分（soundsForStep）は DOM・時刻に触れない純粋な関数にして単体テストする。
// iPhone は触るまで音を出せないので、最初の操作（触る・クリック・キー）で AudioContext を作る（LLM-TC-0014-05）
import { aircraftPath, aircraftSpeed, type Aircraft } from '../core/aircraft';
import type { GameState } from '../core/game';
import { isOver } from '../core/wave';

/** 効果音の 8 種（LLM-TC-0014-01） */
export type SoundName = 'shot' | 'blast' | 'hit' | 'aircraftIn' | 'aircraftDown' | 'wave' | 'end' | 'rankIn';
export const SOUND_NAMES: readonly SoundName[] = ['shot', 'blast', 'hit', 'aircraftIn', 'aircraftDown', 'wave', 'end', 'rankIn'];

const alive = (list: readonly { readonly alive: boolean }[]): number => list.filter((p) => p.alive).length;

/** 前のステップの空の敵が、出ていったのではなく消えた（＝壊れた）か */
function destroyedAircraft(prev: readonly Aircraft[], next: readonly Aircraft[]): number {
  let n = 0;
  for (const a of prev) {
    const stillThere = next.some((b) => b.kind === a.kind && b.dir === a.dir && b.y === a.y);
    const leaving = (a.age + 1) * aircraftSpeed(a.kind) >= aircraftPath(a.kind);
    if (!stillThere && !leaving) n += 1;
  }
  return n;
}

/**
 * 1 ステップ前と後の状態から、鳴らす効果音を決める（ランクインは画面の流れで決まるので、ここでは決めない）。
 * 同じ音は 1 つだけ返す（同じステップに何発撃っても「撃つ」は 1 回）
 */
export function soundsForStep(prev: GameState, next: GameState): SoundName[] {
  const out = new Set<SoundName>();
  // 撃つ：壊れていない基地の残弾が減った（壊れて 0 になったのは「やられる」）
  if (next.bases.some((b, i) => { const p = prev.bases[i]; return p !== undefined && p.alive && b.alive && b.ammo < p.ammo; })) out.add('shot');
  // 爆発：新しい爆風（迎撃が着いた・誘爆）
  if (next.blasts.some((b) => b.age === 0)) out.add('blast');
  // やられる：都市か基地が壊れた
  if (alive(next.cities) < alive(prev.cities) || alive(next.bases) < alive(prev.bases)) out.add('hit');
  // 空の敵が出た・壊れた（LLM-PBI-0009）
  if (next.wave.number === prev.wave.number && (next.wave.airLaunched ?? 0) > (prev.wave.airLaunched ?? 0)) out.add('aircraftIn');
  if (destroyedAircraft(prev.aircraft ?? [], next.aircraft ?? []) > 0) out.add('aircraftDown');
  // ウェーブの始め
  if (prev.wave.status === 'break' && next.wave.status === 'playing') out.add('wave');
  // 終わり（CLEAR・GAME OVER）
  if (!isOver(prev.wave.status) && isOver(next.wave.status)) out.add('end');
  return SOUND_NAMES.filter((s) => out.has(s));
}

/** 1 つの音の作り方：周波数の移り（始め→終わり）・長さ（秒）・波の形・大きさ */
interface Tone {
  readonly from: number;
  readonly to: number;
  readonly seconds: number;
  readonly type: OscillatorType;
  readonly volume: number;
  /** 少し遅らせて重ねる音（ファンファーレなど） */
  readonly delay?: number;
}

/** 効果音の中身（大きさは控えめ。うるさすぎないこと：LLM-TC-0014-06） */
export const SOUND_TONES: Readonly<Record<SoundName, readonly Tone[]>> = {
  shot: [{ from: 880, to: 440, seconds: 0.08, type: 'square', volume: 0.05 }],
  blast: [{ from: 160, to: 40, seconds: 0.35, type: 'sawtooth', volume: 0.08 }],
  hit: [{ from: 120, to: 30, seconds: 0.6, type: 'sawtooth', volume: 0.12 }],
  aircraftIn: [{ from: 300, to: 600, seconds: 0.4, type: 'triangle', volume: 0.06 }],
  aircraftDown: [
    { from: 600, to: 200, seconds: 0.3, type: 'square', volume: 0.07 },
    { from: 900, to: 300, seconds: 0.3, type: 'triangle', volume: 0.05, delay: 0.08 },
  ],
  wave: [
    { from: 440, to: 440, seconds: 0.12, type: 'square', volume: 0.05 },
    { from: 660, to: 660, seconds: 0.18, type: 'square', volume: 0.05, delay: 0.14 },
  ],
  end: [
    { from: 523, to: 523, seconds: 0.2, type: 'triangle', volume: 0.08 },
    { from: 392, to: 392, seconds: 0.2, type: 'triangle', volume: 0.08, delay: 0.22 },
    { from: 262, to: 262, seconds: 0.5, type: 'triangle', volume: 0.08, delay: 0.44 },
  ],
  rankIn: [
    { from: 523, to: 523, seconds: 0.12, type: 'square', volume: 0.05 },
    { from: 659, to: 659, seconds: 0.12, type: 'square', volume: 0.05, delay: 0.13 },
    { from: 784, to: 784, seconds: 0.3, type: 'square', volume: 0.05, delay: 0.26 },
  ],
};

export interface SoundPlayer {
  /** 最初の操作の中で呼ぶ。AudioContext を作って始める（2 回目からは何もしない） */
  unlock(): void;
  /** 音を鳴らす。始める前・OFF のときは鳴らさない（数えもしない）。Web Audio のないブラウザでは音は出さず、数えるだけ */
  play(names: readonly SoundName[]): void;
  setEnabled(enabled: boolean): void;
  readonly enabled: boolean;
  /** 始めたか */
  readonly unlocked: boolean;
  /** 鳴らした回数（`?debug=1` の E2E が読む） */
  readonly counts: Readonly<Record<string, number>>;
  /** AudioContext（BGM が使う。始める前は null） */
  readonly context: AudioContext | null;
}

/** 音を作る。Web Audio が使えないブラウザでも止まらない（鳴らないだけ） */
export function createAudio(onPlayed: (counts: Readonly<Record<string, number>>) => void = () => {}): SoundPlayer {
  let ctx: AudioContext | null = null;
  /** 最初の操作があったか。Web Audio のないブラウザ（E2E の WebKit など）でも、鳴らす判断と回数は同じにする */
  let unlocked = false;
  let enabled = true;
  const counts: Record<string, number> = {};

  const tone = (c: AudioContext, t: Tone) => {
    const start = c.currentTime + (t.delay ?? 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), start + t.seconds);
    gain.gain.setValueAtTime(t.volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.seconds);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + t.seconds + 0.02);
  };

  return {
    unlock() {
      if (unlocked) return;
      unlocked = true;
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        void ctx.resume().catch(() => undefined);
      } catch {
        ctx = null;
      }
    },
    play(names) {
      if (!unlocked || !enabled || names.length === 0) return;
      for (const n of names) {
        try {
          if (ctx) for (const t of SOUND_TONES[n]) tone(ctx, t);
        } catch {
          // 鳴らせなくても遊ぶのは止めない
        }
        counts[n] = (counts[n] ?? 0) + 1;
      }
      onPlayed(counts);
    },
    setEnabled(v) {
      enabled = v;
    },
    get enabled() {
      return enabled;
    },
    get unlocked() {
      return unlocked;
    },
    get counts() {
      return counts;
    },
    get context() {
      return ctx;
    },
  };
}

/** E2E が読む形（例：`shot:3,blast:2`）。名前の順は SOUND_NAMES の順 */
export const formatCounts = (counts: Readonly<Record<string, number>>): string =>
  SOUND_NAMES.filter((n) => (counts[n] ?? 0) > 0)
    .map((n) => `${n}:${counts[n] ?? 0}`)
    .join(',');
