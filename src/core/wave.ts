import { AMMO_PER_BASE, GROUND_Y, STEPS_PER_SECOND, WAVE_BREAK_STEPS, WAVE_ENEMY_COUNTS, WAVE_MIRV_COUNTS } from './config';
import { ENEMY_FIRST_SPAWN_STEP, enemySpeedRange, spawnIntervalSteps } from './enemy';
import { nextRandom } from './random';

/**
 * ゲームの場面（LLM-PBI-0004）。
 * - break：ウェーブのあいだ（「WAVE n」を出す約 3 秒。敵は出ない。迎撃は撃てる）。始めの WAVE 1 の前にもある
 * - playing：ウェーブの敵が落ちてくる
 * - clear：最後のウェーブの敵がすべて消え、都市が残っている
 * - gameover：6 都市がすべて壊れた、または弾が尽きて止められなくなった（その場で止まる）
 */
export type GameStatus = 'break' | 'playing' | 'clear' | 'gameover';

/** 終わったか（CLEAR か GAME OVER） */
export const isOver = (s: GameStatus): boolean => s === 'clear' || s === 'gameover';

export interface WaveProgress {
  /** 今の（break のときは次の）ウェーブの番号。1 から */
  readonly number: number;
  readonly status: GameStatus;
  /** 今の場面になってからのステップ数 */
  readonly phaseStep: number;
  /** このウェーブで出した敵の数 */
  readonly spawned: number;
  /** このウェーブで多弾頭になる番号（0 から）。ウェーブの始めに決める（LLM-TC-0011-04）。ないときは多弾頭なし */
  readonly mirvAt?: readonly number[];
}

export const WAVE_COUNT = WAVE_ENEMY_COUNTS.length;

export const INITIAL_WAVE: WaveProgress = { number: 1, status: 'break', phaseStep: 0, spawned: 0 };

/** そのウェーブの敵の数 */
export const enemiesInWave = (n: number): number => WAVE_ENEMY_COUNTS[n - 1] ?? 0;

/**
 * ステップの始め：ウェーブのあいだが終わったら、ウェーブを始める。
 * 始めるとき、壊れていない基地の弾を 10 発に戻す（壊れた基地は 0 のまま。PO の決定）。
 * 多弾頭の並びは、そのときの乱数の状態 rng から決める（LLM-TC-0011-04）
 */
export function beginStep<B extends { readonly alive: boolean; readonly ammo: number }>(
  w: WaveProgress,
  bases: readonly B[],
  rng = 0,
): { wave: WaveProgress; bases: readonly B[] } {
  if (w.status !== 'break' || w.phaseStep < WAVE_BREAK_STEPS) return { wave: w, bases };
  return {
    wave: { number: w.number, status: 'playing', phaseStep: 0, spawned: 0, mirvAt: mirvPlan(w.number, rng) },
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

/** そのウェーブの多弾頭の数（LLM-PBI-0008） */
export const mirvsInWave = (n: number): number => WAVE_MIRV_COUNTS[n - 1] ?? 0;

/**
 * ウェーブ n で何発目（0 から）が多弾頭かを、乱数の状態 rng から決める（LLM-TC-0011-04）。
 * 数はウェーブごとに決まった数、同じ rng なら同じ並び、2 発続けては出ない。
 * 敵の乱数の並びは進めない（rng から別の並びを作る）ので、出る位置・狙い・速さは変わらない
 */
export function mirvPlan(n: number, rng: number): readonly number[] {
  const total = enemiesInWave(n);
  const k = Math.min(mirvsInWave(n), Math.ceil(total / 2));
  if (total <= 0 || k <= 0) return [];
  // 続かない k 個の並び ＝ (total - k + 1) 個の枠から k 個を選び、i 番目に i を足したもの
  const slots = Array.from({ length: total - k + 1 }, (_, i) => i);
  let state = (rng ^ 0x5bd1e995 ^ Math.imul(n, 0x9e3779b1)) >>> 0;
  const picked: number[] = [];
  for (let i = 0; i < k; i++) {
    const r = nextRandom(state);
    state = r.state;
    const [s] = slots.splice(Math.floor(r.value * slots.length), 1);
    if (s !== undefined) picked.push(s);
  }
  return picked.sort((a, b) => a - b).map((s, i) => s + i);
}

/** そのウェーブで index 番目（0 から）に出る敵が多弾頭か（ウェーブの始めに決めた並びで。LLM-TC-0011-04） */
export const isMirvSpawn = (w: WaveProgress, index: number): boolean => w.mirvAt?.includes(index) ?? false;

/**
 * 守り切ったときの 1 プレイの長さの目安（秒。LLM-TC-0011-03）。
 * ウェーブごとに「あいだ ＋ 最初の敵まで ＋ 最後の敵が出るまで ＋ 最後の敵が画面の半ばまで落ちる（平均の速さで）」を足す
 */
export function estimatedClearSeconds(): number {
  let total = 0;
  for (let n = 1; n <= WAVE_COUNT; n++) {
    const speed = enemySpeedRange(n);
    const avgPerSecond = ((speed.min + speed.max) / 2) * STEPS_PER_SECOND;
    const steps = WAVE_BREAK_STEPS + ENEMY_FIRST_SPAWN_STEP + (enemiesInWave(n) - 1) * spawnIntervalSteps(n);
    total += steps / STEPS_PER_SECOND + GROUND_Y / 2 / avgPerSecond;
  }
  return total;
}
