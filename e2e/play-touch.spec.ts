import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// iPhone のタッチの操作（LLM-PBI-0002）。PC の操作は play-pc.spec.ts
test.skip(({ isMobile }) => !isMobile, 'タッチの端末だけ');

interface TouchState {
  cursor: { x: number; y: number };
  interceptors: { base: number; toX: number; toY: number }[];
}
const state = (page: Page) => page.evaluate(() => window.__llm?.getState() as unknown as TouchState);

/** 論理座標の点を、画面の位置（CSS ピクセル）に直す */
async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  return { x: box.x + (x / 480) * box.width, y: box.y + (y / 640) * box.height };
}

test('LLM-TC-0002-01 ゲーム画面を触ると、触った所へ、いちばん近い基地から撃ち、照準もそこに移る', async ({ page }) => {
  await openFrozen(page);
  const p = await toPage(page, 400, 200);
  await page.touchscreen.tap(p.x, p.y);
  await advance(page, 1);
  const s = await state(page);
  expect(s.interceptors).toHaveLength(1);
  expect(s.interceptors[0]?.base).toBe(2); // 右の基地 C
  // 画面の位置 → 論理座標の丸めがあるので 1 ドットまで
  expect(Math.abs((s.interceptors[0]?.toX ?? 0) - 400)).toBeLessThanOrEqual(1);
  expect(Math.abs((s.interceptors[0]?.toY ?? 0) - 200)).toBeLessThanOrEqual(1);
  expect(Math.abs(s.cursor.x - 400)).toBeLessThanOrEqual(1);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '10,10,9');
});

test('LLM-TC-0002-03 1 回触ると 1 発だけ撃つ', async ({ page }) => {
  await openFrozen(page);
  const p = await toPage(page, 100, 300);
  await page.touchscreen.tap(p.x, p.y);
  await advance(page, 1);
  await advance(page, 10); // 触っていないステップでは撃たない
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '9,10,10');
  await page.touchscreen.tap(p.x, p.y);
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '8,10,10');
});
