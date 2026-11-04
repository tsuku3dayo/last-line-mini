/**
 * iPhone で、遊んでいる最中に起きてほしくないブラウザの動きを止める（LLM-GUI-0002 §3・TEAM 5.2・テンプレート §5.3・§5.5）。
 * - 長押しの虫めがね・メニュー、2 回タップの拡大：touchstart の既定の動きを止める（CSS だけでは止まらない）
 * - 2 本指の拡大：gesturestart を止める（user-scalable=no でも拡大できるため）
 * - スクロール：少しでも残ると押せる位置がずれるので、0 に戻す
 * ボタン・入力欄・リンクの上は止めない（止めると押せなくなる。更新のボタンは LLM-PBI-0012）。
 * タッチの Pointer Events（撃つ操作）は touchstart より先に届くので、止めても撃てる。
 */
const INTERACTIVE = 'button, input, textarea, select, a, label';

/** この要素の上のタッチは、ブラウザの既定の動きのままにするか */
export function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

export function guardTouch(doc: Document = document, win: Window = window): void {
  doc.addEventListener(
    'touchstart',
    (e) => {
      if (!isInteractive(e.target)) e.preventDefault();
    },
    { passive: false },
  );
  doc.addEventListener('gesturestart', (e) => e.preventDefault());

  const resetScroll = () => {
    if (win.scrollX !== 0 || win.scrollY !== 0) win.scrollTo(0, 0);
  };
  win.addEventListener('scroll', resetScroll);
  win.visualViewport?.addEventListener('scroll', resetScroll);
  win.visualViewport?.addEventListener('resize', resetScroll);
  // 文字の入力のあと、キーボードが閉じたときにも戻す（名前の入力は LLM-PBI-0007）
  doc.addEventListener('focusout', resetScroll);
}
