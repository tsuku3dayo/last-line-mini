---
id: LLM-AC-0005
type: attested-computation
title: 点数が HUD に出て、終わりにボーナスが足される
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - LLM-PBI-0005（v1.0）
  - LLM-TC-0005（v1.0）
  - LLM-TC-9001（v1.6）
  - LLM-TASK-0023〜0024（スプリント 05。PR #39・#40）
verified: { by: オーナー, at: 2026-11-09T14:06:26+09:00 }
---

# LLM-AC-0005 インクリメントの実施記録

LLM-PBI-0005 が完成の定義（`docs/definition-of-done.md` v1.0）を満たしたことの記録。スプリント 05 のスプリントレビュー（2026-11-09）で PO が受け入れた。

- 対象の版：プレビュー `v0.1.0 β 103fff2`（PR #40 のマージ）。自動テストは main `103fff2`
- 公開：GitHub Actions「Pages」run 42563459515（success）→ https://tsuku3dayo.github.io/last-line-mini/preview/

## 1. 自動テストの結果（2026-11-09、main `103fff2` で手元で実行した出力どおり）

- `npm run verify`：lint OK・単体（Vitest）`Test Files  18 passed (18)`・`Tests  110 passed (110)`・build・check-dist（preview）OK・check-docs OK
- E2E 全体（Playwright、3 端末）：`58 passed`・`20 skipped`（failed・flaky は 0。skipped は端末に合わないテストの skip で、スプリント 04 と同じ 20 件）
- CI（PR #39・#40）：verify・e2e・production-build がすべて 1 回目で pass。やり直しで通った（flaky）は 0

| 確認 ID | 自動テスト（すべて ✓） |
| :--- | :--- |
| LLM-TC-0005-01 | 単体（決まった値 25 点・迎撃 25 点・誘爆の連鎖 3 つで 75 点・地面に落ちた敵 0 点・1P は 6 桁）、E2E 3 端末（data-score が 25 増え、地面に落ちた敵では増えない） |
| LLM-TC-0005-02 | 単体（決まった値 5 点・100 点／CLEAR：300 → 760、壊れた基地の弾は 0／GAME OVER：都市 0 で残弾だけ／1 回だけ足す／G キーでも同じ）、E2E 3 端末（CLEAR で data-score 760） |
| LLM-TC-0005-03 | 単体（内訳 2 行の文字・位置 y 330・354・色・大きさ／2 行が同じ 22 文字で画面に収まる／TAP OR PRESS ANY KEY は y 400 で重ならない）、E2E 3 端末（data-message）、スクリーンショット（PC・iPhone SE） |
| LLM-TC-0005-04 | 単体（新しいゲームは 0 点・TOP 000000）、E2E 3 端末（GAME OVER → やり直しで data-score 0） |
| LLM-TC-0005-05 | 単体（始めの位置 (240, 420)・「＋」の上端 414 が「WAVE 1」の下端 308 より下）、スクリーンショット（PC・iPhone SE） |
| LLM-TC-0004-03 | E2E 3 端末（終わりの画面に内訳 2 行が加わったので、期待する文字の並びだけを直した。TASK-0024） |

## 2. プレビューでの実機確認（PO、PC の Chrome と iPhone 11）

右下の番号を最初に確かめてから見た。結果：**すべて OK**。

| 確認 ID | 見たこと | 版 | 結果 |
| :--- | :--- | :--- | :--- |
| LLM-TC-9001-13 | 右下が `v0.1.0 β 103fff2` | 103fff2 | OK |
| LLM-TC-0005-06 | 敵を落とすと 1P が 25 ずつ増える | 103fff2 | OK |
| LLM-TC-0005-06 | 終わりに内訳 2 行が出て、1P にボーナスが足される | 103fff2 | OK |
| LLM-TC-0005-06 | 触るか押してやり直すと、1P が 0 から | 103fff2 | OK |
| LLM-TC-9001-14 | iPhone 11 の `?debug=1` で fps 55 以上 | 103fff2 | OK |

- 2026-11-09 13:55 ごろ：PO（質問の画面）「PC・iPhone とも OK」
- 2026-11-09 13:57 ごろ：PO（質問の画面）fps「55 以上だった」

## 3. 確認できなかったこと・気づいたこと

- スプリント 04 の AC-0004 の 3 章に書いた「照準の始めの位置 (240, 300) が WAVE 1 の文字と重なる」は、この PBI で (240, 420) にして解消した（TC-0005-05）。
- `TOP` は LLM-PBI-0006 まで `000000` のまま（PO の決定）。
- 点の開き方（25 点・5 点・100 点）は仕様書 §4.1・§4.2 のとおり。難しさとの釣り合いは LLM-PBI-0011 で見直す。

## 4. 完成の定義（PBI ごと）

| 項目 | 結果 |
| :--- | :--- |
| 受け入れ条件のすべての確認 ID に、自動テストか実機確認の結果がある | ✓（01〜05 自動、06 実機） |
| プレビューで実機確認をした（確認できなかったことは書いた） | ✓ |
| iPhone 11 のプレビューで、`?debug=1` の fps が 55 以上 | ✓ |
| これまでのインクリメントと一緒に動く（E2E 全体が通る） | ✓（58 passed、1 回目で全件） |
| AC が書かれ、整合性チェックを通った | ✓（check:docs OK） |
| 一時的な診断のコードが残っていない | ✓（撮影に使った一時的なテストはコミットしていない） |
