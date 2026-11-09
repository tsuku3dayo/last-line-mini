---
id: LLM-AC-0004
type: attested-computation
title: 1 面がウェーブで進み、CLEAR か GAME OVER で終わる
status: stable
version: 1.0
updated: 2026-11-05
sources:
  - LLM-PBI-0004（v1.0）
  - LLM-TC-0004（v1.2）
  - LLM-TC-9001（v1.6）
  - LLM-TASK-0016〜0020（スプリント 04。PR #29〜#33）
verified: { by: オーナー, at: 2026-11-05T11:19:18+09:00 }
---

# LLM-AC-0004 インクリメントの実施記録

LLM-PBI-0004 が完成の定義（`docs/definition-of-done.md` v1.0）を満たしたことの記録。スプリント 04 のスプリントレビュー（2026-11-05）で PO が受け入れた。

- 対象の版：1 プレイの実機確認（TC-0004-07）はプレビュー `v0.1.0 β 6e5adc3`（PR #32 のマージ）。照準を隠す確認（TC-0004-08）はプレビュー `v0.1.0 β e0d4bff`（PR #33 のマージ）。自動テストは main `e0d4bff`
- 公開：GitHub Actions「Pages」run 41951955458（success）→ https://tsuku3dayo.github.io/last-line-mini/preview/

## 1. 自動テストの結果（2026-11-05、main `e0d4bff` で手元で実行した出力どおり）

- `npm run verify`：lint OK・単体（Vitest）`Test Files  17 passed (17)`・`Tests  96 passed (96)`・build・check-dist（preview）OK・check-docs OK
- E2E 全体（Playwright、3 端末）：`49 passed`・`20 skipped`（failed・flaky は 0。skipped は端末に合わないテストの skip で、PR #32・#33 のときと同じ 20 件）
- CI（PR #29〜#33）：verify・e2e・production-build がすべて pass。やり直しで通った（flaky）は 0

| 確認 ID | 自動テスト（すべて ✓） |
| :--- | :--- |
| LLM-TC-0004-01 | 単体（始めは WAVE 1、4 ウェーブで 6・9・12・15 体／あいだは「WAVE n」、遊んでいるあいだは何も出さない） |
| LLM-TC-0004-02 | 単体（あいだの約 3 秒は敵が出ない・壊れていない基地を 10 発に戻す・壊れた基地は 0 のまま）、E2E 3 端末 |
| LLM-TC-0004-03 | 単体（最後のウェーブの敵が消え都市が残れば CLEAR／DEFENSE COMPLETE の色・大きさ）、E2E 3 端末 |
| LLM-TC-0004-04 | 単体（6 都市全滅で GAME OVER・その場で止まる／THE END の色・大きさ）、E2E 3 端末（PC は `?debug=1` の G キーも） |
| LLM-TC-0004-05 | 単体（弾 0・迎撃と爆風なし・都市を狙う敵あり、がそろうと GAME OVER。1 つ欠けると続く） |
| LLM-TC-0004-06 | 単体（約 1 秒たつまで受け付けず文字も出さない／点滅）、E2E 3 端末（PC はキー、iPhone はタッチで WAVE 1 から。やり直しで撃っていない） |
| LLM-TC-0004-08 | 単体 1 件（CLEAR・GAME OVER のあいだは照準を描かない。ウェーブのあいだと遊んでいるあいだは描く）、スクリーンショット（PC・iPhone SE） |
| LLM-TC-0001-02 | E2E 3 端末（TASK-0016 でマウスの動きが届くのを待つ形に直した） |

## 2. プレビューでの実機確認（PO、PC の Chrome と iPhone 11）

右下の番号を最初に確かめてから見た。結果：**すべて OK**。

| 確認 ID | 見たこと | 版 | 結果 |
| :--- | :--- | :--- | :--- |
| LLM-TC-9001-13 | 右下が `v0.1.0 β 6e5adc3` | 6e5adc3 | OK |
| LLM-TC-0004-07 | WAVE 1 が出て敵が来る | 6e5adc3 | OK |
| LLM-TC-0004-07 | WAVE 2〜4、弾が 10 発に戻る | 6e5adc3 | OK |
| LLM-TC-0004-07 | DEFENSE COMPLETE／THE END（PC は `?debug=1` の G キー） | 6e5adc3 | OK |
| LLM-TC-0004-07 | 約 1 秒後に TAP OR PRESS ANY KEY、触るか押すと WAVE 1 から | 6e5adc3 | OK |
| LLM-TC-9001-14 | iPhone 11 の `?debug=1` で fps 55 以上 | 6e5adc3 | OK |
| LLM-TC-0004-07 | 約 3 分の 1 プレイが遊びやすいか | 6e5adc3 | OK |
| — | 照準の「＋」が中央の文字と重なる | 6e5adc3 | PO が「隠す」と決めた → TASK-0020 |
| LLM-TC-0004-08 | THE END・DEFENSE COMPLETE で「＋」が出ない | e0d4bff | OK |

- 2026-11-05 10:45:18：PO「PC,iPhoneともに確認しました。1～7：すべてOKでした」
- 2026-11-05 11:11:51：PO「マージしました。PC,iPhoneともに確認しOKでした」

## 3. 確認できなかったこと・気づいたこと

- 照準の始めの位置 (240, 300) は、始めの「WAVE 1」の文字（y = 280〜308）とも重なる（文字があとに描かれるので、文字の中に隠れて見える）。PO の指示どおり終わりのときだけ隠し、ここは変えていない。スプリントレビューで扱う。
- ウェーブの敵の数（6・9・12・15）は仮。難しさの調整は LLM-PBI-0011 で見直す。

## 4. 完成の定義（PBI ごと）

| 項目 | 結果 |
| :--- | :--- |
| 受け入れ条件のすべての確認 ID に、自動テストか実機確認の結果がある | ✓（01〜06・08 自動、07・08 実機） |
| プレビューで実機確認をした（確認できなかったことは書いた） | ✓ |
| iPhone 11 のプレビューで、`?debug=1` の fps が 55 以上 | ✓ |
| これまでのインクリメントと一緒に動く（E2E 全体が通る） | ✓（49 passed、1 回目で全件） |
| AC が書かれ、整合性チェックを通った | ✓（check:docs OK） |
| 一時的な診断のコードが残っていない | ✓（`?debug=1` の G キーはテスト用の入口として PO が足すと決めたもの） |
