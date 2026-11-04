// ゲームの決まった値（LLM-SA-0001 §4・LLM-GUI-0001 §1）。座標はすべて論理座標（480 × 640）。

export const LOGICAL_WIDTH = 480;
export const LOGICAL_HEIGHT = 640;

/** 1 秒あたりのステップ数（固定タイムステップ） */
export const STEPS_PER_SECOND = 120;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
/** 1 回の描画で進める最大のステップ数（これを超えた遅れは捨てる） */
export const MAX_STEPS_PER_FRAME = 12;

/** 基地 A・B・C の x と、最初の弾の数 */
export const BASE_XS = [40, 240, 440] as const;
export const AMMO_PER_BASE = 10;
/** ウェーブごとの敵の数（LLM-PBI-0004。4 ウェーブ・約 3 分。仮の数で LLM-PBI-0011 で直す） */
export const WAVE_ENEMY_COUNTS = [6, 9, 12, 15] as const;
/** ウェーブのあいだ（「WAVE n」を出す時間）。始めの WAVE 1 の前にもある */
export const WAVE_BREAK_STEPS = 3 * STEPS_PER_SECOND;

/** 都市 1〜6 の x */
export const CITY_XS = [100, 140, 180, 300, 340, 380] as const;

/** 平らな地面の高さ（上端の y） */
export const GROUND_Y = 592;
/** 基地の載る丘のいちばん高いところの y と、丘の半分の幅 */
export const MOUND_TOP_Y = 572;
export const MOUND_HALF_WIDTH = 32;
/** 丘の上の平らなところの半分の幅 */
export const MOUND_FLAT_HALF_WIDTH = 14;
