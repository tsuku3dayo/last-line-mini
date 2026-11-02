import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { bumpVersion, checkDocs } from '../../scripts/docs-lib.mjs';

// 例の ID は組み立てて書く（このファイルの文字を check-docs が本物の確認 ID と取り違えないように）
const P = 'LLM';
const PG = `${P}-PG-0001`;
const PBI = `${P}-PBI-0001`;
const TC = `${P}-TC-0001`;
const AC = `${P}-AC-0001`;
const CID = `${TC}-01`;
const VERIFIED = 'verified: { by: オーナー, at: 2026-11-02T15:00:00+09:00 }';

let root: string;

const write = (rel: string, text: string) => {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, 'utf8');
};
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const edit = (rel: string, from: string, to: string) => write(rel, read(rel).replace(from, to));

const doc = (id: string, type: string, extra: { status?: string; version?: string; sources?: string[]; verified?: string; theme?: string; body?: string } = {}) => `---
id: ${id}
type: ${type}
title: 例
${extra.theme ? `theme: ${extra.theme}\n` : ''}status: ${extra.status ?? 'stable'}
version: ${extra.version ?? '1.0'}
updated: 2026-11-02
sources:
${(extra.sources ?? ['docs/spec/spec.md (v1.0)']).map((s) => `  - ${s}`).join('\n')}
${extra.verified ?? VERIFIED}
---

${extra.body ?? '# 例'}
`;

const backlog = (state: string) => `# プロダクトバックログ

| 順 | ID | 題名 | テーマ | 大きさ | 状態 |
| ---: | :--- | :--- | :--- | :--- | :--- |
| 1 | ${PBI} | 例 | 例 | S | ${state} |
`;

/** 正しい最小の一式 */
function makeValidRepo() {
  root = mkdtempSync(join(tmpdir(), 'llm-check-docs-'));
  write('docs/spec/spec.md', '# 仕様書\n\n版：v1.0\n');
  write(`docs/00-product/${PG}-product-goal-ja.md`, doc(PG, 'product-goal'));
  write('docs/00-product/product-backlog.md', backlog('準備 OK'));
  write(`docs/01-pbi/${PBI}-product-backlog-item-ja.md`, doc(PBI, 'product-backlog-item', { theme: '例', sources: [`${PG}（v1.0）`] }));
  write(`docs/05-test/${TC}-test-case-ja.md`, doc(TC, 'test-case', {
    sources: [`${PBI}（v1.0）`],
    verified: 'verified: null',
    body: `| 確認 ID | 確かめること | 方法 | 場所 |\n| :--- | :--- | :--- | :--- |\n| ${CID} | 例 | 自動（単体） | tests/unit/a.test.ts |\n`,
  }));
  write('tests/unit/a.test.ts', `it('${CID} 例', () => {});\n`);
}

beforeEach(makeValidRepo);

describe('check:docs', () => {
  it('LLM-TC-9001-07 決まりどおりの一式はエラーにならない', () => {
    expect(checkDocs(root)).toEqual([]);
  });

  it('LLM-TC-9001-07 承認のある種類が stable なのに verified がないとエラー', () => {
    edit(`docs/01-pbi/${PBI}-product-backlog-item-ja.md`, VERIFIED, 'verified: null');
    expect(checkDocs(root).join('\n')).toMatch(/verified がない/);
  });

  it('LLM-TC-9001-07 sources の版が今の版と違うとエラー', () => {
    edit(`docs/01-pbi/${PBI}-product-backlog-item-ja.md`, `${PG}（v1.0）`, `${PG}（v0.9）`);
    expect(checkDocs(root).join('\n')).toMatch(/版 v0\.9 が今の版 v1\.0 でない/);
  });

  it('LLM-TC-9001-07 stable なのに sources が review だとエラー', () => {
    edit(`docs/00-product/${PG}-product-goal-ja.md`, 'status: stable', 'status: review');
    expect(checkDocs(root).join('\n')).toMatch(/stable なのに sources の .* が review/);
  });

  it('LLM-TC-9001-07 ファイル名・置き場所・ない ID をエラーにする', () => {
    write(`docs/03-gui/${P}-GUI-0001-gui.md`, doc(`${P}-GUI-0001`, 'gui-design', { body: `${P}-ADR-0009 を見る` }));
    const errors = checkDocs(root).join('\n');
    expect(errors).toMatch(/ファイル名が/);
    expect(errors).toMatch(/本文の .*ADR-0009 がない/);
  });

  it('LLM-TC-9001-07 テストの確認 ID が test-case にないとエラー', () => {
    write('e2e/b.spec.ts', `test('${TC}-99 例', () => {});\n`);
    expect(checkDocs(root).join('\n')).toMatch(/TC-0001-99 が test-case にない/);
  });

  it('LLM-TC-9001-07 プロダクトバックログの状態と PBI・AC が食い違うとエラー', () => {
    write('docs/00-product/product-backlog.md', backlog('完成'));
    expect(checkDocs(root).join('\n')).toMatch(/完成」なのに .*AC-0001 がない/);
    write(`docs/07-increments/${AC}-attested-computation-ja.md`, doc(AC, 'attested-computation', { status: 'review', verified: 'verified: null', sources: [`${PBI}（v1.0）`] }));
    expect(checkDocs(root)).toEqual([]); // AC は review のままでよい（受け入れはレビューで）
  });

  it('LLM-TC-9001-07 完成した PBI の手動の確認 ID が AC にないとエラー', () => {
    edit(`docs/05-test/${TC}-test-case-ja.md`, '| 自動（単体） |', '| 手動 |');
    write('tests/unit/a.test.ts', "it('例', () => {});\n");
    write('docs/00-product/product-backlog.md', backlog('完成'));
    write(`docs/07-increments/${AC}-attested-computation-ja.md`, doc(AC, 'attested-computation', { status: 'review', verified: 'verified: null', sources: [`${PBI}（v1.0）`] }));
    expect(checkDocs(root).join('\n')).toMatch(/テストのコードにも AC にもない/);
    edit(`docs/07-increments/${AC}-attested-computation-ja.md`, '# 例', `| ${CID} | OK |`);
    expect(checkDocs(root)).toEqual([]);
  });
});

describe('版を上げるスクリプト', () => {
  it('LLM-TC-9001-08 版を 0.1 上げ、承認のある種類を review に戻し、下流の sources をそろえる', () => {
    const { from, to, changed } = bumpVersion(root, PG, { today: '2026-11-03' });
    expect([from, to]).toEqual(['1.0', '1.1']);
    for (const [file, text] of changed) writeFileSync(file, text, 'utf8');
    const pg = read(`docs/00-product/${PG}-product-goal-ja.md`);
    expect(pg).toMatch(/^version: 1\.1$/m);
    expect(pg).toMatch(/^status: review$/m);
    expect(pg).toMatch(/^verified: null$/m);
    expect(pg).toMatch(/^updated: 2026-11-03$/m);
    const pbi = read(`docs/01-pbi/${PBI}-product-backlog-item-ja.md`);
    expect(pbi).toContain(`${PG}（v1.1）`);
    // 下流は表記だけ。版・状態は変えない
    expect(pbi).toMatch(/^version: 1\.0$/m);
    expect(pbi).toMatch(/^status: stable$/m);
  });

  it('LLM-TC-9001-08 承認のない種類は status を変えない', () => {
    const { changed } = bumpVersion(root, TC, { today: '2026-11-03' });
    const text = changed.get(join(root, `docs/05-test/${TC}-test-case-ja.md`)) ?? '';
    expect(text).toMatch(/^version: 1\.1$/m);
    expect(text).toMatch(/^status: stable$/m);
  });
});
