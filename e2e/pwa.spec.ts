import { expect, test } from '@playwright/test';

test.describe('PWA の骨組み', () => {
  // Service Worker のオフラインの確かめは Chromium で行う（WebKit の Playwright は SW の扱いが限られる）
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium だけで確かめる');

  test('LLM-TC-9001-05 Service Worker が登録され、オフラインでも読み込み直せる', async ({ page, context }) => {
    await page.goto('./');
    await expect(page.locator('body')).toHaveAttribute('data-sw', 'registered');
    // 初めて入った SW は、今開いているページを扱わない（registerType: 'prompt'）。
    // 有効になるのを待ってから一度読み込み直し、SW がページを扱う状態にする
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-channel', 'preview');
    await expect(page.locator('#app-version')).toHaveText(/^v\d+\.\d+\.\d+ β( [0-9a-f]{7})?$/);
    await context.setOffline(false);
  });

  test('LLM-TC-9001-04 マニフェストがプレビューの名前・範囲・アイコンになっている', async ({ page, request }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const res = await request.get(new URL(href ?? '', page.url()).toString());
    const manifest = (await res.json()) as { name: string; short_name: string; scope: string; icons: { src: string }[] };
    expect(manifest.name).toBe('最終防衛線ミニβ');
    expect(manifest.short_name).toBe('防衛線ミニβ');
    expect(manifest.scope).toBe('/last-line-mini/preview/');
    expect(manifest.icons.every((i) => i.src.startsWith('icons/preview/'))).toBe(true);
  });
});
