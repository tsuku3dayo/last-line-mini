import { MOUND_FLAT_HALF_WIDTH } from './config';

/** 「都市に落ちた」とみなす幅（中心から。LLM-PBI-0003） */
export const CITY_HIT_HALF_WIDTH = 12;
/** 「基地に落ちた」とみなす幅：基地の台（丘の上の平らなところ）の半分の幅 */
export const BASE_HIT_HALF_WIDTH = MOUND_FLAT_HALF_WIDTH;

interface Target {
  readonly x: number;
  readonly alive: boolean;
}

/**
 * 敵が落ちた点（x）から、都市と基地の被害を決める（LLM-PBI-0003）。
 * - 都市の幅に落ちたら、その都市は壊れる（復活しない）
 * - 基地の台の幅に落ちたら、その基地は壊れ、残弾が 0 になる（7a-3、PO の決定）
 * - 壊れたものに落ちても何も変わらない
 */
export function applyLandings<C extends Target, B extends Target & { readonly ammo: number }>(
  cities: readonly C[],
  bases: readonly B[],
  landedXs: readonly number[],
): { cities: C[]; bases: B[] } {
  const hit = (x: number, half: number) => landedXs.some((lx) => Math.abs(lx - x) <= half);
  return {
    cities: cities.map((c) => (c.alive && hit(c.x, CITY_HIT_HALF_WIDTH) ? { ...c, alive: false } : c)),
    bases: bases.map((b) => (b.alive && hit(b.x, BASE_HIT_HALF_WIDTH) ? { ...b, alive: false, ammo: 0 } : b)),
  };
}
