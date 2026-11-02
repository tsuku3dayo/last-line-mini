import { describe, expect, it } from 'vitest';
import { computeLayout } from '../../src/app/layout';
import { readDebugParams } from '../../src/app/debug';
import { AMMO_PER_BASE, BASE_XS, CITY_XS, GROUND_Y, LOGICAL_HEIGHT, LOGICAL_WIDTH, MAX_STEPS_PER_FRAME, MOUND_HALF_WIDTH, MOUND_TOP_Y, STEP_MS } from '../../src/core/config';
import { createGame, NO_INPUT, step } from '../../src/core/game';
import { nextRandom, seedState } from '../../src/core/random';
import { groundProfile, groundYAt } from '../../src/core/terrain';
import { planSteps } from '../../src/core/timestep';
import { GLYPH_HEIGHT, GLYPH_WIDTH, GLYPHS, textWidth } from '../../src/render/font';
import { formatScore, hud1pText, hudTopText } from '../../src/render/hud';

describe('固定ステップと決定性', () => {
  it('LLM-TC-9001-09 たった時間をステップ数に直し、余りを持ち越す', () => {
    expect(planSteps(0, STEP_MS * 3)).toEqual({ steps: 3, acc: 0 });
    const r = planSteps(0, STEP_MS * 2.5);
    expect(r.steps).toBe(2);
    expect(r.acc).toBeCloseTo(STEP_MS * 0.5);
    // 60 Hz の 1 コマ（16.67 ms）は 120 ステップ／秒で 2 ステップ
    expect(planSteps(0, 1000 / 60).steps).toBe(2);
  });

  it('LLM-TC-9001-09 1 回に進めるのは最大ステップ数まで。超えた遅れは捨てる', () => {
    expect(planSteps(0, 5000)).toEqual({ steps: MAX_STEPS_PER_FRAME, acc: 0 });
    expect(planSteps(0, -10)).toEqual({ steps: 0, acc: 0 });
  });

  it('LLM-TC-9001-09 同じ種からは同じ乱数の列、違う種からは違う列になる', () => {
    const seq = (seed: number) => {
      let s = seedState(seed);
      return Array.from({ length: 5 }, () => {
        const r = nextRandom(s);
        s = r.state;
        return r.value;
      });
    };
    expect(seq(42)).toEqual(seq(42));
    expect(seq(42)).not.toEqual(seq(43));
    for (const v of seq(7)) expect(v >= 0 && v < 1).toBe(true);
  });

  it('LLM-TC-9001-09 同じ種と入力で 2 回動かすと同じ状態になる。状態を書き換えない', () => {
    const run = () => {
      let s = createGame(123);
      for (let i = 0; i < 240; i++) s = step(s, NO_INPUT);
      return s;
    };
    expect(run()).toEqual(run());
    const s0 = createGame(1);
    const s1 = step(s0, NO_INPUT);
    expect(s0.step).toBe(0);
    expect(s1.step).toBe(1);
  });
});

describe('地形・基地・都市（LLM-GUI-0001 §1）', () => {
  it('LLM-TC-9001-12 最初の状態：基地 3 つ（各 10 発）・都市 6 つが決まった位置にある', () => {
    const s = createGame(1);
    expect(s.bases.map((b) => b.x)).toEqual([40, 240, 440]);
    expect(s.bases.every((b) => b.ammo === AMMO_PER_BASE && AMMO_PER_BASE === 10)).toBe(true);
    expect(s.cities.map((c) => c.x)).toEqual([100, 140, 180, 300, 340, 380]);
    expect(s.cities.every((c) => c.alive)).toBe(true);
  });

  it('LLM-TC-9001-12 基地の丘は画面の内側に収まり、都市の位置には丘がかからない', () => {
    for (const bx of BASE_XS) {
      expect(bx - MOUND_HALF_WIDTH).toBeGreaterThan(0);
      expect(bx + MOUND_HALF_WIDTH).toBeLessThan(LOGICAL_WIDTH);
    }
    for (const cx of CITY_XS) {
      for (const bx of BASE_XS) expect(Math.abs(cx - bx) - 12).toBeGreaterThan(MOUND_HALF_WIDTH);
    }
  });

  it('LLM-TC-9001-12 地面の高さ：基地の真下は丘の上、都市の真下は平らな地面', () => {
    const profile = groundProfile();
    expect(profile[0]).toEqual({ x: 0, y: GROUND_Y });
    for (let i = 1; i < profile.length; i++) expect((profile[i]?.x ?? 0) >= (profile[i - 1]?.x ?? 0)).toBe(true);
    for (const bx of BASE_XS) expect(groundYAt(bx)).toBe(MOUND_TOP_Y);
    for (const cx of CITY_XS) expect(groundYAt(cx)).toBe(GROUND_Y);
    expect(groundYAt(-50)).toBe(GROUND_Y);
  });
});

describe('文字と HUD', () => {
  it('LLM-TC-9001-12 文字は 0〜9・A〜Z・.・空白があり、すべて 5 × 7 ドット', () => {
    const chars = [...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ. '];
    for (const ch of chars) {
      const g = GLYPHS[ch];
      expect(g, ch).toBeDefined();
      expect(g?.length).toBe(GLYPH_HEIGHT);
      for (const row of g ?? []) expect(row).toMatch(new RegExp(`^[#.]{${GLYPH_WIDTH}}$`));
    }
    expect(textWidth('AB', 2)).toBe(22);
  });

  it('LLM-TC-9001-12 HUD は 1P と TOP の点数を 6 桁で出し、画面の幅に収まる', () => {
    expect(formatScore(25)).toBe('000025');
    expect(formatScore(1234567)).toBe('999999');
    expect(hud1pText(0)).toBe('1P 000000');
    expect(hudTopText(150)).toBe('TOP 000150');
    // 左右の HUD が重ならない（左端 8・右端 8、間を 16 以上空ける）
    expect(8 + textWidth(hud1pText(999999), 2) + 16 + textWidth(hudTopText(999999), 2) + 8).toBeLessThanOrEqual(LOGICAL_WIDTH);
  });
});

describe('大きさ合わせ（テンプレート §5.5）', () => {
  it('LLM-TC-9001-10 PC（1280 × 800）では高さいっぱいで真ん中に置く', () => {
    const l = computeLayout(1280, 800);
    expect(l.scale).toBeCloseTo(800 / LOGICAL_HEIGHT);
    expect(l.height).toBeCloseTo(800);
    expect(l.left).toBeCloseTo((1280 - l.width) / 2);
    expect(l.top).toBeCloseTo(0);
  });

  it('LLM-TC-9001-10 iPhone SE 第 3 世代（375 × 667）では幅いっぱい', () => {
    const l = computeLayout(375, 667);
    expect(l.scale).toBeCloseTo(375 / LOGICAL_WIDTH);
    expect(l.width).toBeCloseTo(375);
    expect(l.height).toBeLessThanOrEqual(667);
  });

  it('LLM-TC-9001-10 安全領域を引いた中に収まり、縦横の比を保つ', () => {
    const l = computeLayout(414, 896, { top: 48, right: 0, bottom: 34, left: 0 });
    expect(l.top).toBeGreaterThanOrEqual(48);
    expect(l.top + l.height).toBeLessThanOrEqual(896 - 34 + 1e-9);
    expect(l.width / l.height).toBeCloseTo(LOGICAL_WIDTH / LOGICAL_HEIGHT);
    expect(computeLayout(0, 0).scale).toBe(0);
  });
});

describe('テスト用の入口', () => {
  it('LLM-TC-9001-11 ?debug=1 のときだけ種を読む', () => {
    expect(readDebugParams('?debug=1&seed=42')).toEqual({ debug: true, seed: 42 });
    expect(readDebugParams('?seed=42')).toEqual({ debug: false, seed: null });
    expect(readDebugParams('?debug=1&seed=abc')).toEqual({ debug: true, seed: null });
    expect(readDebugParams('')).toEqual({ debug: false, seed: null });
  });
});
