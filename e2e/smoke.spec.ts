import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('LLM-TC-9001-01 プレビューを開くと、画面に版が出てタイトルがプレビューの名前になる', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-channel', 'preview');
  const version = await page.locator('body').getAttribute('data-version');
  expect(version).toMatch(/^v\d+\.\d+\.\d+ β( [0-9a-f]{7})?$/);
  await expect(page.locator('#app-version')).toHaveText(version ?? '');
  await expect(page).toHaveTitle('最終防衛線ミニβ');
});

test('LLM-TC-9001-14 ?debug=1 のときだけ、画面に fps が出る', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#debug-fps')).toHaveCount(0);
  await page.goto('./?debug=1');
  await expect(page.locator('#debug-fps')).toHaveText(/^fps \d+$/, { timeout: 5000 });
});

test('LLM-TC-9001-13 プレビューの版に、build したコミットの短い番号が付く', async ({ page }) => {
  // build と同じ決め方（vite.config.ts）：APP_COMMIT があればそれ、なければ git
  const head = process.env.APP_COMMIT || execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim();
  await page.goto('./');
  await expect(page.locator('#app-version')).toHaveText(new RegExp(`^v\\d+\\.\\d+\\.\\d+ β ${head}$`));
});
