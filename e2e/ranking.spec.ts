import { expect, test, type Page } from '@playwright/test';
import { advance, confirmName, openFrozen, poke, presetStorage, PREVIEW_RANKING_KEY, PRODUCTION_RANKING_KEY } from './helpers';

// TOP10 の保存と HUD の TOP（LLM-PBI-0006）。PC でも iPhone でも確かめる

const record = (score: number, name = 'AAA') => ({ name, score, cities: 6, missiles: 30, status: 'CLEARED', createdAt: '2026-11-01T00:00:00.000Z' });

/** 今の状態をその場で GAME OVER にし、点を置く（終わった瞬間に TOP10 へ入れる） */
async function endWithScore(page: Page, score: number): Promise<void> {
  await page.evaluate((sc) => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({ ...s, score: sc, wave: { ...s.wave, status: 'gameover', phaseStep: 0 } });
  }, score);
  await expect(page.locator('body')).toHaveAttribute('data-status', 'gameover');
}

const readKey = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

test('LLM-TC-0006-05 HUD の TOP に TOP10 の 1 位の点が出る（記録がなければ 0）', async ({ page }) => {
  await openFrozen(page);
  await expect(page.locator('body')).toHaveAttribute('data-top', '0');

  const other = await page.context().newPage();
  await presetStorage(other, PREVIEW_RANKING_KEY, JSON.stringify([record(12345), record(900, 'B.C')]));
  await openFrozen(other);
  await expect(other.locator('body')).toHaveAttribute('data-top', '12345');
});

test('LLM-TC-0006-03 終わった点はプレビューのキーに保存され、本番のキーには書かない', async ({ page }) => {
  await openFrozen(page);
  await advance(page, 1);
  await endWithScore(page, 1234);
  const saved = JSON.parse((await readKey(page, PREVIEW_RANKING_KEY)) ?? '[]') as { name: string; score: number; status: string }[];
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ name: '...', score: 1234, status: 'GAME_OVER' });
  expect(await readKey(page, PRODUCTION_RANKING_KEY)).toBeNull();
  await expect(page.locator('body')).toHaveAttribute('data-top', '1234');
});

test('LLM-TC-0006-03 保存の中身が壊れていても起動し、TOP10 は空（TOP 0）', async ({ page }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, '{これは壊れた中身');
  await openFrozen(page);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
  await expect(page.locator('body')).toHaveAttribute('data-top', '0');
  // 次に終わったときに、正しい形で書き直す
  await advance(page, 1);
  await endWithScore(page, 50);
  const saved = JSON.parse((await readKey(page, PREVIEW_RANKING_KEY)) ?? '[]') as { score: number }[];
  expect(saved.map((r) => r.score)).toEqual([50]);
});

const rowsOf = async (page: Page) => ((await page.locator('body').getAttribute('data-message')) ?? '').split('|');

test('LLM-TC-0006-01 開くとタイトル画面：題字と TOP10 の 10 行。約 1 秒たってから触るか押すと WAVE 1 から', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify([record(12345), record(9870, 'B.C')]));
  await openFrozen(page, 1, { title: true });
  const body = page.locator('body');
  const rows = await rowsOf(page);
  expect(rows.slice(0, 12)).toEqual([
    'LAST LINE MINI',
    'TOP 10',
    '1 AAA 012345',
    '2 B.C 009870',
    ...Array.from({ length: 8 }, (_, i) => `${i + 3} --- 000000`),
  ]);
  await poke(page, isMobile); // 出てから約 1 秒は受け付けない
  await expect(body).toHaveAttribute('data-screen', 'title');
  await advance(page, 120);
  await expect(body).toHaveAttribute('data-message', /\|TAP OR PRESS ANY KEY$/);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'play');
  await expect(body).toHaveAttribute('data-wave', '1');
  await expect(body).toHaveAttribute('data-status', 'break');
  await expect(body).toHaveAttribute('data-ammo', '10,10,10'); // 始める操作で撃っていない
});

test('LLM-TC-0006-04 LLM-TC-0006-06 ランクインした点が TOP10 の画面に入り、開き直しても残る', async ({ page, isMobile }) => {
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify([record(900), record(100, 'LOW')]));
  await openFrozen(page);
  await advance(page, 1);
  await endWithScore(page, 500);
  await advance(page, 120);
  await poke(page, isMobile);
  // LLM-PBI-0007 から：ランクインしたら先に名前の入力（空のまま確定すると ...）
  await confirmName(page, isMobile);
  const rows = await rowsOf(page);
  expect(rows.slice(0, 4)).toEqual(['TOP 10', '1 AAA 000900', '2 ... 000500', '3 LOW 000100']);
  expect(rows).toContain('YOUR SCORE 000500');

  // 開き直すと、タイトルの TOP10 に残っている（保存の中身は置き直さない）
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  expect((await rowsOf(page)).slice(2, 5)).toEqual(['1 AAA 000900', '2 ... 000500', '3 LOW 000100']);
  await expect(page.locator('body')).toHaveAttribute('data-top', '900');
});

test('LLM-TC-0006-04 ランクインしなくても TOP10 の画面に今回の点が出る。触るか押すとタイトル', async ({ page, isMobile }) => {
  const ten = Array.from({ length: 10 }, (_, i) => record(1000 - i * 10, `P${i}`));
  await presetStorage(page, PREVIEW_RANKING_KEY, JSON.stringify(ten));
  await openFrozen(page);
  await advance(page, 1);
  await endWithScore(page, 910); // 10 位（910）と同じ点は入らない
  await advance(page, 120);
  await poke(page, isMobile);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-screen', 'top10');
  const rows = await rowsOf(page);
  expect(rows[10]).toBe('10 P9 000910');
  expect(rows).toContain('YOUR SCORE 000910');
  expect(rows.filter((r) => r.includes('...'))).toEqual([]); // 入っていない
  await advance(page, 120);
  await poke(page, isMobile);
  await expect(body).toHaveAttribute('data-screen', 'title');
});
