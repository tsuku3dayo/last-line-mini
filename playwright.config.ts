import { defineConfig, devices } from '@playwright/test';
import { CHANNELS } from './channels.mjs';

// E2E は build したプレビュー用の dist を vite preview で動かす（npm run build のあと）
// ポートはこのプロジェクト専用の 4417。Vite の決まりの 4173 は、ほかのプロジェクトのサーバーとぶつかって
// E2E が始められないことがあった（LLM-TASK-0016）。E2E_PORT で変えられる
const PORT = Number(process.env.E2E_PORT ?? 4417);
const BASE_URL = `http://localhost:${PORT}${CHANNELS.preview.base}`;

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
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    // 残っていた別のサーバーを使い回して古い版を試さないように、毎回立てる（ポートがふさがっていればエラー）
    reuseExistingServer: false,
  },
});
