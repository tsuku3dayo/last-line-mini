---
id: LLM-TC-0007
type: test-case
title: ランクインしたら 3 文字の名前を入れ、自分の行が点滅する
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - LLM-PBI-0007（v1.0）
  - LLM-GUI-0003（v1.0）
verified: null
---

# LLM-TC-0007 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0007-01 | ランクインしたら、終わりの画面で触るか押すと名前の入力の画面になり、入力欄に打てる。入らなければ TOP10 の画面 | 自動（E2E）＋スクリーンショット | `e2e/name-entry.spec.ts` |
| LLM-TC-0007-02 | A〜Z・0〜9・`.` の 3 文字まで。小文字は大文字に、ほかは入らない | 自動（単体・E2E） | `tests/unit/name.test.ts`、`e2e/name-entry.spec.ts` |
| LLM-TC-0007-03 | Enter か `OK` で確定すると名前つきで TOP10 に入り TOP10 の画面へ。空なら `...` | 自動（単体・E2E） | `tests/unit/name.test.ts`、`e2e/name-entry.spec.ts` |
| LLM-TC-0007-04 | TOP10 の画面で今回の行が 0.5 秒ごとに点滅 | 自動（単体）＋スクリーンショット | `tests/unit/screens.test.ts` |
| LLM-TC-0007-05 | 名前を打っているあいだ、キーでゲームが始まらず、画面も切り替わらない | 自動（E2E） | `e2e/name-entry.spec.ts` |
| LLM-TC-0007-06 | PC の Chrome と iPhone 11 のプレビューで、名前を入れて自分の行が点滅。iPhone はキーボードが出て、入力欄と `OK` が隠れず、勝手に拡大されない | 手動（実機） | 手順：右下の番号を確かめる → ランクインする（記録が 10 件未満なら必ず入る）→ 名前を打つ（小文字・記号も試す）→ 確定 → 自分の行が点滅。iPhone はキーボードの出方・隠れ・拡大を見る。iPhone 11 の `?debug=1` で fps 55 以上（完成の定義） |
