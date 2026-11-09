// タイトルと TOP10 の画面の文字を決める純粋な関数（LLM-GUI-0003 §1・§2。単体テストする）
import { formatScore } from './hud';
import { RESTART_DELAY_STEPS, type OverlayText } from './overlay';
import { STEPS_PER_SECOND } from '../core/config';

/** 今の画面（LLM-GUI-0003 §0）。name は名前の入力（LLM-PBI-0007） */
export type Screen = 'title' | 'play' | 'name' | 'top10';

/** どの画面も、出てから約 1 秒は触る・押すを受け付けない（前の画面の操作で飛ばないように。GUI-0003 §0） */
export const SCREEN_INPUT_DELAY_STEPS = RESTART_DELAY_STEPS;
const BLINK_STEPS = Math.round(0.5 * STEPS_PER_SECOND);

export const canLeaveScreen = (screenStep: number): boolean => screenStep >= SCREEN_INPUT_DELAY_STEPS;

const WHITE = '#e0e0e0';
const ORANGE = '#ffb347';
const GREEN = '#6cff8a';
const DIM = '#555555';
/** 点滅の消えているあいだの色（夜空と同じ。文字の並びは変えずに見えなくする） */
const HIDDEN = '#05070f';

/** TOP10 の 1 行目の y と、行の間（GUI-0003 §1） */
export const ROW_TOP_Y = 176;
export const ROW_GAP = 28;

/** TOP10 の 1 行：`順位（右寄せ 2 桁）  名前  点（6 桁）`。記録のない行は `---  000000` */
export function rankRowText(rank: number, record: { readonly name: string; readonly score: number } | undefined): string {
  const name = record ? record.name.padEnd(3) : '---';
  return `${String(rank).padStart(2)}  ${name}  ${formatScore(record?.score ?? 0)}`;
}

/** 今回の行の点滅：画面が出たときから 0.5 秒ごとに、緑と見えない色を行き来する（LLM-TC-0007-04） */
export const highlightOn = (screenStep: number): boolean => Math.floor(screenStep / BLINK_STEPS) % 2 === 0;

function rows(list: readonly { readonly name: string; readonly score: number }[], highlight: { rank: number; screenStep: number } | null = null): OverlayText[] {
  return Array.from({ length: 10 }, (_, i) => {
    const r = list[i];
    const base = r ? WHITE : DIM;
    const color = highlight && highlight.rank === i + 1 ? (highlightOn(highlight.screenStep) ? GREEN : HIDDEN) : base;
    return { text: rankRowText(i + 1, r), y: ROW_TOP_Y + ROW_GAP * i, scale: 2, color };
  });
}

/** 「TAP OR PRESS ANY KEY」：受け付けるようになってから 0.5 秒ごとに点滅 */
function tapPrompt(screenStep: number): OverlayText[] {
  if (!canLeaveScreen(screenStep)) return [];
  const on = Math.floor((screenStep - SCREEN_INPUT_DELAY_STEPS) / BLINK_STEPS) % 2 === 0;
  return on ? [{ text: 'TAP OR PRESS ANY KEY', y: 520, scale: 2, color: WHITE }] : [];
}

/** 名前の入力の画面の文字（GUI-0003 §3）。入力欄と OK は HTML の部品（src/app/name-entry.ts） */
export function nameTexts(rank: number, score: number): OverlayText[] {
  return [
    { text: 'NEW RECORD', y: 64, scale: 4, color: GREEN },
    { text: `RANK ${rank}   SCORE ${formatScore(score)}`, y: 120, scale: 2, color: WHITE },
    { text: 'ENTER YOUR NAME', y: 168, scale: 2, color: ORANGE },
  ];
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

/**
 * TOP10 の画面（GUI-0003 §2）。yourScore は今回の点（ランクインしなくても出す）。
 * rank は今回ランクインした順位（入らなければ null）。その行を点滅させる（LLM-PBI-0007）
 */
export function top10Texts(
  list: readonly { readonly name: string; readonly score: number }[],
  yourScore: number,
  screenStep: number,
  rank: number | null = null,
): OverlayText[] {
  return [
    { text: 'TOP 10', y: 72, scale: 4, color: ORANGE },
    ...rows(list, rank === null ? null : { rank, screenStep }),
    { text: `YOUR SCORE ${formatScore(yourScore)}`, y: 464, scale: 2, color: WHITE },
    ...tapPrompt(screenStep),
  ];
}
