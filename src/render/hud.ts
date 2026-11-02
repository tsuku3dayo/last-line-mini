// HUD の文字を決める純粋な関数（単体テストする）

/** 点数を 6 桁の 0 埋めにする（999999 で止める） */
export function formatScore(score: number): string {
  return String(Math.min(999999, Math.max(0, Math.floor(score)))).padStart(6, '0');
}

export const hud1pText = (score: number): string => `1P ${formatScore(score)}`;
export const hudTopText = (score: number): string => `TOP ${formatScore(score)}`;
