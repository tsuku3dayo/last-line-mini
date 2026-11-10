---
id: LLM-TC-0004
type: test-case
title: 1 面がウェーブで進み、CLEAR か GAME OVER で終わる
status: stable
version: 1.3
updated: 2026-11-10
sources:
  - LLM-PBI-0004（v1.0）
  - LLM-GUI-0001（v1.8）
verified: null
---

# LLM-TC-0004 テストケース

ファイルの名前は予定（スプリントプランニングで TASK に割り当てるときに直す）。

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0004-01 | 始めは WAVE 1。4 ウェーブで、ウェーブごとの敵の数が決まった数（仮：6・9・12・15）だけ出る | 自動（単体） | `tests/unit/wave.test.ts` |
| LLM-TC-0004-02 | ウェーブの敵がすべて消えると約 3 秒のあいだ敵が出ず、壊れていない基地の弾が 10 発に戻り、次のウェーブになる。壊れた基地は 0 のまま | 自動（単体・E2E） | `tests/unit/wave.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0004-03 | 最後のウェーブの敵がすべて消え、都市が残っていれば CLEAR。「DEFENSE COMPLETE」が描かれる | 自動（単体・E2E） | `tests/unit/wave.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0004-04 | 6 都市がすべて壊れた瞬間に GAME OVER（その場で止まる）。「THE END」が描かれる | 自動（単体・E2E） | `tests/unit/wave.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0004-05 | 弾が 0・迎撃と爆風なし・残っている都市を狙う敵（分かれる前の多弾頭は子の狙いも。LLM-PBI-0008）が飛んでいる、がそろうと GAME OVER。どれか 1 つでも欠けると続く | 自動（単体） | `tests/unit/wave.test.ts` |
| LLM-TC-0004-06 | 演出の約 1 秒あとに「TAP OR PRESS ANY KEY」が出て、触るかキーで WAVE 1 から始まる。それより前の操作は受け付けない（v1.2：LLM-PBI-0006 から、触るかキーで進む先は TOP10 の画面（ランクインしたら名前の入力）→ タイトル → WAVE 1。LLM-GUI-0003 §0） | 自動（単体・E2E） | `tests/unit/wave.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0004-07 | PC の Chrome と iPhone 11 のプレビューで、1 プレイを最後まで遊べる（約 3 分） | 手動（実機） | 手順：右下の番号を確かめる → WAVE 1〜4 を遊ぶ → CLEAR か GAME OVER のあと、触るか押して最初から |
| LLM-TC-0004-08 | CLEAR・GAME OVER のあいだは照準を描かない。WAVE 1 からやり直すと描く（LLM-GUI-0001 v1.4 §5。実機確認の結果から足した） | 自動（単体）＋スクリーンショット | `tests/unit/overlay.test.ts` |
