import { describe, expect, it } from 'vitest';
import { formatVersion } from '../../src/app/version';
import { CHANNELS, resolveChannel } from '../../channels.mjs';

describe('画面の版と、本番・プレビューの分け方', () => {
  it('LLM-TC-9001-01 プレビューの版には β が付き、本番には付かない', () => {
    expect(formatVersion('0.1.0', 'preview')).toBe('v0.1.0 β');
    expect(formatVersion('0.1.0', 'production')).toBe('v0.1.0');
  });

  it('LLM-TC-9001-13 プレビューの版にはコミットの短い番号が付き、本番には付かない', () => {
    expect(formatVersion('0.1.0', 'preview', 'aefcdbd')).toBe('v0.1.0 β aefcdbd');
    expect(formatVersion('0.1.0', 'production', 'aefcdbd')).toBe('v0.1.0');
  });

  it('LLM-TC-9001-01 APP_CHANNEL の指定がなければプレビュー、知らない値はエラー', () => {
    expect(resolveChannel(undefined)).toBe('preview');
    expect(resolveChannel('production')).toBe('production');
    expect(() => resolveChannel('prod')).toThrow();
  });

  it('LLM-TC-9001-01 本番とプレビューは base・アプリ識別子・名前が違う', () => {
    const p = CHANNELS.production;
    const v = CHANNELS.preview;
    expect(p.base).toBe('/last-line-mini/');
    expect(v.base).toBe('/last-line-mini/preview/');
    expect(p.appId).not.toBe(v.appId);
    expect(p.name).not.toBe(v.name);
  });
});
