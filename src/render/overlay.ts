// ウェーブと終わりの表示を決める純粋な関数（LLM-GUI-0001 §5。単体テストする）
import { STEPS_PER_SECOND } from '../core/config';
import { isOver, type WaveProgress } from '../core/wave';

/** 終わってから「TAP OR PRESS ANY KEY」を出し、やり直しを受け付けるまで（約 1 秒） */
export const RESTART_DELAY_STEPS = 1 * STEPS_PER_SECOND;
/** 「TAP OR PRESS ANY KEY」の点滅の半周期（0.5 秒） */
const BLINK_STEPS = Math.round(0.5 * STEPS_PER_SECOND);

export interface OverlayText {
  readonly text: string;
  /** 文字の上端の y（論理座標）。x はゲーム画面の中央 */
  readonly y: number;
  /** 5 × 7 ドットの文字の倍率 */
  readonly scale: number;
  readonly color: string;
}

/** やり直してよいか：CLEAR か GAME OVER になってから約 1 秒たった（それより前の操作は受け付けない） */
export const canRestart = (w: WaveProgress): boolean => isOver(w.status) && w.phaseStep >= RESTART_DELAY_STEPS;

/** 今出す文字（上から順） */
export function overlayTexts(w: WaveProgress): OverlayText[] {
  const out: OverlayText[] = [];
  if (w.status === 'break') out.push({ text: `WAVE ${w.number}`, y: 280, scale: 4, color: '#e0e0e0' });
  if (w.status === 'clear') out.push({ text: 'DEFENSE COMPLETE', y: 280, scale: 3, color: '#6cff8a' });
  if (w.status === 'gameover') out.push({ text: 'THE END', y: 280, scale: 4, color: '#ff5a3c' });
  if (canRestart(w)) {
    const on = Math.floor((w.phaseStep - RESTART_DELAY_STEPS) / BLINK_STEPS) % 2 === 0;
    if (on) out.push({ text: 'TAP OR PRESS ANY KEY', y: 340, scale: 2, color: '#e0e0e0' });
  }
  return out;
}
