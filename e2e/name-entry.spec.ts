import { expect, test, type Page } from '@playwright/test';
import { advance, confirmName, openFrozen, poke, presetStorage, PREVIEW_RANKING_KEY } from './helpers';

// 名前の入力（LLM-PBI-0007・0020）。PC でも iPhone でも確かめる

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

test('LLM-TC-0007-01 PC で終わりの画面をクリックして名前の画面に入っても、そのまま打てる（入力欄から外れない）', async ({ page, isMobile }) => {
  test.skip(isMobile, 'マウスは PC だけ');
  await openFrozen(page);
  await advance(page, 1);
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: 500, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await advance(page, 120);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.9); // OK の下ではない所（TEAM 5.2 v1.4）
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'name');
  await expect(page.locator('#name-input')).toBeFocused(); // クリックの続きで外れていない（TASK-0033 で直した）
  await page.keyboard.type('pc');
  await expect(page.locator('#name-input')).toHaveValue('pc'); // 小文字はそのまま（LLM-PBI-0020）
});

test('LLM-TC-0007-01 ランクインしなかったら、名前の入力をせず TOP10 の画面へ', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify(Array.from({ length: 10 }, (_, i) => record(1000 - i * 10, `P${i}`))));
  await openFrozen(page);
  await endAndPoke(page, isMobile, 10);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'top10');
  await expect(page.locator('#name-input')).toBeHidden();
});

// LLM-TC-0007-02（大文字にして 3 文字まで）は LLM-TC-0020-01・02 に置き換わった（LLM-PBI-0020）
test('LLM-TC-0020-01 LLM-TC-0020-02 日本語・英数字・記号が入り、絵文字・空白は入らず 8 文字まで。確定すると名前つきで TOP10 に入る', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 500);
  const input = page.locator('#name-input');
  // 確定した文字が入ったときと同じ（変換を通さず、そのまま入る）
  await input.pressSequentially('やまだ😀 たろう山田太郎');
  await expect(input).toHaveValue('やまだたろう山田');
  await input.fill('');
  await input.pressSequentially('Ta-ro!');
  await expect(input).toHaveValue('Ta-ro!');
  await input.fill('');
  await input.pressSequentially('やまだたろう山田');
  await confirmName(page, isMobile);
  expect((await rowsOf(page))[1]).toBe('1 やまだたろう山田 000500');
  expect((await saved(page))[0]).toMatchObject({ name: 'やまだたろう山田', score: 500 });
  await expect(input).toBeHidden();
});

/** 入力欄に、日本語入力の変換の出来事を送る（変換中の文字を置く → 変換を確定する）。実機のキーボードの代わり */
async function compose(page: Page, step: 'start' | 'update' | 'end', value?: string): Promise<void> {
  await page.evaluate(
    ([s, v]) => {
      const el = document.querySelector('#name-input') as HTMLInputElement | null;
      if (!el) throw new Error('入力欄がない');
      if (s === 'start') el.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
      if (v !== undefined) {
        el.value = v;
        el.dispatchEvent(new InputEvent('input', { data: v, inputType: 'insertCompositionText', isComposing: s !== 'end' }));
      }
      if (s === 'end') el.dispatchEvent(new CompositionEvent('compositionend', { data: v ?? '' }));
    },
    [step, value] as const,
  );
}

test('LLM-TC-0020-03 変換中は文字を整えず、変換中の Enter で名前が確定しない。変換の確定のあとに整え、Enter で確定する', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 500);
  const body = page.locator('body');
  const input = page.locator('#name-input');
  await advance(page, 240); // 約 1 秒の受け付けない時間を過ぎてから
  await compose(page, 'start', 'やまだ');
  // 変換中：9 文字を超えても、使えない文字があっても、書き換えない（書き換えると変換が壊れる）
  await compose(page, 'update', 'やまだ たろう12345');
  await expect(input).toHaveValue('やまだ たろう12345');
  // 変換中の Enter（変換の確定のための Enter）では、名前を確定しない
  await page.evaluate(() => {
    const el = document.querySelector('#name-input') as HTMLInputElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
  });
  await expect(body).toHaveAttribute('data-screen', 'name');
  // Safari は、変換を確定する Enter を compositionend のあとに keyCode 229 で送る。これも名前の確定にしない
  await compose(page, 'end', 'やまだ たろう12345');
  await page.evaluate(() => {
    const el = document.querySelector('#name-input') as HTMLInputElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }));
  });
  await expect(body).toHaveAttribute('data-screen', 'name');
  // 変換を確定したところで整える（空白を捨て、8 文字に切る）
  await expect(input).toHaveValue('やまだたろう12');
  await input.press('Enter');
  await expect(body).toHaveAttribute('data-screen', 'top10');
  expect((await saved(page))[0]?.name).toBe('やまだたろう12');
});

/** TOP10 の rank 位の行の、名前の枠（x 120〜330）で、文字の色（明るい画素）がある x の右端（論理座標）。なければ -1 */
async function nameInkRight(page: Page, rank: number): Promise<number> {
  return page.evaluate((r) => {
    const c = document.querySelector('#stage canvas, canvas#stage, canvas') as HTMLCanvasElement | null;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) throw new Error('Canvas がない');
    const k = c.width / 480; // 倍率が変わっても同じ所を読む（TEAM 5.4）
    const y = 176 + 28 * (r - 1);
    const x0 = Math.round(120 * k);
    const w = Math.round(210 * k);
    const d = ctx.getImageData(x0, Math.round((y - 6) * k), w, Math.round(26 * k)).data;
    let right = -1;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] ?? 0) + (d[i + 1] ?? 0) + (d[i + 2] ?? 0);
      if (lum > 300) right = Math.max(right, ((i / 4) % w) / k + 120);
    }
    return right;
  }, rank);
}

test('LLM-TC-0020-04 LLM-TC-0020-05 今までの記録と日本語 8 文字の名前が TOP10 に並び、名前は枠に収まり、読み込み直しても同じ', async ({ page }) => {
  const list = [record(900, 'やまだたろう山田'), record(800, 'AAA'), record(700, '...'), record(600, 'B.C')];
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify(list));
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-screen', 'title');
  const rows = async () => (await rowsOf(page)).slice(2, 7);
  expect(await rows()).toEqual(['1 やまだたろう山田 000900', '2 AAA 000800', '3 ... 000700', '4 B.C 000600', '5 --- 000000']);
  await expect(body).toHaveAttribute('data-top', '900');
  // 名前の枠（x 120〜312）：全角 8 文字は枠の右のほうまで届き、点（x 336 から）にかからない。英字 3 文字は短い
  const jp = await nameInkRight(page, 1);
  const en = await nameInkRight(page, 2);
  expect(jp).toBeGreaterThan(230);
  expect(jp).toBeLessThanOrEqual(312);
  expect(en).toBeGreaterThan(120);
  expect(en).toBeLessThan(jp);
  await openFrozen(page, 1, { title: true }); // 開き直す（保存は置き直さない）
  expect(await rows()).toEqual(['1 やまだたろう山田 000900', '2 AAA 000800', '3 ... 000700', '4 B.C 000600', '5 --- 000000']);
});

test('LLM-TC-0007-03 空のまま確定すると名前は ...（PC は OK のクリックでも確定できる）', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 300);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'name');
  await advance(page, 120);
  if (isMobile) await page.locator('#name-ok').tap();
  else await page.locator('#name-ok').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'top10');
  expect((await rowsOf(page))[1]).toBe('1 ... 000300');
  expect((await saved(page))[0]?.name).toBe('...');
});

test('LLM-TC-0007-03 名前の画面が出てから約 1 秒は、OK・Enter で確定しない（終わりの画面を触った操作が OK に届いても進まない）', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 400);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-screen', 'name');
  // すぐ OK（iPhone で起きた、同じ操作のクリックが指の下の OK に届く場合にあたる）と Enter
  if (isMobile) await page.locator('#name-ok').tap();
  else await page.locator('#name-ok').click();
  await page.locator('#name-input').press('Enter');
  await advance(page, 119); // ふちの少し内側（119 ステップ）でも受け付けない
  await page.locator('#name-input').press('Enter');
  await expect(body).toHaveAttribute('data-screen', 'name');
  await expect(page).toHaveURL(/debug=1/); // ページは読み込み直されていない
  await advance(page, 1); // ちょうど 120 ステップで受け付ける
  await page.locator('#name-input').press('Enter');
  await expect(body).toHaveAttribute('data-screen', 'top10');
});

test('LLM-TC-0007-05 名前を打っているあいだ、キーでゲームが始まらず、画面も切り替わらない', async ({ page, isMobile }) => {
  await openFrozen(page);
  await endAndPoke(page, isMobile, 500);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-screen', 'name');
  await advance(page, 240); // 約 1 秒の受け付けない時間を過ぎても
  await page.locator('#name-input').pressSequentially('g z'); // G（GAME OVER のキー）・空白・Z（発射のキー）
  await expect(body).toHaveAttribute('data-screen', 'name');
  await expect(page.locator('#name-input')).toHaveValue('gz'); // 空白は入らず、小文字はそのまま（LLM-PBI-0020）
  // 入力欄の外（ゲーム画面）を触る・クリックしても、確定も画面の切り替えもしない
  const stage = await page.locator('#stage').boundingBox();
  if (!stage) throw new Error('位置が取れない');
  if (isMobile) await page.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height * 0.8);
  else await page.mouse.click(stage.x + stage.width / 2, stage.y + stage.height * 0.8);
  await expect(body).toHaveAttribute('data-screen', 'name');
  expect((await saved(page))[0]?.name).toBe('...'); // まだ確定していない
});
