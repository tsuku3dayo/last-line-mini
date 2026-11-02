---
id: LLM-TC-9001
type: test-case
title: 土台・公開（非機能）
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - LLM-TST-0001（v1.0）§3
  - LLM-SA-0001（v1.0）§2・§3
  - docs/definition-of-done.md（v1.0）
verified: null
---

# LLM-TC-9001 テストケース（土台・公開）

どの PBI にも属さない非機能の確認（LLM-TST-0001 §3）。LLM-TASK-0002 で公開の分を足す。

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-9001-01 | 画面に版が出る。プレビューは `β` 付きでプレビューの名前、本番は付かない。本番とプレビューで base・アプリ識別子・名前が違う | 自動（単体・E2E） | `tests/unit/version.test.ts`、`e2e/smoke.spec.ts` |
| LLM-TC-9001-02 | 層の決まり（core は DOM・時刻・乱数・外の層を使わない、など）が ESLint で守られる | 自動（単体） | `tests/unit/layer-rules.test.ts` |
| LLM-TC-9001-03 | dist の参照が base で始まり、外部の URL と原作の名前が入っていない | 自動（dist の検査） | `scripts/check-dist.mjs`（verify・CI） |
