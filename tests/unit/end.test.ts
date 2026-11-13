import { describe, expect, it } from 'vitest';
import { WAVE_ENEMY_COUNTS } from '../../src/core/config';
import type { EnemyMissile } from '../../src/core/enemy';
import { createGame, forceGameOver, NO_INPUT, step, type GameState } from '../../src/core/game';
import { WAVE_COUNT } from '../../src/core/wave';

/** x へ落ちる敵。traveled はその深さ（591.5 なら次のステップで着く） */
const toward = (x: number, traveled = 100, speed = 0.001): EnemyMissile => ({ fromX: x, fromY: 0, toX: x, toY: 592, speed, traveled });

/** ウェーブ 1 の途中（まだ敵を出し切っていない）に置く。狙う物以外は消して前提を確かめる（TEAM 5.6） */
function playing(over: Partial<GameState> = {}): GameState {
  const s = createGame(1);
  return { ...s, wave: { number: 1, status: 'playing', phaseStep: 1, spawned: 1 }, ...over };
}
const noAmmo = (s: GameState): GameState['bases'] => s.bases.map((b) => ({ ...b, ammo: 0 }));

describe('終わりの判定（LLM-PBI-0004）', () => {
  it('LLM-TC-0004-04 6 都市がすべて壊れた瞬間に GAME OVER になり、そのあとは敵も爆風も止まる', () => {
    const base = playing();
    const fiveLost = { ...base, cities: base.cities.map((c, i) => ({ ...c, alive: i === 5 ? true : false })) };
    // 最後の都市（x=380）に落ちる敵と、ほかに飛んでいる敵・爆風
    const s = step({ ...fiveLost, enemies: [toward(380, 591.5, 1), toward(100, 200, 0.5)], blasts: [{ x: 300, y: 300, age: 10 }] }, NO_INPUT);
    expect(s.cities.every((c) => !c.alive)).toBe(true);
    expect(s.wave.status).toBe('gameover');
    const later = step(step(s, NO_INPUT), NO_INPUT);
    expect(later.enemies).toEqual(s.enemies); // 止まっている
    expect(later.blasts).toEqual(s.blasts);
    expect(later.wave.status).toBe('gameover');
    expect(later.wave.phaseStep).toBe(2); // 経った時間は数える（終わりの表示に使う）
  });

  it('LLM-TC-0004-04 最後のウェーブが終わる瞬間に都市が全部壊れたら、CLEAR ではなく GAME OVER', () => {
    const base = playing({ wave: { number: WAVE_COUNT, status: 'playing', phaseStep: 999, spawned: WAVE_ENEMY_COUNTS[WAVE_COUNT - 1] ?? 0 } });
    const fiveLost = { ...base, cities: base.cities.map((c, i) => ({ ...c, alive: i === 0 })) };
    const s = step({ ...fiveLost, enemies: [toward(100, 591.5, 1)] }, NO_INPUT);
    expect(s.wave.status).toBe('gameover');
  });

  it('LLM-TC-0004-05 弾が 0・迎撃と爆風なし・残っている都市を狙う敵が飛んでいる、がそろうと GAME OVER', () => {
    const base = playing();
    const s = step({ ...base, bases: noAmmo(base), enemies: [toward(140)] }, NO_INPUT);
    expect(s.wave.status).toBe('gameover');
  });

  it('LLM-TC-0004-05 どれか 1 つでも欠けると続く', () => {
    const base = playing();
    const empty = noAmmo(base);
    // 1. どこかの基地に弾が 1 発ある
    const oneShot = empty.map((b, i) => (i === 2 ? { ...b, ammo: 1 } : b));
    expect(step({ ...base, bases: oneShot, enemies: [toward(140)] }, NO_INPUT).wave.status).toBe('playing');
    // 2. 迎撃ミサイルが飛んでいる／爆風が残っている
    const flying = [{ base: 0, fromX: 40, fromY: 560, toX: 140, toY: 100, traveled: 0 }];
    expect(step({ ...base, bases: empty, enemies: [toward(140)], interceptors: flying }, NO_INPUT).wave.status).toBe('playing');
    expect(step({ ...base, bases: empty, enemies: [toward(140)], blasts: [{ x: 400, y: 100, age: 5 }] }, NO_INPUT).wave.status).toBe('playing');
    // 3. 飛んでいる敵が、基地か壊れた都市しか狙っていない
    const cityGone = base.cities.map((c) => (c.x === 140 ? { ...c, alive: false } : c));
    expect(step({ ...base, bases: empty, cities: cityGone, enemies: [toward(140), toward(240)] }, NO_INPUT).wave.status).toBe('playing');
    // 飛んでいる敵がいない
    expect(step({ ...base, bases: empty, enemies: [] }, NO_INPUT).wave.status).toBe('playing');
  });

  it('LLM-TC-0004-05 ウェーブのあいだは、弾が 0 でも判定しない（次のウェーブで弾が戻る）', () => {
    const base = createGame(1); // 始めのあいだ
    const s = step({ ...base, bases: noAmmo(base), enemies: [toward(140)] }, NO_INPUT);
    expect(s.wave.status).toBe('break');
  });

  it('LLM-TC-0004-04 forceGameOver（?debug=1 の G キー）で、その場で GAME OVER になる', () => {
    const s = forceGameOver(playing({ enemies: [toward(100)] }));
    expect(s.wave).toMatchObject({ status: 'gameover', phaseStep: 0 });
    expect(step(s, NO_INPUT).enemies).toEqual(s.enemies);
  });
});
