import type Phaser from 'phaser';

/**
 * Vẽ khối tường gạch chiếu xiên (mặt gạch so le + mặt trên), dùng chung cho
 * Bất Động Thành Lũy (`skills/fortressStand.ts`) và tường thành quanh làng (`world/castleWall.ts`).
 * Chỉ nhận một Graphics và thông số hình học; không giữ trạng thái.
 */

export const OUTLINE = 0x10141f;
export const MORTAR = 0x3e4558;
export const BRICK = 0x8793a8;

/** Chiều dài mong muốn của một viên gạch (px). */
const BRICK_LENGTH = 30;
/** Chiều cao mong muốn của một hàng gạch (px). */
const BRICK_ROW_HEIGHT = 11.5;

export interface Pt {
  x: number;
  y: number;
}

export interface BrickBoxSpec {
  /** Gốc hệ toạ độ (u, v) trong toạ độ vẽ của Graphics. */
  readonly originX: number;
  readonly originY: number;
  /** Hướng u (độ dày) và v = (-dirY, dirX) (bề ngang). */
  readonly dirX: number;
  readonly dirY: number;
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
  /** Vector nhô lên của khối (chiếu xiên); mặt có pháp tuyến ngược chiều vector này mới được vẽ. */
  readonly extX: number;
  readonly extY: number;
  /** Chiều cao khối (px) để chia hàng gạch. */
  readonly height: number;
  /** Chớp trắng khi trúng đòn. */
  readonly flash?: boolean;
  /** HP còn lại 0..1: dưới 0.6 / 0.3 thì hiện vết nứt (mặc định 1 = nguyên vẹn). */
  readonly ratio?: number;
  /** Chỉ vẽ các mặt đứng, bỏ mặt trên (dùng cho răng cưa xếp trên mặt trên của khối khác). */
  readonly skipTop?: boolean;
}

/** Nhân màu (0xRRGGBB) với hệ số sáng; > 1 pha về trắng. */
export function shade(color: number, factor: number): number {
  const mix = (c: number): number =>
    factor <= 1
      ? Math.round(c * factor)
      : Math.round(c + (255 - c) * (factor - 1));
  const r = mix((color >> 16) & 255);
  const g = mix((color >> 8) & 255);
  const b = mix(color & 255);

  return (r << 16) | (g << 8) | b;
}

function quad(g: Phaser.GameObjects.Graphics, a: Pt, b: Pt, c: Pt, d: Pt): void {
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
  g.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
}

function outline(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.lineStyle(2, OUTLINE, 1);

  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];

    g.lineBetween(a.x, a.y, b.x, b.y);
  }
}

/** Một mặt đứng: cạnh đáy p→q nhô lên theo (extX, extY); nền vữa tối + gạch so le mỗi hàng lệch nửa viên. */
function drawFace(
  g: Phaser.GameObjects.Graphics,
  spec: BrickBoxSpec,
  p: Pt,
  q: Pt,
  light: number,
): void {
  const { extX, extY, height } = spec;
  const ratio = spec.ratio ?? 1;
  const at = (s: number, t: number): Pt => ({
    x: p.x + (q.x - p.x) * s + extX * t,
    y: p.y + (q.y - p.y) * s + extY * t,
  });
  const length = Math.hypot(q.x - p.x, q.y - p.y);
  const perRow = Math.max(1, Math.round(length / BRICK_LENGTH));
  const rows = Math.max(2, Math.round(height / BRICK_ROW_HEIGHT));
  const gapS = 1.5 / Math.max(length, 1);
  const gapT = 1.5 / Math.max(height, 1);
  const base = spec.flash ? 0xffffff : BRICK;

  g.fillStyle(shade(MORTAR, light), 1);
  quad(g, at(0, 0), at(1, 0), at(1, 1), at(0, 1));

  for (let r = 0; r < rows; r += 1) {
    const t0 = r / rows + gapT;
    const t1 = (r + 1) / rows - gapT;
    const offset = r % 2 === 0 ? 0 : 0.5 / perRow;

    for (let k = -1; k <= perRow; k += 1) {
      const s0 = Math.max(0, offset + k / perRow) + gapS;
      const s1 = Math.min(1, offset + (k + 1) / perRow) - gapS;

      if (s1 - s0 < gapS * 2) {
        continue;
      }

      // Mỗi viên lệch sắc nhẹ (ổn định theo vị trí) cho tường có chất liệu.
      const tint = 0.9 + ((r * 7 + k * 13 + 29) % 5) * 0.04;
      const top = t1 - (t1 - t0) * 0.22;

      g.fillStyle(shade(base, light * tint), 1);
      quad(g, at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1));
      g.fillStyle(shade(base, light * tint * 1.25), 1);
      quad(g, at(s0, top), at(s1, top), at(s1, t1), at(s0, t1));
    }
  }

  // Vết nứt khi HP thấp.
  g.lineStyle(2, OUTLINE, 0.9);

  if (ratio < 0.6) {
    const a = at(0.3, 0.95);
    const b = at(0.38, 0.55);
    const c = at(0.3, 0.3);

    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineBetween(b.x, b.y, c.x, c.y);
  }

  if (ratio < 0.3) {
    const a = at(0.7, 0.9);
    const b = at(0.62, 0.5);
    const c = at(0.72, 0.15);

    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineBetween(b.x, b.y, c.x, c.y);
  }

  outline(g, [at(0, 0), at(1, 0), at(1, 1), at(0, 1)]);
}

/** Vẽ khối tường: các mặt đứng hướng về camera rồi mặt trên sáng. */
export function drawBrickBox(
  g: Phaser.GameObjects.Graphics,
  spec: BrickBoxSpec,
): void {
  const { originX, originY, dirX, dirY, u0, u1, v0, v1, extX, extY } = spec;
  const perpX = -dirY;
  const perpY = dirX;
  const corner = (u: number, v: number): Pt => ({
    x: originX + dirX * u + perpX * v,
    y: originY + dirY * u + perpY * v,
  });
  const ext = (pt: Pt): Pt => ({ x: pt.x + extX, y: pt.y + extY });

  const faces: Array<{ p: Pt; q: Pt; nx: number; ny: number; light: number }> = [
    { p: corner(u1, v0), q: corner(u1, v1), nx: dirX, ny: dirY, light: 1 },
    { p: corner(u0, v0), q: corner(u0, v1), nx: -dirX, ny: -dirY, light: 0.85 },
    { p: corner(u0, v0), q: corner(u1, v0), nx: -perpX, ny: -perpY, light: 0.7 },
    { p: corner(u0, v1), q: corner(u1, v1), nx: perpX, ny: perpY, light: 0.7 },
  ];

  for (const face of faces) {
    if (face.nx * extX + face.ny * extY < 0) {
      drawFace(g, spec, face.p, face.q, face.light);
    }
  }

  if (spec.skipTop) {
    return;
  }

  const top = [
    ext(corner(u0, v0)),
    ext(corner(u1, v0)),
    ext(corner(u1, v1)),
    ext(corner(u0, v1)),
  ];

  g.fillStyle(shade(spec.flash ? 0xffffff : BRICK, 1.35), 1);
  quad(g, top[0], top[1], top[2], top[3]);
  outline(g, top);
}
