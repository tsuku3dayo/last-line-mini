import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// PC の操作（キーボード・マウス）。タッチの端末では LLM-PBI-0002 で確かめる
test.skip(({ isMobile }) => isMobile, 'PC の操作だけ');

interface CursorState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
const cursor = (page: Page) => page.evaluate(() => window.__llm?.getState().cursor as CursorState);

/** 論理座標の点を、画面の位置（CSS ピクセル）に直す */
async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  return { x: box.x + (x / 480) * box.width, y: box.y + (y / 640) * box.height };
}

test('LLM-TC-0001-02 マウスを動かすと、照準がマウスの位置にすぐ動く', async ({ page }) => {
  await openFrozen(page);
  for (const target of [{ x: 100, y: 200 }, { x: 400, y: 450 }]) {
    const p = await toPage(page, target.x, target.y);
    await page.mouse.move(p.x, p.y);
    await advance(page, 1);
    const c = await cursor(page);
    expect(c.x).toBeCloseTo(target.x, 0);
    expect(c.y).toBeCloseTo(target.y, 0);
  }
});

test('LLM-TC-0001-01 方向キーを押し続けると照準が加速して動き、離すとすぐには止まらず止まる', async ({ page }) => {
  await openFrozen(page);
  const start = await cursor(page);
  await page.keyboard.down('ArrowRight');
  await advance(page, 60);
  const moving = await cursor(page);
  await page.keyboard.up('ArrowRight');
  expect(moving.x).toBeGreaterThan(start.x + 50);
  expect(moving.vx).toBeGreaterThan(0);

  await advance(page, 1);
  const justReleased = await cursor(page);
  expect(justReleased.x).toBeGreaterThan(moving.x); // まだ滑っている

  await advance(page, 60);
  const stopped = await cursor(page);
  expect(stopped.vx).toBe(0);
  await advance(page, 10);
  expect((await cursor(page)).x).toBe(stopped.x);
});
