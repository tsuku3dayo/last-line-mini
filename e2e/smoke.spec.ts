import { expect, test } from '@playwright/test';

test('LLM-TC-9001-01 プレビューを開くと、画面に版が出てタイトルがプレビューの名前になる', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-channel', 'preview');
  const version = await page.locator('body').getAttribute('data-version');
  expect(version).toMatch(/^v\d+\.\d+\.\d+ β$/);
  await expect(page.locator('#app-version')).toHaveText(version ?? '');
  await expect(page).toHaveTitle('最終防衛線ミニβ');
});
