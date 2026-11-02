import { BASE_XS, GROUND_Y, LOGICAL_WIDTH, MOUND_FLAT_HALF_WIDTH, MOUND_HALF_WIDTH, MOUND_TOP_Y } from './config';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * 地面の上端の折れ線（左端から右端へ）。基地の下は台形の丘にする。
 * 丘は 3 つとも画面の内側に収まる（BASE_XS と MOUND_HALF_WIDTH の値。単体テストで確かめる）。
 */
export function groundProfile(): Point[] {
  const pts: Point[] = [{ x: 0, y: GROUND_Y }];
  for (const bx of BASE_XS) {
    pts.push(
      { x: bx - MOUND_HALF_WIDTH, y: GROUND_Y },
      { x: bx - MOUND_FLAT_HALF_WIDTH, y: MOUND_TOP_Y },
      { x: bx + MOUND_FLAT_HALF_WIDTH, y: MOUND_TOP_Y },
      { x: bx + MOUND_HALF_WIDTH, y: GROUND_Y },
    );
  }
  pts.push({ x: LOGICAL_WIDTH, y: GROUND_Y });
  return pts;
}

/** x の位置の地面の高さ（上端の y）。画面の外の x は端の高さ */
export function groundYAt(x: number, profile: readonly Point[] = groundProfile()): number {
  const cx = Math.min(LOGICAL_WIDTH, Math.max(0, x));
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (!a || !b || cx > b.x) continue;
    return b.x === a.x ? Math.min(a.y, b.y) : a.y + ((b.y - a.y) * (cx - a.x)) / (b.x - a.x);
  }
  return GROUND_Y;
}
