---
id: LLM-TC-0013
type: test-case
title: README と権利・クレジットの表記がある
status: stable
version: 1.0
updated: 2026-11-18
sources:
  - LLM-PBI-0013（v1.0）
  - LLM-GUI-0003（v1.3）
verified: null
---

# LLM-TC-0013 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0013-01 | README に決まった節（紹介・遊ぶ場所・遊び方・動作を確かめた端末・ランキングの注意・更新と復旧・クレジット・使った道具の権利）があり、原作の名前がなく、ライセンスの節がない | 自動（文書の検査：README の見出し・原作の名前）＋目で見る（PR で PO が読む） | `scripts/check-docs.mjs`、`README.md` |
| LLM-TC-0013-02 | 「クレジット」ボタンはタイトルにだけ出る。押すとクレジット画面が開きゲームは始まらない。ボタンの外では今までどおり始まる。iPhone SE 第 3 世代で 44 ポイント以上 | 自動（単体：画面ごとにボタンを出すかの判定。E2E：画面の状態・ボタンの大きさ）＋スクリーンショット（PC 1280 × 800・iPhone SE 375 × 667 のタイトル） | `tests/unit/credits.test.ts`、`e2e/credits.spec.ts` |
| LLM-TC-0013-03 | クレジット画面に 6 つの役割と名前が順に出て、使った道具と権利の表記が出る。上下に動かして最後まで読める。「BACK」・Esc でタイトルに戻り、そのほかのキー・触る操作ではゲームが始まらない。更新の帯（`simulateUpdate`）は出ない | 自動（単体：クレジットのデータ。E2E：文字・並び・スクロール・BACK・Esc・ほかのキー・帯）＋スクリーンショット（PC・iPhone SE のクレジット画面の上と一番下） | `tests/unit/credits.test.ts`、`e2e/credits.spec.ts` |
| LLM-TC-0013-04 | dist に入っている npm のパッケージがすべてクレジットのデータに載っていて、ライセンスの文が dist の中にある。README にも同じ道具が載っている | 自動（dist の検査：dist に入ったパッケージの一覧とクレジットのデータを比べる・本文があるか。文書の検査：README の道具） | `scripts/check-dist.mjs`、`scripts/check-docs.mjs` |
| LLM-TC-0013-05 | iPhone 11 の Safari のプレビューで、「クレジット」→ 最後まで動かして読める → 「BACK」でタイトル → 1 プレイして fps 55 以上 | 手動（実機） | 手順：コードの TASK の最後のマージで公開が走ったのを確かめ（案 15）、右下の番号がそのマージと同じ → タイトルの「クレジット」を触る → 上下になぞって最後（MIT License の本文）まで見える → 「BACK」でタイトル → `?debug=1` で開き直して 1 プレイ、fps 55 以上 |
