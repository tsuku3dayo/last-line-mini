---
id: LLM-TC-0002
type: test-case
title: iPhone のタッチで迎え撃てる
status: stable
version: 1.1
updated: 2026-11-09
sources:
  - LLM-PBI-0002（v1.0）
  - LLM-GUI-0002（v1.0）
verified: null
---

# LLM-TC-0002 テストケース

ファイルの名前は予定（スプリントプランニングで TASK に割り当てるときに直す）。E2E の端末は iphone11-webkit と iphonese-webkit（LLM-TST-0001）。

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0002-01 | 触った所（論理座標に直したもの）へ、横の距離がいちばん近い残弾のある基地から撃ち、照準もそこに移る | 自動（単体・E2E・iPhone） | `tests/unit/touch-fire.test.ts`、`e2e/play-touch.spec.ts` |
| LLM-TC-0002-02 | 同じ距離なら B、A と C なら A。0 の基地は飛ばす。3 つとも 0 なら撃たない | 自動（単体） | `tests/unit/touch-fire.test.ts` |
| LLM-TC-0002-03 | 触った瞬間に 1 発。指をすべらせても撃たない。同じステップに 2 か所触ると 2 発 | 自動（単体・E2E）＋ 手動（2 本の指は実機） | `tests/unit/touch-fire.test.ts`、`e2e/play-touch.spec.ts`、手動：実機で 2 本の指で同時に触る |
| LLM-TC-0002-04 | iPhone 11・iPhone SE（第 3 世代）の縦の画面に、ゲーム画面が安全領域の内側に欠けずに収まる | 自動（単体・E2E・iPhone）＋ 手動（ノッチ・ホームバー） | `tests/unit/layout.test.ts`、`e2e/play-touch.spec.ts`、手動：実機で見る |
| LLM-TC-0002-05 | 長押しの虫めがね・メニュー、2 回タップの拡大、2 本指の拡大、スクロールが起きない | 自動（E2E：`touchstart` の既定の動きが止められている・スクロールが 0）＋ 手動（実機） | `e2e/play-touch.spec.ts`、手動：実機で長押し・2 回タップ・2 本指で広げる |
| LLM-TC-0002-06 | （v1.1 でなくした：LLM-PBI-0019 で PC もクリックで撃つようにした。PO の決定 2026-11-09。結果は LLM-AC-0002 に残る）PC ではマウスのクリックでは撃たない | なし | — |
| LLM-TC-0002-07 | iPhone 11 の Safari とホーム画面のプレビュー版で遊べ、版の表示が main の版と同じ | 手動（実機） | 手順：プレビューの URL を開く → 右下の版を見る → 触って撃ち、1 発以上落とす → ホーム画面に追加して同じことをする |
