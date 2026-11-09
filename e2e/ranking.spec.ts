import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen, presetStorage, PREVIEW_RANKING_KEY, PRODUCTION_RANKING_KEY } from './helpers';

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
