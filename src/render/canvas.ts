import { GROUND_Y, LOGICAL_HEIGHT, LOGICAL_WIDTH, MOUND_TOP_Y } from '../core/config';
import type { GameState } from '../core/game';
import { groundProfile } from '../core/terrain';
import { COLORS } from './colors';
import { textPixels, textWidth } from './font';
import { hud1pText, hudTopText } from './hud';

const FONT_SCALE = 2;
const PROFILE = groundProfile();

/** 自前の文字で書く。align は x の基準 */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = FONT_SCALE, align: 'left' | 'right' | 'center' = 'left'): void {
  const w = textWidth(text, scale);
  const left = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  ctx.fillStyle = color;
  for (const p of textPixels(text)) ctx.fillRect(left + p.x * scale, y + p.y * scale, scale, scale);
}

function drawGround(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.groundFill;
  ctx.beginPath();
  ctx.moveTo(0, LOGICAL_HEIGHT);
  for (const p of PROFILE) ctx.lineTo(p.x, p.y);
  ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.groundEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  PROFILE.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

/** 基地：丘の上の水色の発射台 */
function drawBase(ctx: CanvasRenderingContext2D, x: number, topY: number): void {
  ctx.fillStyle = COLORS.base;
  ctx.fillRect(x - 10, topY - 4, 20, 4);
  ctx.fillRect(x - 6, topY - 8, 12, 4);
  ctx.fillRect(x - 2, topY - 12, 4, 4);
}

/** 都市：暗い建物と暖色の窓の灯り */
function drawCity(ctx: CanvasRenderingContext2D, x: number): void {
  const base = GROUND_Y;
  const blocks = [
    { dx: -12, w: 8, h: 10 },
    { dx: -4, w: 8, h: 16 },
    { dx: 4, w: 8, h: 12 },
  ];
  for (const b of blocks) {
    ctx.fillStyle = COLORS.cityBuilding;
    ctx.fillRect(x + b.dx, base - b.h, b.w, b.h);
    ctx.fillStyle = COLORS.cityLight;
    for (let wy = base - b.h + 2; wy < base - 2; wy += 4) ctx.fillRect(x + b.dx + 2, wy, 2, 2);
    for (let wy = base - b.h + 4; wy < base - 2; wy += 4) ctx.fillRect(x + b.dx + 5, wy, 2, 2);
  }
}

/** 照準：白い「＋」（LLM-GUI-0001 §2） */
function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const cx = Math.round(x);
  const cy = Math.round(y);
  ctx.fillStyle = COLORS.cursor;
  ctx.fillRect(cx - 6, cy - 1, 5, 2);
  ctx.fillRect(cx + 1, cy - 1, 5, 2);
  ctx.fillRect(cx - 1, cy - 6, 2, 5);
  ctx.fillRect(cx - 1, cy + 1, 2, 5);
}

/** 1 回分を描く。ctx は論理座標（480 × 640）に変換済みであること */
export function render(ctx: CanvasRenderingContext2D, state: GameState, view: { score: number; topScore: number }): void {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  drawGround(ctx);
  for (const base of state.bases) drawBase(ctx, base.x, MOUND_TOP_Y);
  for (const city of state.cities) if (city.alive) drawCity(ctx, city.x);

  // 残弾（基地の真下）
  for (const base of state.bases) {
    drawText(ctx, String(base.ammo), base.x, GROUND_Y + 14, base.ammo > 0 ? COLORS.ammo : COLORS.ammoEmpty, FONT_SCALE, 'center');
  }

  drawCursor(ctx, state.cursor.x, state.cursor.y);

  // HUD（y = 8〜24）
  drawText(ctx, hud1pText(view.score), 8, 8, COLORS.hud1p);
  drawText(ctx, hudTopText(view.topScore), LOGICAL_WIDTH - 8, 8, COLORS.hudTop, FONT_SCALE, 'right');
}
