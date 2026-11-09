import { expect, type Page } from '@playwright/test';

/** プレビューの TOP10 の保存のキー（LLM-SA-0001 §2。E2E はプレビューの build を開く） */
export const PREVIEW_RANKING_KEY = 'last-line-mini-preview-ranking';
export const PRODUCTION_RANKING_KEY = 'last-line-mini-ranking';

/**
 * ページが開く前に、保存の中身を置く（LLM-PBI-0006）。value は文字列のまま置く（壊れた中身も試せるように）。
 * 最初の 1 回だけ置く（開き直しで残るかを確かめるテストで、置き直さないように）
 */
export async function presetStorage(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(
    ([k, v]) => {
      if (sessionStorage.getItem('__preset') === '1') return;
      sessionStorage.setItem('__preset', '1');
      localStorage.setItem(k, v);
    },
    [key, value] as const,
  );
}

/**
 * テスト用の入口つきで開き、ループを止める（決まった種で、ステップを自分で進める）。
 * 開くとタイトル画面なので（LLM-PBI-0006）、ふつうはタイトルを飛ばして WAVE 1 から始める。title: true ならタイトルのまま
 */
export async function openFrozen(page: Page, seed = 1, opts: { title?: boolean } = {}): Promise<void> {
  await page.goto(`./?debug=1&seed=${seed}`);
  await expect(page.locator('body')).toHaveAttribute('data-debug', '1');
  await page.evaluate(() => window.__llm?.freeze());
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  if (opts.title) {
    // 開いてから止めるまでに進んだタイトルの時間を 0 に戻す（点滅・約 1 秒の受け付けない時間を、毎回同じ所から数える。LLM-TASK-0031）
    await page.evaluate(() => window.__llm?.title());
    await expect(page.locator('body')).toHaveAttribute('data-step', '0');
    return;
  }
  await page.evaluate(() => window.__llm?.start());
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
}

/**
 * 名前の画面で、名前を打って確定する（LLM-PBI-0007）。PC は Enter、iPhone は OK を触る。
 * 確定すると TOP10 の画面になる
 */
export async function confirmName(page: Page, isMobile: boolean, text = ''): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'name');
  if (text) await page.locator('#name-input').pressSequentially(text);
  // 確定は、名前の画面が出てから約 1 秒たってから（GUI-0003 §0。LLM-TASK-0030）
  await advance(page, 120);
  if (isMobile) await page.locator('#name-ok').tap();
  else await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'top10');
}

/** ゲーム画面の真ん中を、iPhone は触り、PC はスペースキーを押す（触る・押すで次の画面へ） */
export async function poke(page: Page, isMobile: boolean): Promise<void> {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('ゲーム画面がない');
  if (isMobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.keyboard.press('Space');
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
