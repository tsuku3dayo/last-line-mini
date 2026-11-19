import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// 爆撃機と衛星（LLM-PBI-0009）。PC でも iPhone でも確かめる

const BREAK_STEPS = 3 * 120;

/** 論理座標 (x, y) の 1 点の色（[r, g, b]）。倍率が変わっても同じ所を読む（TEAM 5.4） */
async function colorAt(page: Page, x: number, y: number): Promise<[number, number, number]> {
  return page.evaluate(
    ([lx, ly]) => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) throw new Error('Canvas がない');
      const k = c.width / 480;
      const d = ctx.getImageData(Math.round(lx * k), Math.round(ly * k), 1, 1).data;
      return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0] as [number, number, number];
    },
    [x, y] as const,
  );
}

/** 色が近いか（各 ±24） */
const near = (c: readonly number[], hex: string): boolean => {
  const want = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return want.every((w, i) => Math.abs((c[i] ?? 0) - w) <= 24);
};

/** WAVE 2 の中に、爆撃機と衛星を決まった所に置く */
async function placeAircraft(page: Page, bomberDir: 1 | -1): Promise<void> {
  await page.evaluate((dir) => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      wave: { ...s.wave, number: 2, status: 'playing', phaseStep: 1, spawned: 1, airPlan: [], airLaunched: 0 },
      enemies: [],
      interceptors: [],
      blasts: [],
      aircraft: [
        { kind: 'bomber', dir, x: 200, y: 120, age: 1, dropped: 0 },
        { kind: 'satellite', dir: -1, x: 330, y: 64, age: 1, dropped: 0 },
      ],
    });
  }, bomberDir);
}

test('LLM-TC-0009-07 爆撃機と衛星が GUI-0001 v1.9 の形・色で描かれ、爆撃機は進む向きに機首を向ける', async ({ page }) => {
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  await placeAircraft(page, 1);
  await advance(page, 0);
  // 爆撃機：胴（灰青）、右向きなら機首の灯り（赤）は右（中心 ＋ 6〜8 × 1.5）
  expect(near(await colorAt(page, 195, 120), '#7d8fa8')).toBe(true);
  expect(near(await colorAt(page, 211, 120), '#ff5a3c')).toBe(true);
  expect(near(await colorAt(page, 189, 120), '#ff5a3c')).toBe(false);
  // 衛星：本体（白みの黄）と左右の太陽電池（青緑）
  expect(near(await colorAt(page, 330, 65), '#e8e0b0')).toBe(true);
  expect(near(await colorAt(page, 330 - 13, 65), '#3fb8af')).toBe(true);
  expect(near(await colorAt(page, 330 + 13, 65), '#3fb8af')).toBe(true);
  // 左へ進む爆撃機は、機首の灯りが左
  await placeAircraft(page, -1);
  await advance(page, 0);
  expect(near(await colorAt(page, 189, 120), '#ff5a3c')).toBe(true);
  expect(near(await colorAt(page, 211, 120), '#ff5a3c')).toBe(false);
});

test('LLM-TC-0009-06 LLM-TC-0009-01 WAVE 2 は弾 15 発で始まり、決まったステップで爆撃機が出て横切る', async ({ page }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-ammo', '15,15,15');
  await advance(page, BREAK_STEPS + 1);
  // WAVE 1 の敵をすべて出し終え、画面に敵がいない → WAVE 2 のあいだ → WAVE 2
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, enemies: [], wave: { ...s.wave, spawned: 12 } });
  });
  await advance(page, 1);
  await advance(page, BREAK_STEPS + 1);
  await expect(body).toHaveAttribute('data-wave', '2');
  await expect(body).toHaveAttribute('data-status', 'playing');
  await expect(body).toHaveAttribute('data-ammo', '15,15,15');
  const at = (await page.evaluate(() => window.__llm?.getState().wave.airPlan?.[0]?.atStep)) ?? 0;
  const phase = (await page.evaluate(() => window.__llm?.getState().wave.phaseStep)) ?? 0;
  await advance(page, at - phase + 1);
  const air = (await page.evaluate(() => window.__llm?.getState().aircraft)) ?? [];
  expect(air.map((a) => a.kind)).toEqual(['bomber']);
  const bomber = air[0];
  if (!bomber) throw new Error('爆撃機がいない');
  expect(bomber.y).toBeGreaterThanOrEqual(100);
  expect(bomber.y).toBeLessThanOrEqual(140);
  // 3 秒進めると、画面の中で灰青の胴が見える
  await advance(page, 3 * 120);
  const now = (await page.evaluate(() => window.__llm?.getState().aircraft?.[0])) ?? bomber;
  expect(near(await colorAt(page, now.x - 4 * now.dir, now.y), '#7d8fa8')).toBe(true);
});

test('LLM-TC-0009-07 スクリーンショット：爆撃機と衛星（PC・iPhone SE で目で見る）', async ({ page }, info) => {
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  await placeAircraft(page, 1);
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    // 落とした弾と、近くの爆風も描いておく（重なり方を見る）
    api.setState({
      ...s,
      enemies: [
        { fromX: 190, fromY: 128, toX: 180, toY: 592, speed: 0.4, traveled: 120 },
        { fromX: 330, fromY: 71, toX: 340, toY: 592, speed: 0.4, traveled: 90 },
      ],
      blasts: [{ x: 260, y: 140, age: 40 }],
    });
  });
  await advance(page, 0);
  await page.screenshot({ path: info.outputPath('aircraft.png') });
});
