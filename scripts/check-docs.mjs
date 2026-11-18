// 成果物の整合性チェック（TEAM 4.5・LLM-TC-9001-07）。
// 使い方：node scripts/check-docs.mjs [--strict]
//   --strict：プロダクトゴールを確かめるリリースで使う。未実装・未記録も 0 に
//   README の検査（LLM-TC-0013-01・04）も行う。クレジットのデータはゲームの画面と同じもの（Node 24 は .ts の型を外して読める）
import { checkDocs } from './docs-lib.mjs';
import { checkReadme } from './readme-lib.mjs';
import { CREDIT_ROLES, THIRD_PARTY } from '../src/app/credits.ts';

const strict = process.argv.includes('--strict');
const errors = [...checkDocs(process.cwd(), { strict }), ...checkReadme(process.cwd(), { roles: CREDIT_ROLES, tools: THIRD_PARTY })];
if (errors.length > 0) {
  console.error(`check-docs${strict ? '（strict）' : ''}: ${errors.length} 件のエラー`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-docs${strict ? '（strict）' : ''}: OK`);
