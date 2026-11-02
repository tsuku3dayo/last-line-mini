---
id: LLM-TS-0001
type: technology-stack
title: 最終防衛線ミニ 技術スタック
status: stable
version: 1.1
updated: 2026-11-02
sources:
  - LLM-SA-0001（v1.0）
  - docs/spec/ARCHITECTURE-TEMPLATE.md（2026-11-02 版）§7〜§9
verified: null
---

# 最終防衛線ミニ 技術スタック（初版）

テンプレート §7 の構成を使う。版はテンプレートの 2026-10-26 時点のもの。**最初のスプリントで土台を作るときに、その日の最新を確かめ直し**、違えばこの表を直す。

## 1. 実行時（ブラウザ）

| 用途 | 技術 |
| :--- | :--- |
| 描画 | HTML5 Canvas 2D（自前のドット絵・ビットマップフォント） |
| 入力 | KeyboardEvent（慣性の照準・3 つの発射キー）、Pointer Events（マウス・タッチ） |
| 保存 | localStorage（TOP10） |
| オフライン | Service Worker（vite-plugin-pwa ＝ Workbox）、workbox-window |
| 音 | 使わない（あとで決める。使うなら Web Audio の合成） |

実行時のライブラリは workbox-window だけ。

## 2. 開発の道具

| 用途 | パッケージ | 版の範囲 | 手元の確認（2026-11-02） |
| :--- | :--- | :--- | :--- |
| 実行環境 | Node.js | 24 系（`engines: ">=24"`） | v24.0.0 |
| パッケージ管理 | npm | Node に付属 | 11.3.0 |
| ビルド | vite | ^8.3.5 | 8.3.5 が最新 |
| 言語 | typescript | ~6.0.3 | 最新は 7.0.2 だが、typescript-eslint 8.72.1 の対応が `<6.1.0` までのため 6.0.3 |
| PWA | vite-plugin-pwa / workbox-window | ^2.0.0 / ^7.4.1 | 最新（LLM-TASK-0002 で入れる） |
| 単体テスト | vitest | ^5.0.5 | 5.0.5 が最新 |
| E2E | @playwright/test | 1.64.1（固定。CI のコンテナ `v1.64.1-noble` とそろえる） | 1.64.1 が最新 |
| Lint | eslint・@eslint/js・typescript-eslint・globals | ^10.14.0・^10.0.1・^8.72.1・^17.14.0 | 最新 |
| 型 | @types/node | ^24（実行環境の Node 24 に合わせる。最新は 26 系） | 24.19.2 |

`npm audit` の注意（中）が 1 件：ESLint が使う minimatch。開発のときだけ使う道具で、アプリには入らない。自動の直し方は ESLint を 4.0 に戻すものなので使わず、ESLint の更新を待つ（2026-11-02）。
| Git / GitHub | git・gh | — | 2.51.0 / 2.103.0（ログイン済み） |

## 3. テスト・検査（テンプレート §6）

- `npm run verify` = lint → test → build → check:dist → check:docs。
- E2E の端末：PC（Chromium 1280 × 800）、iPhone 11（WebKit）、iPhone SE 第 3 世代（WebKit 375 × 667）。Android は入れない（IDK Q4：実機がなく確かめられない）。
- check-dist には、テンプレートの検査に次を足す：プレビュー用と本番用の build で、名前・`<app-id>`・`base` がそれぞれ正しいこと。

## 4. CI と公開（テンプレート §9 との違い）

| きっかけ | ワークフロー | すること |
| :--- | :--- | :--- |
| PR | `ci.yml` | verify、E2E |
| main への push（PR のマージ） | `pages.yml` | verify・E2E → main をプレビュー用に build、最新のタグを本番用に build → まとめて公開 |
| タグ `v*` の push（リリース） | `pages.yml` | 同上（本番が新しいタグになる） |

- テンプレートの「main へのマージ ＝ 公開」は、このチームでは「main へのマージ ＝ **プレビュー** に公開」に読み替える（TEAM 1 章）。
- Pages の公開元は「GitHub Actions」。main は CI が緑でないとマージできないように保護する。

## 5. 改訂履歴

| 版 | 日付 | 内容 |
| :--- | :--- | :--- |
| 0.1 | 2026-11-02 | 初版の案（テンプレートから） |
| 1.0 | 2026-11-02 | 承認 |
| 1.1 | 2026-11-02 | LLM-TASK-0001 で版を確かめた結果を書いた |
