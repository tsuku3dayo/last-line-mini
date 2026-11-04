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

test('LLM-TC-0002-04 縦の画面に、ゲーム画面の全体が欠けずに 1 画面に収まる', async ({ page }) => {
  await openFrozen(page);
  const box = await page.locator('#stage').boundingBox();
  const view = page.viewportSize();
  if (!box || !view) throw new Error('大きさが取れない');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height + 0.5);
  expect(box.width).toBeCloseTo(view.width, 0); // 縦の画面では幅いっぱい
  await expect(page.locator('#app-version')).toBeInViewport();
});

test('LLM-TC-0002-05 長押し・2 回タップ・2 本指の拡大につながる既定の動きが止められ、スクロールしない', async ({ page }) => {
  await openFrozen(page);
  const r = await page.evaluate(() => {
    const canvas = document.getElementById('screen');
    // dispatchEvent は、どれかの受け手が既定の動きを止めると false を返す
    const touch = canvas?.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }));
    const gesture = document.dispatchEvent(new Event('gesturestart', { bubbles: true, cancelable: true }));
    // ボタンの上は止めない（あとで置く「更新」ボタンが押せるように）
    const button = document.body.appendChild(document.createElement('button'));
    const onButton = button.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }));
    button.remove();
    window.scrollTo(0, 200);
    return {
      touch,
      gesture,
      onButton,
      touchAction: getComputedStyle(document.body).touchAction,
      scrollable: document.documentElement.scrollHeight > window.innerHeight,
    };
  });
  expect(r.touch).toBe(false);
  expect(r.gesture).toBe(false);
  expect(r.onButton).toBe(true);
  expect(r.touchAction).toBe('none');
  expect(r.scrollable).toBe(false);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
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
