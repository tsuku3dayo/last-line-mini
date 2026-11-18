import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CREDIT_ROLES,
  MIT_LICENSE_TEXT,
  THIRD_PARTY,
  creditButtonVisible,
  packageOfModuleId,
  uncreditedPackages,
} from '../../src/app/credits';

/** LICENSE の文の空白・改行を 1 つの空白にそろえる（本文は段落ごとに 1 行で持っているため） */
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('クレジットの中身（LLM-PBI-0013）', () => {
  it('LLM-TC-0013-03 役割と名前は PO の決定の 6 つを、例の並びのまま持つ', () => {
    expect(CREDIT_ROLES).toEqual([
      { role: 'PRODUCER', name: 'つくだ よしはる' },
      { role: 'DIRECTOR', name: 'つくだ よしはる' },
      { role: 'GAME DESIGNER', name: 'つくだ よしはる' },
      { role: 'GRAPHIC DESIGNER', name: 'CLAUDE CODE' },
      { role: 'SOUND CREATOR', name: 'CLAUDE CODE' },
      { role: 'PROGRAMMER', name: 'CLAUDE CODE' },
    ]);
  });

  it('LLM-TC-0013-04 道具の著作権の行と MIT License の本文は、各パッケージの LICENSE の文と同じ', () => {
    expect(THIRD_PARTY.map((t) => t.name)).toEqual(['Vite', 'vite-plugin-pwa', 'Workbox']);
    for (const t of THIRD_PARTY) {
      expect(t.license).toBe('MIT License');
      for (const pkg of t.packages) {
        const file = pkg === 'vite' ? 'LICENSE.md' : 'LICENSE';
        const text = flat(readFileSync(`node_modules/${pkg}/${file}`, 'utf8'));
        expect(text, pkg).toContain(t.copyright);
        for (const para of MIT_LICENSE_TEXT) expect(text, pkg).toContain(para);
      }
    }
  });

  it('LLM-TC-0013-04 dist に外の URL を入れない（著作権の行に URL を書かない）', () => {
    for (const t of THIRD_PARTY) expect(t.copyright).not.toMatch(/https?:/);
  });
});

describe('「クレジット」ボタンを出す画面（LLM-PBI-0013）', () => {
  it('LLM-TC-0013-02 タイトルにだけ出す', () => {
    expect(creditButtonVisible('title')).toBe(true);
    for (const screen of ['top10', 'play', 'name', 'credits']) expect(creditButtonVisible(screen)).toBe(false);
  });
});

describe('dist に入る道具とクレジットの突き合わせ（LLM-PBI-0013）', () => {
  const root = 'C:\\work\\game';

  it('LLM-TC-0013-04 モジュールの ID から npm のパッケージを出す。自分のコードは数えない', () => {
    expect(packageOfModuleId('C:/work/game/node_modules/workbox-window/build/workbox-window.prod.es5.mjs', root)).toBe('workbox-window');
    expect(packageOfModuleId('/home/ci/game/node_modules/@scope/pkg/index.js', '/home/ci/game')).toBe('@scope/pkg');
    expect(packageOfModuleId('\0vite/preload-helper.js', root)).toBe('vite');
    expect(packageOfModuleId('/@vite-plugin-pwa/virtual:pwa-register', root)).toBe('vite-plugin-pwa');
    expect(packageOfModuleId('C:/work/game/src/main.ts', root)).toBeNull();
    expect(packageOfModuleId('C:/work/game/index.html', root)).toBeNull();
    expect(packageOfModuleId('\0some-plugin/helper', root)).toBe('?\0some-plugin/helper');
  });

  it('LLM-TC-0013-04 クレジットに載っていない道具を見つける', () => {
    expect(uncreditedPackages(['vite', 'vite-plugin-pwa', 'workbox-window', 'vite'])).toEqual([]);
    expect(uncreditedPackages(['vite', 'left-pad', '?\0x'])).toEqual(['?\0x', 'left-pad']);
  });
});
