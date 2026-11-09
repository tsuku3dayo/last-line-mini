// ウェーブと終わりの表示を決める純粋な関数（LLM-GUI-0001 §5。単体テストする）
import { BONUS_PER_CITY, BONUS_PER_MISSILE, STEPS_PER_SECOND } from '../core/config';
import type { Bonus } from '../core/game';
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

/** 照準の「＋」を描くか：CLEAR・GAME OVER のあいだは描かない（中央の文字と重ならないように。LLM-GUI-0001 §5） */
export const showCursor = (w: WaveProgress): boolean => !isOver(w.status);

/**
 * ボーナスの内訳の 1 行（LLM-GUI-0001 v1.5 §5）。等幅の文字なので、2 行の「X」と合計の右端がそろうように空白で詰める。
 * 例：`MISSILES 12 X 5     60`・`CITIES    4 X 100  400`（どちらも 22 文字）
 */
export function bonusLine(label: string, count: number, unit: number): string {
  return `${label.padEnd(8)} ${String(count).padStart(2)} X ${String(unit).padEnd(3)}${String(count * unit).padStart(5)}`;
}

/** 今出す文字（上から順）。bonus は終わりのボーナスの内訳（終わったあとだけ出す） */
export function overlayTexts(w: WaveProgress, bonus: Bonus | null = null): OverlayText[] {
  const out: OverlayText[] = [];
  if (w.status === 'break') out.push({ text: `WAVE ${w.number}`, y: 280, scale: 4, color: '#e0e0e0' });
  if (w.status === 'clear') out.push({ text: 'DEFENSE COMPLETE', y: 280, scale: 3, color: '#6cff8a' });
  if (w.status === 'gameover') out.push({ text: 'THE END', y: 280, scale: 4, color: '#ff5a3c' });
  if (isOver(w.status) && bonus) {
    out.push({ text: bonusLine('MISSILES', bonus.missiles, BONUS_PER_MISSILE), y: 330, scale: 2, color: '#e0e0e0' });
    out.push({ text: bonusLine('CITIES', bonus.cities, BONUS_PER_CITY), y: 354, scale: 2, color: '#e0e0e0' });
  }
  if (canRestart(w)) {
    const on = Math.floor((w.phaseStep - RESTART_DELAY_STEPS) / BLINK_STEPS) % 2 === 0;
    if (on) out.push({ text: 'TAP OR PRESS ANY KEY', y: 400, scale: 2, color: '#e0e0e0' });
  }
  return out;
}
