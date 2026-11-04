// 手元で main に直接コミットさせない（スプリント 02 のレトロの案 1・LLM-TC-9001-15）。
// .githooks/pre-commit から呼ばれる。作業は必ず作業ブランチで行い、main には PR のマージで入れる。
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** 守るブランチ */
export const PROTECTED = ['main'];

/** このブランチにコミットしてよいか。だめなら理由の文、よければ null */
export function checkBranch(branch) {
  if (PROTECTED.includes(branch)) {
    return `${branch} には直接コミットできません。先に作業ブランチを切ってください（例：git switch -c feat/TASK-0000-name）。`;
  }
  return null;
}

// コマンドとして実行されたとき（フックから）
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  const message = checkBranch(branch);
  if (message) {
    console.error(`guard-main: ${message}`);
    process.exit(1);
  }
}
