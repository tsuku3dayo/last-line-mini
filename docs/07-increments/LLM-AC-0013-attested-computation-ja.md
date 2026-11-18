---
id: LLM-AC-0013
type: attested-computation
title: README と権利・クレジットの表記がある
status: stable
version: 1.0
updated: 2026-11-18
sources:
  - LLM-PBI-0013（v1.0）
  - LLM-TC-0013（v1.0）
  - LLM-TC-9001（v1.6）
  - LLM-TASK-0044（スプリント 12。PR #82）
  - LLM-TASK-0045（スプリント 12。PR #83）
verified: { by: オーナー, at: 2026-11-18T17:49:20+09:00 }
---

# LLM-AC-0013 インクリメントの実施記録

LLM-PBI-0013 が完成の定義（`docs/definition-of-done.md` v1.0）を満たしたことの記録。スプリント 12 のスプリントレビューで PO が受け入れるかを決める。

- 対象の版：プレビュー `v0.1.0 β eae7aa3`（最後のコードの PR は #83〔`6ccb3ad`〕。公開はその時点の main を build するので、文書だけの #84 のマージ `eae7aa3` が入った。ゲームの中身は `6ccb3ad` と同じ）
- 公開：GitHub Actions「Pages」run 44268074668（#83 の push、success、2026-11-18 17:40:06 に終わり）→ https://tsuku3dayo.github.io/last-line-mini/preview/
- 公開された JS に、版 `eae7aa3` とクレジットの文が入っていることを、頼む前に Claude Code が読み取りで確かめた（OPTION 6.5 v1.9）

## 1. 自動テストの結果（2026-11-18、手元で実行した出力どおり）

- `npm run verify`（`bfc4271`〔TASK-0045〕）：lint OK・単体（Vitest）`173 passed`・build・check-dist（preview）OK・check-docs OK。check-dist は本番の build でも OK（`b3f00b2`）
- E2E 全体（Playwright、3 端末、`b3f00b2`〔TASK-0044〕）：`136 passed`・`26 skipped`（failed は 0）。その前のクレジットの E2E の 1 回目は 1 failed（開き直しで本文が一番上に戻らない → 出してから位置を戻すよう直した）
- build の中の検査（vite.config.ts の third-party-credits）：dist に入るパッケージ（vite・vite-plugin-pwa・workbox-window）がすべてクレジットに載っている。クレジットから Vite を外すと build が止まることを確かめた
- CI（PR #82・#83）：1 回目ですべて pass。やり直しで通った（flaky）は 0
- OPTION 6.5（v1.6）：main と `bfc4271` の `src`・`tests`・`e2e`・`public`・`scripts`・`index.html`・`vite.config.ts`・`tsconfig.json`・`package*.json`・`README.md` の差は 0。E2E を流した `b3f00b2` と main の `src`・`e2e`・`public`・設定の差も 0（0045 は scripts・tests・README だけ）なので、流し直していない

| 確認 ID | 自動テスト（すべて ✓） |
| :--- | :--- |
| LLM-TC-0013-01 | 単体（README の検査：リポジトリの README が通る、README がない・見出しが欠ける・ライセンスの見出し・原作の名前を見つける）・check-docs |
| LLM-TC-0013-02 | 単体（ボタンはタイトルだけ）・E2E（タイトルにだけ出る、出てから約 1 秒は受け付けない、押すとクレジット画面でゲームは始まらない、ボタンの外では始まる、終わり・TOP10 では出ない、3 端末で 44 ポイント以上）＋スクリーンショット（PC・iPhone 11・iPhone SE のタイトル） |
| LLM-TC-0013-03 | 単体（役割と名前の 6 つと並び）・E2E（役割・名前・道具・MIT の本文、BACK 44 ポイント以上、`touch-action: pan-y`、一番下まで動かして本文の最後が見え BACK は残る、本文を触る・Space・Enter・A では何も起きない、更新の帯を出さずタイトルに戻ると出す、Esc・BACK で戻る、開き直すと一番上から）＋スクリーンショット（3 端末の上と一番下を目で見た） |
| LLM-TC-0013-04 | 単体（著作権の行と MIT の本文が各パッケージの LICENSE と同じ、URL を書かない、モジュールの ID からパッケージを出す・載っていないものを見つける）・build の検査・check-dist（アプリの JS にクレジットの文と本文、SW の Workbox が載っている。プレビュー・本番）・check-docs（README の道具がデータと同じ） |

## 2. プレビューでの実機確認（PO、iPhone 11）

頼み方は OPTION 6.5 の表（機器・やること・OK の条件・NG の例、fps は値の選択肢）。

| 確認 ID | 見たこと | 版 | 結果 |
| :--- | :--- | :--- | :--- |
| LLM-TC-9001-13 | Safari の右下が `v0.1.0 β eae7aa3` | eae7aa3 | OK |
| LLM-TC-0013-05 | タイトルの「クレジット」でクレジット画面が開き、ゲームは始まらない | eae7aa3 | OK |
| LLM-TC-0013-05 | 指でなぞって、MIT License の本文の最後まで動かせる。BACK は上に残る | eae7aa3 | OK |
| LLM-TC-0013-05 | 「← BACK」でタイトルに戻る | eae7aa3 | OK |
| LLM-TC-9001-14 | iPhone 11 の Safari の `?debug=1` で fps 55 以上（**60**） | eae7aa3 | OK |

- 2026-11-18 17:44 ごろ：PO（質問の画面）「すべて OK・fps 60」

## 3. 確認できなかったこと・気づいたこと

- README は Git の画面（GitHub）で読む文書なので、実機では見ていない。PR #83 で PO が読める形にした。
- PC の Chrome のクレジット画面は、実機では見ていない。E2E とスクリーンショットで確かめた。
- 本番への公開（リリースのタグ）はまだ。0013 でプロダクトゴールの範囲（順 1〜13）がすべてそろう。

## 4. 完成の定義（PBI ごと）

| 項目 | 結果 |
| :--- | :--- |
| 受け入れ条件のすべての確認 ID に、自動テストか実機確認の結果がある | ✓（01〜04 自動、05 実機） |
| プレビューで実機確認をした（確認できなかったことは書いた） | ✓（1 回ですべて OK） |
| iPhone 11 のプレビューで、`?debug=1` の fps が 55 以上 | ✓（60） |
| これまでのインクリメントと一緒に動く（E2E 全体が通る） | ✓（136 passed） |
| AC が書かれ、整合性チェックを通った | ✓（check:docs OK） |
| 一時的な診断のコードが残っていない | ✓（`src` に console.log・debugger がないことを確かめた） |
| README・権利やクレジットの表記がある | ✓（README.md・ゲーム内のクレジット画面） |
