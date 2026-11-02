// 種から作る乱数（mulberry32）。core は Math.random を使わない（テンプレート §5.2）。
// 状態（32 ビットの整数）を受け取り、値と次の状態を返す純粋な関数にする。

/** 種を 32 ビットの符号なし整数にそろえる */
export function seedState(seed: number): number {
  return seed >>> 0;
}

/** [0, 1) の数と、次の状態を返す */
export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}
