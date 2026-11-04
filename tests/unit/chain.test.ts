import { describe, expect, it } from 'vitest';
import { BLAST_GROW_STEPS, BLAST_LIFE_STEPS, blastRadius } from '../../src/core/blast';
import type { EnemyMissile } from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';

/** (x, 0) から真下に落ちる、ほとんど止まっている敵。traveled は今の深さ */
const hovering = (x: number, y: number): EnemyMissile => ({ fromX: x, fromY: 0, toX: x, toY: 592, speed: 0.001, traveled: y });

/** 敵が出ないよう、出る時刻より前で止めた状態から始める（狙う物以外は消して前提を確かめる。TEAM 5.6） */
const scene = (enemies: EnemyMissile[], blasts: GameState['blasts']): GameState => ({ ...createGame(1), enemies, blasts });

const run = (s: GameState, n: number): GameState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = step(cur, NO_INPUT);
  return cur;
};

describe('誘爆（LLM-PBI-0003）', () => {
  it('LLM-TC-0003-01 爆風で壊れた敵の弾頭の場所に、迎撃と同じ爆風が出る（出たときは age 0）', () => {
    const s = step(scene([hovering(200, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]), NO_INPUT);
    expect(s.enemies).toHaveLength(0);
    const chained = s.blasts.filter((b) => b.age === 0);
    expect(chained).toHaveLength(1);
    expect(chained[0]?.x).toBeCloseTo(200, 6);
    expect(chained[0]?.y).toBeCloseTo(300, 2);
    // 迎撃と同じ大きさ・時間：同じ blastRadius で広がって消える
    let blasts = chained;
    let maxR = 0;
    for (let i = 0; i < BLAST_LIFE_STEPS + 1; i++) {
      maxR = Math.max(maxR, ...blasts.map((b) => blastRadius(b.age)));
      blasts = blasts.map((b) => ({ ...b, age: b.age + 1 })).filter((b) => b.age < BLAST_LIFE_STEPS);
    }
    expect(maxR).toBe(blastRadius(BLAST_GROW_STEPS));
    expect(blasts).toHaveLength(0);
  });

  it('LLM-TC-0003-01 誘爆の爆風は次のステップから効く（同じステップでは隣の敵を壊さない）', () => {
    // 元の爆風（x=200、半径 24）のふちの内側の 1 つ目（x=223.5）と、ふちのすぐ外の 2 つ目（x=224.3。1 つ目から 0.8）
    const start = scene([hovering(223.5, 300), hovering(224.3, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]);
    const s1 = step(start, NO_INPUT);
    expect(s1.enemies.map((m) => m.fromX)).toEqual([224.3]); // 同じステップでは、誘爆はまだ効かない
    const s2 = step(s1, NO_INPUT);
    expect(s2.enemies.map((m) => m.fromX)).toEqual([]); // 次のステップで、誘爆（半径 1）に入って壊れる
  });

  it('LLM-TC-0003-01 誘爆の爆風に入った敵も壊れ、さらに誘爆が続く（連鎖）', () => {
    // 元の爆風（x=200、半径 24）が届くのは 1 つ目（x=220）だけ。2 つ目（x=240）は 1 つ目の誘爆に、3 つ目（x=260）は 2 つ目の誘爆に入る
    const start = scene([hovering(220, 300), hovering(240, 300), hovering(260, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]);
    const s = run(start, 2 * BLAST_LIFE_STEPS);
    expect(s.enemies.filter((m) => m.speed === 0.001)).toHaveLength(0); // 3 つとも壊れた
  });

  it('LLM-TC-0003-01 連鎖の途中：2 つ目は元の爆風では壊れず、1 つ目の誘爆で壊れる', () => {
    const start = scene([hovering(220, 300), hovering(240, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]);
    const s1 = step(start, NO_INPUT);
    expect(s1.enemies.map((m) => m.fromX)).toEqual([240]); // 元の爆風では 1 つ目だけ
    const later = run(s1, BLAST_LIFE_STEPS);
    expect(later.enemies.filter((m) => m.speed === 0.001)).toHaveLength(0);
  });

  it('LLM-TC-0003-01 誘爆が届かない所の敵は残る', () => {
    const s = run(scene([hovering(200, 300), hovering(300, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]), BLAST_LIFE_STEPS);
    expect(s.enemies.filter((m) => m.speed === 0.001).map((m) => m.fromX)).toEqual([300]);
  });
});
