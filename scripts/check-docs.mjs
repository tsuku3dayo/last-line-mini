// 成果物の整合性チェック（TEAM 4.5・LLM-TC-9001-07）。
// 使い方：node scripts/check-docs.mjs [--strict]
//   --strict：プロダクトゴールを確かめるリリースで使う。未実装・未記録も 0 に
import { checkDocs } from './docs-lib.mjs';

const strict = process.argv.includes('--strict');
const errors = checkDocs(process.cwd(), { strict });
if (errors.length > 0) {
  console.error(`check-docs${strict ? '（strict）' : ''}: ${errors.length} 件のエラー`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-docs${strict ? '（strict）' : ''}: OK`);
