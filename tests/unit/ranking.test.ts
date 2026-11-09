import { describe, expect, it } from 'vitest';
import { insertRecord, qualifies, RANKING_SIZE, topScore, type RankRecord } from '../../src/core/ranking';
import { hudTopText } from '../../src/render/hud';

/** 点と日時だけ変えた記録（ほかの項目は決まった値） */
const rec = (score: number, createdAt = '2026-11-09T00:00:00.000Z', name = 'AAA'): RankRecord => ({
  name,
  score,
  cities: 6,
  missiles: 30,
  status: 'CLEARED',
  createdAt,
});

/** 1000・900・…・100 の 10 件（すべて別の日時） */
const full = (): RankRecord[] => Array.from({ length: 10 }, (_, i) => rec(1000 - i * 100, `2026-11-0${i % 9}T00:00:00.000Z`, `P${i}`));

describe('TOP10 の並べ方（LLM-PBI-0006）', () => {
  it('LLM-TC-0006-02 決まった値：10 件まで', () => {
    expect(RANKING_SIZE).toBe(10);
  });

  it('LLM-TC-0006-02 10 件より少ないときは、どんな点でも入る（0 点でも）', () => {
    expect(qualifies([], 0)).toBe(true);
    const r = insertRecord([rec(500)], rec(0));
    expect(r.rank).toBe(2);
    expect(r.list.map((x) => x.score)).toEqual([500, 0]);
  });

  it('LLM-TC-0006-02 点の高い順に並ぶ', () => {
    const r = insertRecord([rec(900), rec(500), rec(100)], rec(600));
    expect(r.rank).toBe(2);
    expect(r.list.map((x) => x.score)).toEqual([900, 600, 500, 100]);
  });

  it('LLM-TC-0006-02 同じ点は先に取ったほうが上（新しい記録は同じ点の下に入る）', () => {
    const old = rec(500, '2026-11-01T00:00:00.000Z', 'OLD');
    const r = insertRecord([rec(900), old, rec(100)], rec(500, '2026-11-09T00:00:00.000Z', 'NEW'));
    expect(r.list.map((x) => x.name)).toEqual(['AAA', 'OLD', 'NEW', 'AAA']);
    expect(r.rank).toBe(3);
  });

  it('LLM-TC-0006-02 10 件のとき：10 位より高ければ入り、11 位になったものは消える', () => {
    const list = full();
    expect(list.at(-1)?.score).toBe(100); // 前提：10 位は 100
    const r = insertRecord(list, rec(101, '2026-11-09T00:00:00.000Z', 'NEW'));
    expect(r.rank).toBe(10);
    expect(r.list).toHaveLength(10);
    expect(r.list.at(-1)?.name).toBe('NEW');
    expect(r.list.some((x) => x.name === 'P9')).toBe(false); // 前の 10 位（100）は消えた
  });

  it('LLM-TC-0006-02 10 件のとき：10 位と同じ点は入らない。10 位より低くても入らない', () => {
    const list = full();
    expect(qualifies(list, 100)).toBe(false); // ちょうど同じ
    expect(qualifies(list, 99)).toBe(false); // 少し下
    expect(qualifies(list, 101)).toBe(true); // 少し上
    const r = insertRecord(list, rec(100, '2026-11-09T00:00:00.000Z', 'NEW'));
    expect(r.rank).toBeNull();
    expect(r.list).toBe(list); // 変わらない
  });

  it('LLM-TC-0006-02 1 位より高ければ 1 位', () => {
    const r = insertRecord(full(), rec(5000));
    expect(r.rank).toBe(1);
    expect(r.list[0]?.score).toBe(5000);
  });

  it('LLM-TC-0006-05 HUD の TOP は 1 位の点。記録がなければ 000000', () => {
    expect(topScore([])).toBe(0);
    expect(hudTopText(topScore([]))).toBe('TOP 000000');
    expect(topScore(full())).toBe(1000);
    expect(hudTopText(topScore(full()))).toBe('TOP 001000');
  });
});
