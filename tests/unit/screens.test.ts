import { describe, expect, it } from 'vitest';
import { LOGICAL_WIDTH } from '../../src/core/config';
import { GLYPHS, textPixels, textWidth } from '../../src/render/font';
import type { OverlayText } from '../../src/render/overlay';
import {
  canLeaveScreen,
  nameTexts,
  rankRowTexts,
  ROW_GAP,
  ROW_NAME_BOX_WIDTH,
  ROW_NAME_X,
  ROW_RANK_RIGHT_X,
  ROW_SCORE_X,
  ROW_TOP_Y,
  SCREEN_INPUT_DELAY_STEPS,
  titleTexts,
  top10Texts,
} from '../../src/render/screens';

const list = [
  { name: 'AAA', score: 12345 },
  { name: 'B.C', score: 9870 },
  { name: '...', score: 50 },
];
const texts = (o: { text: string }[]) => o.map((x) => x.text);
/** 自前の文字の左右の端（x と align から） */
function span(o: OverlayText): [number, number] {
  const w = textWidth(o.text, o.scale);
  const x = o.x ?? LOGICAL_WIDTH / 2;
  const left = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  return [left, left + w];
}
/** 1 行（順位・名前・点の 3 つ）。i は 0 から */
const rowOf = (out: OverlayText[], first: number, i: number) => out.slice(first + 3 * i, first + 3 * i + 3);

describe('タイトルと TOP10 の画面（LLM-GUI-0003）', () => {
  it('LLM-TC-0006-01 1 行は「順位 2 桁・名前・点 6 桁」、記録のない行は「---・000000」', () => {
    expect(texts(rankRowTexts(1, list[0], 176, '#e0e0e0'))).toEqual(['1', 'AAA', '012345']);
    expect(texts(rankRowTexts(10, undefined, 428, '#555555'))).toEqual(['10', '---', '000000']);
  });

  it('LLM-TC-0020-04 列の位置が決まっている：順位は x 96 に右寄せ、名前は x 120 から左寄せ（ブラウザの文字）、点は x 336 から', () => {
    const [rank, name, score] = rankRowTexts(3, { name: 'A', score: 7 }, 232, '#e0e0e0');
    expect(rank).toMatchObject({ x: ROW_RANK_RIGHT_X, align: 'right', y: 232 });
    expect(name).toMatchObject({ text: 'A', x: ROW_NAME_X, align: 'left', font: 'name', y: 232 });
    expect(score).toMatchObject({ text: '000007', x: ROW_SCORE_X, align: 'left', y: 232 });
    expect(rank?.font).toBeUndefined();
    expect(score?.font).toBeUndefined();
    // 1 行は x 72〜408 の枠（字間を除いた墨の端は 74〜406）で、画面の中央にそろう
    const left = span(rankRowTexts(10, undefined, 0, '')[0]!)[0];
    const right = span(score!)[1];
    expect([left, right]).toEqual([74, 406]);
    expect((left + right) / 2).toBe(LOGICAL_WIDTH / 2);
    // 名前の枠（120〜312）は順位とも点ともぶつからない。全角 8 文字（大きさ 20 で幅 160）が入る
    expect(ROW_NAME_X).toBeGreaterThan(ROW_RANK_RIGHT_X);
    expect(ROW_NAME_X + ROW_NAME_BOX_WIDTH).toBeLessThan(ROW_SCORE_X);
    expect(8 * 20).toBeLessThanOrEqual(ROW_NAME_BOX_WIDTH);
  });

  it('LLM-TC-0006-01 タイトル：題字・TOP 10・10 行（記録のない行は暗い色）', () => {
    const out = titleTexts(list, 0);
    expect(out[0]).toEqual({ text: 'LAST LINE MINI', y: 72, scale: 4, color: '#6cff8a' });
    expect(out[1]).toEqual({ text: 'TOP 10', y: 136, scale: 2, color: '#ffb347' });
    const rows = Array.from({ length: 10 }, (_, i) => rowOf(out, 2, i));
    expect(rows.map((r) => r[0]?.y)).toEqual(Array.from({ length: 10 }, (_, i) => ROW_TOP_Y + ROW_GAP * i));
    expect(texts(rows[0]!)).toEqual(['1', 'AAA', '012345']);
    expect(rows[0]!.map((o) => o.color)).toEqual(['#e0e0e0', '#e0e0e0', '#e0e0e0']);
    expect(texts(rows[3]!)).toEqual(['4', '---', '000000']);
    expect(rows[3]!.map((o) => o.color)).toEqual(['#555555', '#555555', '#555555']);
    // 最後の行（y 428）と TAP OR PRESS ANY KEY（y 520）が重ならない
    expect((rows[9]?.[0]?.y ?? 0) + 7 * 2).toBeLessThan(520);
  });

  it('LLM-TC-0006-01 自前の文字で描く文字は、すべて形がある（名前はブラウザの文字なので除く）', () => {
    const used = new Set(
      [...titleTexts(list, SCREEN_INPUT_DELAY_STEPS), ...top10Texts([], 0, SCREEN_INPUT_DELAY_STEPS)].filter((o) => o.font !== 'name').flatMap((o) => [...o.text]),
    );
    for (const ch of used) expect(GLYPHS[ch], `「${ch}」の形`).toBeDefined();
    // `-` は 1 本の横線（形がある）
    expect(textPixels('-').length).toBeGreaterThan(0);
  });

  it('LLM-TC-0020-04 名前は、日本語でも英字でも、いつもブラウザの文字で描く', () => {
    const out = titleTexts([{ name: 'やまだたろう山田', score: 1 }, ...list], 0);
    const names = out.filter((o) => o.font === 'name');
    expect(texts(names)).toEqual(['やまだたろう山田', 'AAA', 'B.C', '...', '---', '---', '---', '---', '---', '---']);
  });

  it('LLM-TC-0006-01 どの文字も画面の幅に収まる', () => {
    for (const o of [...titleTexts(list, SCREEN_INPUT_DELAY_STEPS), ...top10Texts(list, 999999, SCREEN_INPUT_DELAY_STEPS)]) {
      if (o.font === 'name') continue; // 名前の枠は上の列の位置のテストで見る
      const [l, r] = span(o);
      expect(l, o.text).toBeGreaterThanOrEqual(0);
      expect(r, o.text).toBeLessThanOrEqual(LOGICAL_WIDTH);
    }
  });

  it('LLM-TC-0006-01 出てから約 1 秒は受け付けず「TAP OR PRESS ANY KEY」も出さない。そのあと 0.5 秒ごとに点滅', () => {
    expect(canLeaveScreen(SCREEN_INPUT_DELAY_STEPS - 1)).toBe(false);
    expect(canLeaveScreen(SCREEN_INPUT_DELAY_STEPS)).toBe(true);
    expect(texts(titleTexts(list, SCREEN_INPUT_DELAY_STEPS - 1))).not.toContain('TAP OR PRESS ANY KEY');
    const shown = (s: number) => texts(titleTexts(list, SCREEN_INPUT_DELAY_STEPS + s)).includes('TAP OR PRESS ANY KEY');
    expect([shown(0), shown(59), shown(60), shown(119), shown(120)]).toEqual([true, true, false, false, true]);
  });

  it('LLM-TC-0007-04・LLM-TC-0020-04 TOP10 の画面で今回の行が名前も一緒に 0.5 秒ごとに点滅する（緑 ⇔ 見えない色）。ほかの行は変わらない', () => {
    const row = (step: number, rank: number | null, i: number) => rowOf(top10Texts(list, 9870, step, rank), 1, i);
    const colors = (r: OverlayText[]) => r.map((o) => o.color);
    // 今回は 2 位（B.C）
    expect(texts(row(0, 2, 1))).toEqual(['2', 'B.C', '009870']);
    expect(colors(row(0, 2, 1))).toEqual(['#6cff8a', '#6cff8a', '#6cff8a']);
    expect(colors(row(59, 2, 1))).toEqual(['#6cff8a', '#6cff8a', '#6cff8a']);
    expect(colors(row(60, 2, 1))).toEqual(['#05070f', '#05070f', '#05070f']); // 消えている（文字の並びは変えない）
    expect(texts(row(60, 2, 1))).toEqual(['2', 'B.C', '009870']);
    expect(colors(row(119, 2, 1))).toEqual(['#05070f', '#05070f', '#05070f']);
    expect(colors(row(120, 2, 1))).toEqual(['#6cff8a', '#6cff8a', '#6cff8a']);
    // ほかの行はいつも同じ色
    expect(colors(row(60, 2, 0))).toEqual(['#e0e0e0', '#e0e0e0', '#e0e0e0']);
    expect(colors(row(60, 2, 5))).toEqual(['#555555', '#555555', '#555555']);
    // ランクインしなかったときは、どの行も点滅しない
    expect(colors(top10Texts(list, 10, 60, null).slice(1, 31))).toEqual(colors(top10Texts(list, 10, 0, null).slice(1, 31)));
  });

  it('LLM-TC-0007-01 名前の入力の画面の文字：NEW RECORD・順位と点・ENTER YOUR NAME（上半分に置く）', () => {
    const out = nameTexts(3, 1735);
    expect(out).toEqual([
      { text: 'NEW RECORD', y: 64, scale: 4, color: '#6cff8a' },
      { text: 'RANK 3   SCORE 001735', y: 120, scale: 2, color: '#e0e0e0' },
      { text: 'ENTER YOUR NAME', y: 168, scale: 2, color: '#ffb347' },
    ]);
    for (const o of nameTexts(10, 999999)) expect(textWidth(o.text, o.scale)).toBeLessThanOrEqual(LOGICAL_WIDTH);
    // キーボードが下から出ても隠れないよう、文字・入力欄（y 200〜248）・OK（y 264〜322）は画面の上半分（y 320 前後まで）
    expect(Math.max(...out.map((o) => o.y))).toBeLessThan(320);
  });

  it('LLM-TC-0006-04 TOP10 の画面：TOP 10・10 行・YOUR SCORE（ランクインしなくても出す）', () => {
    const out = top10Texts(list, 1735, SCREEN_INPUT_DELAY_STEPS);
    expect(out[0]).toEqual({ text: 'TOP 10', y: 72, scale: 4, color: '#ffb347' });
    expect(out.slice(1, 31).filter((o) => o.font === 'name')).toHaveLength(10);
    expect(out).toContainEqual({ text: 'YOUR SCORE 001735', y: 464, scale: 2, color: '#e0e0e0' });
    expect(texts(out)).toContain('TAP OR PRESS ANY KEY');
  });
});
