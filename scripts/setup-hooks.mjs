// npm install のときに、Git のフックの置き場所を .githooks にする（package.json の prepare）。
// git の履歴がない所（CI の Playwright のコンテナなど）では何もしない（npm install を止めない）。
import { execSync } from 'node:child_process';

try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  console.log('setup-hooks: .githooks を有効にした');
} catch {
  console.log('setup-hooks: git の履歴がないので、フックは有効にしない');
}
