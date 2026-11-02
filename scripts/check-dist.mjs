// build したもの（dist）の検査。テンプレート §6.3 ＋ 原作の名前が入っていないこと（完成の定義）。
// 使い方：node scripts/check-dist.mjs [--channel production|preview] [--dir dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { CHANNELS, resolveChannel } from '../channels.mjs';

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const channel = resolveChannel(argValue('--channel') ?? process.env.APP_CHANNEL);
const dir = argValue('--dir') ?? 'dist';
const config = CHANNELS[channel];

const TEXT_EXT = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt', '.mjs']);
// 通信しない文字列・自分の公開先だけを許す
const ALLOWED_URL_PREFIXES = ['http://www.w3.org/', 'https://tsuku3dayo.github.io/', 'https://bit.ly/wb-precache'];
// 原作の名前・ロゴの文字（LLM-IDK-0001 心配ごと②）
const FORBIDDEN_WORDS = [/missile\s*command/i, /ミサイル\s*コマンド/, /\batari\b/i, /アタリ社/];

const errors = [];
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

if (!existsSync(join(dir, 'index.html'))) {
  console.error(`check-dist: ${dir}/index.html がない（先に npm run build）`);
  process.exit(1);
}

const html = readFileSync(join(dir, 'index.html'), 'utf8');
for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const ref = m[1];
  if (/^(https?:|data:|#)/.test(ref)) continue;
  if (!ref.startsWith(config.base)) errors.push(`index.html の参照が base（${config.base}）で始まらない: ${ref}`);
  // プレビューの base は本番の base の下にあるので、本番ではプレビューを指していないことも見る
  if (channel === 'production' && ref.startsWith(CHANNELS.preview.base)) errors.push(`index.html の参照がプレビューを指している: ${ref}`);
}
const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
if (title !== config.name) errors.push(`<title> が ${config.name} でない: ${title}`);
if (!html.includes(`content="${config.name}"`)) errors.push(`apple-mobile-web-app-title が ${config.name} でない`);

for (const file of walk(dir)) {
  if (!TEXT_EXT.has(extname(file))) continue;
  const text = readFileSync(file, 'utf8');
  const rel = relative(dir, file);
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
    if (!ALLOWED_URL_PREFIXES.some((p) => m[0].startsWith(p))) errors.push(`${rel}: 外部の URL: ${m[0]}`);
  }
  for (const re of FORBIDDEN_WORDS) {
    if (re.test(text)) errors.push(`${rel}: 原作の名前に当たる文字: ${re}`);
  }
}

if (errors.length > 0) {
  console.error(`check-dist（${channel}）: ${errors.length} 件のエラー`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-dist（${channel}）: OK`);
