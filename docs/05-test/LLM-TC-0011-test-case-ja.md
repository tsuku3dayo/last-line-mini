---
id: LLM-TC-0011
type: test-case
title: 難しさを調整し、1 プレイ 3 分前後で後半ほど難しくする
status: stable
version: 1.0
updated: 2026-11-13
sources:
  - LLM-PBI-0011（v1.0）
  - LLM-GUI-0001（v1.8）
verified: null
---

# LLM-TC-0011 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0011-01 | 5 ウェーブで、ウェーブごとの敵の数が前より多く、5 ウェーブ目の敵がすべて消えて都市が残ると CLEAR | 自動（単体・E2E） | `tests/unit/wave.test.ts`、`e2e/flow.spec.ts` |
| LLM-TC-0011-02 | ウェーブが進むほど、敵の速さ（最小・最大とも）が下がらず、出る間隔が長くならない。WAVE 5 は WAVE 1 より速く、間隔が短い | 自動（単体） | `tests/unit/enemy.test.ts` |
| LLM-TC-0011-03 | 各ウェーブの最後の敵を画面の半ばで落とすとして設定値から計算した長さが 150〜210 秒 | 自動（単体） | `tests/unit/wave.test.ts` |
| LLM-TC-0011-04 | 多弾頭の位置が種から決まる：ウェーブごとの数どおり・同じ種で同じ・ちがう種でちがう並びが出る・2 発続かない・WAVE 1 は 0。WAVE 1 の敵の乱数の並びは今と同じ | 自動（単体） | `tests/unit/mirv.test.ts` |
| LLM-TC-0011-05 | 爆風の最大の半径が 36、最大のまま 1 秒（120 ステップ）、広がる 0.4 秒・縮む 0.5 秒。誘爆の爆風も同じ | 自動（単体） | `tests/unit/blast.test.ts`、`tests/unit/chain.test.ts` |
| LLM-TC-0011-06 | PC の Chrome と iPhone 11 のプレビューで、守り切ったときの長さが 2 分半〜3 分半、後半ほど難しく感じる、爆風が大きく長く残る | 手動（実機） | 手順：右下の番号を確かめる → PC で 1 プレイを時計で測って守り切る（できなければ GAME OVER までの長さと何ウェーブ目かを書く）→ 難しさの上がり方と爆風を見る → iPhone 11 で同じ → iPhone 11 の `?debug=1` で fps 55 以上（完成の定義） |
