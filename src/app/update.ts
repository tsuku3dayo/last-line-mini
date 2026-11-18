/**
 * 新しい版の扱いの決まり（LLM-PBI-0012・LLM-GUI-0003 §5。テンプレート §5.9）。DOM と SW に触れない部分だけをここに置き、単体テストで確かめる。
 */

/** 更新の帯を出す画面（遊んでいない画面だけ。プレイ中・終わりの表示・名前の入力では出さない） */
const IDLE_SCREENS: readonly string[] = ['title', 'top10'];

/** 更新の帯を出すか：待っている新しい版があり、今の画面がタイトルか TOP10 のとき（LLM-TC-0012-01） */
export function bannerVisible(screen: string, waiting: boolean): boolean {
  return waiting && IDLE_SCREENS.includes(screen);
}

/** 新しい版を探せるもの（ServiceWorkerRegistration の一部） */
export interface Updatable {
  update(): Promise<unknown>;
}

/** 見えているかを知らせるもの（Document の一部） */
export interface VisibilitySource {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

/**
 * 登録の直後と、見えるようになったとき（オンラインのとき）に新しい版を探す（LLM-TC-0012-03）。
 * iPhone のホーム画面のアプリは前に戻ってきても読み込み直さないので、これがないと新しい版に気づかない。
 * 探すのに失敗しても（通信が切れたなど）何もしない。次に見えたときにまた探す
 */
export function watchForUpdates(registration: Updatable, doc: VisibilitySource, isOnline: () => boolean): void {
  const check = () => {
    if (doc.visibilityState !== 'visible' || !isOnline()) return;
    registration.update().catch(() => undefined);
  };
  check();
  doc.addEventListener('visibilitychange', check);
}
