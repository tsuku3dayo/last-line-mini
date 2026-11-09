import { describe, expect, it } from 'vitest';
import { EMPTY_NAME, finalName, NAME_LENGTH, sanitizeName } from '../../src/core/name';
import { GLYPHS } from '../../src/render/font';

describe('名前の入力（LLM-PBI-0007）', () => {
  it('LLM-TC-0007-02 決まった値：3 文字まで、空なら ...', () => {
    expect(NAME_LENGTH).toBe(3);
    expect(EMPTY_NAME).toBe('...');
  });

  it('LLM-TC-0007-02 A〜Z・0〜9・. はそのまま。小文字は大文字に', () => {
    expect(sanitizeName('AB.')).toBe('AB.');
    expect(sanitizeName('z9')).toBe('Z9');
    expect(sanitizeName('a.b')).toBe('A.B');
  });

  it('LLM-TC-0007-02 ほかの文字（記号・空白・かな・全角）は入らない', () => {
    expect(sanitizeName('a!b')).toBe('AB');
    expect(sanitizeName(' a b ')).toBe('AB');
    expect(sanitizeName('あいう')).toBe('');
    expect(sanitizeName('ＡＢＣ')).toBe(''); // 全角の英字
    expect(sanitizeName('-_@')).toBe('');
  });

  it('LLM-TC-0007-02 3 文字まで（4 文字目からは入らない）', () => {
    expect(sanitizeName('ABC')).toBe('ABC');
    expect(sanitizeName('ABCD')).toBe('ABC');
    expect(sanitizeName('a!bcd')).toBe('ABC'); // 捨てた文字は数えない
  });

  it('LLM-TC-0007-03 確定する名前：空（使えない文字だけも）なら ...', () => {
    expect(finalName('')).toBe('...');
    expect(finalName('!!')).toBe('...');
    expect(finalName('yo')).toBe('YO');
  });

  it('LLM-TC-0007-02 使える文字は、すべて自前の文字に形がある（TOP10 に出せる）', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.') expect(GLYPHS[ch], ch).toBeDefined();
  });
});
