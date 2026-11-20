import { describe, expect, it } from 'vitest';
import { CLEAR_BUTTON, CLEAR_NO_BUTTON, CLEAR_YES_BUTTON, clearButtonVisible, clearConfirmText } from '../../src/app/clear-ranking';
import { SOUND_BUTTON, soundKey } from '../../src/app/sound-button';
import { CREDIT_BUTTON } from '../../src/app/credits-screen';
import { clearRanking, loadRanking, rankingKey, saveRanking, type KeyValueStorage } from '../../src/storage/ranking-store';

const memory = (withRemove = true): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  const s: KeyValueStorage & { data: Map<string, string> } = {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
  if (withRemove) s.removeItem = (k) => void data.delete(k);
  return s;
};

const rec = (score: number) => ({ name: 'AAA', score, cities: 6, missiles: 30, status: 'CLEARED' as const, createdAt: '2026-11-01T00:00:00.000Z' });

describe('記録を消す（LLM-PBI-0022）', () => {
  it('LLM-TC-0022-01 「記録を消す」はタイトルで記録が 1 件以上のときだけ', () => {
    expect(clearButtonVisible('title', 1)).toBe(true);
    expect(clearButtonVisible('title', 10)).toBe(true);
    expect(clearButtonVisible('title', 0)).toBe(false);
    for (const s of ['play', 'top10', 'name', 'credits']) expect(clearButtonVisible(s, 5)).toBe(false);
  });

  it('LLM-TC-0022-01 ボタンの位置（GUI-0003 §10）：クレジットの右で重ならない。高さ 60（iPhone SE で約 45 ポイント）', () => {
    expect(CLEAR_BUTTON).toEqual({ x: 336, y: 560, width: 120, height: 60 });
    expect(CLEAR_BUTTON.x).toBeGreaterThanOrEqual(CREDIT_BUTTON.x + CREDIT_BUTTON.width);
    expect(SOUND_BUTTON.x + SOUND_BUTTON.width).toBeLessThanOrEqual(CREDIT_BUTTON.x);
    expect(CLEAR_BUTTON.x + CLEAR_BUTTON.width).toBeLessThanOrEqual(480);
    expect(CLEAR_YES_BUTTON).toEqual({ x: 120, y: 320, width: 240, height: 60 });
    expect(CLEAR_NO_BUTTON).toEqual({ x: 120, y: 410, width: 240, height: 60 });
  });

  it('LLM-TC-0022-02 確かめる画面の文に件数が入る', () => {
    expect(clearConfirmText(5)).toBe('この端末の記録（5 件）をすべて消します。\n消した記録は元に戻せません。');
    expect(clearConfirmText(10)).toContain('（10 件）');
  });

  it('LLM-TC-0022-04 消すのは渡したキー（開いているチャンネル）の TOP10 だけ。音の設定ともう一方のチャンネルは残る', () => {
    const s = memory();
    const preview = rankingKey('preview');
    const production = rankingKey('production');
    saveRanking(s, preview, [rec(100), rec(50)]);
    saveRanking(s, production, [rec(900)]);
    s.setItem(soundKey('preview'), 'off');
    expect(clearRanking(s, preview)).toBe(true);
    expect(loadRanking(s, preview)).toEqual([]);
    expect(s.data.has(preview)).toBe(false);
    expect(loadRanking(s, production)).toHaveLength(1);
    expect(s.getItem(soundKey('preview'))).toBe('off');
  });

  it('LLM-TC-0022-04 removeItem のない保存先では空の一覧を書く。消せなくても止めない', () => {
    const s = memory(false);
    const key = rankingKey('preview');
    saveRanking(s, key, [rec(100)]);
    expect(clearRanking(s, key)).toBe(true);
    expect(loadRanking(s, key)).toEqual([]);
    const broken: KeyValueStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('x');
      },
    };
    expect(clearRanking(broken, key)).toBe(false);
  });
});
