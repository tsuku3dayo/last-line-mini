import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CREDIT_ROLES, THIRD_PARTY } from '../../src/app/credits';
import { README_HEADINGS, checkReadme } from '../../scripts/readme-lib.mjs';

const credits = { roles: CREDIT_ROLES, tools: THIRD_PARTY };
const real = readFileSync('README.md', 'utf8');

/** README を置いた仮のリポジトリで検査する */
function check(text: string | null): string[] {
  const root = mkdtempSync(join(tmpdir(), 'readme-'));
  if (text !== null) writeFileSync(join(root, 'README.md'), text, 'utf8');
  return checkReadme(root, credits);
}

describe('README の検査（LLM-PBI-0013）', () => {
  it('LLM-TC-0013-01・04 リポジトリの README は決まりを満たす', () => {
    expect(checkReadme(process.cwd(), credits)).toEqual([]);
  });

  it('LLM-TC-0013-01 README がない・見出しが欠けていると知らせる', () => {
    expect(check(null)).toEqual(['README.md がない']);
    const errors = check(real.replace('## 動作を確かめた端末', '## 端末'));
    expect(errors).toEqual([`README.md に見出し「${README_HEADINGS[2]}」がない`]);
  });

  it('LLM-TC-0013-01 ライセンスの見出しと原作の名前を見つける', () => {
    expect(check(`${real}\n## ライセンス\n`).some((e) => e.includes('ライセンスの見出し'))).toBe(true);
    expect(check(`${real}\n## License\n`).some((e) => e.includes('ライセンスの見出し'))).toBe(true);
    const name = ['Missile', 'Command'].join(' '); // このファイルが原作の名前を含まないよう組み立てる
    expect(check(`${real}\n${name}\n`).some((e) => e.includes('原作の名前'))).toBe(true);
  });

  it('LLM-TC-0013-04 クレジットと使った道具が、ゲームのクレジットのデータとずれたら知らせる', () => {
    expect(check(real.replace('| PROGRAMMER | CLAUDE CODE |', '| PROGRAMMER | だれか |'))).toEqual(['README.md のクレジットに「PROGRAMMER｜CLAUDE CODE」の行がない']);
    expect(check(real.replace('Copyright 2018 Google LLC', 'Copyright Google'))[0]).toContain('「Workbox」の行がない');
  });
});
