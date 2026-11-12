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

/**
 * 名前の形の検査の既定：1 文字以上・制御文字なし・長すぎない（8 文字の絵文字なしの名前は 16 単位あれば足りるので 32 まで）。
 * 使える文字の決まり（LLM-PBI-0020）は core にあり、storage は core を import しないので、呼ぶ側（main）が isName で渡す
 */
const isNameShape = (name: string): boolean => name.length > 0 && name.length <= 32 && !/\p{Cc}/u.test(name);

const isRecord = (isName: (name: string) => boolean) => (v: unknown): v is StoredRecord => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.name === 'string' &&
    isNameShape(r.name) &&
    isName(r.name) &&
    isCount(r.score, Number.MAX_SAFE_INTEGER) &&
    isCount(r.cities, 6) &&
    isCount(r.missiles, 30) &&
    (r.status === 'CLEARED' || r.status === 'GAME_OVER') &&
    typeof r.createdAt === 'string'
  );
};

/** 名前の決まりを渡さないときは形だけを見る */
const anyName = (): boolean => true;

/**
 * 保存の中身を読む。何もない・JSON でない・形が違うもの（名前が isName に合わないものも）が 1 件でもあれば、
 * 空の TOP10 にする（起動を止めない。GUI-0003 §4）。点の高い順（同じ点は日時の古い順）にそろえ、10 件まで
 */
export function parseRanking(text: string | null, isName: (name: string) => boolean = anyName): StoredRecord[] {
  if (!text) return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(data) || !data.every(isRecord(isName))) return [];
  return [...data]
    .sort((a, b) => b.score - a.score || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    .slice(0, MAX);
}

/** 読み込む。localStorage が使えないときも空の TOP10 */
export function loadRanking(storage: KeyValueStorage, key: string, isName: (name: string) => boolean = anyName): StoredRecord[] {
  try {
    return parseRanking(storage.getItem(key), isName);
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
