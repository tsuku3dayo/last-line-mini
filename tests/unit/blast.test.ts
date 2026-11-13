import { describe, expect, it } from 'vitest';
import { BLAST_GROW_STEPS, BLAST_HOLD_STEPS, BLAST_LIFE_STEPS, BLAST_MAX_RADIUS, blastRadius, isInsideBlast, stepBlasts } from '../../src/core/blast';
import { stepEnemies, type EnemyMissile } from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';

/** (x, 0) から真下に落ちる敵。traveled は今の深さ */
const falling = (x: number, y: number, speed = 0.3): EnemyMissile => ({ fromX: x, fromY: 0, toX: x, toY: 592, speed, traveled: y });

describe('爆風', () => {
  it('LLM-TC-0011-05 最大の半径は 36（24 の 1.5 倍）で、最大のまま 0.5 秒残る。広がる 0.4 秒・縮む 0.5 秒', () => {
    expect(BLAST_MAX_RADIUS).toBe(36);
    expect(BLAST_GROW_STEPS).toBe(48);
    expect(BLAST_HOLD_STEPS).toBe(60);
    expect(BLAST_LIFE_STEPS).toBe(48 + 60 + 60);
    // 最大になってから 0.5 秒（60 ステップ）のあいだずっと 36
    for (let age = BLAST_GROW_STEPS - 1; age < BLAST_GROW_STEPS + BLAST_HOLD_STEPS; age++) expect(blastRadius(age)).toBe(36);
    expect(blastRadius(BLAST_GROW_STEPS + BLAST_HOLD_STEPS)).toBeLessThan(36);
  });

  it('LLM-TC-0001-06 決まった半径まで広がってから縮んで消える', () => {
    expect(blastRadius(BLAST_GROW_STEPS - 1)).toBe(BLAST_MAX_RADIUS);
    expect(blastRadius(0)).toBeLessThan(BLAST_MAX_RADIUS / 4);
    expect(blastRadius(BLAST_LIFE_STEPS - 1)).toBeLessThan(BLAST_MAX_RADIUS / 4);
    expect(blastRadius(BLAST_LIFE_STEPS)).toBe(0);
    let blasts = [{ x: 100, y: 100, age: 0 }];
    for (let i = 0; i < BLAST_LIFE_STEPS - 1; i++) blasts = stepBlasts(blasts);
    expect(blasts).toHaveLength(1);
    expect(stepBlasts(blasts)).toHaveLength(0);
  });

  it('LLM-TC-0001-06 点が爆風の中かどうかは、今の半径で決まる（ふちはちょうど中）', () => {
    const big = [{ x: 100, y: 100, age: BLAST_GROW_STEPS }]; // いちばん大きい
    expect(isInsideBlast(big, 100 + BLAST_MAX_RADIUS, 100)).toBe(true);
    expect(isInsideBlast(big, 100 + BLAST_MAX_RADIUS + 0.01, 100)).toBe(false);
    const small = [{ x: 100, y: 100, age: 0 }];
    expect(isInsideBlast(small, 100 + BLAST_MAX_RADIUS / 2, 100)).toBe(false);
    expect(isInsideBlast([], 100, 100)).toBe(false);
  });

  it('LLM-TC-0001-06 爆風の中に入った敵は消え、外の敵は残る', () => {
    const blasts = [{ x: 200, y: 300, age: BLAST_GROW_STEPS }];
    // 弾頭が爆風の中に入る敵・外を通る敵
    const inside = falling(200, 300 - 0.3);
    const outside = falling(260, 299.7);
    const r = stepEnemies([inside, outside], blasts);
    expect(r.destroyed).toHaveLength(1);
    expect(r.destroyed[0]?.fromX).toBe(200);
    expect(r.flying).toHaveLength(1);
    expect(r.flying[0]?.fromX).toBe(260);
  });

  it('LLM-TC-0001-06 ゲームの中で：撃った爆風に入った敵が消える', () => {
    // 敵を 1 つだけ置き、通り道に爆風を置く（狙う物以外は消して前提を確かめる。TEAM 5.6）
    let s: GameState = { ...createGame(1), enemies: [falling(240, 280)], blasts: [{ x: 240, y: 300, age: 0 }] };
    expect(s.enemies).toHaveLength(1);
    for (let i = 0; i < 60; i++) s = step(s, NO_INPUT);
    // 新しく出た敵は数えない：x = 240 の敵が残っていない
    expect(s.enemies.some((m) => m.fromX === 240 && m.toX === 240)).toBe(false);
    expect(s.impacts).toHaveLength(0); // 地面には着いていない
  });
});
