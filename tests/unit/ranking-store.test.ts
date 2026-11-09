import { describe, expect, it } from 'vitest';
import { CHANNELS } from '../../channels.mjs';
import { loadRanking, parseRanking, rankingKey, saveRanking, type StoredRecord } from '../../src/storage/ranking-store';

const ok: StoredRecord = { name: 'AB.', score: 1735, cities: 4, missiles: 12, status: 'CLEARED', createdAt: '2026-11-09T05:00:00.000Z' };

/** localStorage の代わり（テンプレート §5.8：Storage は外から渡す） */
function fakeStorage(initial: Record<string, string> = {}, opts: { throwOnSet?: boolean; throwOnGet?: boolean } = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(k: string): string | null {
      if (opts.throwOnGet) throw new Error('使えない');
      return data.get(k) ?? null;
    },
    setItem(k: string, v: string): void {
      if (opts.throwOnSet) throw new Error('いっぱい');
      data.set(k, v);
    },
  };
}

describe('TOP10 の保存（LLM-PBI-0006）', () => {
  it('LLM-TC-0006-03 保存のキーはプレビューと本番で別（アプリ識別子 + -ranking）', () => {
    expect(rankingKey('production')).toBe('last-line-mini-ranking');
    expect(rankingKey('preview')).toBe('last-line-mini-preview-ranking');
    // channels.mjs のアプリ識別子とそろっている（LLM-SA-0001 §2）
    expect(rankingKey('production')).toBe(`${CHANNELS.production.appId}-ranking`);
    expect(rankingKey('preview')).toBe(`${CHANNELS.preview.appId}-ranking`);
  });

  it('LLM-TC-0006-03 保存して読み戻すと同じ中身', () => {
    const s = fakeStorage();
    expect(saveRanking(s, 'k', [ok])).toBe(true);
    expect(loadRanking(s, 'k')).toEqual([ok]);
  });

  it('LLM-TC-0006-03 何もない・壊れた中身は空の TOP10（起動を止めない）', () => {
    expect(parseRanking(null)).toEqual([]);
    expect(parseRanking('')).toEqual([]);
    expect(parseRanking('{これは JSON でない')).toEqual([]);
    expect(parseRanking('{"a":1}')).toEqual([]); // 配列でない
    expect(parseRanking(JSON.stringify([{ ...ok, score: '100' }]))).toEqual([]); // 型が違う
    expect(parseRanking(JSON.stringify([{ ...ok, name: 'abcd' }]))).toEqual([]); // 使えない名前
    expect(parseRanking(JSON.stringify([{ ...ok, status: 'WIN' }]))).toEqual([]);
    expect(parseRanking(JSON.stringify([{ ...ok, score: -1 }]))).toEqual([]);
    expect(parseRanking(JSON.stringify([{ ...ok, score: 1.5 }]))).toEqual([]);
  });

  it('LLM-TC-0006-03 11 件以上あっても 10 件まで読み、点の高い順にそろえる', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...ok, score: i * 10 }));
    const got = parseRanking(JSON.stringify(many));
    expect(got).toHaveLength(10);
    expect(got[0]?.score).toBe(110);
    expect(got.at(-1)?.score).toBe(20);
  });

  it('LLM-TC-0006-03 localStorage が使えない（読めない・書けない）ときも止まらない', () => {
    expect(loadRanking(fakeStorage({}, { throwOnGet: true }), 'k')).toEqual([]);
    expect(saveRanking(fakeStorage({}, { throwOnSet: true }), 'k', [ok])).toBe(false);
  });
});
