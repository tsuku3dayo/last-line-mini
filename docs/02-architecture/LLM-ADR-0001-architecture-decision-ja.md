---
id: LLM-ADR-0001
type: architecture-decision
title: 公開先とデータの置き場所
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - LLM-IDK-0001（v1.0）
  - LLM-SA-0001（v1.0）
verified: { by: オーナー, at: 2026-11-02T15:12:54+09:00 }
---

# LLM-ADR-0001 公開先とデータの置き場所

PO の前提に関わる決定（OPTION 2.1）。2026-11-02 のチャットで PO が選んだ。

## 決定

1. **公開先**：GitHub Pages（公開リポジトリ `last-line-mini`）。本番は `/last-line-mini/`、プレビューは `/last-line-mini/preview/`。GitHub Pages は 1 つのリポジトリに 1 つの公開物しか置けないので、最新のリリースのタグ（本番）と main（プレビュー）を 1 回の公開でまとめて出す。
2. **データの置き場所**：ランキング（TOP10）は端末の localStorage だけ。サーバー・外部のサービスは使わない。
3. **費用**：0 円（GitHub の無料の範囲）。

## 選ばなかった案

| 案 | 選ばなかった理由 |
| :--- | :--- |
| 手元だけ（公開しない） | プレビューでの実機確認（OPTION 6.5）ができない |
| オンラインランキング（サーバー・BaaS） | 費用・不正なスコア対策・個人情報の扱いが増える。PO が「ローカルのみ」を選んだ |
| プレビューを別のリポジトリにする | リポジトリが 2 つになり、版の管理が分かれる |

## 結果

- iPhone の Safari は、しばらく開かないとデータを消すことがある。ランキングが消えることは受け入れる（IDK Q6）。
- 本番とプレビューは名前・アイコン・`<app-id>`（`last-line-mini` / `last-line-mini-preview`）で分ける。
