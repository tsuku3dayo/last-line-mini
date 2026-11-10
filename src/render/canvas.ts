import { GROUND_Y, LOGICAL_HEIGHT, LOGICAL_WIDTH, MOUND_TOP_Y } from '../core/config';
import { blastRadius, type Blast } from '../core/blast';
import { enemyHead, IMPACT_STEPS, type EnemyMissile, type Impact } from '../core/enemy';
import type { GameState } from '../core/game';
import { interceptorPosition, type Interceptor } from '../core/interceptor';
import { groundProfile } from '../core/terrain';
import { COLORS } from './colors';
import { textPixels, textWidth } from './font';
import { hud1pText, hudTopText } from './hud';
import { overlayTexts, showCursor, type OverlayText } from './overlay';

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

/** 壊れた基地：灰色の台で、上の段が欠けた形（LLM-GUI-0001 §4） */
function drawBrokenBase(ctx: CanvasRenderingContext2D, x: number, topY: number): void {
  ctx.fillStyle = COLORS.baseBroken;
  ctx.fillRect(x - 10, topY - 4, 20, 4);
  ctx.fillRect(x - 6, topY - 6, 5, 2);
  ctx.fillRect(x + 2, topY - 7, 4, 3);
}

/** 壊れた都市：暗い茶色の低いがれき（幅 20・高さ 4 ほど。LLM-GUI-0001 §4） */
function drawRubble(ctx: CanvasRenderingContext2D, x: number): void {
  ctx.fillStyle = COLORS.cityRubble;
  ctx.fillRect(x - 10, GROUND_Y - 2, 20, 2);
  ctx.fillRect(x - 8, GROUND_Y - 4, 5, 2);
  ctx.fillRect(x - 1, GROUND_Y - 3, 4, 1);
  ctx.fillRect(x + 5, GROUND_Y - 4, 3, 2);
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

/** 迎撃ミサイル：発射した点から今の位置までの緑の軌跡と、着く場所の目印（緑の「×」） */
function drawInterceptor(ctx: CanvasRenderingContext2D, m: Interceptor): void {
  const p = interceptorPosition(m);
  ctx.strokeStyle = COLORS.interceptor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(m.fromX, m.fromY);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.fillStyle = COLORS.enemyHead;
  ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
  const tx = Math.round(m.toX);
  const ty = Math.round(m.toY);
  ctx.fillStyle = COLORS.interceptor;
  for (let d = -3; d <= 3; d++) {
    ctx.fillRect(tx + d, ty + d, 1, 1);
    ctx.fillRect(tx + d, ty - d, 1, 1);
  }
}

/** 爆風：1 ステップごとに色が変わる輪（LLM-GUI-0001 §2。塗りつぶしの白い円は使わない） */
function drawBlast(ctx: CanvasRenderingContext2D, b: Blast, step: number): void {
  const r = blastRadius(b.age);
  if (r <= 0) return;
  ctx.strokeStyle = COLORS.blast[step % COLORS.blast.length] ?? COLORS.blast[0];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(b.x, b.y, Math.max(1, r - 1.5), 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 敵の弾：上端から弾頭までの赤橙の航跡と、白い弾頭（LLM-GUI-0001 §2）。分かれる前の多弾頭も同じ見た目。
 * 多弾頭の子の弾は、親の航跡（親が出た点から分かれた点まで）も描く（LLM-GUI-0001 §4。子が残っているあいだ残る）
 */
function drawEnemy(ctx: CanvasRenderingContext2D, m: EnemyMissile): void {
  const h = enemyHead(m);
  ctx.strokeStyle = COLORS.enemyTrail;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (m.trailFrom) ctx.moveTo(m.trailFrom.x, m.trailFrom.y);
  else ctx.moveTo(m.fromX, m.fromY);
  if (m.trailFrom) ctx.lineTo(m.fromX, m.fromY);
  ctx.lineTo(h.x, h.y);
  ctx.stroke();
  ctx.fillStyle = COLORS.enemyHead;
  ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y) - 1, 2, 2);
}

/** 敵が地面に着いた跡の小さな閃光（LLM-GUI-0001 §4：0.2 秒） */
function drawImpact(ctx: CanvasRenderingContext2D, i: Impact): void {
  const r = 3 + 3 * (1 - i.age / IMPACT_STEPS);
  ctx.fillStyle = COLORS.blast[0];
  ctx.beginPath();
  ctx.arc(i.x, i.y - 2, r, 0, Math.PI * 2);
  ctx.fill();
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
/**
 * タイトル・TOP10 の画面（LLM-GUI-0003）。プレイの絵（敵・基地・都市・地面）と照準は描かない。HUD はどの画面でも出す
 */
export function renderScreen(ctx: CanvasRenderingContext2D, texts: readonly OverlayText[], view: { score: number; topScore: number }): void {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  drawText(ctx, hud1pText(view.score), 8, 8, COLORS.hud1p);
  drawText(ctx, hudTopText(view.topScore), LOGICAL_WIDTH - 8, 8, COLORS.hudTop, FONT_SCALE, 'right');
  for (const o of texts) drawText(ctx, o.text, LOGICAL_WIDTH / 2, o.y, o.color, o.scale, 'center');
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, view: { score: number; topScore: number }): void {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  drawGround(ctx);
  for (const base of state.bases) (base.alive ? drawBase : drawBrokenBase)(ctx, base.x, MOUND_TOP_Y);
  for (const city of state.cities) {
    if (city.alive) drawCity(ctx, city.x);
    else drawRubble(ctx, city.x);
  }

  // 残弾（基地の真下）
  for (const base of state.bases) {
    drawText(ctx, String(base.ammo), base.x, GROUND_Y + 14, base.ammo > 0 ? COLORS.ammo : COLORS.ammoEmpty, FONT_SCALE, 'center');
  }

  for (const m of state.enemies) drawEnemy(ctx, m);
  for (const i of state.impacts) drawImpact(ctx, i);
  for (const m of state.interceptors) drawInterceptor(ctx, m);
  for (const b of state.blasts) drawBlast(ctx, b, state.step);
  if (showCursor(state.wave)) drawCursor(ctx, state.cursor.x, state.cursor.y);

  // HUD（y = 8〜24）
  drawText(ctx, hud1pText(view.score), 8, 8, COLORS.hud1p);
  drawText(ctx, hudTopText(view.topScore), LOGICAL_WIDTH - 8, 8, COLORS.hudTop, FONT_SCALE, 'right');

  // ウェーブと終わりの表示（LLM-GUI-0001 §5）。画面の中央にそろえる
  for (const o of overlayTexts(state.wave, state.bonus)) drawText(ctx, o.text, LOGICAL_WIDTH / 2, o.y, o.color, o.scale, 'center');
}
