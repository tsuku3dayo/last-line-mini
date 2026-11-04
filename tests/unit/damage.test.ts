import { describe, expect, it } from 'vitest';
import { BASE_HIT_HALF_WIDTH, CITY_HIT_HALF_WIDTH, applyLandings } from '../../src/core/damage';
import { TARGETS, type EnemyMissile } from '../../src/core/enemy';
import { createGame, NO_INPUT, step, type GameState, type StepInput } from '../../src/core/game';

/** 地面のすぐ上から x に落ちる敵（次のステップで着く） */
const landingAt = (x: number): EnemyMissile => ({ fromX: x, fromY: 0, toX: x, toY: 592, speed: 1, traveled: 591.5 });
/** 敵が出ないよう、出る時刻より前の状態に敵だけを置く（TEAM 5.6） */
const scene = (enemies: EnemyMissile[], s: GameState = createGame(1)): GameState => ({ ...s, enemies });
const alive = (s: GameState) => ({ cities: s.cities.map((c) => c.alive), bases: s.bases.map((b) => b.alive) });

describe('都市と基地の被弾（LLM-PBI-0003）', () => {
  it('LLM-TC-0003-02 都市の幅（±12）に落ちると、その都市だけが壊れ、復活しない', () => {
    const s = step(scene([landingAt(140 + CITY_HIT_HALF_WIDTH)]), NO_INPUT); // 都市 2 の右のふち
    expect(alive(s).cities).toEqual([true, false, true, true, true, true]);
    let later = s;
    for (let i = 0; i < 600; i++) later = step(later, NO_INPUT);
    expect(later.cities[1]?.alive).toBe(false); // 復活しない
  });

  it('LLM-TC-0003-02 都市と都市のあいだ（幅の外）に落ちても、都市は壊れない', () => {
    const s = step(scene([landingAt(120)]), NO_INPUT); // 都市 1（100）と 2（140）のまん中：どちらからも 20
    expect(alive(s).cities.every(Boolean)).toBe(true);
    expect(s.impacts).toHaveLength(1); // 閃光は出る
  });

  it('LLM-TC-0003-03 基地の台の幅（±14）に落ちると、その基地は壊れ、残弾が 0 になる', () => {
    const s = step(scene([landingAt(240 - BASE_HIT_HALF_WIDTH)]), NO_INPUT); // 基地 B の左のふち
    expect(alive(s).bases).toEqual([true, false, true]);
    expect(s.bases.map((b) => b.ammo)).toEqual([10, 0, 10]);
    expect(alive(s).cities.every(Boolean)).toBe(true);
  });

  it('LLM-TC-0003-03 壊れた基地からは、キーでも撃てず、タッチは残りの基地から撃つ', () => {
    const broken = step(scene([landingAt(240)]), NO_INPUT);
    const key: StepInput = { ...NO_INPUT, pointer: { x: 240, y: 300 }, fire: [false, true, false] };
    const afterKey = step(broken, key);
    expect(afterKey.interceptors).toHaveLength(0);
    expect(afterKey.bases[1]?.ammo).toBe(0);

    const afterTap = step(broken, { ...NO_INPUT, taps: [{ x: 250, y: 300 }] }); // 基地 B のま上を触る
    expect(afterTap.interceptors).toHaveLength(1);
    expect(afterTap.interceptors[0]?.base).not.toBe(1);
  });

  it('LLM-TC-0003-04 壊れた都市・基地にまた落ちても、閃光が出るだけで何も変わらない', () => {
    const once = step(scene([landingAt(140), landingAt(440)]), NO_INPUT);
    expect(alive(once)).toEqual({ cities: [true, false, true, true, true, true], bases: [true, true, false] });
    const twice = step(scene([landingAt(140), landingAt(440)], once), NO_INPUT);
    expect(alive(twice)).toEqual(alive(once));
    expect(twice.bases.map((b) => b.ammo)).toEqual(once.bases.map((b) => b.ammo));
    expect(twice.impacts.length).toBeGreaterThanOrEqual(2); // 閃光は出る
  });

  it('LLM-TC-0003-04 壊れていても、敵の狙いの先は今までどおり都市 6 つと基地 3 つ（狙いは変えない。PBI-0003 のメモ）', () => {
    expect(TARGETS.map((t) => t.x)).toEqual([100, 140, 180, 300, 340, 380, 40, 240, 440]);
    // 壊れた物に落ちても、applyLandings は何も変えない
    const r = applyLandings([{ x: 100, alive: false }], [{ x: 40, alive: false, ammo: 0 }], [100, 40]);
    expect(r.cities[0]).toEqual({ x: 100, alive: false });
    expect(r.bases[0]).toEqual({ x: 40, alive: false, ammo: 0 });
  });
});
