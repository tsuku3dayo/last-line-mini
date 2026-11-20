---
id: LLM-TC-0014
type: test-case
title: 効果音と BGM が鳴る
status: stable
version: 1.0
updated: 2026-11-19
sources:
  - LLM-PBI-0014（v1.0）
  - LLM-GUI-0003（v1.5）
verified: null
---

# LLM-TC-0014 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0014-01 | 1 ステップ前と後の状態から、鳴らす効果音（8 種）を決める。同じ音は 1 ステップに 1 回 | 自動（単体・E2E） | `tests/unit/audio.test.ts`、`e2e/sound.spec.ts`（`?debug=1` で鳴らした音の名前を数える） |
| LLM-TC-0014-02 | BGM はプレイ中だけ・後半ほど速い・終わりで止まる・ほかの画面では鳴らない | 自動（単体・E2E） | `tests/unit/audio.test.ts`、`e2e/sound.spec.ts` |
| LLM-TC-0014-03 | 公開する版に音のファイル（mp3・wav・ogg など）が入っていない | 自動（dist の検査） | `scripts/check-dist.mjs` |
| LLM-TC-0014-04 | 「♪ 音 ON／OFF」で切り替わり、OFF なら鳴らない・端末に覚える・初めは ON・ゲームは始まらない。iPhone SE で 44 ポイント以上 | 自動（単体・E2E）＋スクリーンショット（PC・iPhone SE） | `tests/unit/audio.test.ts`、`e2e/sound.spec.ts` |
| LLM-TC-0014-05 | 最初に触る・クリック・キーまでは鳴らさず、エラーにならない | 自動（E2E） | `e2e/sound.spec.ts` |
| LLM-TC-0014-06 | PC の Chrome と iPhone 11 のプレビューで、効果音と BGM が鳴り、ON／OFF が効く。うるさすぎない。fps 55 以上 | 手動（実機） | 手順：公開のあとに読み取った右下の番号を確かめる → PC で 1 プレイ（撃つ・爆発・都市・空の敵・ウェーブ・終わり・ランクインの音と BGM）→ タイトルで OFF にして鳴らない・開き直しても OFF → iPhone 11 のホーム画面のアプリで同じ（マナーモードを切って）→ `?debug=1` で fps |
