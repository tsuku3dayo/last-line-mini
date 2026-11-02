import type { GameState, StepInput } from '../core/game';

/** URL から、テスト用の入口の有無と乱数の種を読む（テンプレート §5.2・§5.10） */
export function readDebugParams(search: string): { debug: boolean; seed: number | null } {
  const params = new URLSearchParams(search);
  const debug = params.get('debug') === '1';
  const raw = params.get('seed');
  const seed = debug && raw !== null && /^-?\d+$/.test(raw) ? Number(raw) >>> 0 : null;
  return { debug, seed };
}

/** 乱数の種：テスト用に固定されていなければ、端末の乱数から作る */
export function chooseSeed(fixed: number | null): number {
  if (fixed !== null) return fixed;
  const buf = new Uint32Array(1);
  try {
    crypto.getRandomValues(buf);
    return buf[0] ?? 0;
  } catch {
    return Date.now() >>> 0;
  }
}

export interface DebugApi {
  getState(): GameState;
  setState(state: GameState): void;
  /** ループを止める（描画は続く） */
  freeze(): void;
  unfreeze(): void;
  /** 止めたまま、決まった入力で steps ステップ進める */
  advance(steps: number, input?: StepInput): GameState;
}

declare global {
  interface Window {
    __llm?: DebugApi;
  }
}

/** ?debug=1 のときだけ window.__llm を出す */
export function exposeDebugApi(api: DebugApi): void {
  window.__llm = api;
}
