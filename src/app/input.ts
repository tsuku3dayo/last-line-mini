import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/config';
import type { MoveDir } from '../core/cursor';
import type { StepInput } from '../core/game';

/** 画面の位置（CSS ピクセル）を、ゲーム画面の論理座標に直す */
export function toLogical(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
  };
}

type Dir = 'left' | 'right' | 'up' | 'down';

const ARROWS: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export interface InputSource {
  /** 1 ステップぶんの入力を取り出す。マウスの位置は 1 回取り出したら消える */
  read(): StepInput;
}

/**
 * キーボード（方向キー）とマウス（Pointer Events）を、ステップごとの入力にまとめる（テンプレート §5.3）。
 * 文字の入力欄で打っている文字はゲームの操作にしない。
 */
export function createInput(stage: HTMLElement): InputSource {
  const held = new Set<Dir>();
  let pointer: { x: number; y: number } | null = null;

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const dir = ARROWS[e.key];
    if (dir) {
      held.add(dir);
      e.preventDefault(); // ページがスクロールしないように
    }
  });
  window.addEventListener('keyup', (e) => {
    const dir = ARROWS[e.key];
    if (dir) held.delete(dir);
  });
  // 窓から離れたら、押したままのキーを離したことにする
  window.addEventListener('blur', () => held.clear());

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return; // タッチは LLM-PBI-0002
    pointer = toLogical(e.clientX, e.clientY, stage.getBoundingClientRect());
  });

  return {
    read(): StepInput {
      const move: MoveDir = {
        x: held.has('right') === held.has('left') ? 0 : held.has('right') ? 1 : -1,
        y: held.has('down') === held.has('up') ? 0 : held.has('down') ? 1 : -1,
      };
      const p = pointer;
      pointer = null;
      return { move, pointer: p };
    },
  };
}
