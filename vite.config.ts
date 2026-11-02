import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { CHANNELS, resolveChannel } from './channels.mjs';

const channel = resolveChannel(process.env.APP_CHANNEL);
const config = CHANNELS[channel];
// 画面に出す版。package.json の version を埋め込む（src/vite-env.d.ts）
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: config.base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_CHANNEL__: JSON.stringify(channel),
  },
  build: { target: 'es2022' },
  plugins: [
    {
      // index.html の名前・色をチャンネルに合わせる
      name: 'channel-html',
      transformIndexHtml: (html) =>
        html.replaceAll('%APP_NAME%', config.name).replaceAll('%THEME_COLOR%', config.themeColor),
    },
  ],
  test: { include: ['tests/unit/**/*.test.ts'] },
});
