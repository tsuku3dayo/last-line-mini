import { expect, test, type Page } from '@playwright/test';
import { advance, moveMouse, openFrozen } from './helpers';

// PC の操作（マウス）。タッチの端末では LLM-PBI-0002 で確かめる。
// LLM-PBI-0019 から、PC もクリックで近い基地から撃ち、キーボードでは照準を動かさず撃たない（GUI-0001 v1.7 §3）
test.skip(({ isMobile }) => isMobile, 'PC の操作だけ');

interface CursorState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
const cursor = (page: Page) => page.evaluate(() => window.__llm?.getState().cursor as CursorState);

/** 論理座標の点を、画面の位置（CSS ピクセル）に直す */
async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  return { x: box.x + (x / 480) * box.width, y: box.y + (y / 640) * box.height };
}

/** 論理座標の点を左クリックする（押した瞬間に撃つ） */
async function clickAt(page: Page, x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
  const p = await toPage(page, x, y);
  await page.mouse.click(p.x, p.y, { button });
}

test('LLM-TC-0001-02 マウスを動かすと、照準がマウスの位置にすぐ動く', async ({ page }) => {
  await openFrozen(page);
  for (const target of [{ x: 100, y: 200 }, { x: 400, y: 450 }]) {
    const p = await toPage(page, target.x, target.y);
    await moveMouse(page, p.x, p.y);
    await advance(page, 1);
    const c = await cursor(page);
    expect(c.x).toBeCloseTo(target.x, 0);
    expect(c.y).toBeCloseTo(target.y, 0);
  }
});

interface PlayState {
  interceptors: { base: number; toX: number; toY: number }[];
  blasts: { x: number; y: number; age: number }[];
  bases: { ammo: number }[];
}
const play = (page: Page) => page.evaluate(() => window.__llm?.getState() as unknown as PlayState);

test('LLM-TC-0001-03 LLM-TC-0019-01 左クリックで、近い中央の基地からクリックした所へ撃ち、着くと爆風になる', async ({ page }) => {
  await openFrozen(page);
  await advance(page, 1);
  await clickAt(page, 240, 200);
  await advance(page, 1);
  let s = await play(page);
  expect(s.interceptors).toHaveLength(1);
  expect(s.interceptors[0]?.base).toBe(1);
  expect(s.interceptors[0]?.toX).toBeCloseTo(240, 0);
  expect(s.interceptors[0]?.toY).toBeCloseTo(200, 0);
  // 中央は 1 秒に 600 ドット。360 ドット先へは 1 秒あれば着く
  await advance(page, 120);
  s = await play(page);
  expect(s.interceptors).toHaveLength(0);
  expect(s.blasts).toHaveLength(1);
  expect(s.blasts[0]?.x).toBeCloseTo(240, 0);
});

test('LLM-TC-0001-05 LLM-TC-0019-01 左の基地の近くをクリックするたびに左の残弾が減り、0 になると次に近い中央から撃つ', async ({ page }) => {
  await openFrozen(page);
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '10,10,10');
  for (let i = 0; i < 10; i++) {
    await clickAt(page, 60, 200);
    await advance(page, 1);
  }
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '0,10,10');
  // 左が 0 発：x 60 からいちばん近いのは中央（距離 180。右は 380）
  await clickAt(page, 60, 200);
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '0,9,10');
});

test('LLM-TC-0019-02 ゲーム画面の外のクリック、右クリック・真ん中のクリックでは撃たない', async ({ page }) => {
  await openFrozen(page);
  await advance(page, 1);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  // ゲーム画面の左の外（黒いところ）。PC の窓は横長なので、左右に黒い所がある
  expect(box.x).toBeGreaterThan(20); // 前提
  await page.mouse.click(box.x / 2, box.y + box.height / 2);
  await clickAt(page, 240, 200, 'right');
  await clickAt(page, 240, 200, 'middle');
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '10,10,10');
  expect((await play(page)).interceptors).toHaveLength(0);
});

test('LLM-TC-0019-03 方向キー・Z・X・C では、照準も動かず撃ちもしない', async ({ page }) => {
  await openFrozen(page);
  await advance(page, 1);
  const start = await cursor(page);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await advance(page, 60);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  for (const key of ['KeyZ', 'KeyX', 'KeyC']) await page.keyboard.press(key);
  await advance(page, 1);
  expect(await cursor(page)).toEqual(start);
  await expect(page.locator('body')).toHaveAttribute('data-ammo', '10,10,10');
  expect((await play(page)).interceptors).toHaveLength(0);
});

test('LLM-TC-0019-04 画面を進めるクリック（タイトル・終わり・TOP10）では撃たない', async ({ page }) => {
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  // タイトル → クリックで WAVE 1（このクリックで撃たない）
  await advance(page, 120);
  await clickAt(page, 240, 200);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-ammo', '10,10,10');
  expect((await play(page)).interceptors).toHaveLength(0);
  // その場で終わりにする（TOP10 が空なのでランクインし、名前の画面を通る）
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await advance(page, 120);
  await clickAt(page, 240, 600); // 終わりの画面 → 名前の画面（OK の下ではない所）
  await expect(body).toHaveAttribute('data-screen', 'name');
  await advance(page, 120);
  await page.keyboard.press('Enter');
  await expect(body).toHaveAttribute('data-screen', 'top10');
  await advance(page, 120);
  await clickAt(page, 240, 200); // TOP10 → タイトル
  await expect(body).toHaveAttribute('data-screen', 'title');
  await advance(page, 120);
  await clickAt(page, 240, 200); // タイトル → WAVE 1
  await expect(body).toHaveAttribute('data-screen', 'play');
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-ammo', '10,10,10');
  expect((await play(page)).interceptors).toHaveLength(0);
});
