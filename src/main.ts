import './style.css';
import { chooseSeed, exposeDebugApi, readDebugParams } from './app/debug';
import { showFps } from './app/fps';
import { createInput } from './app/input';
import { watchLayout } from './app/layout';
import { startLoop } from './app/loop';
import { setupPwa } from './app/pwa';
import { guardTouch } from './app/touch-guard';
import { formatVersion } from './app/version';
import { createGame, step, type GameState, type StepInput } from './core/game';
import { render } from './render/canvas';

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
  render(ctx, state, { score: 0, topScore: 0 });
  // E2E が読む状態（テンプレート §5.4）
  body.dataset.step = String(state.step);
  body.dataset.ammo = state.bases.map((b) => b.ammo).join(',');
  body.dataset.wave = String(state.wave.number);
  body.dataset.status = state.wave.status;
};

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
