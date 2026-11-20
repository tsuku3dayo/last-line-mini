import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen, poke } from './helpers';

/** タイトルで「♪ 音 ON／OFF」を触る・クリックする（タイトルが出てから約 1 秒たってから） */
async function toggleSound(page: Page, isMobile: boolean): Promise<void> {
  await advance(page, 121);
  const button = page.locator('#sound-button');
  await expect(button).toBeVisible();
  if (isMobile) await button.tap();
  else await button.click();
}

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

test('LLM-TC-0014-02 BGM はプレイ中だけ鳴り、後半ほど速く、終わりで止まる', async ({ page, isMobile }) => {
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  // タイトルを触ってゲームを始める（最初の操作で音が始まる）
  await advance(page, 121);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.3);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.3);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-bgm', 'on:120');
  // WAVE 3 にする → 速くなる
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, wave: { ...s.wave, number: 3 } });
  });
  await expect(body).toHaveAttribute('data-bgm', 'on:136');
  // G キーで GAME OVER → 止まる
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await expect(body).toHaveAttribute('data-bgm', 'off');
});

test('LLM-TC-0014-04 「♪ 音 ON／OFF」で切り替わり、OFF なら鳴らない。開き直しても OFF。ゲームは始まらない。44 ポイント以上', async ({ page, isMobile }) => {
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  const button = page.locator('#sound-button');
  await expect(body).toHaveAttribute('data-sound-enabled', 'on');
  await toggleSound(page, isMobile);
  await expect(button).toHaveText('♪ 音 OFF');
  await expect(body).toHaveAttribute('data-sound-enabled', 'off');
  await expect(body).toHaveAttribute('data-screen', 'title'); // ゲームは始まらない
  const size = await button.boundingBox();
  expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
  // OFF のまま始めて撃っても、音は数えない
  await page.evaluate(() => window.__llm?.start());
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.4);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.4);
  await advance(page, 400);
  await expect(body).not.toHaveAttribute('data-sounds', /.+/);
  await expect(body).toHaveAttribute('data-bgm', 'off');
  // 開き直しても OFF（端末に覚えている）
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-sound-enabled', 'off');
  await expect(page.locator('#sound-button')).toHaveText('♪ 音 OFF');
});

// タイトルの曲（LLM-PBI-0023）。曲そのものは実機で聞く（LLM-TC-0023-04）。ここでは data-bgm（どの曲を鳴らすと決めたか）を読む

/** ボタンを触る・クリックする */
async function press(page: Page, id: string, isMobile: boolean): Promise<void> {
  const button = page.locator(id);
  await expect(button).toBeVisible();
  if (isMobile) await button.tap();
  else await button.click();
  await advance(page, 1);
}

test('LLM-TC-0023-03 最初に触るまでは鳴らない。タイトルで ON にするとすぐタイトルの曲。OFF では鳴らない', async ({ page, isMobile }) => {
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  await advance(page, 121);
  await expect(body).toHaveAttribute('data-bgm', 'off'); // まだ触っていない（ブラウザの決まり）
  await toggleSound(page, isMobile); // 最初に触った（音を出せるようになる）→ OFF
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-sound-enabled', 'off');
  await expect(body).toHaveAttribute('data-bgm', 'off');
  await press(page, '#sound-button', isMobile); // ON にする
  await expect(body).toHaveAttribute('data-sound-enabled', 'on');
  await expect(body).toHaveAttribute('data-bgm', 'title:90');
  await expect(body).toHaveAttribute('data-screen', 'title'); // ゲームは始まらない
});

test('LLM-TC-0023-01 LLM-TC-0023-02 タイトルとクレジットでタイトルの曲、プレイで切り替わり、終わり・TOP10 では止まり、タイトルに戻ると鳴る', async ({ page, isMobile }) => {
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  await advance(page, 121);
  // 最初の操作：「♪」を 2 回（OFF → ON）。触ると音を出せるようになり、ON でタイトルの曲
  await toggleSound(page, isMobile);
  await press(page, '#sound-button', isMobile);
  await expect(body).toHaveAttribute('data-bgm', 'title:90');
  // クレジットでも止めない
  await press(page, '#credits-button', isMobile);
  await expect(body).toHaveAttribute('data-screen', 'credits');
  await expect(body).toHaveAttribute('data-bgm', 'title:90');
  await advance(page, 121);
  await press(page, '#credits-back', isMobile);
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(body).toHaveAttribute('data-bgm', 'title:90');
  // タイトルを触って始める → プレイの曲に切り替わる（最初のタップで始まる動きは変わらない）
  await advance(page, 121);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.3);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.3);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-bgm', 'on:120');
  // GAME OVER → 止まる。そのあとの TOP10（または名前の入力）でも鳴らさない
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await expect(body).toHaveAttribute('data-bgm', 'off');
  await advance(page, 600);
  await poke(page, isMobile);
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-screen', /^(top10|name)$/);
  await expect(body).toHaveAttribute('data-bgm', 'off');
  // タイトルに戻ると、またタイトルの曲
  await page.evaluate(() => window.__llm?.title());
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(body).toHaveAttribute('data-bgm', 'title:90');
});

test('LLM-TC-0014-04 スクリーンショット：タイトルの「♪ 音 ON」と「♪ 音 OFF」', async ({ page, isMobile }, info) => {
  await openFrozen(page, 1, { title: true });
  await advance(page, 121);
  await page.screenshot({ path: info.outputPath('sound-on.png') });
  await toggleSound(page, isMobile);
  await advance(page, 0);
  await page.screenshot({ path: info.outputPath('sound-off.png') });
});
