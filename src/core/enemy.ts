import { isInsideBlast, type Blast } from './blast';
import {
  BASE_XS,
  CITY_XS,
  GROUND_Y,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MIRV_MAX_CHILDREN,
  MIRV_MIN_CHILDREN,
  MIRV_SPLIT_MAX_RATIO,
  MIRV_SPLIT_MIN_RATIO,
  STEPS_PER_SECOND,
} from './config';
import { nextRandom } from './random';
import { groundYAt } from './terrain';

/** 地面の上の点（狙う所） */
export interface Target {
  readonly x: number;
  readonly y: number;
}

/** 多弾頭の分かれ方（LLM-PBI-0008）。分かれる前の親だけが持つ */
export interface MirvSplit {
  /** 弾頭がこの y を越えたステップで分かれる */
  readonly atY: number;
  /** 子の弾の狙い（2〜3 つ、すべて別の所）。親が出たときに決める（弾切れの判定 LLM-TC-0004-05 で数えるため） */
  readonly targets: readonly Target[];
}

/** 敵の弾。画面の上端（子の弾は分かれた点）から目標へ直線で落ちる */
export interface EnemyMissile {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  /** 1 ステップあたりの速さ */
  readonly speed: number;
  readonly traveled: number;
  /** 多弾頭で、まだ分かれていない（LLM-PBI-0008）。見た目は通常の弾と同じ */
  readonly split?: MirvSplit;
  /** 多弾頭の子の弾：親が出た点。親の航跡（ここから from まで）を描くのに使う（LLM-GUI-0001 §4） */
  readonly trailFrom?: { readonly x: number; readonly y: number };
}

/** 地面に着いた跡の閃光。age は出てからのステップ数 */
export interface Impact {
  readonly x: number;
  readonly y: number;
  readonly age: number;
}

/** 速さ：1 秒に 32〜48 ドット（画面の上から地面まで約 12.3〜18.5 秒） */
export const ENEMY_MIN_SPEED = 32 / STEPS_PER_SECOND;
export const ENEMY_MAX_SPEED = 48 / STEPS_PER_SECOND;
/** 出る間隔。ウェーブが始まってからのステップで数える（ウェーブごとの数は config の WAVE_ENEMY_COUNTS） */
export const ENEMY_SPAWN_INTERVAL = 2 * STEPS_PER_SECOND;
export const ENEMY_FIRST_SPAWN_STEP = Math.round(0.5 * STEPS_PER_SECOND);
/** 閃光の長さ（LLM-GUI-0001 §4：0.2 秒） */
export const IMPACT_STEPS = Math.round(0.2 * STEPS_PER_SECOND);
/** 多弾頭が分かれる高さの範囲（LLM-PBI-0008：上から 4〜6 割） */
export const MIRV_SPLIT_MIN_Y = MIRV_SPLIT_MIN_RATIO * LOGICAL_HEIGHT;
export const MIRV_SPLIT_MAX_Y = MIRV_SPLIT_MAX_RATIO * LOGICAL_HEIGHT;

/** 狙える目標：都市 6 つと基地 3 つ（地面の上の点） */
export const TARGETS: readonly Target[] = [...CITY_XS, ...BASE_XS].map((x) => ({ x, y: groundYAt(x) }));

export const enemyTotal = (m: EnemyMissile): number => Math.hypot(m.toX - m.fromX, m.toY - m.fromY);

/** 弾頭（先端）の今の位置 */
export function enemyHead(m: EnemyMissile): { x: number; y: number } {
  const d = enemyTotal(m);
  const t = d === 0 ? 1 : Math.min(1, m.traveled / d);
  return { x: m.fromX + (m.toX - m.fromX) * t, y: m.fromY + (m.toY - m.fromY) * t };
}

/** この敵がこれから狙う所（分かれる前の多弾頭は子の狙い。LLM-TC-0004-05・LLM-TC-0008-05） */
export const enemyAims = (m: EnemyMissile): readonly Target[] => m.split?.targets ?? [{ x: m.toX, y: m.toY }];

/**
 * 多弾頭の分かれ方を乱数で決める：上から 4〜6 割の高さ、2〜3 発、狙いはすべて別の所
 */
function rollSplit(rng: number): { split: MirvSplit; rng: number } {
  const h = nextRandom(rng);
  const n = nextRandom(h.state);
  const count = MIRV_MIN_CHILDREN + Math.min(MIRV_MAX_CHILDREN - MIRV_MIN_CHILDREN, Math.floor(n.value * (MIRV_MAX_CHILDREN - MIRV_MIN_CHILDREN + 1)));
  const pool = [...TARGETS];
  const targets: Target[] = [];
  let state = n.state;
  for (let i = 0; i < count; i++) {
    const r = nextRandom(state);
    state = r.state;
    const [t] = pool.splice(Math.floor(r.value * pool.length), 1);
    if (t) targets.push(t);
  }
  return { split: { atY: MIRV_SPLIT_MIN_Y + h.value * (MIRV_SPLIT_MAX_Y - MIRV_SPLIT_MIN_Y), targets }, rng: state };
}

/**
 * このステップで出るなら、乱数で出る位置・目標・速さを決める。
 * mirv なら多弾頭にする（分かれ方の乱数は、そのあとに続けて取る。通常の弾だけのウェーブの乱数の並びは変わらない）
 */
export function spawnEnemy(step: number, rng: number, mirv = false): { enemy: EnemyMissile | null; rng: number } {
  if (step < ENEMY_FIRST_SPAWN_STEP || (step - ENEMY_FIRST_SPAWN_STEP) % ENEMY_SPAWN_INTERVAL !== 0) return { enemy: null, rng };
  const a = nextRandom(rng);
  const b = nextRandom(a.state);
  const c = nextRandom(b.state);
  const target = TARGETS[Math.floor(b.value * TARGETS.length)] ?? TARGETS[0];
  if (!target) return { enemy: null, rng: c.state };
  const enemy: EnemyMissile = {
    fromX: 8 + a.value * (LOGICAL_WIDTH - 16),
    fromY: 0,
    toX: target.x,
    toY: target.y,
    speed: ENEMY_MIN_SPEED + c.value * (ENEMY_MAX_SPEED - ENEMY_MIN_SPEED),
    traveled: 0,
  };
  if (!mirv) return { enemy, rng: c.state };
  const s = rollSplit(c.state);
  return { enemy: { ...enemy, split: s.split }, rng: s.rng };
}

/** 多弾頭が分かれる：弾頭の今の点から、子の弾をそれぞれの狙いへ出す（速さは親と同じ。LLM-TC-0008-02） */
export function splitMirv(m: EnemyMissile): EnemyMissile[] {
  if (!m.split) return [m];
  const head = enemyHead(m);
  const trailFrom = m.trailFrom ?? { x: m.fromX, y: m.fromY };
  return m.split.targets.map((t) => ({ fromX: head.x, fromY: head.y, toX: t.x, toY: t.y, speed: m.speed, traveled: 0, trailFrom }));
}

/**
 * 敵を 1 ステップ進める。
 * - 爆風の中に入ったものは消える（destroyed。誘爆は LLM-PBI-0003）。分かれる前の多弾頭も 1 発として消え、子は出ない
 * - 地面（目標）に着いたものは消え、閃光を残す（landed。被害は LLM-PBI-0003）
 * - 分かれる高さを越えた多弾頭は、子の弾に替わる（LLM-PBI-0008。子は次のステップから動く）
 */
export function stepEnemies(list: readonly EnemyMissile[], blasts: readonly Blast[]): { flying: EnemyMissile[]; destroyed: EnemyMissile[]; landed: EnemyMissile[] } {
  const flying: EnemyMissile[] = [];
  const destroyed: EnemyMissile[] = [];
  const landed: EnemyMissile[] = [];
  for (const m of list) {
    const next = { ...m, traveled: m.traveled + m.speed };
    const head = enemyHead(next);
    if (isInsideBlast(blasts, head.x, head.y)) destroyed.push(next);
    else if (next.traveled >= enemyTotal(next) || head.y >= GROUND_Y) landed.push(next);
    else if (next.split && head.y >= next.split.atY) flying.push(...splitMirv(next));
    else flying.push(next);
  }
  return { flying, destroyed, landed };
}

/** 閃光を 1 ステップ進め、消えたものを除く */
export function stepImpacts(list: readonly Impact[]): Impact[] {
  return list.map((i) => ({ ...i, age: i.age + 1 })).filter((i) => i.age < IMPACT_STEPS);
}
