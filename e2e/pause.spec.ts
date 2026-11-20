import { expect, test, type Locator, type Page } from '@playwright/test';
import { advance, openFrozen, poke, PREVIEW_RANKING_KEY, presetStorage } from './helpers';

// 一時停止（LLM-PBI-0016・GUI-0003 §9）。止めているかは `?debug=1` の data-paused（1／0）で読む

/** WAVE 1 の始めの「WAVE 1」の表示の長さ（3 秒） */
const BREAK_STEPS = 3 * 120;

async function press(target: Locator, isMobile: boolean): Promise<void> {
  if (isMobile) await target.tap();
  else await target.click();
}

/** ゲーム画面の (rx, ry)（0〜1 の割合）を触る・クリックする */
async function touchStage(page: Page, isMobile: boolean, rx: number, ry: number): Promise<void> {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  const x = box.x + box.width * rx;
  const y = box.y + box.height * ry;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/**
 * アプリ・タブが隠れる／戻る。ヘッドレスのブラウザは別のタブを前に出しても hidden にならないので、
 * visibilityState を上書きしてイベントを出す（案 25 の点検、2026-11-20。本物は実機 LLM-TC-0016-07 で）
 */
async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

const snapshot = async (page: Page) => {
  const body = page.locator('body');
  return {
    step: await body.getAttribute('data-step'),
    score: await body.getAttribute('data-score'),
    ammo: await body.getAttribute('data-ammo'),
    wave: await body.getAttribute('data-wave'),
    status: await body.getAttribute('data-status'),
    enemies: await page.evaluate(() => JSON.stringify(window.__llm?.getState().enemies)),
  };
};

test('LLM-TC-0016-01 「II」はプレイ中（ウェーブのあいだを含む）だけ出て、触ると止まる。ボタンでは撃たない。44 ポイント以上', async ({ page, isMobile }) => {
  await openFrozen(page, 1, { title: true });
  const button = page.locator('#pause-button');
  await expect(button).toBeHidden(); // タイトルでは出さない
  await page.evaluate(() => window.__llm?.start());
  await expect(page.locator('body')).toHaveAttribute('data-status', 'break');
  await expect(button).toBeVisible(); // 「WAVE 1」の表示のあいだも出す
  const size = await button.boundingBox();
  expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(size?.width ?? 0).toBeGreaterThanOrEqual(44);
  await press(button, isMobile);
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-paused', '1');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(button).toBeHidden(); // 止めているあいだは隠す
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '15,15,15'); // ボタンでは撃たない
});

test('LLM-TC-0016-01 終わり（GAME OVER）の表示が出たら「II」を消し、止められない', async ({ page }) => {
  await openFrozen(page);
  await expect(page.locator('#pause-button')).toBeVisible();
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await expect(page.locator('#pause-button')).toBeHidden();
  await setVisibility(page, 'hidden'); // アプリを離れても止めない（LLM-TC-0016-05）
  await setVisibility(page, 'visible');
  await expect(page.locator('body')).toHaveAttribute('data-paused', '0');
});

test('LLM-TC-0016-02 LLM-TC-0016-03 止めているあいだは進まず BGM も止まり、外を触っても撃たない。「続ける」で同じところから進む', async ({ page, isMobile }, info) => {
  await openFrozen(page);
  const body = page.locator('body');
  await touchStage(page, isMobile, 0.5, 0.4); // 最初の操作（音を始める）。1 発撃つ
  await advance(page, BREAK_STEPS + 240); // 敵が降りてきている所まで
  await expect(body).toHaveAttribute('data-bgm', 'on:120');
  await press(page.locator('#pause-button'), isMobile);
  await expect(body).toHaveAttribute('data-paused', '1');
  await expect(body).toHaveAttribute('data-bgm', 'off');
  const before = await snapshot(page);
  await advance(page, 600); // 5 秒ぶん進めようとしても
  await touchStage(page, isMobile, 0.2, 0.3); // ボタンの外を触る
  await advance(page, 10);
  expect(await snapshot(page)).toEqual(before);
  await expect(page.locator('#pause-title')).toHaveText('PAUSE');
  await page.screenshot({ path: info.outputPath('pause.png') });

  // 「▶ 続ける」：止めたところから進み、BGM が鳴り直す。その操作では撃たない
  await press(page.locator('#pause-resume'), isMobile);
  await expect(body).toHaveAttribute('data-paused', '0');
  await expect(page.locator('#pause')).toBeHidden();
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-step', String(Number(before.step) + 1));
  await expect(body).toHaveAttribute('data-ammo', before.ammo ?? '');
  await expect(body).toHaveAttribute('data-bgm', 'on:120');
  await expect(page.locator('#pause-button')).toBeVisible();
});

test('LLM-TC-0016-03 LLM-TC-0016-04 PC はプレイ中に Esc・P で止まり、もう一度で続く', async ({ page, isMobile }) => {
  test.skip(isMobile, 'キーボードは PC だけ');
  await openFrozen(page);
  const body = page.locator('body');
  await advance(page, BREAK_STEPS + 60);
  for (const key of ['Escape', 'p', 'P']) {
    await page.keyboard.press(key);
    await expect(body).toHaveAttribute('data-paused', '1');
    const step = await body.getAttribute('data-step');
    await advance(page, 60);
    await expect(body).toHaveAttribute('data-step', step ?? '');
    await page.keyboard.press(key);
    await expect(body).toHaveAttribute('data-paused', '0');
    await advance(page, 1);
    await expect(body).toHaveAttribute('data-step', String(Number(step) + 1));
  }
  await expect(body).toHaveAttribute('data-ammo', '15,15,15'); // キーでは撃たない
  // 止めているあいだ、ほかのキーでは何もしない（続かない）
  await page.keyboard.press('Escape');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(body).toHaveAttribute('data-paused', '1');
  await expect(body).toHaveAttribute('data-screen', 'play');
});

test('LLM-TC-0016-05 アプリ・タブが隠れたら止まり、戻っても止まったまま。タイトルでは何もしない', async ({ page, isMobile }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await advance(page, BREAK_STEPS + 60);
  await setVisibility(page, 'hidden');
  await expect(body).toHaveAttribute('data-paused', '1');
  const step = await body.getAttribute('data-step');
  await setVisibility(page, 'visible');
  await advance(page, 120);
  await expect(body).toHaveAttribute('data-paused', '1');
  await expect(body).toHaveAttribute('data-step', step ?? '');
  await expect(page.locator('#pause')).toBeVisible();
  await press(page.locator('#pause-resume'), isMobile);
  await expect(body).toHaveAttribute('data-paused', '0');

  // タイトル画面では止めない（今までどおり）
  await page.evaluate(() => window.__llm?.title());
  await setVisibility(page, 'hidden');
  await setVisibility(page, 'visible');
  await expect(body).toHaveAttribute('data-paused', '0');
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(page.locator('#pause')).toBeHidden();
});

test('LLM-TC-0016-06 「やめてタイトルへ」で TOP10 に入れずにタイトルへ。次は新しい WAVE 1', async ({ page, isMobile }) => {
  const saved = JSON.stringify([
    { name: 'AAA', score: 10, cities: 1, missiles: 0, status: 'GAME_OVER', createdAt: '2026-11-20T00:00:00.000Z' },
  ]);
  await presetStorage(page, PREVIEW_RANKING_KEY, saved);
  await openFrozen(page);
  const body = page.locator('body');
  await touchStage(page, isMobile, 0.5, 0.4);
  await advance(page, BREAK_STEPS + 240);
  // 点が入った状態にする（1 位より高い点：入れていたらランクインする）
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    api.setState({ ...api.getState(), score: 5000 });
  });
  await press(page.locator('#pause-button'), isMobile);
  await press(page.locator('#pause-quit'), isMobile);
  await expect(body).toHaveAttribute('data-screen', 'title');
  await expect(body).toHaveAttribute('data-paused', '0');
  await expect(page.locator('#pause')).toBeHidden();
  await expect(page.locator('#pause-button')).toBeHidden();
  expect(await page.evaluate((k) => localStorage.getItem(k), PREVIEW_RANKING_KEY)).toBe(saved);
  await expect(body).toHaveAttribute('data-top', '10');
  // タイトルから始めると新しい WAVE 1
  await advance(page, 121);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await expect(body).toHaveAttribute('data-wave', '1');
  await expect(body).toHaveAttribute('data-score', '0');
  await expect(body).toHaveAttribute('data-ammo', '15,15,15');
});
