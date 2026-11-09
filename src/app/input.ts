import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/config';
import { NO_FIRE, type StepInput } from '../core/game';

/** 画面の位置（CSS ピクセル）を、ゲーム画面の論理座標に直す */
export function toLogical(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
  };
}

/**
 * この押し方で撃つか：タッチで指が付いた瞬間（LLM-PBI-0002 案 C）と、マウスの左ボタンを押した瞬間（LLM-PBI-0019）。
 * 右・真ん中のボタンやペンでは撃たない（LLM-TC-0019-02）
 */
export function firesOn(e: { readonly pointerType: string; readonly button: number }): boolean {
  if (e.pointerType === 'touch') return true;
  return e.pointerType === 'mouse' && e.button === 0;
}

export interface InputSource {
  /** 1 ステップぶんの入力を取り出す。マウスの位置と触った点は 1 回取り出したら消える */
  read(): StepInput;
}

/**
 * マウス・タッチ（Pointer Events）を、ステップごとの入力にまとめる（テンプレート §5.3）。
 * キーボードでは照準を動かさず撃たない（方向キー・Z・X・C はなくした。LLM-PBI-0019・GUI-0001 v1.7 §3）。
 * キーボードは画面を進める・名前の入力・`?debug=1` の G キーにだけ使い、それは main.ts で受ける。
 */
export function createInput(stage: HTMLElement): InputSource {
  let pointer: { x: number; y: number } | null = null;
  // 触った・クリックした点。次に読むまでためる（同じステップに 2 本の指なら 2 点）
  let taps: { x: number; y: number }[] = [];

  stage.addEventListener('pointermove', (e) => {
    // マウスだけ。タッチは指をすべらせても照準を動かさない（LLM-GUI-0002 §2）
    if (e.pointerType !== 'mouse') return;
    pointer = toLogical(e.clientX, e.clientY, stage.getBoundingClientRect());
  });
  stage.addEventListener('pointerdown', (e) => {
    // 押した瞬間だけ撃つ。押したまま動かしても撃たない
    if (!firesOn(e)) return;
    taps.push(toLogical(e.clientX, e.clientY, stage.getBoundingClientRect()));
  });

  return {
    read(): StepInput {
      const p = pointer;
      const t = taps;
      pointer = null;
      taps = [];
      return { pointer: p, fire: NO_FIRE, taps: t };
    },
  };
}
