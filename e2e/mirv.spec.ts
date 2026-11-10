import { expect, test, type Page } from '@playwright/test';
import { advance, openFrozen } from './helpers';

// 多弾頭ミサイル（LLM-PBI-0008）。PC でも iPhone でも確かめる

const BREAK_STEPS = 3 * 120;

/** 真下へ落ちる多弾頭を、分かれる高さ（y=300）の少し手前に置く。子は x=100・380 の都市へ */
async function placeMirv(page: Page): Promise<void> {
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    const s = api.getState();
    api.setState({
      ...s,
      wave: { number: 2, status: 'playing', phaseStep: 1, spawned: 1 },
      interceptors: [],
      blasts: [],
      enemies: [
        {
          fromX: 200,
          fromY: 0,
          toX: 200,
          toY: 592,
          speed: 1,
          traveled: 296,
          split: { atY: 300, targets: [{ x: 100, y: 592 }, { x: 380, y: 592 }] },
        },
      ],
    });
  });
}

/** ゲーム画面の論理座標 (x, y) のまわり（±2）に、敵の航跡の赤橙が描かれているか */
async function trailAt(page: Page, x: number, y: number): Promise<boolean> {
  return page.evaluate(
    ([lx, ly]) => {
      const c = document.querySelector('#stage canvas, canvas#stage, canvas') as HTMLCanvasElement | null;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) throw new Error('Canvas がない');
      const k = c.width / 480; // 倍率が変わっても同じ所を読む（TEAM 5.4）
      const d = ctx.getImageData(Math.round((lx - 2) * k), Math.round((ly - 2) * k), Math.max(1, Math.round(4 * k)), Math.max(1, Math.round(4 * k))).data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] ?? 0;
        const g = d[i + 1] ?? 0;
        const b = d[i + 2] ?? 0;
        if (r > 120 && r > g * 1.6 && r > b * 1.8) return true;
      }
      return false;
    },
    [x, y] as const,
  );
}

test('LLM-TC-0008-02 多弾頭は分かれる高さを越えると、弾頭の点から 2 発の子の弾に分かれ、別々の都市へ向かう', async ({ page }) => {
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  await placeMirv(page);
  await advance(page, 2); // y=298 → 分かれない
  let enemies = (await page.evaluate(() => window.__llm?.getState().enemies)) ?? [];
  expect(enemies).toHaveLength(1);
  await advance(page, 2); // y=300 を越えて分かれる
  enemies = (await page.evaluate(() => window.__llm?.getState().enemies)) ?? [];
  expect(enemies).toHaveLength(2);
  expect(enemies.map((m) => m.toX).sort((a, b) => a - b)).toEqual([100, 380]);
  for (const m of enemies) {
    expect(m.fromX).toBe(200);
    expect(m.fromY).toBeGreaterThanOrEqual(300);
    expect(m.speed).toBe(1);
    expect(m.split).toBeUndefined();
  }
});

test('LLM-TC-0008-04 分かれる前は通常の弾と同じ航跡。分かれたあとも親の航跡が残り、子がいなくなると消える', async ({ page }) => {
  await openFrozen(page);
  await advance(page, BREAK_STEPS + 1);
  await placeMirv(page);
  await advance(page, 1);
  // 分かれる前：上端から弾頭まで、通常の弾と同じ航跡
  expect(await trailAt(page, 200, 150)).toBe(true);
  await advance(page, 40); // 分かれて、子が少し進む
  expect((await page.evaluate(() => window.__llm?.getState().enemies))?.length).toBe(2);
  // 親の航跡（上から分かれた点まで）が残る
  expect(await trailAt(page, 200, 150)).toBe(true);
  // 子の航跡（分かれた点から左下・右下へ）
  const kids = (await page.evaluate(() => window.__llm?.getState().enemies)) ?? [];
  for (const m of kids) {
    const t = 10 / Math.hypot(m.toX - m.fromX, m.toY - m.fromY);
    expect(await trailAt(page, m.fromX + (m.toX - m.fromX) * t, m.fromY + (m.toY - m.fromY) * t)).toBe(true);
  }
  // 子がいなくなると、親の航跡も消える
  await page.evaluate(() => {
    const api = window.__llm;
    if (!api) throw new Error('テスト用の入口がない');
    api.setState({ ...api.getState(), enemies: [] });
  });
  await advance(page, 1);
  expect(await trailAt(page, 200, 150)).toBe(false);
});
