import { sanitizeName } from '../core/name';

/**
 * 名前の入力欄と OK（LLM-GUI-0003 §3）。HTML の部品をゲーム画面の上に重ねる。
 * 位置と大きさは論理座標（480 × 640）の割合で決めるので、画面の倍率が変わっても同じ所に出る。
 * iPhone のキーボードは、触った操作の中で入力欄に入らないと出ないので、show() はその操作の中で呼ぶ。
 *
 * フォーム（form・submit）は使わない（LLM-TASK-0030）。iPhone では、終わりの画面を触った同じ操作のクリックが
 * 指の下に出た OK に届き、フォームの送信でページが読み込み直されて、名前の画面が出なかった（実機確認 TC-0007-06）。
 * 確定は、OK のクリックと入力欄の Enter だけで受け、canConfirm()（画面が出てから約 1 秒たったか）が false なら受けない。
 */
export interface NameEntry {
  show(): void;
  hide(): void;
  /** 画面の倍率（layout）が変わったら呼ぶ。文字の大きさを合わせる */
  setScale(scale: number): void;
  /** 今の入力（整えたあと） */
  readonly value: string;
}

/** 論理座標の四角を、ゲーム画面に対する割合（%）にする */
const at = (x: number, y: number, w: number, h: number) => ({
  left: `${(x / 480) * 100}%`,
  top: `${(y / 640) * 100}%`,
  width: `${(w / 480) * 100}%`,
  height: `${(h / 640) * 100}%`,
});

export function createNameEntry(stage: HTMLElement, onConfirm: (raw: string) => void, canConfirm: () => boolean): NameEntry {
  const box = document.createElement('div');
  box.id = 'name-entry';
  box.hidden = true;

  const input = document.createElement('input');
  input.id = 'name-input';
  input.type = 'text';
  input.setAttribute('aria-label', '名前（3 文字）');
  // iPhone の自動の大文字・直し・候補を切る（GUI-0003 §3）。大文字にするのは sanitizeName
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('enterkeyhint', 'done');
  input.spellcheck = false;
  Object.assign(input.style, at(168, 200, 144, 48));

  const ok = document.createElement('button');
  ok.id = 'name-ok';
  ok.type = 'button'; // 送信のボタンにしない（ページを読み込み直さない）
  ok.textContent = 'OK';
  // 高さ 58（論理）：一番小さい iPhone SE（倍率 0.78）で約 45 ポイント（TEAM 5.2 の 44 以上）
  Object.assign(ok.style, at(168, 264, 144, 58));

  const confirm = () => {
    if (box.hidden || !canConfirm()) return;
    onConfirm(input.value);
  };

  // 打つたびに、使える文字の 3 文字までに整える（小文字は大文字に）
  input.addEventListener('input', () => {
    const v = sanitizeName(input.value);
    if (v !== input.value) input.value = v;
  });
  // Enter（iPhone はキーボードの確定）で確定
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    confirm();
  });
  ok.addEventListener('click', (e) => {
    e.preventDefault();
    confirm();
  });

  box.append(input, ok);
  stage.append(box);

  return {
    show() {
      input.value = '';
      box.hidden = false;
      input.focus();
    },
    hide() {
      box.hidden = true;
      input.blur();
    },
    setScale(scale: number) {
      // iPhone の Safari は 16 px より小さい入力欄で画面を勝手に拡大するので、16 px 以上にする（GUI-0003 §3）
      const px = `${Math.max(16, Math.round(28 * scale))}px`;
      input.style.fontSize = px;
      ok.style.fontSize = px;
    },
    get value() {
      return input.value;
    },
  };
}
