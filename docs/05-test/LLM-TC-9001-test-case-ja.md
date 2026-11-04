---
id: LLM-TC-9001
type: test-case
title: 土台・公開（非機能）
status: stable
version: 1.6
updated: 2026-11-04
sources:
  - LLM-TST-0001（v1.1）§3
  - LLM-SA-0001（v1.0）§2・§3
  - docs/definition-of-done.md（v1.0）
verified: null
---

# LLM-TC-9001 テストケース（土台・公開）

どの PBI にも属さない非機能の確認（LLM-TST-0001 §3）。04〜06 は LLM-TASK-0002（公開・PWA の骨組み）で、13 は LLM-TASK-0009（プレビューの版にマージの印）で、14 は LLM-TASK-0011（fps の表示）で、15 は LLM-TASK-0012（main への直接コミットを止める）で足した。

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-9001-01 | 画面に版が出る。プレビューは `β` 付きでプレビューの名前、本番は付かない。本番とプレビューで base・アプリ識別子・名前が違う | 自動（単体・E2E） | `tests/unit/version.test.ts`、`e2e/smoke.spec.ts` |
| LLM-TC-9001-02 | 層の決まり（core は DOM・時刻・乱数・外の層を使わない、など）が ESLint で守られる | 自動（単体） | `tests/unit/layer-rules.test.ts` |
| LLM-TC-9001-03 | dist の参照が base で始まり、外部の URL と原作の名前が入っていない | 自動（dist の検査） | `scripts/check-dist.mjs`（verify・CI） |
| LLM-TC-9001-04 | 本番とプレビューで、マニフェストの名前・範囲・アイコン、apple-touch-icon、SW のキャッシュ名が分かれている | 自動（dist の検査を両方のチャンネルで・E2E） | `scripts/check-dist.mjs`（CI の verify・production-build）、`e2e/pwa.spec.ts` |
| LLM-TC-9001-05 | Service Worker が登録され、オフラインでも読み込み直せる。本番の SW はプレビュー（`/preview/`）のページを扱わない | 自動（E2E・dist の検査） | `e2e/pwa.spec.ts`、`scripts/check-dist.mjs --channel production` |
| LLM-TC-9001-06 | main へのマージで公開され、プレビューの URL でアプリが、本番の URL で「準備中」のページ（最初のリリースまで）が開ける | 手動（公開のあと） | 手順：Actions の Pages が緑 → `https://tsuku3dayo.github.io/last-line-mini/preview/` と `https://tsuku3dayo.github.io/last-line-mini/` を開く |
| LLM-TC-9001-07 | `check:docs` が、ID・ファイル名・置き場所・frontmatter・sources の版・承認・確認 ID のつながり・プロダクトバックログと PBI と AC の食い違いを見つける | 自動（単体） | `tests/unit/check-docs.test.ts`、`scripts/check-docs.mjs`（verify・CI） |
| LLM-TC-9001-08 | 版を上げるスクリプトが、版を 0.1 上げ、承認のある種類を review に戻し、下流の sources の版の表記をそろえる | 自動（単体） | `tests/unit/check-docs.test.ts`、`scripts/bump-version.mjs` |
| LLM-TC-9001-09 | 固定ステップ（120 ステップ／秒、1 回に最大 12）で進み、同じ種と入力からは同じ状態になる | 自動（単体・E2E） | `tests/unit/skeleton.test.ts`、`e2e/skeleton.spec.ts` |
| LLM-TC-9001-10 | ゲーム画面（480 × 640）が、安全領域を引いた窓の中に縦横の比を保って最大の大きさで収まる。版は画面の右下 | 自動（単体・E2E 3 端末） | `tests/unit/skeleton.test.ts`、`e2e/skeleton.spec.ts` |
| LLM-TC-9001-11 | `?debug=1&seed=` でテスト用の入口（`window.__llm`）が出て、止めたまま決まったステップだけ進められる。`?debug=1` がなければ出ない | 自動（単体・E2E） | `tests/unit/skeleton.test.ts`、`e2e/skeleton.spec.ts` |
| LLM-TC-9001-12 | 地形・基地 3 つ（残弾 10）・都市 6 つ・HUD（1P・TOP）が LLM-GUI-0001 の位置と色で描かれる | 自動（単体）＋ 手動（スクリーンショット・実機） | `tests/unit/skeleton.test.ts`、手動：PBI-0001 の実機確認で見る |
| LLM-TC-9001-13 | プレビューの版に、build したコミットの短い番号（7 桁）が付く（例：`v0.1.0 β aefcdbd`）。本番には付かない | 自動（単体・E2E） | `tests/unit/version.test.ts`、`e2e/smoke.spec.ts` |
| LLM-TC-9001-14 | `?debug=1` のときだけ、ゲーム画面の左下に fps（1 秒ごとの描画の回数）が出る。iPhone 11 のプレビューで 55 以上（完成の定義） | 自動（単体・E2E）＋ 手動（iPhone 11 の値） | `tests/unit/fps.test.ts`、`e2e/smoke.spec.ts`、手動：PBI の実機確認で `?debug=1` を開いて見る |
| LLM-TC-9001-15 | 手元で main に直接コミットしようとすると、Git のフック（`npm install` で有効になる）が止める。作業ブランチでは止めない | 自動（単体） | `tests/unit/guard-main.test.ts`（`scripts/guard-main.mjs`） |
