---
id: LLM-TC-0016
type: test-case
title: 遊んでいる途中で止め、続きから遊べる（ボタンと、アプリを離れたとき）
status: stable
version: 1.0
updated: 2026-11-20
sources:
  - LLM-PBI-0016（v1.0）
  - LLM-GUI-0003（v1.5）§9
verified: null
---

# LLM-TC-0016 テストケース

| 確認 ID | 確かめること | 方法 | 場所 |
| :--- | :--- | :--- | :--- |
| LLM-TC-0016-01 | プレイ中（ウェーブのあいだを含む）だけ「II」が x 210〜270・y 0〜60 に出て、触る／クリックで止まる。ボタンでは撃たない（残弾が変わらない）。終わりの表示・ほかの画面では出ない | 自動（単体・E2E） | 単体（止められるか）、`e2e/pause.spec.ts`（PC・iPhone 11・iPhone SE。SE でボタンが 44 ポイント以上） |
| LLM-TC-0016-02 | 止めた画面に「PAUSE」と 2 つのボタンが出る。止めているあいだはステップ・敵・点・残弾が変わらない。BGM が止まる（`data-bgm` が off）。ボタンの外を触っても撃たない | 自動（E2E） | `e2e/pause.spec.ts`（撮影：止めた画面） |
| LLM-TC-0016-03 | 「▶ 続ける」・Esc・P で止めたところから続く（ステップが進み出す。止める前の状態と同じところから）。BGM が鳴り直す。続けた操作では撃たない | 自動（E2E） | `e2e/pause.spec.ts` |
| LLM-TC-0016-04 | PC でプレイ中に Esc・P を押すと止まる | 自動（E2E） | `e2e/pause.spec.ts`（pc-chromium） |
| LLM-TC-0016-05 | `visibilitychange` で `hidden` になると止めた画面になり、`visible` に戻っても止まったまま。終わりの表示・ほかの画面では何もしない | 自動（E2E） | `e2e/pause.spec.ts`（`document.visibilityState` を上書きしてイベントを出す。ヘッドレスでは別のタブで `hidden` にならないため。案 25 の点検 2026-11-20） |
| LLM-TC-0016-06 | 「やめてタイトルへ」で、TOP10 に入れず（保存が変わらない）タイトルに戻る。次は新しい WAVE 1 | 自動（E2E） | `e2e/pause.spec.ts` |
| LLM-TC-0016-07 | PC の Chrome と iPhone 11（ホーム画面のプレビューのアプリ）で、止めて続ける・やめてタイトルへ、iPhone はホーム画面に戻って開き直すと止まっていて「続ける」で続く。fps 55 以上 | 手動（実機） | 手順：公開のあとに読み取った右下の番号を確かめる → PC で 1 回 → iPhone 11 で 1 回（案 28：細かい違いは E2E で見たので実機は 1 回）→ `?debug=1` で fps |
