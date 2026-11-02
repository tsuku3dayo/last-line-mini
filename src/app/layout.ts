import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/config';

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface Layout {
  /** 論理の 1 ドットを何 CSS ピクセルで表すか */
  readonly scale: number;
  /** ゲーム画面の CSS の大きさと、左上の位置 */
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * 使える広さに、論理の画面（480 × 640）を縦横の比を保って最大の大きさで収める（テンプレート §5.5）。
 * 安全領域（ノッチ・ホームバー）を引いた広さの真ん中に置く。DOM に触れない純粋な関数。
 */
export function computeLayout(viewWidth: number, viewHeight: number, insets: Insets = NO_INSETS): Layout {
  const availW = Math.max(0, viewWidth - insets.left - insets.right);
  const availH = Math.max(0, viewHeight - insets.top - insets.bottom);
  const scale = Math.max(0, Math.min(availW / LOGICAL_WIDTH, availH / LOGICAL_HEIGHT));
  const width = LOGICAL_WIDTH * scale;
  const height = LOGICAL_HEIGHT * scale;
  return {
    scale,
    width,
    height,
    left: insets.left + (availW - width) / 2,
    top: insets.top + (availH - height) / 2,
  };
}

/** 安全領域を CSS の変数から読む（index.html の :root に env() を置く） */
function readInsets(): Insets {
  const s = getComputedStyle(document.documentElement);
  const px = (name: string) => Number.parseFloat(s.getPropertyValue(name)) || 0;
  return { top: px('--safe-top'), right: px('--safe-right'), bottom: px('--safe-bottom'), left: px('--safe-left') };
}

/** 窓の大きさが変わるたびに、ゲーム画面の大きさと Canvas の画素数を合わせる */
export function watchLayout(stage: HTMLElement, canvas: HTMLCanvasElement, onChange: (layout: Layout, dpr: number) => void): void {
  const apply = () => {
    const layout = computeLayout(window.innerWidth, window.innerHeight, readInsets());
    const dpr = window.devicePixelRatio || 1;
    Object.assign(stage.style, {
      left: `${layout.left}px`,
      top: `${layout.top}px`,
      width: `${layout.width}px`,
      height: `${layout.height}px`,
    });
    canvas.width = Math.max(1, Math.round(layout.width * dpr));
    canvas.height = Math.max(1, Math.round(layout.height * dpr));
    onChange(layout, dpr);
  };
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  apply();
}
