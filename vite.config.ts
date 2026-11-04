import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { CHANNELS, resolveChannel } from './channels.mjs';

const channel = resolveChannel(process.env.APP_CHANNEL);
const config = CHANNELS[channel];
const ICON_DIR = `icons/${channel}`;
// 画面に出す版。package.json の version を埋め込む（src/vite-env.d.ts）
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
// プレビューの版に付けるコミットの短い番号（LLM-TC-9001-13）。build-pages.sh では origin/main の worktree で build するので、マージのコミットになる
const commit = (() => {
  // CI のコンテナの中（git の履歴がない）では、ワークフローが APP_COMMIT を渡す
  if (process.env.APP_COMMIT) return process.env.APP_COMMIT;
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return ''; // git がないところでは付けない
  }
})();

export default defineConfig({
  base: config.base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_CHANNEL__: JSON.stringify(channel),
    __APP_COMMIT__: JSON.stringify(channel === 'preview' ? commit : ''),
  },
  build: { target: 'es2022' },
  plugins: [
    {
      // index.html の名前・色・アイコンをチャンネルに合わせる
      name: 'channel-html',
      transformIndexHtml: (html) =>
        html
          .replaceAll('%APP_NAME%', config.name)
          .replaceAll('%THEME_COLOR%', config.themeColor)
          // public のファイルの参照は vite が base を付けないので、base 付きで書く
          .replaceAll('%ICON_HREF%', `${config.base}${ICON_DIR}/icon-180.png`),
    },
    VitePWA({
      registerType: 'prompt', // 勝手に切り替えない（更新ボタンは LLM-PBI-0012）
      injectRegister: false, // 登録は src/app/pwa.ts で自分で行う
      manifest: {
        id: config.base,
        name: config.name,
        short_name: config.shortName,
        lang: 'ja',
        start_url: config.base,
        scope: config.base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: config.themeColor,
        icons: [
          { src: `${ICON_DIR}/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${ICON_DIR}/icon-512.png`, sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        cacheId: config.appId,
        // 自分のチャンネルのアイコンだけをキャッシュする
        globPatterns: ['**/*.{html,js,css,svg,webmanifest}', `${ICON_DIR}/*.png`],
        globIgnores: ['prototype/**'],
        // 本番の SW の範囲 /last-line-mini/ はプレビュー /last-line-mini/preview/ を含むので、扱わない（LLM-SA-0001 §2）
        navigateFallbackDenylist: channel === 'production' ? [/\/preview\//, /\/prototype\//] : [/\/prototype\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { include: ['tests/unit/**/*.test.ts'] },
});
