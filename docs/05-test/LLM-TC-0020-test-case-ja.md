---
id: LLM-TC-0020
type: test-case
title: 名前に日本語も使え、8 文字まで入れられる
status: stable
version: 1.0
updated: 2026-11-12
sources:
  - LLM-PBI-0020（v1.0）
  - LLM-GUI-0003（v1.1）
verified: null
---

# LLM-TC-0020 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0020-01 | ひらがな・カタカナ・漢字・英字（小文字もそのまま）・数字（半角・全角）・記号が入り、絵文字・空白・そのほかの文字は消える | 自動（単体・E2E） | `tests/unit/name.test.ts`、`e2e/name-entry.spec.ts` |
| LLM-TC-0020-02 | 見た目の 1 文字を 1 文字として 8 文字まで（9 文字目は入らない。結合文字・全角も 1 文字）。空のまま確定すると `...` | 自動（単体・E2E） | `tests/unit/name.test.ts`、`e2e/name-entry.spec.ts` |
| LLM-TC-0020-03 | 変換中（`compositionstart` 〜 `compositionend`）は入力欄の文字を整えず、変換中の Enter で名前が確定しない。変換の確定のあとに整え、Enter・`OK` で確定する | 自動（E2E。変換の出来事を送って確かめる）＋実機（TC-0020-06） | `e2e/name-entry.spec.ts` |
| LLM-TC-0020-04 | タイトルと TOP10 の画面で、名前がブラウザの文字で描かれ、全角 8 文字でも 1 行が画面に収まり、列がそろう。今回の行は名前も点滅する | 自動（単体：列の位置。E2E：名前の枠の画素）＋スクリーンショット（PC 1280 × 800・iPhone SE 375 × 667 で全角 8 文字・英字 3 文字・`---` の行を目で見る） | `tests/unit/screens.test.ts`、`e2e/name-entry.spec.ts` |
| LLM-TC-0020-05 | 今までの記録（英字 3 文字・`...`）がそのまま読める。新しい名前の記録が読み込み直したあとも同じ名前で出る。決まりに合わない名前の記録は壊れたものとして扱う | 自動（単体・E2E） | `tests/unit/ranking-store.test.ts`、`e2e/name-entry.spec.ts` |
| LLM-TC-0020-06 | PC の Chrome と iPhone 11 のプレビューで、日本語入力で 8 文字の名前を入れて TOP10 に出せる | 手動（実機） | 手順：右下の番号を確かめる → PC でランクインし、ローマ字かなで漢字まじりの 8 文字を入れて確定 → TOP10 で列がそろい点滅する → iPhone 11 で日本語かなのキーボードで同じ → iPhone 11 の `?debug=1` で fps 55 以上（完成の定義） |
