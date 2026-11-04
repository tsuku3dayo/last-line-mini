import { stepBlasts, type Blast } from './blast';
import { AMMO_PER_BASE, BASE_XS, CITY_XS } from './config';
import { applyLandings } from './damage';
import { INITIAL_CURSOR, stepCursor, type Cursor, type MoveDir } from './cursor';
import { chooseBase, clampTap, type Point } from './touch';
import { enemyHead, spawnEnemy, stepEnemies, stepImpacts, type EnemyMissile, type Impact } from './enemy';
import { launch, stepInterceptors, type Interceptor } from './interceptor';
import { seedState } from './random';

export type { Point } from './touch';

export interface Base {
  readonly x: number;
  readonly ammo: number;
  /** 壊れていないか。敵が落ちると false になり、残弾 0 のまま撃てない（LLM-PBI-0003） */
  readonly alive: boolean;
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
  readonly enemies: readonly EnemyMissile[];
  /** 敵が地面に着いた跡の閃光 */
  readonly impacts: readonly Impact[];
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
  /**
   * このステップで指が付いた点（論理座標。タッチだけ。LLM-PBI-0002）。
   * 1 点につき 1 発、いちばん近い残弾のある基地から撃ち、照準を最後の点に移す。省略は「触っていない」
   */
  readonly taps?: readonly Point[];
}

export const NO_FIRE: FireButtons = Object.freeze([false, false, false] as const);
export const NO_INPUT: StepInput = Object.freeze({ move: Object.freeze({ x: 0, y: 0 }), pointer: null, fire: NO_FIRE });

export function createGame(seed: number): GameState {
  return {
    step: 0,
    rng: seedState(seed),
    cursor: INITIAL_CURSOR,
    bases: BASE_XS.map((x) => ({ x, ammo: AMMO_PER_BASE, alive: true })),
    cities: CITY_XS.map((x) => ({ x, alive: true })),
    interceptors: [],
    blasts: [],
    enemies: [],
    impacts: [],
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

/** 触った点ごとに、いちばん近い残弾のある基地から撃つ。1 発撃つたびに残弾が変わるので、点の順に選び直す */
function fireAtTaps(bases: readonly Base[], taps: readonly Point[]): { bases: Base[]; launched: Interceptor[] } {
  const next = [...bases];
  const launched: Interceptor[] = [];
  for (const t of taps) {
    const p = clampTap(t);
    const i = chooseBase(next, p.x);
    const b = next[i];
    if (!b) continue; // 3 つとも残弾 0
    launched.push(launch(i, b.x, p.x, p.y));
    next[i] = { ...b, ammo: b.ammo - 1 };
  }
  return { bases: next, launched };
}

/** 触った点があれば、照準を最後の点に移す（すぐ動く。速さは 0） */
function cursorAfterTaps(cursor: Cursor, taps: readonly Point[]): Cursor {
  const last = taps[taps.length - 1];
  if (!last) return cursor;
  const p = clampTap(last);
  return { x: p.x, y: p.y, vx: 0, vy: 0 };
}

/** 1 ステップ進める。順番：照準 → 発射（キー → 触った点）→ 迎撃ミサイル → 爆風 → 敵が出る → 敵が動く（爆風で消える・地面に着く）→ 誘爆の爆風を足す → 落ちた所の都市・基地が壊れる */
export function step(state: GameState, input: StepInput): GameState {
  const taps = input.taps ?? [];
  const aimed = stepCursor(state.cursor, input.move, input.pointer);
  const fired = fire(state.bases, input.fire, aimed);
  const tapped = fireAtTaps(fired.bases, taps);
  const cursor = cursorAfterTaps(aimed, taps);
  const moved = stepInterceptors([...state.interceptors, ...fired.launched, ...tapped.launched]);
  // 着いた迎撃ミサイルは、その場で爆風になる（age 0 から）
  const newBlasts = moved.arrived.map((m) => ({ x: m.toX, y: m.toY, age: 0 }));
  const blasts = [...stepBlasts(state.blasts), ...newBlasts];
  const spawned = spawnEnemy(state.step, state.rng);
  const enemies = stepEnemies(spawned.enemy ? [...state.enemies, spawned.enemy] : state.enemies, blasts);
  const landedAt = enemies.landed.map((m) => ({ x: m.toX, y: m.toY, age: 0 }));
  // 誘爆（LLM-PBI-0003）：爆風で壊れた敵の弾頭の場所に、迎撃と同じ爆風を出す。
  // このステップの判定が終わってから足すので、次のステップから効く（1 ステップの中で連鎖が止まらなくなるのを防ぐ）
  const chained = enemies.destroyed.map((m) => ({ ...enemyHead(m), age: 0 }));
  // 被弾（LLM-PBI-0003）：落ちた所の都市・基地が壊れる
  const damaged = applyLandings(state.cities, tapped.bases, enemies.landed.map((m) => enemyHead(m).x));
  return {
    ...state,
    step: state.step + 1,
    cursor,
    bases: damaged.bases,
    cities: damaged.cities,
    rng: spawned.rng,
    interceptors: moved.flying,
    blasts: [...blasts, ...chained],
    enemies: enemies.flying,
    impacts: [...stepImpacts(state.impacts), ...landedAt],
  };
}
