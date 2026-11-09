---
id: LLM-TC-0005
type: test-case
title: 点数が HUD に出て、終わりにボーナスが足される
status: stable
version: 1.1
updated: 2026-11-09
sources:
  - LLM-PBI-0005（v1.0）
  - LLM-GUI-0001（v1.6）
verified: null
---

# LLM-TC-0005 テストケース

ファイルの名前は予定（スプリントプランニングで TASK に割り当てるときに直す）。

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0005-01 | 迎撃でも誘爆でも、敵 1 つにつき 25 点が入り、HUD の `1P` に 6 桁で出る。地面に落ちた敵は 0 点 | 自動（単体・E2E） | `tests/unit/score.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0005-02 | 終わり（CLEAR・GAME OVER）に、残弾 × 5 と残った都市 × 100 が足され、`1P` が最終スコアになる。壊れた基地の残弾は 0 として数える | 自動（単体・E2E） | `tests/unit/score.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0005-03 | 終わりの画面に、ボーナスの内訳が 2 行（MISSILES・CITIES）で出る | 自動（単体）＋スクリーンショット | `tests/unit/overlay.test.ts` |
| LLM-TC-0005-04 | やり直すと `1P` は 0 から。`TOP` は `000000` のまま（v1.1：LLM-PBI-0006 から、やり直しはタイトルから始める。`TOP` は TOP10 の 1 位の点＝TC-0006-05） | 自動（単体・E2E） | `tests/unit/score.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0005-05 | 照準の始めの位置が (240, 420) で、「WAVE 1」の文字と重ならない | 自動（単体）＋スクリーンショット | `tests/unit/cursor.test.ts` |
| LLM-TC-0005-06 | PC の Chrome と iPhone 11 のプレビューで、点数とボーナスを見ながら 1 プレイ遊べる | 手動（実機） | 手順：右下の番号を確かめる → 敵を落として 1P が増える → 終わりの内訳と 1P → 触るか押して 1P が 0 から |
