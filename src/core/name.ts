// 名前（日本語も・8 文字まで）の整え方（LLM-PBI-0020、仕様書 v1.2 §5.1）

/** 名前の長さ（見た目の 1 文字を 1 文字と数える） */
export const NAME_LENGTH = 8;
/** 空のまま確定したときの名前（LLM-TC-0007-03・LLM-TC-0020-02） */
export const EMPTY_NAME = '...';

/** 見た目の 1 文字（書記素）に分ける。結合文字・異体字セレクタ・絵文字の並びも 1 つにまとまる */
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
const graphemes = (s: string): string[] => Array.from(segmenter.segment(s), (g) => g.segment);

/**
 * 使える 1 文字（LLM-TC-0020-01）：ひらがな・カタカナ（半角も）・漢字・長音、英字・数字（半角・全角）、記号。
 * 記号は句読点・記号の類の 1 字のうち、絵文字として出るもの（Emoji_Presentation と U+1F000 から先）を除く。
 * ★・♪ のような文字の記号は使える。異体字セレクタ・つなぎ（ZWJ）の付いた並びは 1 字でないので、それだけで外れる。
 * 空白・制御文字・ほかの文字は使えない
 */
const KANA_KANJI = /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー〜ｰ゛゜]$/u;
const ALNUM = /^[A-Za-z0-9Ａ-Ｚａ-ｚ０-９]$/u;
const SYMBOL = /^[\p{P}\p{S}]$/u;
const PICTOGRAPHIC = /[\p{Emoji_Presentation}\u{1F000}-\u{1FFFF}]/u;

export function isNameChar(ch: string): boolean {
  if (KANA_KANJI.test(ch) || ALNUM.test(ch)) return true;
  return SYMBOL.test(ch) && !PICTOGRAPHIC.test(ch);
}

/**
 * 打った文字を、使える文字の 8 文字までにする（LLM-TC-0020-01・02）。英字の大文字・小文字はそのまま。
 * 濁点が分かれて入った字（か ＋ ゛の結合文字）は NFC で 1 文字にまとめてから数える。使えない文字は捨て、捨てた文字は数えない
 */
export function sanitizeName(raw: string): string {
  return graphemes(raw.normalize('NFC'))
    .filter(isNameChar)
    .slice(0, NAME_LENGTH)
    .join('');
}

/** 確定する名前。空なら `...` */
export const finalName = (raw: string): string => sanitizeName(raw) || EMPTY_NAME;

/** 保存してよい名前か（LLM-TC-0020-05）：`...`、または整えても変わらない 1〜8 文字。今までの英字 3 文字もこれに合う */
export const isValidName = (name: string): boolean => name === EMPTY_NAME || (name.length > 0 && sanitizeName(name) === name);
