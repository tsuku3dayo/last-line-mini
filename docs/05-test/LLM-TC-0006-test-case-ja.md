---
id: LLM-TC-0006
type: test-case
title: タイトル画面で TOP10 を見て始められる（保存・ランクイン判定）
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - LLM-PBI-0006（v1.0）
  - LLM-GUI-0003（v1.0）
verified: null
---

# LLM-TC-0006 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0006-01 | 開くとタイトル画面。`LAST LINE MINI` と TOP10 の 10 行（記録のない行は `---  000000`）。触るか押すと WAVE 1 から | 自動（単体・E2E）＋スクリーンショット | `tests/unit/screens.test.ts`、`e2e/ranking.spec.ts` |
| LLM-TC-0006-02 | 点の高い順に 10 件まで、11 位は消える、同じ点は先が上、10 位と同点は入らない、10 件未満は必ず入る | 自動（単体） | `tests/unit/ranking.test.ts` |
| LLM-TC-0006-03 | 保存のキーがプレビュー `last-line-mini-preview-ranking`・本番 `last-line-mini-ranking`。壊れた中身でも起動し、TOP10 は空 | 自動（単体・E2E） | `tests/unit/ranking-store.test.ts`、`e2e/ranking.spec.ts` |
| LLM-TC-0006-04 | 終わりの画面で触るか押すと TOP10 の画面（`YOUR SCORE`）。ランクインしたら今回の点が入っている。TOP10 の画面で触るか押すとタイトル | 自動（E2E） | `e2e/ranking.spec.ts` |
| LLM-TC-0006-05 | HUD の `TOP` が TOP10 の 1 位の点（記録がなければ `000000`） | 自動（単体・E2E） | `tests/unit/ranking.test.ts`、`e2e/ranking.spec.ts` |
| LLM-TC-0006-06 | 開き直しても TOP10 が残る | 自動（E2E） | `e2e/ranking.spec.ts` |
| LLM-TC-0006-07 | PC の Chrome と iPhone 11 のプレビューで、タイトル → プレイ → 終わり → TOP10 → タイトル、開き直しても残る | 手動（実機） | 手順：右下の番号を確かめる → タイトルの TOP10 を見る → 1 プレイ（PC は `?debug=1` の G キー可）→ TOP10 に今回の点 → タイトル → 開き直して残っている。iPhone 11 の `?debug=1` で fps 55 以上（完成の定義） |
