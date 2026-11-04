import { describe, expect, it } from 'vitest';
import { CURSOR_MAX_Y, CURSOR_MIN_Y } from '../../src/core/cursor';
import { createGame, NO_INPUT, step, type GameState, type Point, type StepInput } from '../../src/core/game';
import { chooseBase } from '../../src/core/touch';

const tap = (...points: Point[]): StepInput => ({ ...NO_INPUT, taps: points });
const withAmmo = (s: GameState, ammo: [number, number, number]): GameState => ({
  ...s,
  bases: s.bases.map((b, i) => ({ ...b, ammo: ammo[i] ?? 0 })),
});
const ammo = (s: GameState) => s.bases.map((b) => b.ammo);
const BASES = [{ x: 40, ammo: 10 }, { x: 240, ammo: 10 }, { x: 440, ammo: 10 }];

describe('タッチ：触った所へ、いちばん近い基地から撃つ（LLM-PBI-0002 案 C）', () => {
  it('LLM-TC-0002-01 触った所へ、横の距離がいちばん近い基地から撃ち、照準もそこに移る', () => {
    for (const [x, base] of [[60, 0], [250, 1], [420, 2]] as const) {
      const s = step(createGame(1), tap({ x, y: 200 }));
      expect(s.interceptors).toHaveLength(1);
      expect(s.interceptors[0]).toMatchObject({ base, toX: x, toY: 200 });
      expect(s.cursor).toMatchObject({ x, y: 200, vx: 0, vy: 0 });
      expect(ammo(s)[base]).toBe(9);
    }
  });

  it('LLM-TC-0002-01 HUD の上・地面の下を触ったときは、照準が動ける範囲に寄せた所へ撃つ', () => {
    const top = step(createGame(1), tap({ x: 240, y: 5 }));
    expect(top.interceptors[0]).toMatchObject({ toY: CURSOR_MIN_Y });
    // 中央の基地のすぐ上なので、同じステップのうちに着いて爆風になる
    const bottom = step(createGame(1), tap({ x: 240, y: 630 }));
    expect(bottom.blasts[0]).toMatchObject({ x: 240, y: CURSOR_MAX_Y });
    expect(bottom.cursor.y).toBe(CURSOR_MAX_Y);
  });

  it('LLM-TC-0002-02 同じ距離なら中央の B を先に、A と C なら A を選ぶ', () => {
    expect(chooseBase(BASES, 140)).toBe(1); // A と B から 100
    expect(chooseBase(BASES, 340)).toBe(1); // B と C から 100
    const noB = [BASES[0], { x: 240, ammo: 0 }, BASES[2]].filter((b) => b !== undefined);
    expect(chooseBase(noB, 240)).toBe(0); // A と C から 200
  });

  it('LLM-TC-0002-02 残弾 0 の基地は飛ばして次に近い基地から撃ち、3 つとも 0 なら何も起きない', () => {
    const s = step(withAmmo(createGame(1), [0, 10, 10]), tap({ x: 30, y: 200 }));
    expect(s.interceptors[0]).toMatchObject({ base: 1 });
    expect(ammo(s)).toEqual([0, 9, 10]);

    const empty = withAmmo(createGame(1), [0, 0, 0]);
    const after = step(empty, tap({ x: 30, y: 200 }));
    expect(after.interceptors).toHaveLength(0);
    expect(ammo(after)).toEqual([0, 0, 0]);
  });

  it('LLM-TC-0002-03 触ったステップだけ 1 発撃つ（触っていないステップでは撃たない）', () => {
    const s1 = step(createGame(1), tap({ x: 240, y: 200 }));
    const s2 = step(s1, NO_INPUT);
    expect(ammo(s2)).toEqual([10, 9, 10]);
    expect(s2.interceptors).toHaveLength(1);
  });

  it('LLM-TC-0002-03 同じステップに 2 か所触ると、それぞれの場所へ 1 発ずつ撃つ（残弾は 1 発ずつ順に数える）', () => {
    const s = step(createGame(1), tap({ x: 60, y: 200 }, { x: 420, y: 300 }));
    expect(s.interceptors.map((m) => [m.base, m.toX, m.toY])).toEqual([[0, 60, 200], [2, 420, 300]]);
    expect(ammo(s)).toEqual([9, 10, 9]);
    expect(s.cursor).toMatchObject({ x: 420, y: 300 }); // 照準は最後の点

    // 残り 1 発の基地の近くを 2 か所触ると、2 発目は次に近い基地から
    const last = step(withAmmo(createGame(1), [1, 10, 10]), tap({ x: 40, y: 200 }, { x: 40, y: 250 }));
    expect(last.interceptors.map((m) => m.base)).toEqual([0, 1]);
  });
});
