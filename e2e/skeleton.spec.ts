import { expect, test } from '@playwright/test';
import { advance, openFrozen } from './helpers';

test('LLM-TC-9001-10 ゲーム画面が窓の中に 3:4 の比で収まり、版が画面の右下にある', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
  const vp = page.viewportSize();
  const box = await page.locator('#stage').boundingBox();
  expect(vp && box).toBeTruthy();
  if (!vp || !box) return;
  expect(box.x).toBeGreaterThanOrEqual(-0.5);
  expect(box.y).toBeGreaterThanOrEqual(-0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
  expect(box.width / box.height).toBeCloseTo(480 / 640, 2);
  // 幅か高さのどちらかが窓いっぱい
  expect(Math.max(box.width / vp.width, box.height / vp.height)).toBeGreaterThan(0.99);

  const ver = await page.locator('#app-version').boundingBox();
  expect(ver).toBeTruthy();
  if (!ver) return;
  expect(ver.x + ver.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
  expect(ver.y + ver.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
});

test('LLM-TC-9001-11 ?debug=1 でテスト用の入口が出て、止めたまま決まったステップだけ進められる', async ({ page }) => {
  await openFrozen(page, 7);
  const before = await page.evaluate(() => window.__llm?.getState().step ?? -1);
  const after = (await advance(page, 120)) as { step: number };
  expect(after.step).toBe(before + 120);
  await expect(page.locator('body')).toHaveAttribute('data-step', String(before + 120));
  // 止めている間は進まない
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__llm?.getState().step)).toBe(before + 120);
});

test('LLM-TC-9001-11 ?debug=1 がなければテスト用の入口は出ない', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
  expect(await page.evaluate(() => typeof window.__llm)).toBe('undefined');
});

test('LLM-TC-9001-09 ループが動いていると、ステップが進む', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-step', /^[1-9]\d*$/);
});
