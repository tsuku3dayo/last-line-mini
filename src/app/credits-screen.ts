import { CREDIT_ROLES, MIT_LICENSE_TEXT, THIRD_PARTY } from './credits';

/**
 * タイトルの「クレジット」ボタンとクレジット画面（LLM-GUI-0003 §7。LLM-PBI-0013）。どちらもゲーム画面の上に重ねる HTML で、
 * 文字はブラウザの文字（ゴシック）。位置は論理座標（480 × 640）の割合、文字や余白の大きさは CSS の --u（論理の 1 の長さ）で決める。
 *
 * 中の pointerdown は、ゲームの「触る／押す」（window の pointerdown）とゲーム画面の撃つ操作に届かないよう止める。
 * クレジット画面の本文は上下に動かせる（タッチのガードは data-scroll の中を止めない。touch-guard.ts）。
 */
export interface Credits {
  setButtonVisible(visible: boolean): void;
  setScreenVisible(visible: boolean): void;
  /** 画面の倍率（layout）が変わったら呼ぶ */
  setScale(scale: number): void;
}

/** 「クレジット」ボタン（論理）。一番小さい iPhone SE（倍率 約 0.75。案 17）で約 45 ポイント */
export const CREDIT_BUTTON = { x: 160, y: 560, width: 160, height: 60 } as const;
/** 「BACK」ボタン（論理） */
export const BACK_BUTTON = { x: 16, y: 16, width: 144, height: 60 } as const;
/** 動かない上の部分（BACK と見出し）の高さ（論理） */
export const CREDITS_HEADER_HEIGHT = 92;

const pctX = (v: number) => `${(v / 480) * 100}%`;
const pctY = (v: number) => `${(v / 640) * 100}%`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
};

export function createCredits(
  stage: HTMLElement,
  handlers: { onOpen: () => void; onBack: () => void; canOpen: () => boolean },
): Credits {
  const button = el('button', '', 'クレジット');
  button.id = 'credits-button';
  button.type = 'button';
  button.hidden = true;
  Object.assign(button.style, {
    left: pctX(CREDIT_BUTTON.x),
    top: pctY(CREDIT_BUTTON.y),
    width: pctX(CREDIT_BUTTON.width),
    height: pctY(CREDIT_BUTTON.height),
  });
  button.addEventListener('pointerdown', (e) => e.stopPropagation());
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (button.hidden || !handlers.canOpen()) return;
    handlers.onOpen();
  });

  const screen = el('div', '');
  screen.id = 'credits';
  screen.hidden = true;
  screen.addEventListener('pointerdown', (e) => e.stopPropagation());

  const header = el('div', 'credits-header');
  header.style.height = pctY(CREDITS_HEADER_HEIGHT);
  const back = el('button', '', '← BACK');
  back.id = 'credits-back';
  back.type = 'button';
  Object.assign(back.style, {
    left: pctX(BACK_BUTTON.x),
    top: `${(BACK_BUTTON.y / CREDITS_HEADER_HEIGHT) * 100}%`,
    width: pctX(BACK_BUTTON.width),
    height: `${(BACK_BUTTON.height / CREDITS_HEADER_HEIGHT) * 100}%`,
  });
  back.addEventListener('click', (e) => {
    e.stopPropagation();
    if (screen.hidden) return;
    handlers.onBack();
  });
  const title = el('h1', 'credits-title', 'クレジット');
  header.append(back, title);

  const scroll = el('div', '');
  scroll.id = 'credits-scroll';
  scroll.dataset.scroll = '';
  scroll.style.top = pctY(CREDITS_HEADER_HEIGHT);
  const roles = el('dl', 'credits-roles');
  for (const { role, name } of CREDIT_ROLES) roles.append(el('dt', 'credits-role', role), el('dd', 'credits-name', name));
  const tools = el('section', 'credits-tools');
  tools.append(el('h2', 'credits-section', '使った道具（権利）'));
  for (const t of THIRD_PARTY) {
    const p = el('p', 'credits-tool');
    p.append(el('b', '', t.name), ` — ${t.license}`, el('br', ''), t.copyright);
    tools.append(p);
  }
  const mit = el('div', 'credits-mit');
  mit.id = 'credits-mit';
  for (const para of MIT_LICENSE_TEXT) mit.append(el('p', '', para));
  tools.append(mit);
  scroll.append(roles, tools);

  screen.append(header, scroll);
  stage.append(button, screen);

  return {
    setButtonVisible(visible: boolean) {
      button.hidden = !visible;
    },
    setScreenVisible(visible: boolean) {
      const opening = visible && screen.hidden;
      screen.hidden = !visible;
      // 開くたびに一番上から（隠れているあいだは位置を変えられないので、出してから戻す）
      if (opening) scroll.scrollTop = 0;
    },
    setScale(scale: number) {
      // 論理の 1 の長さ（px）。文字・余白は CSS で calc(var(--u) * n)
      stage.style.setProperty('--u', `${scale}px`);
    },
  };
}
