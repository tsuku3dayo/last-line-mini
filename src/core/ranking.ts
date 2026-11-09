// TOP10 の並べ方（LLM-PBI-0006、仕様書 §5.1〜§5.3）。保存は storage 層、日時は app 層が渡す

/** TOP10 の 1 件（仕様書 §5.2。順位は並びの位置から出すので持たない） */
export interface RankRecord {
  /** 3 文字までの名前（A〜Z・0〜9・.）。名前を入れる前は `...` */
  readonly name: string;
  readonly score: number;
  /** 残った都市（0〜6） */
  readonly cities: number;
  /** 残弾（0〜30） */
  readonly missiles: number;
  readonly status: 'CLEARED' | 'GAME_OVER';
  /** 記録した日時（ISO-8601） */
  readonly createdAt: string;
}

/** 残す件数 */
export const RANKING_SIZE = 10;

/**
 * この点で TOP10 に入るか。10 件より少なければ必ず入る。
 * 10 件あるときは 10 位より高いときだけ（同じ点は入らない。7a-4、PO の決定 2026-11-09）
 */
export function qualifies(list: readonly RankRecord[], score: number): boolean {
  if (list.length < RANKING_SIZE) return true;
  const last = list[RANKING_SIZE - 1];
  return last === undefined || score > last.score;
}

/**
 * 記録を入れる。同じ点は先に取ったほうが上なので、新しい記録は同じ点の下に入る。11 位になったものは消える。
 * 入らなければ list をそのまま返し、rank は null。入れば rank は 1〜10
 */
export function insertRecord(list: readonly RankRecord[], record: RankRecord): { list: readonly RankRecord[]; rank: number | null } {
  if (!qualifies(list, record.score)) return { list, rank: null };
  const at = list.findIndex((r) => r.score < record.score);
  const index = at === -1 ? list.length : at;
  const next = [...list.slice(0, index), record, ...list.slice(index)].slice(0, RANKING_SIZE);
  return { list: next, rank: index + 1 };
}

/** HUD の TOP に出す点：1 位の点。記録がなければ 0 */
export const topScore = (list: readonly RankRecord[]): number => list[0]?.score ?? 0;
