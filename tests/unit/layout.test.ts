import { describe, expect, it } from 'vitest';
import { computeLayout, type Insets } from '../../src/app/layout';

/** ゲーム画面が、安全領域の内側に欠けずに収まっているか */
function expectInsideSafeArea(viewW: number, viewH: number, insets: Insets) {
  const l = computeLayout(viewW, viewH, insets);
  expect(l.left).toBeGreaterThanOrEqual(insets.left - 1e-9);
  expect(l.top).toBeGreaterThanOrEqual(insets.top - 1e-9);
  expect(l.left + l.width).toBeLessThanOrEqual(viewW - insets.right + 1e-9);
  expect(l.top + l.height).toBeLessThanOrEqual(viewH - insets.bottom + 1e-9);
  expect(l.width / l.height).toBeCloseTo(480 / 640, 6); // 縦横の比を保つ（欠けない）
  return l;
}

describe('iPhone の縦の画面の大きさ合わせ（LLM-PBI-0002）', () => {
  it('LLM-TC-0002-04 iPhone 11（414 × 896、ノッチ 48・ホームバー 34）で、安全領域の内側に幅いっぱいで収まる', () => {
    const l = expectInsideSafeArea(414, 896, { top: 48, right: 0, bottom: 34, left: 0 });
    expect(l.width).toBeCloseTo(414, 6);
    expect(l.height).toBeCloseTo(552, 6);
  });

  it('LLM-TC-0002-04 iPhone SE 第 3 世代（375 × 667）で、幅いっぱいで収まる', () => {
    const l = expectInsideSafeArea(375, 667, { top: 0, right: 0, bottom: 0, left: 0 });
    expect(l.width).toBeCloseTo(375, 6);
    expect(l.height).toBeCloseTo(500, 6);
  });

  it('LLM-TC-0002-04 Safari の上下のバーで見える高さが減っても（SE で 548）、欠けずに収まる', () => {
    expectInsideSafeArea(375, 548, { top: 0, right: 0, bottom: 0, left: 0 });
  });
});
