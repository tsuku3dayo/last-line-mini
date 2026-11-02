import { stepBlasts, type Blast } from './blast';
import { AMMO_PER_BASE, BASE_XS, CITY_XS } from './config';
import { INITIAL_CURSOR, stepCursor, type Cursor, type MoveDir } from './cursor';
import { launch, stepInterceptors, type Interceptor } from './interceptor';
import { seedState } from './random';

export interface Base {
  readonly x: number;
  readonly ammo: number;
}

export interface City {
  readonly x: number;
  readonly alive: boolean;
}

/** ゲームの状態。core の関数はこれを書き換えず、新しい状態を返す */
export interface GameState {
  /** 始めてから進んだステップ数 */
  readonly step: number;
  /** 乱数の今の状態（種から作る） */
  readonly rng: number;
  readonly cursor: Cursor;
  readonly bases: readonly Base[];
  readonly cities: readonly City[];
  readonly interceptors: readonly Interceptor[];
  readonly blasts: readonly Blast[];
}

/** 3 つの基地の発射ボタン（A・B・C）。押した瞬間だけ true */
export type FireButtons = readonly [boolean, boolean, boolean];

/** 1 ステップぶんの入力 */
export interface StepInput {
  /** 方向キーの向き */
  readonly move: MoveDir;
  /** マウスの位置（論理座標）。このステップで動いていなければ null */
  readonly pointer: { readonly x: number; readonly y: number } | null;
  readonly fire: FireButtons;
}

export const NO_FIRE: FireButtons = Object.freeze([false, false, false] as const);
export const NO_INPUT: StepInput = Object.freeze({ move: Object.freeze({ x: 0, y: 0 }), pointer: null, fire: NO_FIRE });

export function createGame(seed: number): GameState {
  return {
    step: 0,
    rng: seedState(seed),
    cursor: INITIAL_CURSOR,
    bases: BASE_XS.map((x) => ({ x, ammo: AMMO_PER_BASE })),
    cities: CITY_XS.map((x) => ({ x, alive: true })),
    interceptors: [],
    blasts: [],
  };
}

/** 押された発射ボタンの基地から、照準へ撃つ。弾のない基地からは撃てない */
function fire(bases: readonly Base[], buttons: FireButtons, target: { x: number; y: number }): { bases: Base[]; launched: Interceptor[] } {
  const launched: Interceptor[] = [];
  const next = bases.map((b, i) => {
    if (!buttons[i] || b.ammo <= 0) return b;
    launched.push(launch(i, b.x, target.x, target.y));
    return { ...b, ammo: b.ammo - 1 };
  });
  return { bases: next, launched };
}

/** 1 ステップ進める。順番：照準 → 発射 → 迎撃ミサイル → 爆風 */
export function step(state: GameState, input: StepInput): GameState {
  const cursor = stepCursor(state.cursor, input.move, input.pointer);
  const fired = fire(state.bases, input.fire, cursor);
  const moved = stepInterceptors([...state.interceptors, ...fired.launched]);
  // 着いた迎撃ミサイルは、その場で爆風になる（age 0 から）
  const newBlasts = moved.arrived.map((m) => ({ x: m.toX, y: m.toY, age: 0 }));
  return {
    ...state,
    step: state.step + 1,
    cursor,
    bases: fired.bases,
    interceptors: moved.flying,
    blasts: [...stepBlasts(state.blasts), ...newBlasts],
  };
}
