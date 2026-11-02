---
id: LLM-TST-0001
type: test-strategy
title: 最終防衛線ミニ テスト戦略
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - LLM-SA-0001（v1.0）
  - LLM-TS-0001（v1.1）
verified: null
---

# LLM-TST-0001 テスト戦略

## 1. テストの種類

| 種類 | 道具 | 対象 | いつ動く |
| :--- | :--- | :--- | :--- |
| 単体 | Vitest（`tests/unit/`） | core のすべて、storage、render・app の純粋な関数、層の決まり、`channels.mjs` | 手元の `npm run verify`、CI |
| E2E | Playwright（`e2e/`） | build したプレビュー用の dist を `vite preview` で動かす | 手元、CI（Playwright のコンテナ） |
| dist の検査 | `scripts/check-dist.mjs` | base・外部の URL・名前・原作の名前が入っていないこと | 手元の verify、CI |
| 文書の検査 | `scripts/check-docs.mjs`（LLM-TASK-0003 で作る） | ID・sources・確認 ID のつながり | 手元の verify、CI |
| 手動 | 実機（PC の Chrome、iPhone 11） | 見た目・手触り・fps・ホーム画面のアプリ | PBI の最後の TASK のあと（OPTION 6.5） |

## 2. E2E の端末

PC（Chromium 1280 × 800）、iPhone 11（WebKit）、iPhone SE 第 3 世代（WebKit 375 × 667）。Android は入れない（IDK Q4）。

## 3. 確認 ID の番号の決まり

- 機能：`LLM-TC-<PBI と同じ 4 桁>-<2 桁>`（TEAM 2.3）。
- **非機能（どの PBI にも属さない土台・公開・性能）**：`LLM-TC-9001-<2 桁>` から使う。PBI の番号（0001〜）とぶつからないように、9000 番台を非機能にとっておく。必要になったら 9002、9003 … を足す。
- 自動テストは名前の先頭に確認 ID を書く。1 つの確認 ID を複数のテストで確かめてよい。

## 4. 決定性

- core は時刻・乱数を外から受け取る。単体テストでは種と入力の列を決めて、同じ結果になることを確かめる。
- E2E は `?debug=1&seed=<整数>` とテスト用の入口（`window.__llm`）で場面を作り、ループを止めて進める（LLM-TASK-0004 で作る）。時刻は `page.clock` を止めてから進める（TEAM 5.4）。

## 5. 手元で動かすときの注意（Windows）

- E2E は dist を動かすので、先に `npm run build`。
- E2E は毎回自分でサーバーを立てる（`reuseExistingServer: false`）。4173 番ポートがふさがっているとエラーになるので、ほかの `vite preview` を止めてから動かす。
