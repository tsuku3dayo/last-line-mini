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
/**
 * ウェーブごとの難しさ（LLM-PBI-0011：5 ウェーブ・後半ほど難しく・守り切って 2 分半〜3 分半）。
 * 4 つの表は同じ長さ（ウェーブの数）。実機で PO が確かめて値だけ直す（LLM-TC-0011-06）。
 * v1.1（PO の指定「敵の攻撃を1.5倍」）：敵の数・多弾頭の数を 1.5 倍（切り上げ）、間隔を 1/1.5 にした
 */
/** 敵の数（多弾頭は親で 1 発と数える） */
export const WAVE_ENEMY_COUNTS = [12, 18, 23, 27, 32] as const;
/** そのうち多弾頭の数（WAVE 1 は 0。LLM-PBI-0008） */
export const WAVE_MIRV_COUNTS = [0, 5, 6, 8, 9] as const;
/** 敵が出る間隔（秒） */
export const WAVE_SPAWN_INTERVAL_SECONDS = [2.0 / 1.5, 1.9 / 1.5, 1.8 / 1.5, 1.7 / 1.5, 1.6 / 1.5] as const;
/** 敵の落ちる速さの倍率（WAVE 1 の速さが 1） */
export const WAVE_SPEED_SCALES = [1.0, 1.1, 1.2, 1.3, 1.4] as const;
/** 多弾頭が分かれる高さ（上からの割合）と、分かれる数（LLM-PBI-0008） */
export const MIRV_SPLIT_MIN_RATIO = 0.4;
export const MIRV_SPLIT_MAX_RATIO = 0.6;
export const MIRV_MIN_CHILDREN = 2;
export const MIRV_MAX_CHILDREN = 3;
/** ウェーブのあいだ（「WAVE n」を出す時間）。始めの WAVE 1 の前にもある */
export const WAVE_BREAK_STEPS = 3 * STEPS_PER_SECOND;

/** 敵（アタックミサイル）を 1 つ壊したときの点。迎撃でも誘爆でも同じ（仕様書 §4.1・LLM-PBI-0005） */
export const SCORE_PER_ENEMY = 25;
/** 終わり（CLEAR・GAME OVER）のボーナス：残弾 1 発・残った都市 1 つあたりの点（仕様書 §4.2・LLM-PBI-0005） */
export const BONUS_PER_MISSILE = 5;
export const BONUS_PER_CITY = 100;

/** 都市 1〜6 の x */
export const CITY_XS = [100, 140, 180, 300, 340, 380] as const;

/** 平らな地面の高さ（上端の y） */
export const GROUND_Y = 592;
/** 基地の載る丘のいちばん高いところの y と、丘の半分の幅 */
export const MOUND_TOP_Y = 572;
export const MOUND_HALF_WIDTH = 32;
/** 丘の上の平らなところの半分の幅 */
export const MOUND_FLAT_HALF_WIDTH = 14;
