import { expect, test, type Page } from '@playwright/test';
import { PREVIEW_RANKING_KEY } from './helpers';

// 起動の復旧（LLM-PBI-0012・GUI-0003 §6。public/boot.js）。アプリ本体（assets/index-*.js）を止めて、8 秒で復旧の画面が出ることを確かめる

const APP_MODULE = /\/assets\/index-[^/]*\.js$/;

/** アプリ本体を読めなくして開き、時計を 8 秒進める */
async function openBroken(page: Page): Promise<void> {
  await page.route(APP_MODULE, (route) => route.abort());
  await page.clock.install();
  await page.goto('./');
  await expect(page.locator('#boot-recovery')).toHaveCount(0); // 8 秒たつまでは出さない
  await page.clock.fastForward(8100);
  await expect(page.locator('#boot-recovery')).toBeVisible();
}

test('LLM-TC-0012-04 ふだんの起動では復旧の画面は出ない（アプリが最初の画面を出したらタイマーを止める）', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  await expect(page.locator('body')).toHaveAttribute('data-boot', 'ok');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  await page.clock.fastForward(9000);
  await expect(page.locator('#boot-recovery')).toHaveCount(0);
});

test('LLM-TC-0012-04 本体が 8 秒たっても画面を出せないと、復旧の画面が出る。ボタンは 44 ポイント以上', async ({ page }, testInfo) => {
  await openBroken(page);
  const box = page.locator('#boot-recovery');
  await expect(box).toContainText('起動できませんでした');
  await expect(box).toContainText('ランキングは消えません。');
  await expect(page.locator('#boot-reload')).toHaveText('再読み込み');
  await expect(page.locator('#boot-clear')).toHaveText('キャッシュを消して再読み込み');
  for (const id of ['#boot-reload', '#boot-clear']) {
    const b = await page.locator(id).boundingBox();
    expect(b?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath('boot-recovery.png') });
});

test.describe('キャッシュを消して再読み込み', () => {
  // CacheStorage を Chromium で確かめる。本物の SW がいると本体を SW のキャッシュから読んでしまうので、SW は止め、
  // SW の登録は偽物（本番とプレビューの範囲の 2 つ）を置いて、どちらの unregister が呼ばれたかを見る
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium だけで確かめる');
  test.use({ serviceWorkers: 'block' });

  test('LLM-TC-0012-04 自分のチャンネルのキャッシュと SW の登録だけを消し、ランキングは残る', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __unregistered?: string[] };
      w.__unregistered = JSON.parse(sessionStorage.getItem('__unregistered') ?? '[]') as string[];
      const fake = (scope: string) => ({
        scope: new URL(scope, location.href).href,
        unregister: () => {
          w.__unregistered?.push(scope);
          sessionStorage.setItem('__unregistered', JSON.stringify(w.__unregistered));
          return Promise.resolve(true);
        },
      });
      Object.defineProperty(navigator.serviceWorker, 'getRegistrations', {
        value: () => Promise.resolve([fake('/last-line-mini/'), fake('/last-line-mini/preview/')]),
      });
    });
    await openBroken(page);
    await page.evaluate(async (key) => {
      localStorage.setItem(key, '[]');
      for (const n of ['last-line-mini-preview-precache-v2-x', 'last-line-mini-preview-runtime-x', 'last-line-mini-precache-v2-x', 'other-app-precache']) {
        await caches.open(n);
      }
    }, PREVIEW_RANKING_KEY);

    await Promise.all([page.waitForEvent('load'), page.locator('#boot-clear').click()]);

    const keys = await page.evaluate(() => caches.keys());
    expect(keys.sort()).toEqual(['last-line-mini-precache-v2-x', 'other-app-precache']);
    expect(await page.evaluate(() => sessionStorage.getItem('__unregistered'))).toBe(JSON.stringify(['/last-line-mini/preview/']));
    expect(await page.evaluate((key) => localStorage.getItem(key), PREVIEW_RANKING_KEY)).toBe('[]');
  });
});
