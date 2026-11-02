// 文書の版を上げ、下流の sources の版の表記をそろえる（TEAM 2.4・LLM-TC-9001-08）。
// 使い方：node scripts/bump-version.mjs <ID> [--dry-run]
//   承認のある種類は status: review・verified: null に戻る（再承認が要る）
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { bumpVersion } from './docs-lib.mjs';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('使い方：node scripts/bump-version.mjs <ID> [--dry-run]');
  process.exit(1);
}
const dry = process.argv.includes('--dry-run');
const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const { from, to, changed } = bumpVersion(process.cwd(), id, { today });
console.log(`${id}: v${from} → v${to}${dry ? '（dry-run）' : ''}`);
for (const [file, text] of changed) {
  console.log(`  ${relative(process.cwd(), file)}`);
  if (!dry) writeFileSync(file, text, 'utf8');
}
