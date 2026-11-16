import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ENEMY_VARIANT_PALETTES, ENEMY_VISUALS } from '../config/enemyVisualConfig';
import {
  ENEMY_VARIANT_CLIPS,
  ENEMY_VARIANT_FRAME_SIZE,
  ENEMY_VARIANT_IDS,
  drawVariantFrame,
  variantFrameNames,
  type EnemyVariantAction,
  type EnemyVariantId,
} from './enemyVariantSprites';

interface FillCall {
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Context giả: ghi lại mọi fillRect (đã cộng translate) và màu; bỏ qua ellipse/bóng. */
function recordFrame(variant: EnemyVariantId, action: EnemyVariantAction, frame: number): { rects: FillCall[]; colors: Set<string> } {
  const rects: FillCall[] = [];
  const colors = new Set<string>();
  const stack: [number, number][] = [];
  let tx = 0;
  let ty = 0;
  let fillStyle = '';
  const context = {
    set fillStyle(value: string) {
      fillStyle = value;
    },
    get fillStyle(): string {
      return fillStyle;
    },
    imageSmoothingEnabled: true,
    save: () => stack.push([tx, ty]),
    restore: () => {
      [tx, ty] = stack.pop() as [number, number];
    },
    translate: (x: number, y: number) => {
      tx += x;
      ty += y;
    },
    beginPath: () => undefined,
    ellipse: () => undefined,
    fill: () => {
      colors.add(fillStyle);
    },
    fillRect: (x: number, y: number, w: number, h: number) => {
      colors.add(fillStyle);
      rects.push({ color: fillStyle, x: x + tx, y: y + ty, w, h });
    },
  } as unknown as CanvasRenderingContext2D;

  drawVariantFrame(context, 0, 0, variant, action, frame);

  return { rects, colors };
}

function enemySheetClipText(): string {
  return readFileSync(fileURLToPath(new URL('./enemySprites.ts', import.meta.url)), 'utf8');
}

describe('enemyVariantSprites: hợp đồng clip và tên frame', () => {
  it('bộ clip = idle 2f@4, walk 4f@9, attack 2f@10 (lặp 0), death 2f@7, y hệt ACTION_SPECS của sheet enemy', () => {
    expect(ENEMY_VARIANT_CLIPS).toEqual([
      { action: 'idle', frames: 2, frameRate: 4, repeat: -1 },
      { action: 'walk', frames: 4, frameRate: 9, repeat: -1 },
      { action: 'attack', frames: 2, frameRate: 10, repeat: 0 },
      { action: 'death', frames: 2, frameRate: 7, repeat: 0 },
    ]);

    const parsed = [
      ...enemySheetClipText().matchAll(
        /\{\s*action:\s*'(\w+)',\s*frames:\s*(\d+),\s*frameRate:\s*(\d+),\s*repeat:\s*(-?\d+)\s*\}/g,
      ),
    ].map((m) => ({ action: m[1], frames: Number(m[2]), frameRate: Number(m[3]), repeat: Number(m[4]) }));

    expect(ENEMY_VARIANT_CLIPS).toEqual(parsed);
  });

  it('chết <= 340 ms, tấn công <= 200 ms', () => {
    const ms = (action: string): number => {
      const clip = ENEMY_VARIANT_CLIPS.find((c) => c.action === action);

      return ((clip?.frames ?? 0) / (clip?.frameRate ?? 1)) * 1000;
    };

    expect(ms('death')).toBeLessThanOrEqual(340);
    expect(ms('attack')).toBeLessThanOrEqual(200);
  });

  it('khung 24 px; tên frame `<prefix>-<action>-<i>` đủ 10 frame theo thứ tự', () => {
    expect(ENEMY_VARIANT_FRAME_SIZE).toBe(24);
    expect(variantFrameNames('enemy-swarmer')).toEqual([
      'enemy-swarmer-idle-0',
      'enemy-swarmer-idle-1',
      'enemy-swarmer-walk-0',
      'enemy-swarmer-walk-1',
      'enemy-swarmer-walk-2',
      'enemy-swarmer-walk-3',
      'enemy-swarmer-attack-0',
      'enemy-swarmer-attack-1',
      'enemy-swarmer-death-0',
      'enemy-swarmer-death-1',
    ]);
  });

  it('EnemyBase khởi tạo bằng `<animPrefix>-idle-0`: frame này có trong sheet mới', () => {
    for (const id of ENEMY_VARIANT_IDS) {
      expect(variantFrameNames(ENEMY_VISUALS[id].animPrefix)).toContain(`${ENEMY_VISUALS[id].animPrefix}-idle-0`);
    }
  });
});

describe('enemyVariantSprites: nội dung vẽ', () => {
  const allFrames: { variant: EnemyVariantId; action: EnemyVariantAction; frame: number }[] = [];

  for (const variant of ENEMY_VARIANT_IDS) {
    for (const clip of ENEMY_VARIANT_CLIPS) {
      for (let frame = 0; frame < clip.frames; frame += 1) {
        allFrames.push({ variant, action: clip.action, frame });
      }
    }
  }

  it('mọi màu vẽ thuộc bảng đã duyệt (hoặc bóng rgba) và mọi pixel nằm trong khung 24', () => {
    for (const { variant, action, frame } of allFrames) {
      const palette = Object.values(ENEMY_VARIANT_PALETTES[variant]) as string[];
      const { rects, colors } = recordFrame(variant, action, frame);

      expect(rects.length, `${variant} ${action}-${frame}`).toBeGreaterThan(0);

      for (const color of colors) {
        expect(palette.includes(color) || color === 'rgba(0, 0, 0, 0.3)', `${variant} ${action}-${frame}: ${color}`).toBe(true);
      }

      for (const rect of rects) {
        const label = `${variant} ${action}-${frame}`;

        expect(rect.x, label).toBeGreaterThanOrEqual(0);
        expect(rect.y, label).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w, label).toBeLessThanOrEqual(ENEMY_VARIANT_FRAME_SIZE);
        expect(rect.y + rect.h, label).toBeLessThanOrEqual(ENEMY_VARIANT_FRAME_SIZE);
      }
    }
  });

  it('khung sống (idle/walk/attack) có mảng nhận dạng màu accent >= 2x2 (mắt/gai)', () => {
    for (const { variant, action, frame } of allFrames) {
      if (action === 'death') {
        continue;
      }

      const accent = ENEMY_VARIANT_PALETTES[variant].accent;
      const { rects } = recordFrame(variant, action, frame);

      expect(
        rects.some((r) => r.color === accent && r.w >= 2 && r.h >= 2),
        `${variant} ${action}-${frame} thiếu mảng accent >= 2x2`,
      ).toBe(true);
    }
  });

  it('Swarmer có >= 3 gai accent 2x2+ (mắt tính riêng), Brute có khe mắt accent rộng >= 4', () => {
    const swarmer = recordFrame('swarmer', 'idle', 0).rects.filter(
      (r) => r.color === ENEMY_VARIANT_PALETTES.swarmer.accent && r.y < 9,
    );

    expect(swarmer.filter((r) => r.w >= 2 && r.h >= 2).length).toBeGreaterThanOrEqual(3);

    const brute = recordFrame('brute', 'idle', 0).rects.filter((r) => r.color === ENEMY_VARIANT_PALETTES.brute.accent);

    expect(brute.some((r) => r.w >= 4 && r.w > r.h)).toBe(true);
  });

  it('Brute: thân/vai/nắm đấm nhô ra mỗi bên <= 8 px thế giới (3 px nguồn x 2.5) so với hitbox 40 ở các khung sống', () => {
    const visual = ENEMY_VISUALS.brute;
    const bodyLeft = (ENEMY_VARIANT_FRAME_SIZE - visual.bodySize) / 2;
    const bodyRight = bodyLeft + visual.bodySize;

    for (const clip of ENEMY_VARIANT_CLIPS) {
      if (clip.action === 'death') {
        continue;
      }

      for (let frame = 0; frame < clip.frames; frame += 1) {
        const { rects } = recordFrame('brute', clip.action, frame);
        const minX = Math.min(...rects.map((r) => r.x));
        const maxX = Math.max(...rects.map((r) => r.x + r.w));

        expect((bodyLeft - minX) * visual.displayScale, `brute ${clip.action}-${frame} trái`).toBeLessThanOrEqual(8);
        expect((maxX - bodyRight) * visual.displayScale, `brute ${clip.action}-${frame} phải`).toBeLessThanOrEqual(8);
        // Thân chính rộng xấp xỉ hitbox: vẽ phủ gần hết bề ngang body.
        expect(maxX - minX, `brute ${clip.action}-${frame} bề rộng`).toBeGreaterThanOrEqual(visual.bodySize);
      }
    }
  });

  it('Swarmer không có tay: không có hình chữ nhật nào nằm ngoài thân ở hai bên trong khung đứng', () => {
    const { rects } = recordFrame('swarmer', 'idle', 0);
    const solid = rects.filter((r) => r.color !== ENEMY_VARIANT_PALETTES.swarmer.outline);

    expect(Math.min(...solid.map((r) => r.x))).toBeGreaterThanOrEqual(4);
    expect(Math.max(...solid.map((r) => r.x + r.w))).toBeLessThanOrEqual(20);
  });
});

describe('enemyVariantSprites.ts: nơi duy nhất dùng canvas; không nạp Phaser lúc chạy', () => {
  it('chỉ nhập kiểu từ phaser (import type)', () => {
    const text = readFileSync(fileURLToPath(new URL('./enemyVariantSprites.ts', import.meta.url)), 'utf8');

    expect(text).toMatch(/import type Phaser from 'phaser';/);
    expect(text).not.toMatch(/^import Phaser from 'phaser';/m);
    expect(text).not.toMatch(/Math\s*\.\s*random|\bDate\s*\./);
  });
});
