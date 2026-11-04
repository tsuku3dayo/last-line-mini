import { describe, expect, it } from 'vitest';
import { AMMO_PER_BASE, WAVE_BREAK_STEPS, WAVE_ENEMY_COUNTS } from '../../src/core/config';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';
import { WAVE_COUNT } from '../../src/core/wave';

const run = (s: GameState, n: number): GameState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = step(cur, NO_INPUT);
  return cur;
};

/** 状態が変わるまで進める（上限つき） */
function runUntil(s: GameState, done: (s: GameState) => boolean, limit = 120 * 600): GameState {
  let cur = s;
  for (let i = 0; i < limit && !done(cur); i++) cur = step(cur, NO_INPUT);
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

  it('LLM-TC-0004-01 4 ウェーブで、それぞれ決まった数（6・9・12・15）の敵だけが出る', () => {
    expect(WAVE_COUNT).toBe(4);
    expect([...WAVE_ENEMY_COUNTS]).toEqual([6, 9, 12, 15]);
    let s = createGame(3);
    const counts: number[] = [];
    for (let n = 1; n <= WAVE_COUNT; n++) {
      s = runUntil(s, (x) => x.wave.number === n && x.wave.status === 'playing');
      let max = 0;
      // そのウェーブが終わるまでに出た数を数える
      s = runUntil(s, (x) => {
        max = Math.max(max, x.wave.spawned);
        return x.wave.status !== 'playing';
      });
      counts.push(max);
    }
    expect(counts).toEqual([6, 9, 12, 15]);
    expect(s.wave.status).toBe('clear');
  });

  it('LLM-TC-0004-02 ウェーブの敵がすべて消えると、次のウェーブのあいだ（約 3 秒）になり、そのあいだは敵が出ない', () => {
    let s = runUntil(createGame(5), (x) => x.wave.status === 'playing');
    s = runUntil(s, (x) => x.wave.status === 'break');
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
    const lastEnding: GameState = { ...s, enemies: [], wave: { number: 4, status: 'playing', phaseStep: 999, spawned: WAVE_ENEMY_COUNTS[3] } };
    expect(step(lastEnding, NO_INPUT).wave.status).toBe('clear');
    // 敵が残っているうちは CLEAR にならない
    const stillFlying: GameState = {
      ...lastEnding,
      enemies: [{ fromX: 100, fromY: 0, toX: 100, toY: 592, speed: 0.001, traveled: 100 }],
    };
    expect(step(stillFlying, NO_INPUT).wave.status).toBe('playing');
  });
});
