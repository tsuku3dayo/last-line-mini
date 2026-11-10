---
id: LLM-TC-0019
type: test-case
title: PC でもマウスのクリックで、近い発射台から撃てる
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - LLM-PBI-0019（v1.1）
  - LLM-GUI-0001（v1.8）
verified: null
---

# LLM-TC-0019 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0019-01 | 左クリックした瞬間に、クリックした所へ横の距離がいちばん近い残弾のある基地から撃つ。基地の選び方・弾切れ・寄せ方はタッチと同じ | 自動（単体・E2E・PC） | `tests/unit/input.test.ts`、`e2e/play-pc.spec.ts` |
| LLM-TC-0019-02 | ゲーム画面の外、右クリック・真ん中のクリックでは撃たない | 自動（単体・E2E・PC） | `tests/unit/input.test.ts`、`e2e/play-pc.spec.ts` |
| LLM-TC-0019-03 | 方向キー・Z・X・C では照準も動かず撃ちもしない。マウスを動かすと照準が付いてくる | 自動（E2E・PC） | `e2e/play-pc.spec.ts` |
| LLM-TC-0019-04 | 画面を進めるクリック（タイトル・終わり・TOP10）では撃たない | 自動（E2E・PC） | `e2e/play-pc.spec.ts` |
| LLM-TC-0019-05 | PC の Chrome のプレビューで、クリックだけで 1 プレイ遊べる。iPhone 11 のタッチは今までどおり | 手動（実機） | 手順：右下の番号を確かめる → PC でクリックだけで 1 プレイ（弾切れの基地の隣から撃つのも見る）→ iPhone 11 でタッチで撃てる → iPhone 11 の `?debug=1` で fps 55 以上（完成の定義） |
