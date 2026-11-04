import { CURSOR_MAX_X, CURSOR_MAX_Y, CURSOR_MIN_X, CURSOR_MIN_Y } from './cursor';

/** 触った点（論理座標） */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** 距離が同じときに先に選ぶ順：中央の B、次に A、最後に C（LLM-GUI-0002 §2） */
const TIE_ORDER: readonly number[] = [1, 0, 2];

/**
 * 触った所の x から、撃つ基地を選ぶ（LLM-PBI-0002 案 C）。
 * 横の距離がいちばん近い、残弾のある基地。距離が同じなら B → A → C。
 * 3 つとも残弾 0 なら -1。
 */
export function chooseBase(bases: readonly { readonly x: number; readonly ammo: number }[], x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  for (const i of TIE_ORDER) {
    const b = bases[i];
    if (!b || b.ammo <= 0) continue;
    const d = Math.abs(b.x - x);
    // 「より近い」ときだけ置き換えるので、同じ距離なら TIE_ORDER の先のものが残る
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

/** 触った点を、照準が動ける範囲に寄せる（HUD の上・地面の下を触ったとき。LLM-GUI-0002 §2） */
export function clampTap(p: Point): Point {
  return {
    x: Math.min(CURSOR_MAX_X, Math.max(CURSOR_MIN_X, p.x)),
    y: Math.min(CURSOR_MAX_Y, Math.max(CURSOR_MIN_Y, p.y)),
  };
}
