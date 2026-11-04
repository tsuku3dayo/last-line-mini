import { AMMO_PER_BASE, WAVE_BREAK_STEPS, WAVE_ENEMY_COUNTS } from './config';

/**
 * ゲームの場面（LLM-PBI-0004）。
 * - break：ウェーブのあいだ（「WAVE n」を出す約 3 秒。敵は出ない。迎撃は撃てる）。始めの WAVE 1 の前にもある
 * - playing：ウェーブの敵が落ちてくる
 * - clear：最後のウェーブの敵がすべて消えた（GAME OVER は LLM-TASK-0018 で足す）
 */
export type GameStatus = 'break' | 'playing' | 'clear';

export interface WaveProgress {
  /** 今の（break のときは次の）ウェーブの番号。1 から */
  readonly number: number;
  readonly status: GameStatus;
  /** 今の場面になってからのステップ数 */
  readonly phaseStep: number;
  /** このウェーブで出した敵の数 */
  readonly spawned: number;
}

export const WAVE_COUNT = WAVE_ENEMY_COUNTS.length;

export const INITIAL_WAVE: WaveProgress = { number: 1, status: 'break', phaseStep: 0, spawned: 0 };

/** そのウェーブの敵の数 */
export const enemiesInWave = (n: number): number => WAVE_ENEMY_COUNTS[n - 1] ?? 0;

/**
 * ステップの始め：ウェーブのあいだが終わったら、ウェーブを始める。
 * 始めるとき、壊れていない基地の弾を 10 発に戻す（壊れた基地は 0 のまま。PO の決定）
 */
export function beginStep<B extends { readonly alive: boolean; readonly ammo: number }>(
  w: WaveProgress,
  bases: readonly B[],
): { wave: WaveProgress; bases: readonly B[] } {
  if (w.status !== 'break' || w.phaseStep < WAVE_BREAK_STEPS) return { wave: w, bases };
  return {
    wave: { number: w.number, status: 'playing', phaseStep: 0, spawned: 0 },
    bases: bases.map((b) => (b.alive ? { ...b, ammo: AMMO_PER_BASE } : b)),
  };
}

/** このステップで、まだ敵を出してよいか（そのウェーブの数に達していない） */
export const maySpawn = (w: WaveProgress): boolean => w.status === 'playing' && w.spawned < enemiesInWave(w.number);

/**
 * ステップの終わり：ウェーブの敵をすべて出し終え、画面の敵がいなくなったら、次のウェーブのあいだへ。
 * 最後のウェーブなら CLEAR。どの場面でも phaseStep を 1 進める
 */
export function endStep(w: WaveProgress, spawnedNow: boolean, enemiesLeft: number): WaveProgress {
  const spawned = w.spawned + (spawnedNow ? 1 : 0);
  if (w.status === 'playing' && spawned >= enemiesInWave(w.number) && enemiesLeft === 0) {
    if (w.number >= WAVE_COUNT) return { number: w.number, status: 'clear', phaseStep: 0, spawned };
    return { number: w.number + 1, status: 'break', phaseStep: 0, spawned: 0 };
  }
  return { ...w, spawned, phaseStep: w.phaseStep + 1 };
}
