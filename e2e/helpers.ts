import { expect, type Page } from '@playwright/test';

/** テスト用の入口つきで開き、ループを止める（決まった種で、ステップを自分で進める） */
export async function openFrozen(page: Page, seed = 1): Promise<void> {
  await page.goto(`./?debug=1&seed=${seed}`);
  await expect(page.locator('body')).toHaveAttribute('data-debug', '1');
  await page.evaluate(() => window.__llm?.freeze());
}

/**
 * マウスを (x, y)（画面の位置）に動かし、ゲーム画面に pointermove が届くまで待つ。
 * Chrome は pointermove を描き直しの区切りにそろえて届けるので、mouse.move が返った時点では
 * まだ届いていないことがある（スプリント 03 で TC-0001-02 がたまに落ちた原因。TASK-0016）。
 */
export async function moveMouse(page: Page, x: number, y: number): Promise<void> {
  // 先に待ち受けを置いてから動かす（置く前に届くと待ち続けてしまうため）
  await page.evaluate(() => {
    const w = window as unknown as { __moved?: Promise<void> };
    w.__moved = new Promise<void>((resolve) => {
      document.getElementById('stage')?.addEventListener('pointermove', () => resolve(), { once: true });
    });
  });
  await page.mouse.move(x, y);
  await page.evaluate(() => (window as unknown as { __moved?: Promise<void> }).__moved);
}

/** 止めたまま steps ステップ進め、状態を返す */
export async function advance(page: Page, steps: number): Promise<unknown> {
  return page.evaluate((n) => window.__llm?.advance(n), steps);
}
