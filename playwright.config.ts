import { defineConfig, devices } from '@playwright/test';
import { CHANNELS } from './channels.mjs';

// E2E は build したプレビュー用の dist を vite preview で動かす（npm run build のあと）
const BASE_URL = `http://localhost:4173${CHANNELS.preview.base}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'pc-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'iphone11-webkit', use: { ...devices['iPhone 11'] } },
    { name: 'iphonese-webkit', use: { ...devices['iPhone SE (3rd gen)'] } }, // 'iPhone SE' は第 1 世代（320 × 568）
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: BASE_URL,
    // 残っていた別のサーバーを使い回して古い版を試さないように、毎回立てる（ポートがふさがっていればエラー）
    reuseExistingServer: false,
  },
});
