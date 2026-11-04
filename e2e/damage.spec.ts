import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// 都市と基地の被弾（LLM-PBI-0003）。PC でも iPhone でも確かめる

interface DamageState {
  cities: { alive: boolean }[];
  bases: { alive: boolean; ammo: number }[];
  interceptors: { base: number }[];
}
const state = (page: Page) => page.evaluate(() => window.__llm?.getState() as unknown as DamageState);

/** 地面のすぐ上に、x に落ちる敵を置く（次のステップで着く） */
async function dropAt(page: Page, xs: number[]): Promise<void> {
  await page.evaluate((list) => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, enemies: list.map((x) => ({ fromX: x, fromY: 0, toX: x, toY: 592, speed: 1, traveled: 591.5 })) });
  }, xs);
}

test('LLM-TC-0003-02 LLM-TC-0003-03 敵が落ちると都市と基地が壊れ、壊れた基地は残弾 0 で撃てない', async ({ page, isMobile }) => {
  await openFrozen(page);
  await dropAt(page, [140, 240]);
  await advance(page, 1);
  const s = await state(page);
  expect(s.cities.map((c) => c.alive)).toEqual([true, false, true, true, true, true]);
  expect(s.bases.map((b) => b.alive)).toEqual([true, false, true]);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '10,0,10');

  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  const above = { x: box.x + (250 / 480) * box.width, y: box.y + (300 / 640) * box.height }; // 基地 B のま上
  if (isMobile) {
    await page.touchscreen.tap(above.x, above.y);
  } else {
    await page.mouse.move(above.x, above.y);
    await page.keyboard.press('KeyX'); // 基地 B のキー
  }
  await advance(page, 1);
  const after = await state(page);
  if (isMobile) {
    // タッチは残りの基地から撃つ
    expect(after.interceptors).toHaveLength(1);
    expect(after.interceptors[0]?.base).not.toBe(1);
  } else {
    expect(after.interceptors).toHaveLength(0);
    await expect(page.locator('body')).toHaveAttribute('data-ammo', '10,0,10');
  }
});
