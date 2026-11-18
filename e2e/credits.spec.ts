import { expect, test, type Locator, type Page } from '@playwright/test';
import { PREVIEW_RANKING_KEY, advance, openFrozen, poke, presetStorage } from './helpers';

// クレジットのボタンと画面（LLM-PBI-0013・GUI-0003 §7）

const record = (score: number, name: string) => ({ name, score, cities: 6, missiles: 30, status: 'CLEARED', createdAt: '2026-11-01T00:00:00.000Z' });
/** 10 行うまった TOP10（0 点で終わってもランクインしないので、名前の入力を通らずに TOP10 へ行ける） */
const fullTop10 = JSON.stringify(Array.from({ length: 10 }, (_, i) => record(1000 - i * 10, `P${i}`)));

async function press(target: Locator, isMobile: boolean): Promise<void> {
  if (isMobile) await target.tap();
  else await target.click();
}

/** タイトルで、約 1 秒の受け付けない時間を過ぎてから「クレジット」を押し、クレジット画面にする */
async function openCredits(page: Page, isMobile: boolean): Promise<void> {
  await openFrozen(page, 1, { title: true });
  await advance(page, 120);
  await press(page.locator('#credits-button'), isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'credits');
}

test('LLM-TC-0013-02 「クレジット」はタイトルにだけ出て、押すとクレジット画面になる。ゲームは始まらない。44 ポイント以上', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, fullTop10);
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  const button = page.locator('#credits-button');
  await expect(button).toBeVisible();
  await expect(button).toHaveText('クレジット');
  const box = await button.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);

  // タイトルが出てから約 1 秒は受け付けない
  await press(button, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'title');

  await advance(page, 120);
  await press(button, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'credits');
  await expect(page.locator('#credits')).toBeVisible();
  await expect(button).toBeHidden();
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-screen', 'credits'); // ゲームは始まらない

  // BACK でタイトルに戻る。ボタンの外を触る／押すと、今までどおり WAVE 1 が始まり、ボタンは消える
  await press(page.locator('#credits-back'), isMobile);
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(button).toBeVisible();
  await advance(page, 120);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await expect(button).toBeHidden();

  // 終わり・TOP10 でも出さない
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: 0, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await expect(button).toBeHidden();
  await advance(page, 120);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'top10');
  await expect(button).toBeHidden();
});

test('LLM-TC-0013-03 クレジット画面に 6 つの役割と名前・使った道具と権利が出て、最後まで動かして読める', async ({ page, isMobile }) => {
  await openCredits(page, isMobile);
  await expect(page.locator('#credits .credits-title')).toHaveText('クレジット');
  await expect(page.locator('#credits-back')).toHaveText('← BACK');
  await expect(page.locator('#credits .credits-role')).toHaveText(['PRODUCER', 'DIRECTOR', 'GAME DESIGNER', 'GRAPHIC DESIGNER', 'SOUND CREATOR', 'PROGRAMMER']);
  await expect(page.locator('#credits .credits-name')).toHaveText(['つくだ よしはる', 'つくだ よしはる', 'つくだ よしはる', 'CLAUDE CODE', 'CLAUDE CODE', 'CLAUDE CODE']);
  await expect(page.locator('#credits .credits-section')).toHaveText('使った道具（権利）');
  const tools = page.locator('#credits .credits-tool');
  await expect(tools).toHaveCount(3);
  await expect(tools.nth(0)).toContainText('Vite — MIT License');
  await expect(tools.nth(1)).toContainText('vite-plugin-pwa — MIT License');
  await expect(tools.nth(2)).toContainText('Copyright 2018 Google LLC');
  await expect(page.locator('#credits-mit')).toContainText('Permission is hereby granted, free of charge');

  // BACK は 44 ポイント以上
  const back = await page.locator('#credits-back').boundingBox();
  expect(back?.height ?? 0).toBeGreaterThanOrEqual(44);

  // 本文は上下に動かせる（なぞって動かせるよう touch-action は pan-y）。一番下まで動かすと MIT License の本文の最後が見える
  const scroll = page.locator('#credits-scroll');
  expect(await scroll.evaluate((e) => getComputedStyle(e).touchAction)).toBe('pan-y');
  const sizes = await scroll.evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight }));
  expect(sizes.scroll).toBeGreaterThan(sizes.client);
  await expect(page.locator('#credits-mit p').last()).not.toBeInViewport();
  await scroll.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expect(page.locator('#credits-mit p').last()).toBeInViewport();
  // BACK は動かない部分にあるので、一番下でも見えている
  await expect(page.locator('#credits-back')).toBeInViewport();
});

test('LLM-TC-0013-03 クレジットからは BACK・Esc だけでタイトルに戻る。ほかのキー・触る操作では何も起きず、更新の帯も出ない', async ({ page, isMobile }) => {
  await openCredits(page, isMobile);
  const body = page.locator('body');

  // 新しい版を見つけても、クレジット画面では帯を出さない（タイトルに戻ったら出す）
  await page.evaluate(() => window.__llm?.simulateUpdate());
  await expect(body).toHaveAttribute('data-update', 'waiting');
  await expect(page.locator('#update-banner')).toBeHidden();

  // 本文を触る／クリック・ほかのキーでは何も起きない
  const scrollBox = await page.locator('#credits-scroll').boundingBox();
  if (!scrollBox) throw new Error('本文がない');
  if (isMobile) await page.touchscreen.tap(scrollBox.x + scrollBox.width / 2, scrollBox.y + scrollBox.height / 2);
  else await page.mouse.click(scrollBox.x + scrollBox.width / 2, scrollBox.y + scrollBox.height / 2);
  for (const key of ['Space', 'Enter', 'KeyA']) await page.keyboard.press(key);
  await advance(page, 120);
  await expect(body).toHaveAttribute('data-screen', 'credits');

  if (!isMobile) {
    await page.keyboard.press('Escape');
    await expect(body).toHaveAttribute('data-screen', 'title');
    await expect(body).toHaveAttribute('data-update', 'shown');
    // 戻ってから約 1 秒は、タイトルの触る／押すを受け付けない
    await page.keyboard.press('Space');
    await advance(page, 1);
    await expect(body).toHaveAttribute('data-screen', 'title');
    // もう一度開く（開き直すと本文は一番上から）
    await advance(page, 120);
    await press(page.locator('#credits-button'), isMobile);
    await expect(body).toHaveAttribute('data-screen', 'credits');
    expect(await page.locator('#credits-scroll').evaluate((e) => e.scrollTop)).toBe(0);
  }
  await press(page.locator('#credits-back'), isMobile);
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(body).toHaveAttribute('data-update', 'shown');
});

test('LLM-TC-0013-02・03 スクリーンショット：タイトルのボタン、クレジットの上と一番下', async ({ page, isMobile }, testInfo) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, fullTop10);
  await openFrozen(page, 1, { title: true });
  await advance(page, 1);
  await page.screenshot({ path: testInfo.outputPath('credits-title.png') });
  await advance(page, 120);
  await press(page.locator('#credits-button'), isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'credits');
  await page.screenshot({ path: testInfo.outputPath('credits-top.png') });
  await page.locator('#credits-scroll').evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await page.screenshot({ path: testInfo.outputPath('credits-bottom.png') });
});
