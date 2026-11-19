import { describe, expect, it } from 'vitest';
import { aircraftPath, aircraftPlan, aircraftSpeed, launchAircraft, stepAircraft, targetBelow, type Aircraft } from '../../src/core/aircraft';
import { BOMBER_DROP, SATELLITE_DROP, STEPS_PER_SECOND } from '../../src/core/config';
import { enemySpeedRange, spawnEnemy } from '../../src/core/enemy';
import { seedState } from '../../src/core/random';

const SEEDS = Array.from({ length: 60 }, (_, k) => seedState(k + 1));
const crossing = (kind: 'bomber' | 'satellite') => aircraftPath(kind) / aircraftSpeed(kind);

/** 飛び終わるまで進め、落とした弾（落とした時の年・x・速さ・狙い）を集める */
function fly(a: Aircraft, wave: number): { atAge: number; x: number; speed: number; toX: number }[] {
  let list: Aircraft[] = [a];
  const out: { atAge: number; x: number; speed: number; toX: number }[] = [];
  for (let i = 0; i < 5000 && list.length > 0; i++) {
    const age = (list[0]?.age ?? 0) + 1;
    const r = stepAircraft(list, [], wave);
    for (const d of r.drops) out.push({ atAge: age, x: d.fromX, speed: d.speed, toX: d.toX });
    list = r.flying;
  }
  return out;
}

describe('落とす弾の位置と速さが毎回変わる（LLM-PBI-0021）', () => {
  it('LLM-TC-0021-01 爆撃機は道のりの 15〜85% の 2 か所で落とし、2 か所は 20% 以上あく。種で位置が変わる', () => {
    const firsts = new Set<number>();
    for (const r of SEEDS) {
      const p = aircraftPlan(2, r)[0];
      if (!p?.drops) throw new Error('落とし方がない');
      expect(p.drops).toHaveLength(2);
      const [a, b] = p.drops.map((d) => d.atAge / crossing('bomber'));
      expect(a).toBeGreaterThanOrEqual(BOMBER_DROP.minRatio - 0.01);
      expect(b).toBeLessThanOrEqual(BOMBER_DROP.maxRatio + 0.01);
      expect((b ?? 0) - (a ?? 0)).toBeGreaterThanOrEqual(BOMBER_DROP.gapRatio - 0.01);
      firsts.add(Math.round((a ?? 0) * 100));
      // 実際に飛ばすと、決めた年に落とす
      expect(fly(launchAircraft(p), 2).map((d) => d.atAge)).toEqual(p.drops.map((d) => d.atAge));
    }
    expect(firsts.size).toBeGreaterThan(10);
  });

  it('LLM-TC-0021-02 衛星は 1.5〜3.5 秒（縮めたときはそれより短い）の間隔で 3 発、画面の中にいるうちに落とし終える', () => {
    const gaps = new Set<number>();
    for (const r of SEEDS) {
      const p = aircraftPlan(3, r)[0];
      if (!p?.drops) throw new Error('落とし方がない');
      expect(p.drops).toHaveLength(3);
      let prev = 0;
      for (const d of p.drops) {
        const gap = (d.atAge - prev) / STEPS_PER_SECOND;
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(SATELLITE_DROP.maxIntervalSeconds + 0.01);
        gaps.add(Math.round(gap * 10));
        prev = d.atAge;
      }
      expect(prev).toBeLessThanOrEqual(crossing('satellite') - SATELLITE_DROP.finishMarginSeconds * STEPS_PER_SECOND + 1);
      expect(fly(launchAircraft(p), 3)).toHaveLength(3);
    }
    expect(gaps.size).toBeGreaterThan(5);
  });

  it('LLM-TC-0021-03 落とす弾の速さは、ウェーブの速さの範囲の中で 1 発ごとに変わる', () => {
    const speeds = new Set<number>();
    for (const r of SEEDS.slice(0, 20)) {
      const p = aircraftPlan(4, r)[0];
      const range = enemySpeedRange(4);
      for (const d of fly(launchAircraft(p ?? { kind: 'bomber', dir: 1, y: 120, atStep: 0 }), 4)) {
        expect(d.speed).toBeGreaterThanOrEqual(range.min);
        expect(d.speed).toBeLessThanOrEqual(range.max);
        speeds.add(Math.round(d.speed * 1000));
      }
    }
    expect(speeds.size).toBeGreaterThan(10);
  });

  it('LLM-TC-0021-04 狙いは真下にいちばん近い都市・基地。同じ種なら同じ。地上の敵の乱数は使わない', () => {
    const p = aircraftPlan(5, seedState(7));
    expect(aircraftPlan(5, seedState(7))).toEqual(p);
    for (const plan of p) for (const d of fly(launchAircraft(plan), 5)) expect(d.toX).toBe(targetBelow(d.x).x);
    // 地上の敵は、空の敵の計画とは別に、同じ乱数の状態から同じ敵が出る（空の敵は rng を進めない）
    const rng = seedState(42);
    aircraftPlan(2, rng);
    expect(spawnEnemy(60, rng, false, 2)).toEqual(spawnEnemy(60, rng, false, 2));
  });
});
