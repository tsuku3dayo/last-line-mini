import { describe, expect, it } from 'vitest';
import { EMPTY_NAME, finalName, isNameChar, isValidName, NAME_LENGTH, sanitizeName } from '../../src/core/name';

// LLM-TC-0007-02（A〜Z・0〜9・. の 3 文字）は、2026-11-12 から LLM-TC-0020-01・02 に置き換わった（LLM-PBI-0020）
describe('名前の入力（LLM-PBI-0007・0020）', () => {
  it('LLM-TC-0020-02 決まった値：8 文字まで、空なら ...', () => {
    expect(NAME_LENGTH).toBe(8);
    expect(EMPTY_NAME).toBe('...');
  });

  it('LLM-TC-0020-01 ひらがな・カタカナ・漢字・長音はそのまま入る', () => {
    expect(sanitizeName('やまだ')).toBe('やまだ');
    expect(sanitizeName('タロウ')).toBe('タロウ');
    expect(sanitizeName('山田太郎')).toBe('山田太郎');
    expect(sanitizeName('ルーシー')).toBe('ルーシー');
    expect(sanitizeName('佐々木')).toBe('佐々木');
    expect(sanitizeName('ﾀﾛｳ')).toBe('ﾀﾛｳ'); // 半角カタカナ
  });

  it('LLM-TC-0020-01 英字は大文字も小文字もそのまま、数字は半角・全角とも入る', () => {
    expect(sanitizeName('Taro')).toBe('Taro');
    expect(sanitizeName('AAA')).toBe('AAA');
    expect(sanitizeName('ＡＢｃ１２')).toBe('ＡＢｃ１２');
    expect(sanitizeName('z9')).toBe('z9');
  });

  it('LLM-TC-0020-01 記号は入る（. - _ ! ? ・ 〜 ★ など）', () => {
    expect(sanitizeName('A.B')).toBe('A.B');
    expect(sanitizeName('-_!?')).toBe('-_!?');
    expect(sanitizeName('た・ろ〜')).toBe('た・ろ〜');
    expect(sanitizeName('★！')).toBe('★！');
  });

  it('LLM-TC-0020-01 絵文字・空白・制御文字・ほかの文字は入らない', () => {
    expect(sanitizeName('た😀ろ')).toBe('たろ');
    expect(sanitizeName('👨‍👩‍👧')).toBe(''); // つないだ絵文字
    expect(sanitizeName('❤️')).toBe(''); // 異体字セレクタ付き
    expect(sanitizeName('🀄⌚')).toBe(''); // 絵文字として出る記号
    expect(sanitizeName(' た　ろ ')).toBe('たろ'); // 半角・全角の空白
    expect(sanitizeName('a\tb\n')).toBe('ab');
    expect(sanitizeName('안녕')).toBe(''); // 日本語・英数字でない文字
    expect(sanitizeName('é')).toBe(''); // 英字の 26 文字でない
  });

  it('LLM-TC-0020-02 見た目の 1 文字を 1 文字として 8 文字まで（9 文字目からは入らない）', () => {
    expect(sanitizeName('あいうえおかきく')).toBe('あいうえおかきく');
    expect(sanitizeName('あいうえおかきくけ')).toBe('あいうえおかきく');
    expect(sanitizeName('ABCDEFGHIJ')).toBe('ABCDEFGH');
    expect(sanitizeName('た😀ろうたろうたろう')).toBe('たろうたろうたろ'); // 捨てた文字は数えない
    // 濁点が分かれて入った字（か ＋ 結合の濁点）は 1 文字にまとめる
    expect(sanitizeName('が')).toBe('が');
    expect([...sanitizeName('が'.repeat(9))]).toHaveLength(8);
    // 𠮷（サロゲートペアの漢字）も 1 文字
    expect(sanitizeName('𠮷'.repeat(9))).toBe('𠮷'.repeat(8));
  });

  it('LLM-TC-0020-02 確定する名前：空（使えない文字だけも）なら ...', () => {
    expect(finalName('')).toBe('...');
    expect(finalName('😀 ')).toBe('...');
    expect(finalName('やまだ')).toBe('やまだ');
    expect(finalName('yo')).toBe('yo');
  });

  it('LLM-TC-0020-05 保存してよい名前：今までの英字 3 文字・... と、新しい 8 文字までの名前', () => {
    for (const n of ['AAA', 'B.C', 'A', '...', 'やまだたろう', '山田太郎ABCD', 'Taro']) expect(isValidName(n), n).toBe(true);
    for (const n of ['', ' ', 'あいうえおかきくけ', 'た😀', 'a b', '안녕']) expect(isValidName(n), n).toBe(false);
  });

  it('LLM-TC-0020-01 1 文字の判定', () => {
    expect(isNameChar('あ')).toBe(true);
    expect(isNameChar('ー')).toBe(true);
    expect(isNameChar(' ')).toBe(false);
    expect(isNameChar('😀')).toBe(false);
  });
});
