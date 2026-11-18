// build したもの（dist）の検査。テンプレート §6.3 ＋ 原作の名前が入っていないこと（完成の定義）。
// LLM-TC-9001-03（base・外部の URL・原作の名前）、LLM-TC-9001-04（チャンネルごとの名前・アイコン・キャッシュ名）、
// LLM-TC-9001-05（本番の SW はプレビューを扱わない）、LLM-TC-0013-04（クレジットと外の道具の権利の表記）
// 使い方：node scripts/check-dist.mjs [--channel production|preview] [--dir dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { CHANNELS, resolveChannel } from '../channels.mjs';
// クレジットのデータは画面と同じものを使う（Node 24 は .ts の型を外して読める）
import { CREDIT_ROLES, MIT_LICENSE_TEXT, THIRD_PARTY } from '../src/app/credits.ts';

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

// 起動の復旧（LLM-TC-0012-05）：boot.js があり、index.html がアプリ本体（モジュール）より先に読む。チャンネルの値を渡している
const bootAt = html.indexOf(`src="${config.base}boot.js"`);
const moduleAt = html.search(/<script type="module"/);
if (!existsSync(join(dir, 'boot.js'))) errors.push('boot.js がない');
if (bootAt < 0) errors.push(`index.html が ${config.base}boot.js を読んでいない`);
else if (moduleAt >= 0 && bootAt > moduleAt) errors.push('index.html が boot.js をアプリ本体より後に読んでいる');
if (!html.includes(`data-app-id="${config.appId}"`)) errors.push(`boot.js に app-id（${config.appId}）を渡していない`);
if (!html.includes(`data-scope="${config.base}"`)) errors.push(`boot.js に範囲（${config.base}）を渡していない`);

// PWA（LLM-TC-9001-04・05）
const iconDir = `${config.base}icons/${channel}/`;
if (!html.includes(`href="${iconDir}icon-180.png"`)) errors.push(`apple-touch-icon が ${iconDir}icon-180.png でない`);
const manifestPath = join(dir, 'manifest.webmanifest');
if (!existsSync(manifestPath)) {
  errors.push('manifest.webmanifest がない');
} else {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expect = { name: config.name, short_name: config.shortName, scope: config.base, start_url: config.base, id: config.base };
  for (const [k, v] of Object.entries(expect)) {
    if (m[k] !== v) errors.push(`manifest の ${k} が ${v} でない: ${m[k]}`);
  }
  for (const icon of m.icons ?? []) {
    if (!String(icon.src).startsWith(`icons/${channel}/`)) errors.push(`manifest のアイコンがチャンネル（${channel}）のものでない: ${icon.src}`);
    if (!existsSync(join(dir, icon.src))) errors.push(`manifest のアイコンがない: ${icon.src}`);
  }
}
const swPath = join(dir, 'sw.js');
if (!existsSync(swPath)) {
  errors.push('sw.js がない');
} else {
  const sw = readFileSync(swPath, 'utf8');
  if (!sw.includes(`"${config.appId}"`)) errors.push(`sw.js のキャッシュ名に ${config.appId} が入っていない`);
  // ほかのチャンネルのアイコンをキャッシュしない
  const other = channel === 'production' ? 'preview' : 'production';
  if (sw.includes(`icons/${other}/`)) errors.push(`sw.js が ${other} のアイコンをキャッシュしている`);
  // 本番の SW はプレビューのページを扱わない（LLM-SA-0001 §2）
  if (channel === 'production' && !sw.includes('\\/preview\\/')) errors.push('本番の sw.js の navigateFallbackDenylist に /preview/ がない');
}

// クレジット（LLM-TC-0013-04）：役割と名前・外の道具の名前と著作権の行・MIT License の本文が、アプリの JS に入っている。
// どの道具が dist に入るかとクレジットとの突き合わせは build のとき（vite.config.ts の third-party-credits）。
// Service Worker（sw.js・workbox-*.js）の中の Workbox は build の突き合わせに出てこないので、ここで Workbox が載っていることを見る
const appJs = walk(join(dir, 'assets')).filter((f) => extname(f) === '.js').map((f) => readFileSync(f, 'utf8')).join('\n');
const creditTexts = [
  ...CREDIT_ROLES.flatMap((c) => [c.role, c.name]),
  ...THIRD_PARTY.flatMap((t) => [t.name, t.license, t.copyright]),
  // 本文は引用符（"Software" など）が JS の書き方で変わることがあるので、引用符のない段落と最初の文の頭で見る
  MIT_LICENSE_TEXT[1],
  MIT_LICENSE_TEXT[0].slice(0, 60),
];
for (const text of creditTexts) {
  if (!appJs.includes(text)) errors.push(`アプリの JS にクレジットの文がない: ${text}`);
}
const usesWorkbox = readdirSync(dir).some((n) => /^workbox-.*\.js$/.test(n)) || (existsSync(swPath) && readFileSync(swPath, 'utf8').includes('workbox'));
if (usesWorkbox && !THIRD_PARTY.some((t) => t.packages.includes('workbox-core'))) errors.push('Service Worker に Workbox が入るのに、クレジットに workbox-core がない');

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
