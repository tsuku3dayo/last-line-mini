import { MAX_STEPS_PER_FRAME, STEP_MS } from './config';

// 60 Hz・120 Hz の足し算の誤差で 1 ステップ足りなくならないように
const EPSILON_MS = 1e-6;

/**
 * たった時間から、今回進めるステップ数と次に持ち越す時間を決める（テンプレート §5.1）。
 * 最大ステップ数を超えた遅れは捨てる（取り戻そうとしない）。
 */
export function planSteps(acc: number, elapsedMs: number): { steps: number; acc: number } {
  let total = acc + Math.max(0, elapsedMs);
  let steps = 0;
  while (total + EPSILON_MS >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
    total -= STEP_MS;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_FRAME && total + EPSILON_MS >= STEP_MS) total = 0;
  return { steps, acc: Math.max(0, total) };
}
