import { describe, expect, it } from 'vitest';
import { BLAST_GROW_STEPS, BLAST_LIFE_STEPS } from '../../src/core/blast';
import { BONUS_PER_CITY, BONUS_PER_MISSILE, SCORE_PER_ENEMY, WAVE_ENEMY_COUNTS } from '../../src/core/config';
import type { EnemyMissile } from '../../src/core/enemy';
import { createGame, forceGameOver, NO_INPUT, step, type GameState } from '../../src/core/game';
import { WAVE_COUNT } from '../../src/core/wave';
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

/** WAVE 1 のあいだを過ぎて、遊んでいる状態まで進める */
const runUntilPlaying = (s: GameState): GameState => {
  let cur = s;
  while (cur.wave.status !== 'playing') cur = step(cur, NO_INPUT);
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

  it('LLM-TC-0005-02 決まった値：残弾 1 発 5 点、都市 1 つ 100 点（仕様書 §4.2）。始めは内訳なし', () => {
    expect(BONUS_PER_MISSILE).toBe(5);
    expect(BONUS_PER_CITY).toBe(100);
    expect(createGame(1).bonus).toBeNull();
  });

  it('LLM-TC-0005-02 CLEAR の瞬間に、残弾 × 5 と残った都市 × 100 が足される（壊れた基地の弾は 0 と数える）', () => {
    const s = runUntilPlaying(createGame(7));
    // 最後のウェーブを出し終え、敵がいない。基地 A 3 発・基地 B は壊れた（弾 0）・基地 C 9 発、都市は 4 つ残り、点は 300
    const lastEnding: GameState = {
      ...s,
      enemies: [],
      wave: { number: WAVE_COUNT, status: 'playing', phaseStep: 999, spawned: WAVE_ENEMY_COUNTS[WAVE_COUNT - 1] ?? 0 },
      bases: [
        { x: 40, ammo: 3, alive: true },
        { x: 240, ammo: 0, alive: false },
        { x: 440, ammo: 9, alive: true },
      ],
      cities: s.cities.map((c, i) => ({ ...c, alive: i < 4 })),
      score: 300,
    };
    expect(lastEnding.bonus).toBeNull(); // 前提
    const done = step(lastEnding, NO_INPUT);
    expect(done.wave.status).toBe('clear');
    expect(done.bonus).toEqual({ missiles: 12, cities: 4 });
    expect(done.score).toBe(300 + 12 * 5 + 4 * 100); // 760
    // 1 回だけ：そのあとステップが進んでも増えない
    expect(run(done, 10).score).toBe(760);
  });

  it('LLM-TC-0005-02 GAME OVER（都市がすべて壊れた）の瞬間は、都市 0 で残弾の分だけ足される', () => {
    const s = runUntilPlaying(createGame(1));
    // 最後の都市（x=380）に落ちる直前の敵。基地は 10・10・10 発、点は 50
    const lastCity: GameState = {
      ...s,
      cities: s.cities.map((c) => ({ ...c, alive: c.x === 380 })),
      enemies: [{ fromX: 380, fromY: 0, toX: 380, toY: 592, speed: 1, traveled: 591.5 }],
      score: 50,
    };
    const done = step(lastCity, NO_INPUT);
    expect(done.wave.status).toBe('gameover');
    expect(done.bonus).toEqual({ missiles: 30, cities: 0 });
    expect(done.score).toBe(50 + 30 * 5); // 200
    expect(run(done, 10).score).toBe(200);
  });

  it('LLM-TC-0005-02 ?debug=1 の G キー（forceGameOver）でも同じくボーナスが足される', () => {
    const done = forceGameOver({ ...createGame(1), score: 25 });
    expect(done.bonus).toEqual({ missiles: 30, cities: 6 });
    expect(done.score).toBe(25 + 150 + 600);
  });

  it('LLM-TC-0005-04 やり直す（新しいゲーム）と 0 点から。TOP は 000000 のまま', () => {
    const played = step(scene([hovering(200, 300)], [{ x: 200, y: 300, age: BLAST_GROW_STEPS }]), NO_INPUT);
    expect(played.score).toBe(25); // 前提
    expect(createGame(2).score).toBe(0);
    expect(hudTopText(0)).toBe('TOP 000000');
  });
});
