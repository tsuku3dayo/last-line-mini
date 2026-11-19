// タイトルの「♪ 音 ON／OFF」（LLM-GUI-0003 §8。LLM-PBI-0014・LLM-TC-0014-04）。
// クレジットのボタンと同じく、ゲーム画面の上に重ねる HTML。中の pointerdown はゲームの「触る／押す」に届かないよう止める
import type { KeyValueStorage } from '../storage/ranking-store';

/** ボタンの位置（論理）。iPhone SE（倍率 約 0.75）で約 45 ポイント */
export const SOUND_BUTTON = { x: 24, y: 560, width: 120, height: 60 } as const;

/** 保存のキー：本番とプレビューで分ける（アプリ識別子 ＋ `-sound`） */
export const soundKey = (channel: 'production' | 'preview'): string => (channel === 'production' ? 'last-line-mini-sound' : 'last-line-mini-preview-sound');

/** 保存の中身から ON か（初めは ON。`off` のときだけ OFF） */
export function loadSoundEnabled(storage: KeyValueStorage, key: string): boolean {
  try {
    return storage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundEnabled(storage: KeyValueStorage, key: string, enabled: boolean): void {
  try {
    storage.setItem(key, enabled ? 'on' : 'off');
  } catch {
    // 書けなくても遊ぶのは止めない
  }
}

/** ボタンの文字 */
export const soundLabel = (enabled: boolean): string => (enabled ? '♪ 音 ON' : '♪ 音 OFF');

export interface SoundButton {
  setVisible(visible: boolean): void;
  setEnabled(enabled: boolean): void;
}

export function createSoundButton(stage: HTMLElement, handlers: { onToggle: () => void; canToggle: () => boolean }): SoundButton {
  const button = document.createElement('button');
  button.id = 'sound-button';
  button.type = 'button';
  button.hidden = true;
  Object.assign(button.style, {
    left: `${(SOUND_BUTTON.x / 480) * 100}%`,
    top: `${(SOUND_BUTTON.y / 640) * 100}%`,
    width: `${(SOUND_BUTTON.width / 480) * 100}%`,
    height: `${(SOUND_BUTTON.height / 640) * 100}%`,
  });
  button.addEventListener('pointerdown', (e) => e.stopPropagation());
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (button.hidden || !handlers.canToggle()) return;
    handlers.onToggle();
  });
  stage.append(button);
  return {
    setVisible(visible) {
      button.hidden = !visible;
    },
    setEnabled(enabled) {
      button.textContent = soundLabel(enabled);
      button.dataset.sound = enabled ? 'on' : 'off';
    },
  };
}
