import { isInsideBlast, type Blast } from './blast';
import { BASE_XS, CITY_XS, GROUND_Y, LOGICAL_WIDTH, STEPS_PER_SECOND } from './config';
import { nextRandom } from './random';
import { groundYAt } from './terrain';

/** 敵の通常弾（アタックミサイル）。画面の上端から目標へ直線で落ちる */
export interface EnemyMissile {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  /** 1 ステップあたりの速さ */
  readonly speed: number;
  readonly traveled: number;
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

/** 狙える目標：都市 6 つと基地 3 つ（地面の上の点） */
export const TARGETS: readonly { x: number; y: number }[] = [...CITY_XS, ...BASE_XS].map((x) => ({ x, y: groundYAt(x) }));

export const enemyTotal = (m: EnemyMissile): number => Math.hypot(m.toX - m.fromX, m.toY - m.fromY);

/** 弾頭（先端）の今の位置 */
export function enemyHead(m: EnemyMissile): { x: number; y: number } {
  const d = enemyTotal(m);
  const t = d === 0 ? 1 : Math.min(1, m.traveled / d);
  return { x: m.fromX + (m.toX - m.fromX) * t, y: m.fromY + (m.toY - m.fromY) * t };
}

/** このステップで出るなら、乱数で出る位置・目標・速さを決める */
export function spawnEnemy(step: number, rng: number): { enemy: EnemyMissile | null; rng: number } {
  if (step < ENEMY_FIRST_SPAWN_STEP || (step - ENEMY_FIRST_SPAWN_STEP) % ENEMY_SPAWN_INTERVAL !== 0) return { enemy: null, rng };
  const a = nextRandom(rng);
  const b = nextRandom(a.state);
  const c = nextRandom(b.state);
  const target = TARGETS[Math.floor(b.value * TARGETS.length)] ?? TARGETS[0];
  if (!target) return { enemy: null, rng: c.state };
  return {
    enemy: {
      fromX: 8 + a.value * (LOGICAL_WIDTH - 16),
      fromY: 0,
      toX: target.x,
      toY: target.y,
      speed: ENEMY_MIN_SPEED + c.value * (ENEMY_MAX_SPEED - ENEMY_MIN_SPEED),
      traveled: 0,
    },
    rng: c.state,
  };
}

/**
 * 敵を 1 ステップ進める。
 * - 爆風の中に入ったものは消える（destroyed。誘爆は LLM-PBI-0003）
 * - 地面（目標）に着いたものは消え、閃光を残す（landed。被害は LLM-PBI-0003）
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
    else flying.push(next);
  }
  return { flying, destroyed, landed };
}

/** 閃光を 1 ステップ進め、消えたものを除く */
export function stepImpacts(list: readonly Impact[]): Impact[] {
  return list.map((i) => ({ ...i, age: i.age + 1 })).filter((i) => i.age < IMPACT_STEPS);
}
