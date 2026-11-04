import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/config';
import type { MoveDir } from '../core/cursor';
import type { FireButtons, StepInput } from '../core/game';

/** 画面の位置（CSS ピクセル）を、ゲーム画面の論理座標に直す */
export function toLogical(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
  };
}

type Dir = 'left' | 'right' | 'up' | 'down';

/** 発射キー：Z＝基地 A、X＝基地 B（中央）、C＝基地 C（LLM-GUI-0001 §3） */
export const FIRE_KEYS: Readonly<Record<string, number>> = { KeyZ: 0, KeyX: 1, KeyC: 2 };

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
 * キーボード（方向キー）・マウス・タッチ（Pointer Events）を、ステップごとの入力にまとめる（テンプレート §5.3）。
 * 文字の入力欄で打っている文字はゲームの操作にしない。
 */
export function createInput(stage: HTMLElement): InputSource {
  const held = new Set<Dir>();
  let pointer: { x: number; y: number } | null = null;
  // 押した瞬間を、次に読むまで覚えておく（押しっぱなしの連続入力では撃たない）
  let fire: [boolean, boolean, boolean] = [false, false, false];

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const base = FIRE_KEYS[e.code];
    if (base !== undefined) {
      if (!e.repeat) fire[base] = true;
      e.preventDefault();
      return;
    }
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

  // 指が付いた点。次に読むまでためる（同じステップに 2 本の指なら 2 点）
  let taps: { x: number; y: number }[] = [];

  stage.addEventListener('pointermove', (e) => {
    // マウスだけ。タッチは指をすべらせても照準を動かさない（LLM-GUI-0002 §2）
    if (e.pointerType !== 'mouse') return;
    pointer = toLogical(e.clientX, e.clientY, stage.getBoundingClientRect());
  });
  stage.addEventListener('pointerdown', (e) => {
    // タッチで指が付いた瞬間だけ撃つ（LLM-PBI-0002 案 C）。マウスのクリックでは撃たない（LLM-GUI-0001 §3）
    if (e.pointerType !== 'touch') return;
    taps.push(toLogical(e.clientX, e.clientY, stage.getBoundingClientRect()));
  });

  return {
    read(): StepInput {
      const move: MoveDir = {
        x: held.has('right') === held.has('left') ? 0 : held.has('right') ? 1 : -1,
        y: held.has('down') === held.has('up') ? 0 : held.has('down') ? 1 : -1,
      };
      const p = pointer;
      const f: FireButtons = fire;
      const t = taps;
      pointer = null;
      fire = [false, false, false];
      taps = [];
      return { move, pointer: p, fire: f, taps: t };
    },
  };
}
