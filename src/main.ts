import './style.css';
import { chooseSeed, exposeDebugApi, readDebugParams } from './app/debug';
import { showFps } from './app/fps';
import { createInput } from './app/input';
import { watchLayout } from './app/layout';
import { startLoop } from './app/loop';
import { setupPwa } from './app/pwa';
import { guardTouch } from './app/touch-guard';
import { formatVersion } from './app/version';
import { createGame, forceGameOver, step, type GameState, type StepInput } from './core/game';
import { insertRecord, topScore, type RankRecord } from './core/ranking';
import { isOver } from './core/wave';
import { render, renderScreen } from './render/canvas';
import { canRestart, overlayTexts } from './render/overlay';
import { canLeaveScreen, titleTexts, top10Texts, type Screen } from './render/screens';
import { loadRanking, rankingKey, saveRanking, type KeyValueStorage } from './storage/ranking-store';

// 組み立て（ここだけが全部の層を知る）。画面の流れ：タイトル → プレイ → 終わり → TOP10 → タイトル（LLM-GUI-0003 §0）
const versionText = formatVersion(__APP_VERSION__, __APP_CHANNEL__, __APP_COMMIT__);
const body = document.body;
body.dataset.version = versionText;
body.dataset.channel = __APP_CHANNEL__;

const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.textContent = versionText;

const stage = document.getElementById('stage');
const canvas = document.getElementById('screen');
if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) throw new Error('画面の要素がない');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D が使えない');

const { debug, seed: fixedSeed } = readDebugParams(location.search);
let state: GameState = createGame(chooseSeed(fixedSeed));
let transform = { scale: 1, dpr: 1 };
const input = createInput(stage);
guardTouch();

// TOP10（LLM-PBI-0006）。localStorage はブラウザの設定によっては触るだけで例外になるので、使えなければ保存しない
const NO_STORAGE: KeyValueStorage = { getItem: () => null, setItem: () => undefined };
const store: KeyValueStorage = (() => {
  try {
    return window.localStorage;
  } catch {
    return NO_STORAGE;
  }
})();
const rankingStoreKey = rankingKey(__APP_CHANNEL__);
let ranking: readonly RankRecord[] = loadRanking(store, rankingStoreKey);
/** このプレイの記録をもう TOP10 に入れたか（終わった瞬間に 1 回だけ） */
let recorded = false;

/** 終わったら（CLEAR・GAME OVER）、点を TOP10 に入れて保存する。名前は LLM-PBI-0007 まで `...` */
const recordIfOver = () => {
  if (recorded || !isOver(state.wave.status)) return;
  recorded = true;
  const result = insertRecord(ranking, {
    name: '...',
    score: state.score,
    cities: state.bonus?.cities ?? state.cities.filter((c) => c.alive).length,
    missiles: state.bonus?.missiles ?? 0,
    status: state.wave.status === 'clear' ? 'CLEARED' : 'GAME_OVER',
    createdAt: new Date().toISOString(),
  });
  if (result.rank === null) return;
  ranking = result.list;
  saveRanking(store, rankingStoreKey, ranking);
};

/** 今の画面と、その画面が出てからのステップ数（タイトル・TOP10 の点滅と、約 1 秒の受け付けない時間に使う） */
let screen: Screen = 'title';
let screenStep = 0;

/** 画面を切り替える。前の画面の操作が次の画面の 1 発にならないよう、たまった入力は捨てる */
const goTo = (next: Screen) => {
  screen = next;
  screenStep = 0;
  input.read();
  body.dataset.screen = next;
};

/** タイトルから WAVE 1 を始める。新しい乱数の種で（`?debug=1&seed=` のときは同じ種） */
const startGame = () => {
  state = createGame(chooseSeed(fixedSeed));
  recorded = false;
  goTo('play');
};

// プレイ中はゲームを進める（入力を渡さなければ、キーボード・マウスから読む）。ほかの画面では画面の時間だけ進め、入力は捨てる
const advanceBy = (steps: number, given?: StepInput) => {
  if (screen === 'play') {
    for (let i = 0; i < steps; i++) state = step(state, given ?? input.read());
  } else {
    screenStep += steps;
    input.read();
  }
  return state;
};

const screenTexts = () => (screen === 'title' ? titleTexts(ranking, screenStep) : top10Texts(ranking, state.score, screenStep));

const draw = () => {
  ctx.setTransform(transform.scale * transform.dpr, 0, 0, transform.scale * transform.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  recordIfOver();
  // TOP は TOP10 の 1 位の点（LLM-PBI-0006）。1P はプレイ中の点（タイトル・TOP10 では前のプレイの点）
  const view = { score: state.score, topScore: topScore(ranking) };
  const messages = screen === 'play' ? overlayTexts(state.wave, state.bonus) : screenTexts();
  if (screen === 'play') render(ctx, state, view);
  else renderScreen(ctx, messages, view);
  // E2E が読む状態（テンプレート §5.4）。step はプレイ中はゲームの、ほかの画面では画面のステップ数
  body.dataset.step = String(screen === 'play' ? state.step : screenStep);
  body.dataset.ammo = state.bases.map((b) => b.ammo).join(',');
  body.dataset.wave = String(state.wave.number);
  body.dataset.status = state.wave.status;
  body.dataset.score = String(state.score);
  body.dataset.top = String(topScore(ranking));
  body.dataset.message = messages.map((o) => o.text).join('|');
};

/**
 * 触る・押す（LLM-GUI-0003 §0）。どの画面も出てから約 1 秒は受け付けない。
 * 終わりの画面 → TOP10（LLM-TC-0006-04。LLM-PBI-0005 までは WAVE 1 からだった）→ タイトル → WAVE 1
 */
const poke = (): boolean => {
  if (screen === 'play') {
    if (!canRestart(state.wave)) return false;
    recordIfOver();
    goTo('top10');
  } else if (!canLeaveScreen(screenStep)) {
    return false;
  } else if (screen === 'top10') {
    goTo('title');
  } else {
    startGame();
  }
  draw();
  return true;
};
window.addEventListener('pointerdown', () => poke());
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (poke()) return;
  // 実機確認用：G キーでその場で GAME OVER にする（`?debug=1` のときだけ。PO の決定、スプリント 04）
  if (debug && screen === 'play' && e.code === 'KeyG' && !isOver(state.wave.status)) {
    state = forceGameOver(state);
    draw();
  }
});

watchLayout(stage, canvas, (layout, dpr) => {
  transform = { scale: layout.scale, dpr };
  body.dataset.scale = layout.scale.toFixed(4);
  draw();
});

goTo('title');
const loop = startLoop((steps) => advanceBy(steps), draw);

if (debug) {
  exposeDebugApi({
    start: () => {
      startGame();
      draw();
    },
    getState: () => state,
    setState: (next) => {
      state = next;
      draw();
    },
    freeze: () => loop.freeze(),
    unfreeze: () => loop.unfreeze(),
    advance: (steps, given) => {
      const s = advanceBy(steps, given);
      draw();
      return s;
    },
  });
  body.dataset.debug = '1';
  showFps(stage);
}

setupPwa();
