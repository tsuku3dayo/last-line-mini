// 記録を消す（LLM-PBI-0022・LLM-GUI-0003 §10）。タイトルの「記録を消す」と、確かめる画面（「消す」・「やめる」）。
// どちらもゲーム画面の上に重ねる HTML。中の pointerdown は、ゲームの「触る／押す」（ゲームを始める）に届かないよう止める。
// 保存を消すのは main.ts（storage の clearRanking）

/** 「記録を消す」（論理）。タイトルの「クレジット」の右。iPhone SE（倍率 約 0.75。案 17）で約 45 ポイント */
export const CLEAR_BUTTON = { x: 336, y: 560, width: 120, height: 60 } as const;
/** 確かめる画面の「消す」（論理） */
export const CLEAR_YES_BUTTON = { x: 120, y: 320, width: 240, height: 60 } as const;
/** 確かめる画面の「やめる」（論理） */
export const CLEAR_NO_BUTTON = { x: 120, y: 410, width: 240, height: 60 } as const;

/** 「記録を消す」を出すか：タイトル画面で、記録が 1 件以上あるとき（LLM-TC-0022-01） */
export const clearButtonVisible = (screen: string, count: number): boolean => screen === 'title' && count > 0;

/** 確かめる画面の説明の文（件数入り。LLM-TC-0022-02） */
export const clearConfirmText = (count: number): string => `この端末の記録（${count} 件）をすべて消します。\n消した記録は元に戻せません。`;

export interface ClearRankingUi {
  setButtonVisible(visible: boolean): void;
  /** 確かめる画面を出す（件数）・隠す（null） */
  setConfirm(count: number | null): void;
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

export function createClearRanking(
  stage: HTMLElement,
  handlers: { onOpen: () => void; onYes: () => void; onNo: () => void },
): ClearRankingUi {
  const open = button('clear-button', '記録を消す', () => {
    if (!open.hidden) handlers.onOpen();
  });
  open.hidden = true;
  place(open, CLEAR_BUTTON);

  const screen = document.createElement('div');
  screen.id = 'clear-confirm';
  screen.hidden = true;
  // 確かめる画面のどこを触っても、ゲームは始まらない（ボタンの外を含む。LLM-TC-0022-03）
  screen.addEventListener('pointerdown', (e) => e.stopPropagation());

  const title = document.createElement('div');
  title.id = 'clear-title';
  title.textContent = 'TOP10 の記録を消しますか？';
  title.style.top = pctY(190);
  const note = document.createElement('div');
  note.id = 'clear-note';
  note.className = 'clear-note';
  note.style.top = pctY(240);
  const yes = button('clear-yes', '消す', () => {
    if (!screen.hidden) handlers.onYes();
  });
  place(yes, CLEAR_YES_BUTTON);
  const no = button('clear-no', 'やめる', () => {
    if (!screen.hidden) handlers.onNo();
  });
  place(no, CLEAR_NO_BUTTON);
  const keys = document.createElement('div');
  keys.className = 'clear-note clear-keys';
  keys.textContent = 'PC：Esc でもやめる';
  keys.style.top = pctY(490);

  screen.append(title, note, yes, no, keys);
  stage.append(open, screen);

  return {
    setButtonVisible(visible) {
      if (open.hidden === !visible) return;
      open.hidden = !visible;
    },
    setConfirm(count) {
      if (count !== null) note.textContent = clearConfirmText(count);
      const visible = count !== null;
      if (screen.hidden === !visible) return;
      screen.hidden = !visible;
    },
  };
}
