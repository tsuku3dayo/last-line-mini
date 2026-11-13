import { expect, test } from '@playwright/test';
import { advance, confirmName, openFrozen, poke } from './helpers';

// 1 面の流れ（LLM-PBI-0004）。PC でも iPhone でも確かめる。進み具合は body の data-wave・data-status で読む

const BREAK_STEPS = 3 * 120;

test('LLM-TC-0004-04 6 都市がすべて壊れると GAME OVER になり、その場で止まる', async ({ page }) => {
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  // 都市を 5 つ壊し、最後の都市（x=380）に落ちる敵と、ゆっくり飛ぶ敵を置く
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      cities: s.cities.map((c) => ({ ...c, alive: c.x === 380 })),
      enemies: [
        { fromX: 380, fromY: 0, toX: 380, toY: 592, speed: 1, traveled: 591.5 },
        { fromX: 100, fromY: 0, toX: 100, toY: 592, speed: 0.5, traveled: 200 },
      ],
    });
  });
  await advance(page, 1);
  await expect(page.locator('body')).toHaveAttribute('data-status', 'gameover');
  const before = await page.evaluate(() => window.__llm?.getState().enemies);
  await advance(page, 30);
  expect(await page.evaluate(() => window.__llm?.getState().enemies)).toEqual(before);
});

test('LLM-TC-0004-04 ?debug=1 のとき、PC の G キーでその場で GAME OVER になる', async ({ page, isMobile }) => {
  test.skip(isMobile, 'キーボードは PC だけ');
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  await page.keyboard.press('KeyG');
  await expect(page.locator('body')).toHaveAttribute('data-status', 'gameover');
});

test('LLM-TC-0004-03 LLM-TC-0004-06 LLM-TC-0006-04 CLEAR で「DEFENSE COMPLETE」、約 1 秒あとに触るか押すと TOP10 → タイトル → WAVE 1', async ({ page, isMobile }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await advance(page, BREAK_STEPS + 1);
  // 最後のウェーブの敵をすべて出し終え、画面の敵がいない状態にする
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, enemies: [], wave: { number: 5, status: 'playing', phaseStep: 999, spawned: 21 } });
  });
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-status', 'clear');
  // 終わりの画面にはボーナスの内訳 2 行も出る（LLM-PBI-0005 で足した。弾は 30 発・都市 6 つのまま）
  const breakdown = 'MISSILES 30 X 5    150|CITIES    6 X 100  600';
  await expect(body).toHaveAttribute('data-message', `DEFENSE COMPLETE|${breakdown}`);

  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const poke = async () => (isMobile ? page.touchscreen.tap(center.x, center.y) : page.keyboard.press('Space'));

  await poke(); // 約 1 秒たつ前は受け付けない
  await expect(body).toHaveAttribute('data-status', 'clear');
  await advance(page, 120);
  await expect(body).toHaveAttribute('data-message', `DEFENSE COMPLETE|${breakdown}|TAP OR PRESS ANY KEY`);
  await poke();
  // LLM-PBI-0006 から：終わりのあとは TOP10 の画面（今回の点を YOUR SCORE で出す）→ タイトル → WAVE 1（GUI-0003 §0）
  // LLM-PBI-0007 から：TOP10 が空なのでランクインし、先に名前の入力（空のまま確定）
  await confirmName(page, isMobile);
  await expect(body).toHaveAttribute('data-message', /\|YOUR SCORE 000750$/); // 弾 30 × 5 ＋ 都市 6 × 100
  await poke(); // 出てから約 1 秒は受け付けない
  await expect(body).toHaveAttribute('data-screen', 'top10');
  await advance(page, 120);
  await poke();
  await expect(body).toHaveAttribute('data-screen', 'title');
  await advance(page, 120);
  await poke();
  await expect(body).toHaveAttribute('data-screen', 'play');
  await expect(body).toHaveAttribute('data-status', 'break');
  await expect(body).toHaveAttribute('data-wave', '1');
  await expect(body).toHaveAttribute('data-message', 'WAVE 1');
  await expect(body).toHaveAttribute('data-ammo', '10,10,10'); // 画面を進める操作で撃っていない
});

test('LLM-TC-0005-01 爆風で敵を壊すと data-score が 25 増え、地面に落ちた敵では増えない', async ({ page }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-score', '0');
  // 敵が出る前（WAVE 1 のあいだ）に、広がりきった爆風の中の敵と、何もない所（x=60）に落ちる直前の敵を置く
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      blasts: [{ x: 200, y: 300, age: 48 }], // BLAST_GROW_STEPS（0.4 秒 × 120）で広がりきった爆風
      enemies: [
        { fromX: 200, fromY: 0, toX: 200, toY: 592, speed: 0.001, traveled: 300 },
        { fromX: 60, fromY: 0, toX: 60, toY: 592, speed: 1, traveled: 591.5 },
      ],
    });
  });
  await advance(page, 1);
  expect(await page.evaluate(() => window.__llm?.getState().enemies.length)).toBe(0); // 前提：2 つとも消えた
  await expect(body).toHaveAttribute('data-score', '25');
});

test('LLM-TC-0005-02 LLM-TC-0005-03 CLEAR の瞬間に残弾 × 5 と都市 × 100 が足され、内訳 2 行が出る', async ({ page }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await advance(page, BREAK_STEPS + 1);
  // 最後のウェーブを出し終えた。基地 A 3 発・B 壊れた・C 9 発、都市 4 つ、点 300
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      enemies: [],
      wave: { number: 5, status: 'playing', phaseStep: 999, spawned: 21 },
      bases: [
        { x: 40, ammo: 3, alive: true },
        { x: 240, ammo: 0, alive: false },
        { x: 440, ammo: 9, alive: true },
      ],
      cities: s.cities.map((c, i) => ({ ...c, alive: i < 4 })),
      score: 300,
    });
  });
  await expect(body).toHaveAttribute('data-score', '300'); // 前提
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-status', 'clear');
  await expect(body).toHaveAttribute('data-score', '760');
  await expect(body).toHaveAttribute('data-message', 'DEFENSE COMPLETE|MISSILES 12 X 5     60|CITIES    4 X 100  400');
});

test('LLM-TC-0005-04 やり直すと data-score は 0 から', async ({ page, isMobile }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: 125, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  });
  await expect(body).toHaveAttribute('data-status', 'gameover');
  // LLM-PBI-0006 から：終わり → TOP10 → タイトル → WAVE 1 でやり直す（TC-0005 v1.1）。
  // LLM-PBI-0007 から：TOP10 が空なのでランクインし、先に名前の入力（空のまま確定）
  await advance(page, 120);
  await poke(page, isMobile);
  await confirmName(page, isMobile);
  for (const next of ['title', 'play']) {
    await advance(page, 120);
    await poke(page, isMobile);
    await expect(body).toHaveAttribute('data-screen', next);
  }
  await expect(body).toHaveAttribute('data-wave', '1');
  await expect(body).toHaveAttribute('data-status', 'break');
  await expect(body).toHaveAttribute('data-score', '0');
});

test('LLM-TC-0004-02 WAVE 1 のあいだ → WAVE 1 → 敵がいなくなると WAVE 2 のあいだ → 弾が 10 発に戻って WAVE 2', async ({ page }) => {
  await openFrozen(page);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-wave', '1');
  await expect(body).toHaveAttribute('data-status', 'break');
  await advance(page, BREAK_STEPS + 1);
  await expect(body).toHaveAttribute('data-status', 'playing');

  // ウェーブ 1 の敵をすべて出し終えて、画面に敵がいない状態にする。基地 A は 2 発まで減らしておく
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      enemies: [],
      wave: { ...s.wave, spawned: 8 }, // WAVE 1 の敵の数（config の WAVE_ENEMY_COUNTS[0]。LLM-PBI-0011）
      bases: s.bases.map((b, i) => (i === 0 ? { ...b, ammo: 2 } : b)),
    });
  });
  await advance(page, 1);
  await expect(body).toHaveAttribute('data-wave', '2');
  await expect(body).toHaveAttribute('data-status', 'break');
  await expect(body).toHaveAttribute('data-ammo', '2,10,10');
  await advance(page, BREAK_STEPS + 1);
  await expect(body).toHaveAttribute('data-status', 'playing');
  await expect(body).toHaveAttribute('data-ammo', '10,10,10');
});
