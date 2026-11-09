import { expect, test, type Page } from '@playwright/test';
import { advance, confirmName, openFrozen, poke, presetStorage, PREVIEW_RANKING_KEY } from './helpers';

// 名前の入力（LLM-PBI-0007）。PC でも iPhone でも確かめる

const record = (score: number, name = 'AAA') => ({ name, score, cities: 6, missiles: 30, status: 'CLEARED', createdAt: '2026-11-01T00:00:00.000Z' });

/** その場で GAME OVER にして点を置き、約 1 秒待って触るか押す（終わりの画面の次へ） */
async function endAndPoke(page: Page, isMobile: boolean, score: number): Promise<void> {
  await advance(page, 1);
  await page.evaluate((sc) => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: sc, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  }, score);
  await advance(page, 120);
  await poke(page, isMobile);
}

const rowsOf = async (page: Page) => ((await page.locator('body').getAttribute('data-message')) ?? '').split('|');
const saved = async (page: Page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), PREVIEW_RANKING_KEY)) ?? '[]') as { name: string; score: number }[];

test('LLM-TC-0007-01 ランクインしたら名前の入力の画面になり、そのまま入力欄に打てる', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify([record(900), record(100, 'LOW')]));
  await openFrozen(page);
  await endAndPoke(page, isMobile, 500);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-screen', 'name');
  expect(await rowsOf(page)).toEqual(['NEW RECORD', 'RANK 2   SCORE 000500', 'ENTER YOUR NAME']);
  await expect(page.locator('#name-input')).toBeVisible();
  await expect(page.locator('#name-ok')).toBeVisible();
  if (!isMobile) await expect(page.locator('#name-input')).toBeFocused(); // PC はそのまま打てる
  // 入力欄と OK は、ゲーム画面の上半分に出る（iPhone のキーボードで隠れないように。GUI-0003 §3）
  const stage = await page.locator('#stage').boundingBox();
  const ok = await page.locator('#name-ok').boundingBox();
  if (!stage || !ok) throw new Error('位置が取れない');
  expect(ok.y + ok.height).toBeLessThanOrEqual(stage.y + stage.height * 0.52);
});

test('LLM-TC-0007-01 ランクインしなかったら、名前の入力をせず TOP10 の画面へ', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify(Array.from({ length: 10 }, (_, i) => record(1000 - i * 10, `P${i}`))));
  await openFrozen(page);
  await endAndPoke(page, isMobile, 10);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'top10');
  await expect(page.locator('#name-input')).toBeHidden();
});

test('LLM-TC-0007-02 LLM-TC-0007-03 小文字は大文字に、ほかの文字は入らず 3 文字まで。確定すると名前つきで TOP10 に入る', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 500);
  await page.locator('#name-input').pressSequentially('a!b-cd');
  await expect(page.locator('#name-input')).toHaveValue('ABC');
  await confirmName(page, isMobile);
  expect((await rowsOf(page))[1]).toBe(' 1  ABC  000500');
  expect((await saved(page))[0]).toMatchObject({ name: 'ABC', score: 500 });
  await expect(page.locator('#name-input')).toBeHidden();
});

test('LLM-TC-0007-03 空のまま確定すると名前は ...（PC は OK のクリックでも確定できる）', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 300);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'name');
  if (isMobile) await page.locator('#name-ok').tap();
  else await page.locator('#name-ok').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'top10');
  expect((await rowsOf(page))[1]).toBe(' 1  ...  000300');
  expect((await saved(page))[0]?.name).toBe('...');
});

test('LLM-TC-0007-05 名前を打っているあいだ、キーでゲームが始まらず、画面も切り替わらない', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 500);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-screen', 'name');
  await advance(page, 240); // 約 1 秒の受け付けない時間を過ぎても
  await page.locator('#name-input').pressSequentially('g z'); // G（GAME OVER のキー）・空白・Z（発射のキー）
  await expect(body).toHaveAttribute('data-screen', 'name');
  await expect(page.locator('#name-input')).toHaveValue('GZ');
  // 入力欄の外（ゲーム画面）を触る・クリックしても、確定も画面の切り替えもしない
  const stage = await page.locator('#stage').boundingBox();
  if (!stage) throw new Error('位置が取れない');
  if (isMobile) await page.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height * 0.8);
  else await page.mouse.click(stage.x + stage.width / 2, stage.y + stage.height * 0.8);
  await expect(body).toHaveAttribute('data-screen', 'name');
  expect((await saved(page))[0]?.name).toBe('...'); // まだ確定していない
});
