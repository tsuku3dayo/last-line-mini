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
import { isOver } from './core/wave';
import { render } from './render/canvas';
import { canRestart, overlayTexts } from './render/overlay';

// 組み立て（ここだけが全部の層を知る）。タイトル画面は LLM-PBI-0006 で足すので、今は開くとすぐプレイが始まる
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

// 入力を渡さなければ、キーボード・マウスから読む
const advanceBy = (steps: number, given?: StepInput) => {
  for (let i = 0; i < steps; i++) state = step(state, given ?? input.read());
  return state;
};

const draw = () => {
  ctx.setTransform(transform.scale * transform.dpr, 0, 0, transform.scale * transform.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // TOP は LLM-PBI-0006 まで 0 のまま（LLM-PBI-0005 の PO の決定）
  render(ctx, state, { score: state.score, topScore: 0 });
  // E2E が読む状態（テンプレート §5.4）
  body.dataset.step = String(state.step);
  body.dataset.ammo = state.bases.map((b) => b.ammo).join(',');
  body.dataset.wave = String(state.wave.number);
  body.dataset.status = state.wave.status;
  body.dataset.score = String(state.score);
  body.dataset.message = overlayTexts(state.wave)
    .map((o) => o.text)
    .join('|');
};

/**
 * やり直し（LLM-TC-0004-06）：終わってから約 1 秒たっていれば、キー・タッチ・クリックで WAVE 1 から。
 * 新しい乱数の種で始める（`?debug=1&seed=` のときは同じ種）。やり直しの操作が新しいゲームの 1 発にならないよう、たまった入力は捨てる
 */
const restartIfReady = (): boolean => {
  if (!canRestart(state.wave)) return false;
  state = createGame(chooseSeed(fixedSeed));
  input.read();
  draw();
  return true;
};
window.addEventListener('pointerdown', () => restartIfReady());
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (restartIfReady()) return;
  // 実機確認用：G キーでその場で GAME OVER にする（`?debug=1` のときだけ。PO の決定、スプリント 04）
  if (debug && e.code === 'KeyG' && !isOver(state.wave.status)) {
    state = forceGameOver(state);
    draw();
  }
});

watchLayout(stage, canvas, (layout, dpr) => {
  transform = { scale: layout.scale, dpr };
  body.dataset.scale = layout.scale.toFixed(4);
  draw();
});

const loop = startLoop((steps) => advanceBy(steps), draw);
body.dataset.screen = 'play';

if (debug) {
  exposeDebugApi({
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
