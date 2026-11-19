// 空の敵：爆撃機と衛星（LLM-PBI-0009、仕様書 §4.1）。
// 地上の敵の乱数の並びは進めない（ウェーブの始めの乱数の状態から別の並びを作る。多弾頭の mirvPlan と同じ考え方）
import { blastRadius, type Blast } from './blast';
import { AIRCRAFT_GAP_SECONDS, BOMBER, BOMBER_DROP, LOGICAL_WIDTH, SATELLITE, SATELLITE_DROP, STEPS_PER_SECOND, WAVE_AIRCRAFT, WAVE_ENEMY_COUNTS } from './config';
import { ENEMY_FIRST_SPAWN_STEP, enemySpeedRange, spawnIntervalSteps, TARGETS, type EnemyMissile, type Target } from './enemy';
import { nextRandom } from './random';

export type AircraftKind = 'bomber' | 'satellite';

/** ウェーブの始めに決める、そのウェーブの空の敵の出方 */
export interface AircraftPlan {
  readonly kind: AircraftKind;
  /** 1：左から右へ、-1：右から左へ */
  readonly dir: 1 | -1;
  readonly y: number;
  /** ウェーブが始まってから何ステップで出るか */
  readonly atStep: number;
  /** 落とす時と速さ（LLM-PBI-0021。ないときは決まった落とし方） */
  readonly drops?: readonly DropPlan[];
}

/** 1 発の落とし方：出てから何ステップで落とすか・弾の速さ（1 ステップあたり） */
export interface DropPlan {
  readonly atAge: number;
  readonly speed: number;
}

/** 飛んでいる空の敵 */
export interface Aircraft {
  readonly kind: AircraftKind;
  readonly dir: 1 | -1;
  /** 機体の中心 */
  readonly x: number;
  readonly y: number;
  /** 出てからのステップ数 */
  readonly age: number;
  /** もう落とした数 */
  readonly dropped: number;
  /** 落とす時と速さ（LLM-PBI-0021。計画から出したものは必ず持つ。ないときは決まった落とし方） */
  readonly drops?: readonly DropPlan[];
}

const spec = (kind: AircraftKind) => (kind === 'bomber' ? BOMBER : SATELLITE);

/** 1 ステップに進む距離 */
export const aircraftSpeed = (kind: AircraftKind): number => spec(kind).speed / STEPS_PER_SECOND;
/** 当たりの四角の大きさ */
export const aircraftSize = (kind: AircraftKind): { width: number; height: number } => ({ width: spec(kind).width, height: spec(kind).height });
/** 落とす数 */
export const aircraftDrops = (kind: AircraftKind): number => spec(kind).drops;
/** 横切る道のり：機体が画面の外（左右の端の外）から、反対の端の外まで */
export const aircraftPath = (kind: AircraftKind): number => LOGICAL_WIDTH + spec(kind).width;

/** そのウェーブで出る空の敵（LLM-TC-0009-01） */
export const aircraftInWave = (n: number): readonly AircraftKind[] => WAVE_AIRCRAFT[n - 1] ?? [];

/** 空の敵が出るステップ：地上の敵の半分（切り上げ）の最後の 1 発が出るステップ。2 機目は 4 秒あと */
export function aircraftFirstStep(n: number): number {
  const total = WAVE_ENEMY_COUNTS[n - 1] ?? 0;
  const half = Math.max(1, Math.ceil(total / 2));
  return ENEMY_FIRST_SPAWN_STEP + (half - 1) * spawnIntervalSteps(n);
}

/** 横切るのにかかるステップ数 */
const crossingSteps = (kind: AircraftKind): number => aircraftPath(kind) / aircraftSpeed(kind);

/**
 * 落とす時と速さを乱数で決める（LLM-PBI-0021）。next は乱数を 1 つずつ取り出す関数。
 * 爆撃機：道のりの 15〜85% の 2 か所（20% 以上あける）。衛星：1.5〜3.5 秒の間隔で 3 発（出る 0.5 秒前までに収める）。
 * 速さ：そのウェーブの地上の敵と同じ範囲
 */
export function rollDrops(kind: AircraftKind, wave: number, next: () => number): DropPlan[] {
  const range = enemySpeedRange(wave);
  const speed = () => range.min + next() * (range.max - range.min);
  if (kind === 'bomber') {
    const { minRatio, maxRatio, gapRatio } = BOMBER_DROP;
    const a = minRatio + next() * (maxRatio - gapRatio - minRatio);
    const b = a + gapRatio + next() * (maxRatio - (a + gapRatio));
    return [a, b].map((ratio) => ({ atAge: Math.round(ratio * crossingSteps(kind)), speed: speed() }));
  }
  const { minIntervalSeconds, maxIntervalSeconds, finishMarginSeconds } = SATELLITE_DROP;
  const gaps = Array.from({ length: SATELLITE.drops }, () => (minIntervalSeconds + next() * (maxIntervalSeconds - minIntervalSeconds)) * STEPS_PER_SECOND);
  const limit = crossingSteps(kind) - finishMarginSeconds * STEPS_PER_SECOND;
  const total = gaps.reduce((s, g) => s + g, 0);
  const k = total > limit ? limit / total : 1;
  let at = 0;
  return gaps.map((g) => {
    at += g * k;
    return { atAge: Math.round(at), speed: speed() };
  });
}

/** ウェーブ n の空の敵の出方を、乱数の状態 rng から決める（同じ rng なら同じ。地上の敵の乱数は進めない） */
export function aircraftPlan(n: number, rng: number): readonly AircraftPlan[] {
  const kinds = aircraftInWave(n);
  let state = (rng ^ 0x27d4eb2f ^ Math.imul(n, 0x85ebca6b)) >>> 0;
  const next = () => {
    const r = nextRandom(state);
    state = r.state;
    return r.value;
  };
  const first = aircraftFirstStep(n);
  return kinds.map((kind, i) => {
    const side = next();
    const h = next();
    const s = spec(kind);
    return {
      kind,
      dir: side < 0.5 ? 1 : -1,
      y: s.minY + h * (s.maxY - s.minY),
      atStep: first + Math.round(i * AIRCRAFT_GAP_SECONDS * STEPS_PER_SECOND),
      drops: rollDrops(kind, n, next),
    };
  });
}

/** 計画から機体を出す：画面の外（機体の半分の幅だけ外）から */
export function launchAircraft(p: AircraftPlan): Aircraft {
  const half = spec(p.kind).width / 2;
  const a: Aircraft = { kind: p.kind, dir: p.dir, x: p.dir === 1 ? -half : LOGICAL_WIDTH + half, y: p.y, age: 0, dropped: 0 };
  return p.drops ? { ...a, drops: p.drops } : a;
}

/** この機体の、age ステップまでに落としているはずの数（落とし方を持っていればそれ、なければ決まった落とし方） */
export function dueDrops(a: Aircraft, age: number): number {
  if (a.drops) return a.drops.filter((d) => d.atAge <= age).length;
  return dropsDue(a.kind, age);
}

/** 落とす数（落とし方を持っていればその数） */
export const totalDrops = (a: Aircraft): number => a.drops?.length ?? aircraftDrops(a.kind);

/** 横切った道のり */
const traveled = (a: Aircraft): number => a.age * aircraftSpeed(a.kind);

/**
 * age ステップのとき、ここまでに落としているはずの数。
 * 爆撃機：道のりを (落とす数 ＋ 1) に等分した所ごと。衛星：出てから 2.5 秒ごと
 */
export function dropsDue(kind: AircraftKind, age: number): number {
  if (kind === 'bomber') {
    const per = aircraftPath(kind) / (BOMBER.drops + 1);
    return Math.min(BOMBER.drops, Math.floor((age * aircraftSpeed(kind)) / per));
  }
  const every = Math.round(SATELLITE.dropIntervalSeconds * STEPS_PER_SECOND);
  return Math.min(SATELLITE.drops, Math.floor(age / every));
}

/** x の真下にいちばん近い都市・基地（同じ近さなら先のもの） */
export function targetBelow(x: number): Target {
  let best = TARGETS[0] as Target;
  for (const t of TARGETS) if (Math.abs(t.x - x) < Math.abs(best.x - x)) best = t;
  return best;
}

/**
 * 落とす弾：機体の下の端から、真下にいちばん近い都市・基地へ。
 * 速さは落とし方に決めた値（LLM-PBI-0021）。落とし方がなければ、そのウェーブの速さの範囲の真ん中
 */
export function dropMissile(a: Aircraft, wave: number): EnemyMissile {
  const t = targetBelow(a.x);
  const r = enemySpeedRange(wave);
  const speed = a.drops?.[a.dropped]?.speed ?? (r.min + r.max) / 2;
  return { fromX: a.x, fromY: a.y + spec(a.kind).height / 2, toX: t.x, toY: t.y, speed, traveled: 0 };
}

/** 爆風の円が機体の四角に重なるか（LLM-TC-0009-04） */
export function isHitByBlast(a: Aircraft, blasts: readonly Blast[]): boolean {
  const { width, height } = aircraftSize(a.kind);
  const left = a.x - width / 2;
  const top = a.y - height / 2;
  return blasts.some((b) => {
    const r = blastRadius(b.age);
    if (r <= 0) return false;
    const nx = Math.min(Math.max(b.x, left), left + width);
    const ny = Math.min(Math.max(b.y, top), top + height);
    return (b.x - nx) ** 2 + (b.y - ny) ** 2 <= r * r;
  });
}

/**
 * 空の敵を 1 ステップ進める。
 * - 爆風に重なったものは壊れる（destroyed。100 点・誘爆は呼ぶ側）。壊れたら落とさない
 * - 落とす時が来たら弾を落とす（dropped の弾。次のステップから動く）
 * - 反対の端の外まで行ったものは消える
 */
export function stepAircraft(
  list: readonly Aircraft[],
  blasts: readonly Blast[],
  wave: number,
): { flying: Aircraft[]; destroyed: Aircraft[]; drops: EnemyMissile[] } {
  const flying: Aircraft[] = [];
  const destroyed: Aircraft[] = [];
  const drops: EnemyMissile[] = [];
  for (const a of list) {
    const age = a.age + 1;
    const moved: Aircraft = { ...a, age, x: a.x + a.dir * aircraftSpeed(a.kind) };
    if (isHitByBlast(moved, blasts)) {
      destroyed.push(moved);
      continue;
    }
    const due = dueDrops(a, age);
    let next = moved;
    while (next.dropped < due) {
      drops.push(dropMissile(next, wave));
      next = { ...next, dropped: next.dropped + 1 };
    }
    if (traveled(next) >= aircraftPath(a.kind)) continue; // 出ていった
    flying.push(next);
  }
  return { flying, destroyed, drops };
}

/** まだ落とす弾が残っているか（弾切れの判定 LLM-TC-0009-05） */
export const hasDropsLeft = (a: Aircraft): boolean => a.dropped < totalDrops(a);
