// アイコン（ドット絵）を PNG に書き出す。外部の画像・道具を使わない。
// 使い方：node scripts/make-icons.mjs  → public/icons/<channel>/icon-{180,192,512}.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// 16 × 16 のドット絵（独自の絵柄：夜空・緑の迎撃の軌跡・爆風の輪・地面と街の灯り）
const ART = [
  'r...............',
  '.r..............',
  '..r.............',
  '...r.yyy........',
  '....yyyyy.......',
  '...yywwwyy......',
  '...yywwwyy......',
  '...yywwwyy......',
  '....yyyyyg......',
  '.....yyy..g.....',
  '...........g....',
  '............g...',
  '..oo.........g..',
  '.oooo..oo.oo..g.',
  'gggggggggggggggg',
  'gggggggggggggggg',
];

const PALETTES = {
  production: { '.': '#05070f', y: '#ff9f1c', w: '#ffe066', g: '#6cff8a', o: '#ffb347', r: '#ff5a3c' },
  // プレビューは背景を紫にして、ホーム画面で本番と見分ける
  preview: { '.': '#2a1450', y: '#ff9f1c', w: '#ffe066', g: '#6cff8a', o: '#ffb347', r: '#ff5a3c' },
};
// 地面の行は緑ではなく地面の色にする
const GROUND = { production: '#2b3b2f', preview: '#3b2b4f' };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, channel) {
  const pal = PALETTES[channel];
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // フィルタ 0 ＋ RGB
    const ay = Math.min(15, Math.floor((y * 16) / size));
    for (let x = 0; x < size; x++) {
      const ax = Math.min(15, Math.floor((x * 16) / size));
      const ch = ART[ay][ax];
      const color = ay >= 14 ? GROUND[channel] : pal[ch];
      const [r, g, b] = hex(color);
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const channel of Object.keys(PALETTES)) {
  const dir = new URL(`../public/icons/${channel}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const size of [180, 192, 512]) {
    writeFileSync(new URL(`icon-${size}.png`, dir), png(size, channel));
  }
  console.log(`public/icons/${channel}/ に 180・192・512 を書いた`);
}
