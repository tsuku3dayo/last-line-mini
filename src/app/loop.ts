import { planSteps } from '../core/timestep';

export interface Loop {
  /** ステップを止める（描画は続ける）。E2E とテスト用の入口で使う */
  freeze(): void;
  unfreeze(): void;
  readonly frozen: boolean;
}

/**
 * requestAnimationFrame のループ（テンプレート §5.1）。時刻を読むのはここだけ。
 * タブが隠れたら進めず、戻ったときに遅れを取り戻さない。
 */
export function startLoop(advance: (steps: number) => void, draw: () => void): Loop {
  let acc = 0;
  let last: number | null = null;
  let frozen = false;

  const frame = (now: number) => {
    if (last !== null && !frozen && document.visibilityState === 'visible') {
      const plan = planSteps(acc, now - last);
      acc = plan.acc;
      if (plan.steps > 0) advance(plan.steps);
    }
    last = now;
    draw();
    requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', () => {
    last = null;
    acc = 0;
  });
  requestAnimationFrame(frame);

  return {
    freeze: () => {
      frozen = true;
      acc = 0;
    },
    unfreeze: () => {
      frozen = false;
      last = null;
    },
    get frozen() {
      return frozen;
    },
  };
}
