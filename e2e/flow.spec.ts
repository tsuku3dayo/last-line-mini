import { expect, test } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// 1 面の流れ（LLM-PBI-0004）。PC でも iPhone でも確かめる。進み具合は body の data-wave・data-status で読む

const BREAK_STEPS = 3 * 120;

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
