// 本番とプレビューの違いを、ここ 1 か所にまとめる（LLM-SA-0001 §2）。
// vite.config.ts・scripts/check-dist.mjs・playwright.config.ts が読む。

export const REPO = 'last-line-mini';

/** @typedef {'production' | 'preview'} Channel */

/** @type {Record<Channel, { base: string; appId: string; name: string; shortName: string; versionSuffix: string; themeColor: string }>} */
export const CHANNELS = {
  production: {
    base: `/${REPO}/`,
    appId: 'last-line-mini',
    name: '最終防衛線ミニ',
    shortName: '最終防衛線ミニ',
    versionSuffix: '',
    themeColor: '#05070f',
  },
  preview: {
    base: `/${REPO}/preview/`,
    appId: 'last-line-mini-preview',
    name: '最終防衛線ミニβ',
    shortName: '防衛線ミニβ',
    versionSuffix: ' β',
    themeColor: '#1a0f2e',
  },
};

/**
 * build の対象。環境変数 APP_CHANNEL で選ぶ。指定がなければプレビュー（本番はリリースのときだけ）。
 * @param {string | undefined} value
 * @returns {Channel}
 */
export function resolveChannel(value) {
  if (value === undefined || value === '' || value === 'preview') return 'preview';
  if (value === 'production') return 'production';
  throw new Error(`APP_CHANNEL は production か preview: ${value}`);
}
