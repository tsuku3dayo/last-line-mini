import { MOUND_TOP_Y, STEPS_PER_SECOND } from './config';

/** 迎撃ミサイル。発射した点から目標へ直線で飛ぶ */
export interface Interceptor {
  /** 撃った基地（0：A、1：B、2：C） */
  readonly base: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  /** 飛んだ距離 */
  readonly traveled: number;
}

/** 速さ（1 ステップあたり）。中央の基地 B は左右より速い（仕様書 §3.1） */
export const SIDE_SPEED = 300 / STEPS_PER_SECOND;
export const CENTER_SPEED = 600 / STEPS_PER_SECOND;
export const CENTER_BASE = 1;

export const interceptorSpeed = (base: number): number => (base === CENTER_BASE ? CENTER_SPEED : SIDE_SPEED);

/** 発射する点：基地の発射台の上 */
export const LAUNCH_Y = MOUND_TOP_Y - 12;

export const totalDistance = (m: Interceptor): number => Math.hypot(m.toX - m.fromX, m.toY - m.fromY);

/** 今の位置 */
export function interceptorPosition(m: Interceptor): { x: number; y: number } {
  const d = totalDistance(m);
  const t = d === 0 ? 1 : Math.min(1, m.traveled / d);
  return { x: m.fromX + (m.toX - m.fromX) * t, y: m.fromY + (m.toY - m.fromY) * t };
}

export function launch(base: number, baseX: number, toX: number, toY: number): Interceptor {
  return { base, fromX: baseX, fromY: LAUNCH_Y, toX, toY, traveled: 0 };
}

/** 1 ステップ進める。着いたものは arrived に分ける（その場で爆風になる） */
export function stepInterceptors(list: readonly Interceptor[]): { flying: Interceptor[]; arrived: Interceptor[] } {
  const flying: Interceptor[] = [];
  const arrived: Interceptor[] = [];
  for (const m of list) {
    const next = { ...m, traveled: m.traveled + interceptorSpeed(m.base) };
    if (next.traveled >= totalDistance(next)) arrived.push(next);
    else flying.push(next);
  }
  return { flying, arrived };
}
