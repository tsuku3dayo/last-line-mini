import { describe, expect, it } from 'vitest';
import { firesOn, toLogical } from '../../src/app/input';
import { createGame, NO_INPUT, step } from '../../src/core/game';

describe('PC のクリックで撃つ（LLM-PBI-0019）', () => {
  it('LLM-TC-0019-01 マウスの左ボタンを押した瞬間に撃つ。タッチも今までどおり撃つ', () => {
    expect(firesOn({ pointerType: 'mouse', button: 0 })).toBe(true);
    expect(firesOn({ pointerType: 'touch', button: 0 })).toBe(true);
  });

  it('LLM-TC-0019-02 右・真ん中のボタン、ほかのボタン、ペンでは撃たない', () => {
    expect(firesOn({ pointerType: 'mouse', button: 1 })).toBe(false); // 真ん中
    expect(firesOn({ pointerType: 'mouse', button: 2 })).toBe(false); // 右
    expect(firesOn({ pointerType: 'mouse', button: 3 })).toBe(false); // 戻る
    expect(firesOn({ pointerType: 'pen', button: 0 })).toBe(false);
  });

  it('LLM-TC-0019-01 クリックした所（画面の位置）を論理座標に直し、タッチと同じく近い残弾のある基地から撃つ', () => {
    // 480 × 640 の画面を 2 倍で、左上 (100, 50) に置いたとき
    const rect = { left: 100, top: 50, width: 960, height: 1280 };
    const p = toLogical(100 + 250 * 2, 50 + 200 * 2, rect);
    expect(p.x).toBeCloseTo(250, 9);
    expect(p.y).toBeCloseTo(200, 9);
    // 基地 B（x 240）が近い。B が 0 発なら、次に近い C（x 440。A は x 40 で距離 210、C は 190）
    const s = step(createGame(1), { ...NO_INPUT, taps: [p] });
    expect(s.interceptors[0]).toMatchObject({ base: 1 });
    expect(s.interceptors[0]?.toX).toBeCloseTo(250, 9);
    const noB = { ...createGame(1), bases: createGame(1).bases.map((b, i) => (i === 1 ? { ...b, ammo: 0 } : b)) };
    expect(step(noB, { ...NO_INPUT, taps: [p] }).interceptors[0]).toMatchObject({ base: 2 });
  });
});
