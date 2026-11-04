import type { Blast } from './blast';
import { CITY_HIT_HALF_WIDTH } from './damage';
import type { EnemyMissile } from './enemy';
import type { Interceptor } from './interceptor';

interface Place {
  readonly x: number;
  readonly alive: boolean;
}

/** 6 都市がすべて壊れたか（LLM-TC-0004-04） */
export const allCitiesLost = (cities: readonly Place[]): boolean => cities.every((c) => !c.alive);

/**
 * 弾が尽きて、着弾を止められなくなったか（7a-2 の B。PO の決定。LLM-TC-0004-05）。
 * 3 つがそろったとき：
 * 1. 基地の弾がすべて 0（壊れた基地は 0）
 * 2. 飛んでいる迎撃ミサイルも、爆風（誘爆を含む）もない
 * 3. 残っている都市を狙う敵が、今飛んでいる（まだ出ていない敵の狙いは乱数で決まるので数えない）
 */
export function cannotStop(state: {
  readonly bases: readonly { readonly ammo: number }[];
  readonly interceptors: readonly Interceptor[];
  readonly blasts: readonly Blast[];
  readonly enemies: readonly EnemyMissile[];
  readonly cities: readonly Place[];
}): boolean {
  if (state.bases.some((b) => b.ammo > 0)) return false;
  if (state.interceptors.length > 0 || state.blasts.length > 0) return false;
  return state.enemies.some((m) => state.cities.some((c) => c.alive && Math.abs(m.toX - c.x) <= CITY_HIT_HALF_WIDTH));
}
