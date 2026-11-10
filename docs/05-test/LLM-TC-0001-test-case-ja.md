---
id: LLM-TC-0001
type: test-case
title: PC で、照準と 3 つの基地で落ちてくるミサイルを迎え撃てる
status: stable
version: 1.2
updated: 2026-11-09
sources:
  - LLM-PBI-0001（v1.0）
  - LLM-GUI-0001（v1.8）
verified: null
---

# LLM-TC-0001 テストケース

ファイルの名前は予定（スプリント 1 のトピック 3 で TASK に割り当てるときに直す）。

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0001-01 | （v1.2 でなくした：LLM-PBI-0019 でキーボードの操作をなくした。PO の決定 2026-11-09。結果は LLM-AC-0001 に残る）方向キーを押し続けると最高速まで加速し、離すと減速して止まる | なし | — |
| LLM-TC-0001-02 | マウスの位置（論理座標に直したもの）に照準がすぐ動く | 自動（単体・E2E・PC） | `tests/unit/cursor.test.ts`、`e2e/play-pc.spec.ts` |
| LLM-TC-0001-03 | 撃つと（v1.2 から：PC はクリック・iPhone はタッチ。LLM-PBI-0019）その基地から照準へ直線で飛び、着いたら爆風になる。着く場所の目印が出る | 自動（単体・E2E） | `tests/unit/interceptor.test.ts`、`e2e/play-pc.spec.ts` |
| LLM-TC-0001-04 | 同じ距離なら中央の基地のミサイルが早く着く | 自動（単体） | `tests/unit/interceptor.test.ts` |
| LLM-TC-0001-05 | 各 10 発、撃つと 1 減り、0 なら撃てない。残弾の表示が合う | 自動（単体・E2E） | `tests/unit/interceptor.test.ts`、`e2e/play-pc.spec.ts` |
| LLM-TC-0001-06 | 爆風は半径まで広がって縮んで消える。中に入った敵は消える | 自動（単体） | `tests/unit/blast.test.ts` |
| LLM-TC-0001-07 | 敵は上端から都市か基地に向かって直線で落ち、航跡が残り、地面で消える | 自動（単体）＋ 手動（見た目） | `tests/unit/enemy.test.ts`、手動：プレビューで見る |
| LLM-TC-0001-08 | PC の Chrome でプレビューの URL から遊べ、版の表示が main の版と同じ | 手動（実機） | 手順：プレビューの URL を開く → 右下の版を見る → クリックで撃って 1 発以上落とす（v1.2。v1.1 までは Z・X・C） |
