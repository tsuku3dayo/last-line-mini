import { describe, expect, it } from 'vitest';
import { bannerVisible, watchForUpdates, type VisibilitySource } from '../../src/app/update';

describe('更新の帯を出す画面（LLM-PBI-0012）', () => {
  it('LLM-TC-0012-01 新しい版を待っているときだけ、タイトルと TOP10 の画面に出す。プレイ中・名前の入力では出さない', () => {
    expect(bannerVisible('title', true)).toBe(true);
    expect(bannerVisible('top10', true)).toBe(true);
    expect(bannerVisible('play', true)).toBe(false);
    expect(bannerVisible('name', true)).toBe(false);
    for (const screen of ['title', 'top10', 'play', 'name']) expect(bannerVisible(screen, false)).toBe(false);
  });
});

/** 見えているかを変えられる偽の Document */
function fakeDoc(initial: string) {
  let listener: (() => void) | null = null;
  const doc: VisibilitySource & { set(state: string): void } = {
    visibilityState: initial,
    addEventListener: (_type, fn) => {
      listener = fn;
    },
    set(state: string) {
      (this as { visibilityState: string }).visibilityState = state;
      listener?.();
    },
  };
  return doc;
}

describe('新しい版を探すきっかけ（LLM-PBI-0012）', () => {
  it('LLM-TC-0012-03 登録の直後と、見えるようになったとき（オンライン）に探す。隠れたとき・オフラインでは探さない', () => {
    let calls = 0;
    const registration = {
      update: () => {
        calls++;
        return Promise.resolve();
      },
    };
    let online = true;
    const doc = fakeDoc('visible');
    watchForUpdates(registration, doc, () => online);
    expect(calls).toBe(1); // 登録の直後

    doc.set('hidden');
    expect(calls).toBe(1); // 隠れたときは探さない
    doc.set('visible');
    expect(calls).toBe(2); // 前に戻ってきたとき

    online = false;
    doc.set('hidden');
    doc.set('visible');
    expect(calls).toBe(2); // オフラインでは探さない
  });

  it('LLM-TC-0012-03 隠れたまま登録されたら、まだ探さない。探すのに失敗しても例外を出さない', async () => {
    let calls = 0;
    const registration = {
      update: () => {
        calls++;
        return Promise.reject(new Error('通信できない'));
      },
    };
    const doc = fakeDoc('hidden');
    watchForUpdates(registration, doc, () => true);
    expect(calls).toBe(0);
    doc.set('visible');
    expect(calls).toBe(1);
    await new Promise((r) => setTimeout(r, 0)); // 失敗の Promise が拾われずに落ちないこと
  });
});
