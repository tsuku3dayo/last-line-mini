import { expect, test, type Locator, type Page } from '@playwright/test';
import { advance, confirmName, openFrozen, poke, PREVIEW_RANKING_KEY, PRODUCTION_RANKING_KEY, presetStorage } from './helpers';

// 記録を消す（LLM-PBI-0022・GUI-0003 §10）。確かめる画面かは `?debug=1` の data-clear（confirm／none）で読む

const rec = (score: number, name: string) => ({ name, score, cities: 6, missiles: 30, status: 'CLEARED', createdAt: '2026-11-01T00:00:00.000Z' });
const five = JSON.stringify([rec(4375, 'AAA'), rec(3200, 'やまだ'), rec(1150, 'B.B'), rec(800, 'はる'), rec(420, 'ZZZ')]);

async function press(target: Locator, isMobile: boolean): Promise<void> {
  if (isMobile) await target.tap();
  else await target.click();
}

/** タイトルで約 1 秒待ってから「記録を消す」を押し、確かめる画面を出す */
async function openConfirm(page: Page, isMobile: boolean): Promise<void> {
  await advance(page, 121);
  await press(page.locator('#clear-button'), isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'confirm');
}

const saved = (page: Page, key = PREVIEW_RANKING_KEY) => page.evaluate((k) => localStorage.getItem(k), key);

test('LLM-TC-0022-01 「記録を消す」は記録のあるタイトルだけに出て、押してもゲームは始まらない。44 ポイント以上', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, five);
  await openFrozen(page, 1, { title: true });
  const button = page.locator('#clear-button');
  await expect(button).toBeVisible();
  await expect(button).toHaveText('記録を消す');
  const size = await button.boundingBox();
  expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
  // タイトルが出てから約 1 秒は受け付けない
  await press(button, isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'none');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  await openConfirm(page, isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title'); // ゲームは始まらない
  // プレイ中・TOP10 では出さない
  await page.evaluate(() => window.__llm?.start());
  await expect(button).toBeHidden();
});

test('LLM-TC-0022-01 記録が 1 件もないときは出さない', async ({ page }) => {
  await openFrozen(page, 1, { title: true });
  await advance(page, 121);
  await expect(page.locator('#credits-button')).toBeVisible();
  await expect(page.locator('#clear-button')).toBeHidden();
});

test('LLM-TC-0022-02 LLM-TC-0022-03 確かめる画面に件数と 2 つのボタン。約 1 秒は押せず、「やめる」で何も消さずに戻る', async ({ page, isMobile }, info) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, five);
  await openFrozen(page, 1, { title: true });
  await openConfirm(page, isMobile);
  await expect(page.locator('#clear-title')).toHaveText('TOP10 の記録を消しますか？');
  await expect(page.locator('#clear-note')).toContainText('（5 件）');
  await expect(page.locator('#clear-note')).toContainText('元に戻せません');
  await expect(page.locator('#sound-button')).toBeHidden();
  await expect(page.locator('#credits-button')).toBeHidden();
  for (const id of ['#clear-yes', '#clear-no']) {
    const size = await page.locator(id).boundingBox();
    expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: info.outputPath('clear-confirm.png') });
  // 出てすぐの「消す」は受け付けない
  await press(page.locator('#clear-yes'), isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'confirm');
  expect(await saved(page)).toBe(five);
  // ボタンの外を触っても何もしない（ゲームは始まらない）
  await advance(page, 121);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.15);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.15);
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'confirm');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  // 「やめる」
  await press(page.locator('#clear-no'), isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'none');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  await expect(page.locator('#clear-button')).toBeVisible();
  expect(await saved(page)).toBe(five);
  await expect(page.locator('body')).toHaveAttribute('data-top', '4375');
});

test('LLM-TC-0022-03 PC は Esc でやめる。ほかのキーでは何もしない', async ({ page, isMobile }) => {
  test.skip(isMobile, 'キーボードは PC だけ');
  await presetStorage(page, PREVIEW_RANKING_KEY, five);
  await openFrozen(page, 1, { title: true });
  await openConfirm(page, isMobile);
  await advance(page, 121);
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'confirm');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-clear', 'none');
  expect(await saved(page)).toBe(five);
});

test('LLM-TC-0022-04 「消す」で開いているチャンネルの TOP10 だけ消え、TOP 000000。音の設定と本番の記録は残り、開き直しても空', async ({ page, isMobile }, info) => {
  const production = JSON.stringify([rec(9000, 'PRD')]);
  await presetStorage(page, PREVIEW_RANKING_KEY, five);
  await page.addInitScript((v) => {
    if (sessionStorage.getItem('__preset2') === '1') return;
    sessionStorage.setItem('__preset2', '1');
    localStorage.setItem('last-line-mini-ranking', v);
    localStorage.setItem('last-line-mini-preview-sound', 'off');
  }, production);
  await openFrozen(page, 1, { title: true });
  await openConfirm(page, isMobile);
  await advance(page, 121);
  await press(page.locator('#clear-yes'), isMobile);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-clear', 'none');
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(body).toHaveAttribute('data-top', '0');
  await expect(page.locator('#clear-button')).toBeHidden();
  expect(await saved(page)).toBeNull();
  expect(await saved(page, PRODUCTION_RANKING_KEY)).toBe(production);
  expect(await page.evaluate(() => localStorage.getItem('last-line-mini-preview-sound'))).toBe('off');
  await advance(page, 121);
  expect((await body.getAttribute('data-message')) ?? '').not.toContain('AAA');
  await page.screenshot({ path: info.outputPath('clear-done.png') });
  // 開き直しても空
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-top', '0');
  await expect(page.locator('#clear-button')).toBeHidden();
});

test('LLM-TC-0022-05 消したあと遊んでランクインすると、名前を入れて 1 位に入る', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, five);
  await openFrozen(page, 1, { title: true });
  await openConfirm(page, isMobile);
  await advance(page, 121);
  await press(page.locator('#clear-yes'), isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-top', '0');
  // タイトルから始めて、すぐ GAME OVER にする（点 0 でも空の TOP10 には入る）
  await advance(page, 121);
  await poke(page, isMobile);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: 120, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await advance(page, 121);
  await poke(page, isMobile);
  await confirmName(page, isMobile, 'NEW');
  const list = JSON.parse((await saved(page)) ?? '[]') as { name: string }[];
  expect(list).toHaveLength(1);
  expect(list[0]?.name).toBe('NEW');
});
