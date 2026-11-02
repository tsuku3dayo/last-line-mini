import { registerSW } from 'virtual:pwa-register';

/**
 * Service Worker を登録する（PWA の骨組み）。
 * 新しい版に気づいたときの「更新」ボタン・起動の復旧は LLM-PBI-0012 で足す。
 */
export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW: () => {
      document.body.dataset.sw = 'registered';
    },
    onRegisterError: () => {
      document.body.dataset.sw = 'error';
    },
  });
}
