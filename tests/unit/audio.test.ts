import { describe, expect, it } from 'vitest';
import { formatCounts, SOUND_NAMES, SOUND_TONES, soundsForStep } from '../../src/app/audio';
import type { Aircraft } from '../../src/core/aircraft';
import { createGame, type GameState } from '../../src/core/game';

const base = (): GameState => {
  const s = createGame(1);
  return { ...s, wave: { number: 2, status: 'playing', phaseStep: 10, spawned: 1, airPlan: [], airLaunched: 0 } };
};

describe('効果音（LLM-PBI-0014）', () => {
  it('LLM-TC-0014-01 何も起きないステップでは鳴らさない', () => {
    const s = base();
    expect(soundsForStep(s, { ...s, step: s.step + 1 })).toEqual([]);
  });

  it('LLM-TC-0014-01 撃つ：壊れていない基地の残弾が減る。何発撃っても 1 回', () => {
    const s = base();
    const next = { ...s, bases: s.bases.map((b) => ({ ...b, ammo: b.ammo - 1 })) };
    expect(soundsForStep(s, next)).toEqual(['shot']);
  });

  it('LLM-TC-0014-01 爆発：新しい爆風（迎撃・誘爆）。古い爆風だけなら鳴らさない', () => {
    const s = base();
    expect(soundsForStep(s, { ...s, blasts: [{ x: 1, y: 1, age: 0 }, { x: 2, y: 2, age: 0 }] })).toEqual(['blast']);
    expect(soundsForStep(s, { ...s, blasts: [{ x: 1, y: 1, age: 5 }] })).toEqual([]);
  });

  it('LLM-TC-0014-01 やられる：都市か基地が壊れる（基地が壊れて残弾 0 になっても「撃つ」にしない）', () => {
    const s = base();
    expect(soundsForStep(s, { ...s, cities: s.cities.map((c, i) => (i === 0 ? { ...c, alive: false } : c)) })).toEqual(['hit']);
    expect(soundsForStep(s, { ...s, bases: s.bases.map((b, i) => (i === 1 ? { ...b, alive: false, ammo: 0 } : b)) })).toEqual(['hit']);
  });

  it('LLM-TC-0014-01 空の敵が出る・壊れる。出ていったときは鳴らさない', () => {
    const s = base();
    const bomber: Aircraft = { kind: 'bomber', dir: 1, x: 100, y: 120, age: 10, dropped: 0 };
    expect(soundsForStep(s, { ...s, wave: { ...s.wave, airLaunched: 1 }, aircraft: [bomber] })).toEqual(['aircraftIn']);
    const flying = { ...s, aircraft: [bomber] };
    expect(soundsForStep(flying, { ...flying, aircraft: [] })).toEqual(['aircraftDown']);
    // 道のりの終わり（反対の端の外）まで来て消えた：出ていった
    const leaving: Aircraft = { ...bomber, age: 1_000_000 };
    expect(soundsForStep({ ...s, aircraft: [leaving] }, { ...s, aircraft: [] })).toEqual([]);
  });

  it('LLM-TC-0014-01 ウェーブの始めと、終わり（CLEAR・GAME OVER）', () => {
    const s = base();
    const brk = { ...s, wave: { ...s.wave, status: 'break' as const } };
    expect(soundsForStep(brk, s)).toEqual(['wave']);
    expect(soundsForStep(s, { ...s, wave: { ...s.wave, status: 'gameover' } })).toEqual(['end']);
    expect(soundsForStep(s, { ...s, wave: { ...s.wave, status: 'clear' } })).toEqual(['end']);
  });

  it('LLM-TC-0014-01 いくつ起きても、同じ音は 1 つずつ、決まった順で返す', () => {
    const s = base();
    const next = {
      ...s,
      bases: s.bases.map((b) => ({ ...b, ammo: b.ammo - 2 })),
      blasts: [{ x: 1, y: 1, age: 0 }],
      cities: s.cities.map((c, i) => (i < 2 ? { ...c, alive: false } : c)),
    };
    expect(soundsForStep(s, next)).toEqual(['shot', 'blast', 'hit']);
  });

  it('LLM-TC-0014-01 8 種の音がすべて合成の中身を持つ。数えた形は名前の順', () => {
    expect(SOUND_NAMES).toHaveLength(8);
    for (const n of SOUND_NAMES) expect(SOUND_TONES[n].length).toBeGreaterThan(0);
    expect(formatCounts({ blast: 2, shot: 3 })).toBe('shot:3,blast:2');
  });
});
