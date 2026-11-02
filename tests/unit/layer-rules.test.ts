import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// 層の決まり（eslint.config.js）を誤って消したときに気づけるようにする
const eslint = new ESLint();

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? '');
}

describe('層の決まり', { timeout: 60_000 }, () => {
  it('LLM-TC-9001-02 core は DOM・時刻・Math.random・外の層を使えない', async () => {
    const file = 'src/core/sample.ts';
    expect(await ruleIds('export const w = document.title;\n', file)).toContain('no-restricted-globals');
    expect(await ruleIds('export const t = Date.now();\n', file)).toContain('no-restricted-globals');
    expect(await ruleIds('export const r = Math.random();\n', file)).toContain('no-restricted-properties');
    expect(await ruleIds("export { x } from '../render/x';\n", file)).toContain('no-restricted-imports');
  });

  it('LLM-TC-9001-02 render は app・storage を import できない', async () => {
    expect(await ruleIds("export { x } from '../app/x';\n", 'src/render/sample.ts')).toContain('no-restricted-imports');
  });

  it('LLM-TC-9001-02 storage はほかの層を import できない', async () => {
    expect(await ruleIds("export { x } from '../core/x';\n", 'src/storage/sample.ts')).toContain('no-restricted-imports');
  });

  it('LLM-TC-9001-02 決まりを守ったコードはエラーにならない', async () => {
    expect(await ruleIds('export const add = (a: number, b: number): number => a + b;\n', 'src/core/sample.ts')).toEqual([]);
  });
});
