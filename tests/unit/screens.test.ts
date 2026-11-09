import { describe, expect, it } from 'vitest';
import { LOGICAL_WIDTH } from '../../src/core/config';
import { GLYPHS, textPixels, textWidth } from '../../src/render/font';
import { canLeaveScreen, rankRowText, ROW_GAP, ROW_TOP_Y, SCREEN_INPUT_DELAY_STEPS, titleTexts, top10Texts } from '../../src/render/screens';

const list = [
  { name: 'AAA', score: 12345 },
  { name: 'B.C', score: 9870 },
  { name: '...', score: 50 },
];
const texts = (o: { text: string }[]) => o.map((x) => x.text);

describe('タイトルと TOP10 の画面（LLM-GUI-0003）', () => {
  it('LLM-TC-0006-01 1 行は「順位 2 桁・名前 3 文字・点 6 桁」、記録のない行は「---  000000」', () => {
    expect(rankRowText(1, list[0])).toBe(' 1  AAA  012345');
    expect(rankRowText(10, undefined)).toBe('10  ---  000000');
    expect(rankRowText(3, { name: 'A', score: 7 })).toBe(' 3  A    000007'); // 短い名前も列がそろう
    expect(rankRowText(1, list[0])).toHaveLength(15);
    expect(rankRowText(10, undefined)).toHaveLength(15);
  });

  it('LLM-TC-0006-01 タイトル：題字・TOP 10・10 行（記録のない行は暗い色）', () => {
    const out = titleTexts(list, 0);
    expect(out[0]).toEqual({ text: 'LAST LINE MINI', y: 72, scale: 4, color: '#6cff8a' });
    expect(out[1]).toEqual({ text: 'TOP 10', y: 136, scale: 2, color: '#ffb347' });
    const rows = out.slice(2, 12);
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.y)).toEqual(Array.from({ length: 10 }, (_, i) => ROW_TOP_Y + ROW_GAP * i));
    expect(rows[0]).toMatchObject({ text: ' 1  AAA  012345', color: '#e0e0e0' });
    expect(rows[3]).toMatchObject({ text: ' 4  ---  000000', color: '#555555' });
    // 最後の行（y 428）と TAP OR PRESS ANY KEY（y 520）が重ならない
    expect((rows[9]?.y ?? 0) + 7 * 2).toBeLessThan(520);
  });

  it('LLM-TC-0006-01 画面に出す文字は、すべて自前の文字に形がある（形がないと空白になり、`---` が消えた）', () => {
    const used = new Set([...titleTexts(list, SCREEN_INPUT_DELAY_STEPS), ...top10Texts([], 0, SCREEN_INPUT_DELAY_STEPS)].flatMap((o) => [...o.text]));
    for (const ch of used) expect(GLYPHS[ch], `「${ch}」の形`).toBeDefined();
    // `-` は 1 本の横線（形がある）
    expect(textPixels('-').length).toBeGreaterThan(0);
  });

  it('LLM-TC-0006-01 どの文字も画面の幅に収まる', () => {
    for (const o of [...titleTexts(list, SCREEN_INPUT_DELAY_STEPS), ...top10Texts(list, 999999, SCREEN_INPUT_DELAY_STEPS)]) {
      expect(textWidth(o.text, o.scale)).toBeLessThanOrEqual(LOGICAL_WIDTH);
    }
  });

  it('LLM-TC-0006-01 出てから約 1 秒は受け付けず「TAP OR PRESS ANY KEY」も出さない。そのあと 0.5 秒ごとに点滅', () => {
    expect(canLeaveScreen(SCREEN_INPUT_DELAY_STEPS - 1)).toBe(false);
    expect(canLeaveScreen(SCREEN_INPUT_DELAY_STEPS)).toBe(true);
    expect(texts(titleTexts(list, SCREEN_INPUT_DELAY_STEPS - 1))).not.toContain('TAP OR PRESS ANY KEY');
    const shown = (s: number) => texts(titleTexts(list, SCREEN_INPUT_DELAY_STEPS + s)).includes('TAP OR PRESS ANY KEY');
    expect([shown(0), shown(59), shown(60), shown(119), shown(120)]).toEqual([true, true, false, false, true]);
  });

  it('LLM-TC-0006-04 TOP10 の画面：TOP 10・10 行・YOUR SCORE（ランクインしなくても出す）', () => {
    const out = top10Texts(list, 1735, SCREEN_INPUT_DELAY_STEPS);
    expect(out[0]).toEqual({ text: 'TOP 10', y: 72, scale: 4, color: '#ffb347' });
    expect(out.slice(1, 11)).toHaveLength(10);
    expect(out).toContainEqual({ text: 'YOUR SCORE 001735', y: 464, scale: 2, color: '#e0e0e0' });
    expect(texts(out)).toContain('TAP OR PRESS ANY KEY');
  });
});
