// 名前（3 文字）の整え方（LLM-PBI-0007、仕様書 §5.1）

/** 名前の長さ */
export const NAME_LENGTH = 3;
/** 空のまま確定したときの名前（LLM-TC-0007-03） */
export const EMPTY_NAME = '...';

/** 打った文字を、使える文字（A〜Z・0〜9・.）の 3 文字までにする。小文字は大文字にし、ほかの文字は捨てる */
export function sanitizeName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, '')
    .slice(0, NAME_LENGTH);
}

/** 確定する名前。空なら `...` */
export const finalName = (raw: string): string => sanitizeName(raw) || EMPTY_NAME;
