// 一時停止（LLM-PBI-0016・LLM-GUI-0003 §9）。プレイ中の「II」ボタンと、止めた画面（PAUSE・「▶ 続ける」・「やめてタイトルへ」）。
// どちらもゲーム画面の上に重ねる HTML。中の pointerdown は、ゲームの「触る／押す」とゲーム画面の撃つ操作に届かないよう止める。
// 止めているかは main.ts が持ち、止めているあいだはゲームを進めない（ゲームのロジック src/core は変えない）
import { isOver, type GameStatus } from '../core/wave';

/** 「II」ボタン（論理）。HUD の 1P と TOP のあいだ。一番小さい iPhone SE（倍率 約 0.75。案 17）で約 45 ポイント */
export const PAUSE_BUTTON = { x: 210, y: 0, width: 60, height: 60 } as const;
/** 止めた画面の「▶ 続ける」（論理） */
export const RESUME_BUTTON = { x: 120, y: 300, width: 240, height: 60 } as const;
/** 止めた画面の「やめてタイトルへ」（論理） */
export const QUIT_BUTTON = { x: 120, y: 390, width: 240, height: 60 } as const;

/** 止められるか：プレイ中（ウェーブのあいだを含む）で、終わり（CLEAR・GAME OVER）の表示が出ていない（LLM-TC-0016-01） */
export const canPause = (screen: string, status: GameStatus): boolean => screen === 'play' && !isOver(status);

/** 止める・続けるキー：Esc と P（LLM-TC-0016-03・04）。P は配列や日本語入力に左右されないよう、キーの位置（code）で見る */
export const isPauseKey = (e: { readonly key: string; readonly code: string }): boolean => e.key === 'Escape' || e.code === 'KeyP';

export interface PauseUi {
  setButtonVisible(visible: boolean): void;
  setPausedVisible(visible: boolean): void;
}

const pctX = (v: number) => `${(v / 480) * 100}%`;
const pctY = (v: number) => `${(v / 640) * 100}%`;
const place = (e: HTMLElement, r: { x: number; y: number; width: number; height: number }) =>
  Object.assign(e.style, { left: pctX(r.x), top: pctY(r.y), width: pctX(r.width), height: pctY(r.height) });

const button = (id: string, text: string, onClick: () => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.id = id;
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
};

export function createPause(stage: HTMLElement, handlers: { onPause: () => void; onResume: () => void; onQuit: () => void }): PauseUi {
  const pauseButton = button('pause-button', 'II', () => {
    if (!pauseButton.hidden) handlers.onPause();
  });
  pauseButton.hidden = true;
  pauseButton.setAttribute('aria-label', '止める');
  place(pauseButton, PAUSE_BUTTON);

  const screen = document.createElement('div');
  screen.id = 'pause';
  screen.hidden = true;
  // 止めた画面のどこを触っても撃たない・画面を進めない（ボタンの外を含む。LLM-TC-0016-02）
  screen.addEventListener('pointerdown', (e) => e.stopPropagation());

  const title = document.createElement('div');
  title.id = 'pause-title';
  title.textContent = 'PAUSE';
  title.style.top = pctY(180);
  const note = document.createElement('div');
  note.className = 'pause-note';
  note.textContent = '止めています';
  note.style.top = pctY(256);
  const resume = button('pause-resume', '▶ 続ける', () => {
    if (!screen.hidden) handlers.onResume();
  });
  place(resume, RESUME_BUTTON);
  const quit = button('pause-quit', 'やめてタイトルへ', () => {
    if (!screen.hidden) handlers.onQuit();
  });
  place(quit, QUIT_BUTTON);
  const keys = document.createElement('div');
  keys.className = 'pause-note pause-keys';
  keys.textContent = 'PC：Esc・P でも止める／続ける';
  keys.style.top = pctY(470);

  screen.append(title, note, resume, quit, keys);
  stage.append(pauseButton, screen);

  return {
    setButtonVisible(visible) {
      if (pauseButton.hidden === !visible) return;
      pauseButton.hidden = !visible;
    },
    setPausedVisible(visible) {
      if (screen.hidden === !visible) return;
      screen.hidden = !visible;
    },
  };
}
