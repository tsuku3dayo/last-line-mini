import { describe, expect, it } from 'vitest';
import { BLAST_GROW_STEPS, BLAST_LIFE_STEPS } from '../../src/core/blast';
import { SCORE_PER_ENEMY } from '../../src/core/config';
import type { EnemyMissile } from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState } from '../../src/core/game';
import { hud1pText, hudTopText } from '../../src/render/hud';

/** (x, 0) から真下に落ちる、ほとんど止まっている敵。traveled は今の深さ */
const hovering = (x: number, y: number): EnemyMissile => ({ fromX: x, fromY: 0, toX: x, toY: 592, speed: 0.001, traveled: y });

/** 敵が出ないよう、出る時刻より前で止めた状態から始める（狙う物以外は消して前提を確かめる。TEAM 5.6） */
const scene = (enemies: EnemyMissile[], blasts: GameState['blasts'] = []): GameState => ({ ...createGame(1), enemies, blasts });

const run = (s: GameState, n: number): GameState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = step(cur, NO_INPUT);
  return cur;
};

describe('点数（LLM-PBI-0005）', () => {
  it('LLM-TC-0005-01 決まった値：敵 1 つで 25 点（仕様書 §4.1）、始めは 0 点', () => {
    expect(SCORE_PER_ENEMY).toBe(25);
    expect(createGame(1).score).toBe(0);
  });

  it('LLM-TC-0005-01 迎撃の爆風で敵を 1 つ壊すと 25 点', () => {
    const start = scene([hovering(200, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]);
    expect(start.score).toBe(0); // 前提
    const s = step(start, NO_INPUT);
    expect(s.enemies).toHaveLength(0);
    expect(s.score).toBe(25);
  });

  it('LLM-TC-0005-01 誘爆で壊れた敵も 25 点（連鎖で 3 つ → 75 点）', () => {
    // 元の爆風（x=200、半径 24）が届くのは 1 つ目（x=220）だけ。2 つ目・3 つ目は誘爆で壊れる
    const start = scene([hovering(220, 300), hovering(240, 300), hovering(260, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]);
    const s1 = step(start, NO_INPUT);
    expect(s1.score).toBe(25); // 前提：元の爆風では 1 つ目だけ
    const s = run(s1, 2 * BLAST_LIFE_STEPS);
    expect(s.enemies.filter((m) => m.speed === 0.001)).toHaveLength(0);
    expect(s.score).toBe(75);
  });

  it('LLM-TC-0005-01 地面に落ちた敵は 0 点', () => {
    // 都市にも基地の台（x=40 ± 14）にもかからない x=60 に落とす
    const start = scene([{ fromX: 60, fromY: 0, toX: 60, toY: 592, speed: 1, traveled: 591.5 }]);
    const s = step(start, NO_INPUT);
    expect(s.enemies).toHaveLength(0); // 前提：落ちて消えた
    expect(s.impacts).toHaveLength(1);
    expect(s.score).toBe(0);
  });

  it('LLM-TC-0005-01 HUD の 1P は 6 桁で出る', () => {
    expect(hud1pText(25)).toBe('1P 000025');
    expect(hud1pText(75)).toBe('1P 000075');
  });

  it('LLM-TC-0005-04 やり直す（新しいゲーム）と 0 点から。TOP は 000000 のまま', () => {
    const played = step(scene([hovering(200, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]), NO_INPUT);
    expect(played.score).toBe(25); // 前提
    expect(createGame(2).score).toBe(0);
    expect(hudTopText(0)).toBe('TOP 000000');
  });
});
