---
id: LLM-PBI-0004
type: product-backlog-item
title: 1 面がウェーブで進み、CLEAR か GAME OVER で終わる
theme: ゲームの流れ
status: draft
version: 0.1
updated: 2026-11-02
sources:
  - LLM-PG-0001（v1.0）
  - docs/spec/last-line-mini-spec.md (v1.1) §2.1・§6.2
verified: null
---

# LLM-PBI-0004 1 面がウェーブで進み、CLEAR か GAME OVER で終わる

状態：未整理（リファインメントで、受け入れ条件・確認 ID・画面を足す）

## ストーリー

遊ぶ人として、攻撃の波を凌ぎ切ったら「守り切った」、都市が全部やられたら「終わり」とはっきり分かりたい。それは、1 面完結の 1 プレイとして終わりがあるから。

## メモ（仕様書から・決めること）

- 最後の敵が消えた時点で都市が 1 つ以上残れば CLEAR（DEFENSE COMPLETE の演出）
- 6 都市すべてが壊れたら GAME OVER（THE END の演出。原作の八角形の画面は使わず、独自の演出にする）
- 決めること：ウェーブの数・1 プレイの長さ（7a-1）、「全拠点の弾が尽きて着弾を止められなくなった時点」の扱い（7a-2）
