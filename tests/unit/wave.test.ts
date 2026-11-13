import { describe, expect, it } from 'vitest';
import { AMMO_PER_BASE, WAVE_BREAK_STEPS, WAVE_ENEMY_COUNTS, WAVE_MIRV_COUNTS } from '../../src/core/config';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';
import { enemySpeedRange, spawnIntervalSteps } from '../../src/core/enemy';
import { estimatedClearSeconds, WAVE_COUNT } from '../../src/core/wave';

describe('難しさ（LLM-PBI-0011）', () => {
  it('LLM-TC-0011-02 ウェーブが進むほど、敵の速さが下がらず、出る間隔が長くならない。WAVE 5 は WAVE 1 より速く短い', () => {
    for (let n = 2; n <= WAVE_COUNT; n++) {
      expect(enemySpeedRange(n).min).toBeGreaterThanOrEqual(enemySpeedRange(n - 1).min);
      expect(enemySpeedRange(n).max).toBeGreaterThanOrEqual(enemySpeedRange(n - 1).max);
      expect(spawnIntervalSteps(n)).toBeLessThanOrEqual(spawnIntervalSteps(n - 1));
    }
    expect(enemySpeedRange(WAVE_COUNT).min).toBeGreaterThan(enemySpeedRange(1).min);
    expect(spawnIntervalSteps(WAVE_COUNT)).toBeLessThan(spawnIntervalSteps(1));
  });

  it('LLM-TC-0011-03 守り切ったときの長さの目安が 150〜210 秒（2 分半〜3 分半）', () => {
    const sec = estimatedClearSeconds();
    expect(sec).toBeGreaterThanOrEqual(150);
    expect(sec).toBeLessThanOrEqual(210);
  });

  it('LLM-TC-0011-01 出る間隔と速さは、ウェーブの中で実際に出た敵に効いている', () => {
    const s = runUntil(createGame(11), (x) => x.wave.number === WAVE_COUNT && x.wave.status === 'playing', true);
    const steps: number[] = [];
    const speeds: number[] = [];
    let seen = 0;
    runUntil(
      s,
      (x) => {
        if (x.wave.spawned > seen) {
          seen = x.wave.spawned;
          steps.push(x.wave.phaseStep);
          const m = x.enemies[x.enemies.length - 1];
          if (m) speeds.push(m.speed);
        }
        return seen >= 3;
      },
      true,
    );
    expect(steps[1]! - steps[0]!).toBe(spawnIntervalSteps(WAVE_COUNT));
    for (const v of speeds) {
      expect(v).toBeGreaterThanOrEqual(enemySpeedRange(WAVE_COUNT).min);
      expect(v).toBeLessThanOrEqual(enemySpeedRange(WAVE_COUNT).max);
    }
  });
});

const run = (s: GameState, n: number): GameState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = step(cur, NO_INPUT);
  return cur;
};

/**
 * 状態が変わるまで進める（上限つき）。
 * keepAlive のときは、ウェーブの進み方だけを確かめるため、毎ステップ都市と基地を始めの状態に戻し、
 * 6 都市全滅・弾切れの GAME OVER にならないようにする（狙う物以外は消して前提を確かめる。TEAM 5.6）
 */
function runUntil(s: GameState, done: (s: GameState) => boolean, keepAlive = false, limit = 120 * 600): GameState {
  let cur = s;
  const keep = (x: GameState): GameState => (keepAlive ? { ...x, cities: s.cities, bases: s.bases } : x);
  for (let i = 0; i < limit && !done(cur); i++) cur = keep(step(cur, NO_INPUT));
  if (!done(cur)) throw new Error('上限までに変わらなかった');
  return cur;
}

describe('ウェーブ（LLM-PBI-0004）', () => {
  it('LLM-TC-0004-01 始めは WAVE 1 のあいだ（約 3 秒）で敵は出ず、そのあと WAVE 1 が始まる', () => {
    const s0 = createGame(1);
    expect(s0.wave).toMatchObject({ number: 1, status: 'break' });
    const justBefore = run(s0, WAVE_BREAK_STEPS);
    expect(justBefore.wave.status).toBe('break');
    expect(justBefore.enemies).toHaveLength(0);
    const started = run(justBefore, 1);
    expect(started.wave).toMatchObject({ number: 1, status: 'playing' });
  });

  // LLM-TC-0004-01（4 ウェーブ・6・9・12・15）は LLM-TC-0011-01 に置き換わった（LLM-PBI-0011）
  it('LLM-TC-0011-01 5 ウェーブで、それぞれ決まった数の敵だけが出て、ウェーブが進むほど多い。5 ウェーブ目が終わると CLEAR', () => {
    expect(WAVE_COUNT).toBe(5);
    // v1.1：敵の攻撃は v1.0（敵 8・12・15・18・21、多弾頭 0・3・4・5・6、間隔 2.0〜1.6 秒）の 1.5 倍（数は切り上げ、間隔は 1/1.5）
    expect([...WAVE_ENEMY_COUNTS]).toEqual([8, 12, 15, 18, 21].map((c) => Math.ceil(c * 1.5)));
    expect([...WAVE_MIRV_COUNTS]).toEqual([0, 3, 4, 5, 6].map((c) => Math.ceil(c * 1.5)));
    expect([1, 2, 3, 4, 5].map((n) => spawnIntervalSteps(n))).toEqual([2.0, 1.9, 1.8, 1.7, 1.6].map((s) => Math.round((s / 1.5) * 120)));
    for (let i = 1; i < WAVE_ENEMY_COUNTS.length; i++) {
      expect(WAVE_ENEMY_COUNTS[i]).toBeGreaterThan(WAVE_ENEMY_COUNTS[i - 1] ?? 0);
    }
    let s = createGame(3);
    const counts: number[] = [];
    for (let n = 1; n <= WAVE_COUNT; n++) {
      s = runUntil(s, (x) => x.wave.number === n && x.wave.status === 'playing', true);
      let max = 0;
      // そのウェーブが終わるまでに出た数を数える
      s = runUntil(
        s,
        (x) => {
          max = Math.max(max, x.wave.spawned);
          return x.wave.status !== 'playing';
        },
        true,
      );
      counts.push(max);
    }
    expect(counts).toEqual([...WAVE_ENEMY_COUNTS]);
    expect(s.wave.status).toBe('clear');
  });

  it('LLM-TC-0004-02 ウェーブの敵がすべて消えると、次のウェーブのあいだ（約 3 秒）になり、そのあいだは敵が出ない', () => {
    let s = runUntil(createGame(5), (x) => x.wave.status === 'playing');
    // 敵が多い（LLM-PBI-0011 v1.1）と都市が全部壊れて GAME OVER になることがあるので、都市と基地は戻す（TEAM 5.6）
    s = runUntil(s, (x) => x.wave.status === 'break', true);
    expect(s.wave.number).toBe(2);
    expect(s.enemies).toHaveLength(0);
    const inBreak = run(s, WAVE_BREAK_STEPS);
    expect(inBreak.wave.status).toBe('break');
    expect(inBreak.enemies).toHaveLength(0);
    expect(run(inBreak, 1).wave).toMatchObject({ number: 2, status: 'playing' });
  });

  it('LLM-TC-0004-02 次のウェーブが始まると、壊れていない基地は 10 発に戻り、壊れた基地は 0 のまま', () => {
    const s = runUntil(createGame(5), (x) => x.wave.status === 'playing');
    // ウェーブ 1 の終わり：基地 A は撃ち減らし、基地 B は壊れている、と置く
    const ending: GameState = {
      ...s,
      enemies: [],
      wave: { ...s.wave, spawned: WAVE_ENEMY_COUNTS[0] },
      bases: [
        { x: 40, ammo: 3, alive: true },
        { x: 240, ammo: 0, alive: false },
        { x: 440, ammo: 10, alive: true },
      ],
    };
    const inBreak = step(ending, NO_INPUT);
    expect(inBreak.wave).toMatchObject({ number: 2, status: 'break' });
    expect(inBreak.bases.map((b) => b.ammo)).toEqual([3, 0, 10]); // あいだはまだ戻らない
    const next = runUntil(inBreak, (x) => x.wave.status === 'playing');
    expect(next.bases.map((b) => b.ammo)).toEqual([AMMO_PER_BASE, 0, AMMO_PER_BASE]);
    expect(next.bases.map((b) => b.alive)).toEqual([true, false, true]);
  });

  it('LLM-TC-0004-03 最後のウェーブの敵をすべて出し終えて画面の敵がいなくなると CLEAR', () => {
    const s = runUntil(createGame(7), (x) => x.wave.status === 'playing');
    const lastEnding: GameState = {
      ...s,
      enemies: [],
      wave: { number: WAVE_COUNT, status: 'playing', phaseStep: 999, spawned: WAVE_ENEMY_COUNTS[WAVE_COUNT - 1] ?? 0 },
    };
    expect(step(lastEnding, NO_INPUT).wave.status).toBe('clear');
    // 敵が残っているうちは CLEAR にならない
    const stillFlying: GameState = {
      ...lastEnding,
      enemies: [{ fromX: 100, fromY: 0, toX: 100, toY: 592, speed: 0.001, traveled: 100 }],
    };
    expect(step(stillFlying, NO_INPUT).wave.status).toBe('playing');
  });
});
