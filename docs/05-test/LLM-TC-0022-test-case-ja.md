---
id: LLM-TC-0022
type: test-case
title: ランキング（TOP10）のデータを消して、最初からにできる
status: stable
version: 1.0
updated: 2026-11-20
sources:
  - LLM-PBI-0022（v1.0）
  - LLM-GUI-0003（v1.6）§10
verified: null
---

# LLM-TC-0022 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0022-01 | 記録があるときだけタイトルの右下に「記録を消す」が出る（記録なし・ほかの画面では出ない）。押してもゲームは始まらない。44 ポイント以上 | 自動（単体・E2E） | 単体（ボタンを出すか）、`e2e/clear-ranking.spec.ts`（PC・iPhone 11・iPhone SE） |
| LLM-TC-0022-02 | 確かめる画面に件数入りの文と「消す」「やめる」が出る。出てから約 1 秒は押せない | 自動（単体・E2E） | 単体（文の件数）、`e2e/clear-ranking.spec.ts`（撮影：確かめる画面） |
| LLM-TC-0022-03 | 「やめる」・Esc で何も消さずにタイトルへ。ボタンの外・ほかのキーでは何もしない | 自動（E2E） | `e2e/clear-ranking.spec.ts` |
| LLM-TC-0022-04 | 「消す」で開いているチャンネルの TOP10 だけ消え、TOP 000000・ボタンが消える。音の保存ともう一方のチャンネルの記録は残る。開き直しても空 | 自動（単体・E2E） | 単体（`clearRanking`）、`e2e/clear-ranking.spec.ts`（撮影：消したあと） |
| LLM-TC-0022-05 | 消したあとランクインすると 1 位に入る | 自動（E2E） | `e2e/clear-ranking.spec.ts` |
| LLM-TC-0022-06 | PC の Chrome と iPhone 11（ホーム画面のプレビューのアプリ）で「やめる」→ 残る、「消す」→ 空・開き直しても空。fps 55 以上 | 手動（実機） | 手順：公開のあとに読み取った右下の番号を確かめる → PC で 1 回 → iPhone 11 で 1 回（案 28）→ `?debug=1` で fps |
