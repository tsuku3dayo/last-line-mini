// TOP10 の保存・読み込み（LLM-PBI-0006、LLM-SA-0001 §2・§4）。
// ほかの層を import しない（層の決まり）。localStorage は外から渡す（テスト用の偽物を渡せるように）

/** 保存する 1 件。core の RankRecord と同じ形（storage は core を import しないので、ここにも書く） */
export interface StoredRecord {
  readonly name: string;
  readonly score: number;
  readonly cities: number;
  readonly missiles: number;
  readonly status: 'CLEARED' | 'GAME_OVER';
  readonly createdAt: string;
}

/** localStorage のうち使う分 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MAX = 10;

/** 保存のキー：アプリ識別子（channels.mjs）+ `-ranking`。本番とプレビューで分ける（LLM-SA-0001 §2） */
export function rankingKey(channel: 'production' | 'preview'): string {
  return channel === 'production' ? 'last-line-mini-ranking' : 'last-line-mini-preview-ranking';
}

const isCount = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

function isRecord(v: unknown): v is StoredRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.name === 'string' &&
    /^[A-Z0-9.]{1,3}$/.test(r.name) &&
    isCount(r.score, Number.MAX_SAFE_INTEGER) &&
    isCount(r.cities, 6) &&
    isCount(r.missiles, 30) &&
    (r.status === 'CLEARED' || r.status === 'GAME_OVER') &&
    typeof r.createdAt === 'string'
  );
}

/**
 * 保存の中身を読む。何もない・JSON でない・形が違うものが 1 件でもあれば、空の TOP10 にする（起動を止めない。GUI-0003 §4）。
 * 点の高い順（同じ点は日時の古い順）にそろえ、10 件まで
 */
export function parseRanking(text: string | null): StoredRecord[] {
  if (!text) return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data) || !data.every(isRecord)) return [];
  return [...data]
    .sort((a, b) => b.score - a.score || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    .slice(0, MAX);
}

/** 読み込む。localStorage が使えないときも空の TOP10 */
export function loadRanking(storage: KeyValueStorage, key: string): StoredRecord[] {
  try {
    return parseRanking(storage.getItem(key));
  } catch {
    return [];
  }
}

/** 保存する。書けなかったら false（容量・プライベートブラウズなど。遊ぶのは止めない） */
export function saveRanking(storage: KeyValueStorage, key: string, list: readonly StoredRecord[]): boolean {
  try {
    storage.setItem(key, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}
