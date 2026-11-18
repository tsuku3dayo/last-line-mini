import { expect, test, type Page } from '@playwright/test';
import { PREVIEW_RANKING_KEY, advance, openFrozen, poke, presetStorage } from './helpers';

// 更新の帯（LLM-PBI-0012・GUI-0003 §5）。本物の SW の更新は E2E で作りにくいので、`?debug=1` の simulateUpdate で
// 「新しい版を見つけた」ことにする。「更新」は読み込み直さず data-update-applied を数える（本物の切り替えは実機 TC-0012-06）

const record = (score: number, name: string) => ({ name, score, cities: 6, missiles: 30, status: 'CLEARED', createdAt: '2026-11-01T00:00:00.000Z' });
/** 10 行うまった TOP10（0 点で終わってもランクインしないので、名前の入力を通らずに TOP10 へ行ける） */
const fullTop10 = JSON.stringify(Array.from({ length: 10 }, (_, i) => record(1000 - i * 10, `P${i}`)));

const simulateUpdate = (page: Page) => page.evaluate(() => window.__llm?.simulateUpdate());

/** 帯の「更新」の外の、ゲーム画面の真ん中あたりではない所（帯の文字のところ）を触る／クリックする */
async function tapBannerText(page: Page, isMobile: boolean): Promise<void> {
  const box = await page.locator('#update-text').boundingBox();
  if (!box) throw new Error('帯の文字がない');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

test('LLM-TC-0012-01 新しい版を見つけても勝手に切り替えず、タイトルに帯が出る。プレイ中は消え、TOP10 でまた出る', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, fullTop10);
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  const banner = page.locator('#update-banner');
  await expect(body).toHaveAttribute('data-update', 'none');
  await expect(banner).toBeHidden();

  await simulateUpdate(page);
  await expect(body).toHaveAttribute('data-update', 'shown');
  await expect(banner).toBeVisible();
  await expect(page.locator('#update-text')).toHaveText('新しい版があります');
  await expect(page.locator('#update-button')).toHaveText('更新');
  expect(await body.getAttribute('data-update-applied')).toBeNull(); // 勝手に切り替えない

  // 帯の外を触る／押すと、今までどおり WAVE 1 が始まり、帯は消える
  await advance(page, 120);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await expect(body).toHaveAttribute('data-update', 'waiting');
  await expect(banner).toBeHidden();

  // 終わりの表示でも出さない
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: 0, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await expect(body).toHaveAttribute('data-status', 'gameover');
  await expect(banner).toBeHidden();

  // TOP10 に来たらまた出る
  await advance(page, 120);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'top10');
  await expect(body).toHaveAttribute('data-update', 'shown');
  await expect(banner).toBeVisible();
});

test('LLM-TC-0012-02 「更新」で切り替える。帯の文字のところを触ってもゲームは始まらない。ボタンは 44 ポイント以上', async ({ page, isMobile }) => {
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  await simulateUpdate(page);
  await advance(page, 120); // 約 1 秒の受け付けない時間を過ぎても、帯の中では始まらないこと

  await tapBannerText(page, isMobile);
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-screen', 'title');

  const button = page.locator('#update-button');
  const box = await button.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  if (isMobile) await button.tap();
  else await button.click();
  await expect(body).toHaveAttribute('data-update-applied', '1');
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-screen', 'title'); // 「更新」でもゲームは始まらない
});

test('LLM-TC-0012-02 スクリーンショット：タイトルと TOP10 の更新の帯', async ({ page, isMobile }, testInfo) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, fullTop10);
  await openFrozen(page, 1, { title: true });
  await simulateUpdate(page);
  await advance(page, 1);
  await page.screenshot({ path: testInfo.outputPath('update-banner-title.png') });
  await advance(page, 120);
  await poke(page, isMobile);
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: 0, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await advance(page, 120);
  await poke(page, isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'top10');
  await advance(page, 1);
  await page.screenshot({ path: testInfo.outputPath('update-banner-top10.png') });
});
