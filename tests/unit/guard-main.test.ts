import { describe, expect, it } from 'vitest';
import { checkBranch } from '../../scripts/guard-main.mjs';

describe('main への直接コミットを止める（スプリント 02 のレトロの案 1）', () => {
  it('LLM-TC-9001-15 main では止まり、作業ブランチでは通る', () => {
    expect(checkBranch('main')).toMatch(/作業ブランチ/);
    expect(checkBranch('feat/TASK-0013-chain')).toBeNull();
    expect(checkBranch('docs/sprint-03-review')).toBeNull();
  });
});
