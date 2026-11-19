import { expect, test } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// 効果音（LLM-PBI-0014）。音そのものは実機で聞く（LLM-TC-0014-06）。ここでは `?debug=1` の data-sounds（鳴らした回数）を読む

const BREAK_STEPS = 3 * 120;

test('LLM-TC-0014-05 最初の操作までは音を始めず、エラーにならない', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openFrozen(page); // テスト用の入口で始める（触っていない）
  await advance(page, BREAK_STEPS + 1); // WAVE 1 が始まる（本当なら「ウェーブの始め」の音）
  await expect(page.locator('body')).not.toHaveAttribute('data-sounds', /.+/);
  expect(errors).toEqual([]);
});

test('LLM-TC-0014-01 LLM-TC-0014-05 触ったあとは、ウェーブの始め・撃つ・爆発の音が鳴る', async ({ page, isMobile }) => {
  await openFrozen(page);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  // ゲーム画面の真ん中を触る・クリックする（最初の操作で音が始まり、そこへ撃つ）
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.4;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-sounds', /shot:1/);
  await advance(page, BREAK_STEPS); // 迎撃が着いて爆発、WAVE 1 が始まる
  const sounds = (await page.locator('body').getAttribute('data-sounds')) ?? '';
  expect(sounds).toMatch(/blast:\d/);
  expect(sounds).toMatch(/wave:1/);
});
