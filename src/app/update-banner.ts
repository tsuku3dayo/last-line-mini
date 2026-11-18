/**
 * 更新の帯（LLM-GUI-0003 §5。LLM-PBI-0012）。ゲーム画面の上の端に重ねる HTML の帯で、文字はブラウザの文字（ゴシック）。
 * 位置と大きさは論理座標（480 × 640）の割合で決めるので、画面の倍率が変わっても同じ所に出る（名前の入力欄と同じ作り）。
 *
 * 帯の中の pointerdown は、ゲームの「触る／押す」（window の pointerdown）とゲーム画面の撃つ操作に届かないよう止める。
 * 帯を触ってもゲームは始まらない（LLM-TC-0012-02）。
 */
export interface UpdateBanner {
  setVisible(visible: boolean): void;
  /** 画面の倍率（layout）が変わったら呼ぶ。文字の大きさを合わせる */
  setScale(scale: number): void;
}

/** 帯の高さ（論理）。「更新」は幅 120・高さ 60：一番小さい iPhone SE（倍率 約 0.75）で約 45 ポイント（TEAM 5.2 の 44 以上。58 では 43.5 で届かなかった） */
export const BANNER_HEIGHT = 64;
export const UPDATE_BUTTON = { x: 352, y: 2, width: 120, height: 60 } as const;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function createUpdateBanner(stage: HTMLElement, onUpdate: () => void): UpdateBanner {
  const bar = document.createElement('div');
  bar.id = 'update-banner';
  bar.hidden = true;
  bar.setAttribute('role', 'status');
  Object.assign(bar.style, { left: '0', top: '0', width: '100%', height: pct(BANNER_HEIGHT, 640) });

  const text = document.createElement('span');
  text.id = 'update-text';
  text.textContent = '新しい版があります';
  Object.assign(text.style, { left: pct(16, 480) });

  const button = document.createElement('button');
  button.id = 'update-button';
  button.type = 'button';
  button.textContent = '更新';
  Object.assign(button.style, {
    left: pct(UPDATE_BUTTON.x, 480),
    top: pct(UPDATE_BUTTON.y, BANNER_HEIGHT),
    width: pct(UPDATE_BUTTON.width, 480),
    height: pct(UPDATE_BUTTON.height, BANNER_HEIGHT),
  });

  // 帯の中を触っても、ゲームの「触る／押す」・撃つ操作にしない
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bar.hidden) return;
    onUpdate();
  });

  bar.append(text, button);
  stage.append(bar);

  return {
    setVisible(visible: boolean) {
      bar.hidden = !visible;
    },
    setScale(scale: number) {
      // 文字は大きさ 20（論理。GUI-0003 §5）。小さい画面でも読めるよう 12 px より小さくしない
      const size = `${Math.max(12, Math.round(20 * scale))}px`;
      text.style.fontSize = size;
      button.style.fontSize = size;
    },
  };
}
