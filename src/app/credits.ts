/**
 * クレジットの中身（LLM-PBI-0013・LLM-GUI-0003 §7）。画面（credits-screen.ts）・build の検査（vite.config.ts）・
 * dist の検査（scripts/check-dist.mjs）・README の検査（LLM-TASK-0045）は、どれもこのデータを使う。DOM に触れない。
 */

/** 役割と名前。PO の決定（2026-11-18：「例のとおり 6 つすべて」）の並びのまま */
export const CREDIT_ROLES: readonly { readonly role: string; readonly name: string }[] = [
  { role: 'PRODUCER', name: 'つくだ よしはる' },
  { role: 'DIRECTOR', name: 'つくだ よしはる' },
  { role: 'GAME DESIGNER', name: 'つくだ よしはる' },
  { role: 'GRAPHIC DESIGNER', name: 'CLAUDE CODE' },
  { role: 'SOUND CREATOR', name: 'CLAUDE CODE' },
  { role: 'PROGRAMMER', name: 'CLAUDE CODE' },
];

/**
 * 公開する版（dist）に入る外の道具。packages は、その道具に当たる npm のパッケージの名前（build の検査で、
 * dist に入ったパッケージがどれかの packages にあることを確かめる）。著作権の行は各パッケージの LICENSE の文のまま
 */
export const THIRD_PARTY: readonly {
  readonly name: string;
  readonly packages: readonly string[];
  readonly license: string;
  readonly copyright: string;
}[] = [
  {
    name: 'Vite',
    packages: ['vite'],
    license: 'MIT License',
    copyright: 'Copyright (c) 2019-present, VoidZero Inc. and Vite contributors',
  },
  {
    name: 'vite-plugin-pwa',
    packages: ['vite-plugin-pwa'],
    license: 'MIT License',
    // LICENSE の行の終わりの URL は外す（dist に外の URL を入れない決まり。check-dist）
    copyright: 'Copyright (c) 2020-PRESENT Anthony Fu',
  },
  {
    name: 'Workbox',
    // workbox-window はアプリの中、ほかは Service Worker（sw.js・workbox-*.js）の中
    packages: ['workbox-window', 'workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies'],
    license: 'MIT License',
    copyright: 'Copyright 2018 Google LLC',
  },
];

/** MIT License の本文（英語の原文のまま。段落ごとに 1 行） */
export const MIT_LICENSE_TEXT: readonly string[] = [
  'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:',
  'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
];

/** 「クレジット」ボタンを出す画面（タイトルだけ。LLM-TC-0013-02） */
export function creditButtonVisible(screen: string): boolean {
  return screen === 'title';
}

/**
 * build に入ったモジュールの ID から、npm のパッケージの名前を出す（LLM-TC-0013-04）。
 * 自分のコード（src・index.html）は null。分からないものは '?' 付きで返す（検査で止めて、クレジットを見直すため）
 */
export function packageOfModuleId(id: string, root: string): string | null {
  const path = id.split('\\').join('/');
  const nm = /\/node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(path);
  if (nm?.[1]) return nm[1];
  if (path.startsWith('\0vite/')) return 'vite'; // Vite が足す小さな助け（modulepreload など）
  if (path.includes('virtual:pwa-register')) return 'vite-plugin-pwa'; // SW の登録（virtual:pwa-register）
  const rootPath = root.split('\\').join('/');
  if (path.startsWith(`${rootPath}/src/`) || path === `${rootPath}/index.html`) return null;
  return `?${path}`;
}

/** パッケージがクレジットのどの道具にも載っていなければ、その名前を返す */
export function uncreditedPackages(packages: Iterable<string>): string[] {
  const known = new Set(THIRD_PARTY.flatMap((t) => t.packages));
  return [...new Set(packages)].filter((p) => !known.has(p)).sort();
}
