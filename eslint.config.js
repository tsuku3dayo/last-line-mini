import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 層の決まり（LLM-SA-0001 §3・テンプレート §3）。破るとエラーにする。
const CORE_FORBIDDEN_GLOBALS = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'performance', 'requestAnimationFrame', 'Date']
  .map((name) => ({ name, message: 'src/core は DOM・時刻に触れない' }));

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'prototype/', 'playwright-report/', 'test-results/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { files: ['scripts/**/*.mjs', '*.config.{js,ts}', 'channels.mjs'], languageOptions: { globals: globals.node } },
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
  { files: ['public/**/*.js'], languageOptions: { globals: globals.browser, sourceType: 'script', ecmaVersion: 5 } },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...CORE_FORBIDDEN_GLOBALS],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'src/core は乱数を使わない（種から作る）' }],
      'no-restricted-imports': ['error', { patterns: [{ group: ['../*'], message: 'src/core は外を import しない' }] }],
    },
  },
  {
    files: ['src/render/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['../app/*', '../storage/*'], message: 'render は app・storage を import しない' }] }] },
  },
  {
    files: ['src/storage/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['../core/*', '../render/*', '../app/*'], message: 'storage はほかの層を import しない' }] }] },
  },
);
