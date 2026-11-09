/**
 * 一時的な診断（LLM-TASK-0030。TEAM 3.5：実機で原因が分からないときは、画面に状態を出して記録を見る）。
 * `?debug=1` のときだけ、画面の切り替え・触った・クリック・入力欄に入った／出た・ページの読み込み直し・エラーを
 * 新しい順に画面の左上に出す。ページを読み込み直しても残るよう sessionStorage に置く。
 * PBI-0007 を完成にする前に外す。
 */
const KEY = 'llm-diag';
const MAX = 14;

let el: HTMLElement | null = null;

function read(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function show(lines: string[]): void {
  if (el) el.textContent = lines.join('\n');
}

export function diag(message: string): void {
  if (!el) return;
  const t = new Date();
  const stamp = `${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(t.getMilliseconds()).padStart(3, '0')}`;
  const lines = [`${stamp} ${message}`, ...read()].slice(0, MAX);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // 保存できなくても画面には出す
  }
  show(lines);
}

const describe = (t: EventTarget | null): string => (t instanceof Element ? (t.id ? `#${t.id}` : t.tagName.toLowerCase()) : String(t));

/** 診断を始める（`?debug=1` のときだけ呼ぶ） */
export function startDiag(stage: HTMLElement, screen: () => string): void {
  el = document.createElement('pre');
  el.id = 'debug-diag';
  stage.append(el);
  diag(`起動 ${location.pathname}${location.search}`);
  window.addEventListener('pointerdown', (e) => diag(`pointerdown ${e.pointerType} ${describe(e.target)} 画面=${screen()}`), true);
  window.addEventListener('click', (e) => diag(`click ${describe(e.target)} 画面=${screen()}`), true);
  document.addEventListener('focusin', (e) => diag(`focusin ${describe(e.target)}`));
  document.addEventListener('focusout', (e) => diag(`focusout ${describe(e.target)}`));
  document.addEventListener('submit', (e) => diag(`submit ${describe(e.target)}`), true);
  window.addEventListener('beforeunload', () => diag('beforeunload（読み込み直し・離れる）'));
  window.addEventListener('pagehide', () => diag('pagehide'));
  document.addEventListener('visibilitychange', () => diag(`visibility ${document.visibilityState}`));
  window.addEventListener('error', (e) => diag(`error ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => diag(`rejection ${String(e.reason)}`));
}
