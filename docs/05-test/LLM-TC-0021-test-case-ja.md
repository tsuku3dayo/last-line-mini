---
id: LLM-TC-0021
type: test-case
title: 空の敵が落とす弾の位置と速さが毎回変わる
status: stable
version: 1.0
updated: 2026-11-19
sources:
  - LLM-PBI-0021（v1.0）
verified: null
---

# LLM-TC-0021 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0021-01 | 爆撃機は道のりの 15〜85% の 2 か所で落とし、2 か所は 20% 以上あく。種を変えると位置が変わる | 自動（単体） | `tests/unit/aircraft.test.ts` |
| LLM-TC-0021-02 | 衛星は 1.5〜3.5 秒（縮めたときはそれより短い）の間隔で 3 発、画面の中にいるうちに落とし終える | 自動（単体） | `tests/unit/aircraft.test.ts` |
| LLM-TC-0021-03 | 落とす弾の速さはウェーブの速さの範囲の中で、1 発ごとに変わる | 自動（単体） | `tests/unit/aircraft.test.ts` |
| LLM-TC-0021-04 | 狙いは真下にいちばん近い都市・基地。同じ種なら同じ展開。地上の敵の出方（位置・狙い・速さ・多弾頭）は変わらない | 自動（単体・E2E） | `tests/unit/aircraft.test.ts`、E2E 全体（決まった種の多弾頭・難しさのテストが通る） |
| LLM-TC-0021-05 | PC の Chrome と iPhone 11 のプレビューで、遊ぶたびに落とす所と速さが違い、落とせる。fps 55 以上 | 手動（実機） | 手順：公開のあとに読み取った右下の番号を確かめる → PC で 2 回遊び、WAVE 2 の爆撃機・WAVE 3 の衛星の落とす所が違うのを見る → iPhone 11 で 1 回 → `?debug=1` で fps |
