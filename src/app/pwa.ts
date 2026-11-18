import { registerSW } from 'virtual:pwa-register';
import { watchForUpdates } from './update';

export interface Pwa {
  /** 待っている新しい版に切り替えて読み込み直す（「更新」ボタン。LLM-TC-0012-02） */
  applyUpdate(): void;
}

/**
 * Service Worker を登録する（テンプレート §5.9。LLM-PBI-0012）。
 * 新しい版を見つけても勝手に切り替えない（registerType: 'prompt'）。見つけたら onNeedRefresh で知らせ、
 * 「更新」ボタンを押したときだけ applyUpdate で切り替える。
 * 登録の直後と、見えるようになったとき（オンラインのとき）に新しい版を探す。
 */
export function setupPwa(onNeedRefresh: () => void): Pwa {
  if (!('serviceWorker' in navigator)) return { applyUpdate: () => undefined };
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh,
    onRegisteredSW: (_url, registration) => {
      document.body.dataset.sw = 'registered';
      if (registration) watchForUpdates(registration, document, () => navigator.onLine);
    },
    onRegisterError: () => {
      document.body.dataset.sw = 'error';
    },
  });
  return {
    applyUpdate: () => {
      void updateSW(true);
    },
  };
}
