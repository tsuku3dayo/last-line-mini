// README の検査（LLM-TC-0013-01・04。LLM-PBI-0013）。check-docs.mjs が呼ぶ。
// - 決まった見出しがある（遊ぶ場所・遊び方・動作を確かめた端末・気をつけること・新しい版と困ったとき・クレジット・使った道具）
// - ライセンスの見出しを置かない（PO の決定、2026-11-18：「ライセンスは記載しない」）
// - 原作の名前がない（LLM-IDK-0001 心配ごと②）
// - クレジット（役割と名前）と使った道具（名前・ライセンス・著作権の行）が、ゲームのクレジットのデータと同じ
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FORBIDDEN_WORDS } from './forbidden-words.mjs';

export const README_HEADINGS = [
  '## 遊ぶ場所',
  '## 遊び方',
  '## 動作を確かめた端末',
  '## 気をつけること',
  '## 新しい版と困ったとき',
  '## クレジット',
  '## 使った道具（権利）',
];

/**
 * @param {string} root リポジトリの一番上
 * @param {{ roles: readonly { role: string; name: string }[]; tools: readonly { name: string; license: string; copyright: string }[] }} credits
 * @returns {string[]} エラー
 */
export function checkReadme(root, credits) {
  const path = join(root, 'README.md');
  if (!existsSync(path)) return ['README.md がない'];
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  const errors = [];
  for (const h of README_HEADINGS) {
    if (!lines.includes(h)) errors.push(`README.md に見出し「${h}」がない`);
  }
  for (const line of lines) {
    if (/^#+\s.*(ライセンス|license)/i.test(line)) errors.push(`README.md にライセンスの見出しがある（置かない決まり）: ${line}`);
  }
  for (const re of FORBIDDEN_WORDS) {
    if (re.test(text)) errors.push(`README.md に原作の名前に当たる文字: ${re}`);
  }
  for (const { role, name } of credits.roles) {
    if (!lines.some((l) => l.startsWith(`| ${role} | ${name} |`))) errors.push(`README.md のクレジットに「${role}｜${name}」の行がない`);
  }
  for (const t of credits.tools) {
    if (!lines.some((l) => l.startsWith(`| ${t.name} | ${t.license} | ${t.copyright} |`))) errors.push(`README.md の使った道具に「${t.name}」の行がない（名前・ライセンス・著作権の行をクレジットのデータとそろえる）`);
  }
  return errors;
}
