import { expect, test } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// 1 面の流れ（LLM-PBI-0004）。PC でも iPhone でも確かめる。進み具合は body の data-wave・data-status で読む

const BREAK_STEPS = 3 * 120;

test('LLM-TC-0004-04 6 都市がすべて壊れると GAME OVER になり、その場で止まる', async ({ page }) => {
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  // 都市を 5 つ壊し、最後の都市（x=380）に落ちる敵と、ゆっくり飛ぶ敵を置く
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      cities: s.cities.map((c) => ({ ...c, alive: c.x === 380 })),
      enemies: [
        { fromX: 380, fromY: 0, toX: 380, toY: 592, speed: 1, traveled: 591.5 },
        { fromX: 100, fromY: 0, toX: 100, toY: 592, speed: 0.5, traveled: 200 },
      ],
    });
  });
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-status', 'gameover');
  const before = await page.evaluate(() => window.__llm?.getState().enemies);
  await advance(page, 30);
  expect(await page.evaluate(() => window.__llm?.getState().enemies)).toEqual(before);
});

test('LLM-TC-0004-04 ?debug=1 のとき、PC の G キーでその場で GAME OVER になる', async ({ page, isMobile }) => {
  test.skip(isMobile, 'キーボードは PC だけ');
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  await page.keyboard.press('KeyG');
  await expect(page.locator('body')).toHaveAttribute('data-status', 'gameover');
});

test('LLM-TC-0004-02 WAVE 1 のあいだ → WAVE 1 → 敵がいなくなると WAVE 2 のあいだ → 弾が 10 発に戻って WAVE 2', async ({ page }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-wave', '1');
  await expect(body).toHaveAttribute('data-status', 'break');
  await advance(page, BREAK_STEPS + 1);
  await expect(body).toHaveAttribute('data-status', 'playing');

  // ウェーブ 1 の敵をすべて出し終えて、画面に敵がいない状態にする。基地 A は 2 発まで減らしておく
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      enemies: [],
      wave: { ...s.wave, spawned: 6 },
      bases: s.bases.map((b, i) => (i === 0 ? { ...b, ammo: 2 } : b)),
    });
  });
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-wave', '2');
  await expect(body).toHaveAttribute('data-status', 'break');
  await expect(body).toHaveAttribute('data-ammo', '2,10,10');
  await advance(page, BREAK_STEPS + 1);
  await expect(body).toHaveAttribute('data-status', 'playing');
  await expect(body).toHaveAttribute('data-ammo', '10,10,10');
});
