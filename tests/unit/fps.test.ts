import { describe, expect, it } from 'vitest';
import { createFpsCounter } from '../../src/app/fps';

describe('fps の数え方（完成の定義：iPhone 11 で fps 55 以上）', () => {
  it('LLM-TC-9001-14 1 秒たつごとに、その 1 秒の描画の回数を返し、それ以外は null', () => {
    const c = createFpsCounter();
    expect(c.frame(0)).toBeNull();
    let last: number | null = null;
    for (let i = 1; i <= 60; i++) last = c.frame((i * 1000) / 60);
    expect(last).toBeCloseTo(60, 6);
    // 次の 1 秒は 30 回
    for (let i = 1; i <= 30; i++) last = c.frame(1000 + (i * 1000) / 30);
    expect(last).toBeCloseTo(30, 6);
  });
});
