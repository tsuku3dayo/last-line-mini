import { expect, type Page } from '@playwright/test';

/** テスト用の入口つきで開き、ループを止める（決まった種で、ステップを自分で進める） */
export async function openFrozen(page: Page, seed = 1): Promise<void> {
  await page.goto(`./?debug=1&seed=${seed}`);
  await expect(page.locator('body')).toHaveAttribute('data-debug', '1');
  await page.evaluate(() => window.__llm?.freeze());
}

/** 止めたまま steps ステップ進め、状態を返す */
export async function advance(page: Page, steps: number): Promise<unknown> {
  return page.evaluate((n) => window.__llm?.advance(n), steps);
}
