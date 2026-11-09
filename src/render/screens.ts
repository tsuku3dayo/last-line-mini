// タイトルと TOP10 の画面の文字を決める純粋な関数（LLM-GUI-0003 §1・§2。単体テストする）
import { formatScore } from './hud';
import { RESTART_DELAY_STEPS, type OverlayText } from './overlay';
import { STEPS_PER_SECOND } from '../core/config';

/** 今の画面（LLM-GUI-0003 §0）。名前の入力は LLM-PBI-0007 で足す */
export type Screen = 'title' | 'play' | 'top10';

/** どの画面も、出てから約 1 秒は触る・押すを受け付けない（前の画面の操作で飛ばないように。GUI-0003 §0） */
export const SCREEN_INPUT_DELAY_STEPS = RESTART_DELAY_STEPS;
const BLINK_STEPS = Math.round(0.5 * STEPS_PER_SECOND);

export const canLeaveScreen = (screenStep: number): boolean => screenStep >= SCREEN_INPUT_DELAY_STEPS;

const WHITE = '#e0e0e0';
const ORANGE = '#ffb347';
const GREEN = '#6cff8a';
const DIM = '#555555';

/** TOP10 の 1 行目の y と、行の間（GUI-0003 §1） */
export const ROW_TOP_Y = 176;
export const ROW_GAP = 28;

/** TOP10 の 1 行：`順位（右寄せ 2 桁）  名前  点（6 桁）`。記録のない行は `---  000000` */
export function rankRowText(rank: number, record: { readonly name: string; readonly score: number } | undefined): string {
  const name = record ? record.name.padEnd(3) : '---';
  return `${String(rank).padStart(2)}  ${name}  ${formatScore(record?.score ?? 0)}`;
}

function rows(list: readonly { readonly name: string; readonly score: number }[]): OverlayText[] {
  return Array.from({ length: 10 }, (_, i) => {
    const r = list[i];
    return { text: rankRowText(i + 1, r), y: ROW_TOP_Y + ROW_GAP * i, scale: 2, color: r ? WHITE : DIM };
  });
}

/** 「TAP OR PRESS ANY KEY」：受け付けるようになってから 0.5 秒ごとに点滅 */
function tapPrompt(screenStep: number): OverlayText[] {
  if (!canLeaveScreen(screenStep)) return [];
  const on = Math.floor((screenStep - SCREEN_INPUT_DELAY_STEPS) / BLINK_STEPS) % 2 === 0;
  return on ? [{ text: 'TAP OR PRESS ANY KEY', y: 520, scale: 2, color: WHITE }] : [];
}

/** タイトル画面（GUI-0003 §1） */
export function titleTexts(list: readonly { readonly name: string; readonly score: number }[], screenStep: number): OverlayText[] {
  return [
    { text: 'LAST LINE MINI', y: 72, scale: 4, color: GREEN },
    { text: 'TOP 10', y: 136, scale: 2, color: ORANGE },
    ...rows(list),
    ...tapPrompt(screenStep),
  ];
}

/** TOP10 の画面（GUI-0003 §2）。yourScore は今回の点（ランクインしなくても出す） */
export function top10Texts(list: readonly { readonly name: string; readonly score: number }[], yourScore: number, screenStep: number): OverlayText[] {
  return [
    { text: 'TOP 10', y: 72, scale: 4, color: ORANGE },
    ...rows(list),
    { text: `YOUR SCORE ${formatScore(yourScore)}`, y: 464, scale: 2, color: WHITE },
    ...tapPrompt(screenStep),
  ];
}
