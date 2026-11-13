import { STEPS_PER_SECOND } from './config';

/** 爆風。age は出てからのステップ数 */
export interface Blast {
  readonly x: number;
  readonly y: number;
  readonly age: number;
}

/** いちばん大きいときの半径（論理ドット。LLM-PBI-0011：24 の 1.5 倍） */
export const BLAST_MAX_RADIUS = 36;
/** 広がる時間・いちばん大きいまま保つ時間（LLM-PBI-0011：1 秒）・縮む時間（ステップ） */
export const BLAST_GROW_STEPS = Math.round(0.4 * STEPS_PER_SECOND);
export const BLAST_HOLD_STEPS = Math.round(1.0 * STEPS_PER_SECOND);
export const BLAST_SHRINK_STEPS = Math.round(0.5 * STEPS_PER_SECOND);
export const BLAST_LIFE_STEPS = BLAST_GROW_STEPS + BLAST_HOLD_STEPS + BLAST_SHRINK_STEPS;

/** 出てから age ステップの半径。広がって、保って、縮んで、0 になる */
export function blastRadius(age: number): number {
  if (age < 0 || age >= BLAST_LIFE_STEPS) return 0;
  if (age < BLAST_GROW_STEPS) return (BLAST_MAX_RADIUS * (age + 1)) / BLAST_GROW_STEPS;
  if (age < BLAST_GROW_STEPS + BLAST_HOLD_STEPS) return BLAST_MAX_RADIUS;
  const t = (age - BLAST_GROW_STEPS - BLAST_HOLD_STEPS + 1) / BLAST_SHRINK_STEPS;
  return BLAST_MAX_RADIUS * (1 - t);
}

/** 爆風を 1 ステップ進め、消えたものを除く */
export function stepBlasts(blasts: readonly Blast[]): Blast[] {
  return blasts.map((b) => ({ ...b, age: b.age + 1 })).filter((b) => b.age < BLAST_LIFE_STEPS);
}

/** 点 (x, y) が、どれかの爆風の中にあるか */
export function isInsideBlast(blasts: readonly Blast[], x: number, y: number): boolean {
  return blasts.some((b) => {
    const r = blastRadius(b.age);
    return r > 0 && (x - b.x) ** 2 + (y - b.y) ** 2 <= r * r;
  });
}
