import { AMMO_PER_BASE, BASE_XS, CITY_XS } from './config';
import { seedState } from './random';

export interface Base {
  readonly x: number;
  readonly ammo: number;
}

export interface City {
  readonly x: number;
  readonly alive: boolean;
}

/** ゲームの状態。core の関数はこれを書き換えず、新しい状態を返す */
export interface GameState {
  /** 始めてから進んだステップ数 */
  readonly step: number;
  /** 乱数の今の状態（種から作る） */
  readonly rng: number;
  readonly bases: readonly Base[];
  readonly cities: readonly City[];
}

/** 1 ステップぶんの入力。照準・発射は LLM-TASK-0005・0006 で足す */
export type StepInput = Readonly<Record<never, never>>;
export const NO_INPUT: StepInput = Object.freeze({});

export function createGame(seed: number): GameState {
  return {
    step: 0,
    rng: seedState(seed),
    bases: BASE_XS.map((x) => ({ x, ammo: AMMO_PER_BASE })),
    cities: CITY_XS.map((x) => ({ x, alive: true })),
  };
}

/** 1 ステップ進める */
export function step(state: GameState, _input: StepInput): GameState {
  return { ...state, step: state.step + 1 };
}
