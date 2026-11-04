/**
 * 1 秒ごとの描画の回数（fps）を数える。DOM に触れない純粋な部分（完成の定義：iPhone 11 で `?debug=1` の fps が 55 以上）。
 * frame(now) を描画のたびに呼ぶと、1 秒たつごとに、その 1 秒の fps を返す（それ以外は null）。
 */
export function createFpsCounter(): { frame(now: number): number | null } {
  let start: number | null = null;
  let frames = 0;
  return {
    frame(now: number): number | null {
      if (start === null) {
        start = now;
        return null;
      }
      frames += 1;
      const elapsed = now - start;
      if (elapsed < 1000) return null;
      const fps = (frames * 1000) / elapsed;
      start = now;
      frames = 0;
      return fps;
    },
  };
}

/** `?debug=1` のとき、画面の左上に fps を出す（撃つ操作のじゃまをしない） */
export function showFps(parent: HTMLElement): void {
  const el = document.createElement('div');
  el.id = 'debug-fps';
  el.textContent = 'fps --';
  parent.appendChild(el);
  const counter = createFpsCounter();
  const tick = (now: number) => {
    const fps = counter.frame(now);
    if (fps !== null) {
      el.textContent = `fps ${Math.round(fps)}`;
      document.body.dataset.fps = String(Math.round(fps));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
