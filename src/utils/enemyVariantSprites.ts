/**
 * Sheet procedural cho hai archetype quái mới (Gói M2, docs/GAMEPLAY_LOOP_M.md §3b V1): Swarmer (`enemy-swarmer`) và
 * Brute (`enemy-bruiser`). Cùng hợp đồng với sheet `enemy`: khung 24 px, tên frame `<prefix>-<action>-<i>`, anim
 * `<prefix>-<action>`, clip idle 2f / walk 4f / attack 2f (lặp 0, pose giữ ở frame cuối) / death 2f, cùng fps;
 * quay mặt sang phải (Enemy lật ngang bằng setFlipX).
 *
 * Phần vẽ dùng `CanvasRenderingContext2D` thuần (test kiểm bằng context giả); chỉ `createEnemyVariantSheets` chạm
 * Phaser (nhập kiểu thôi, không nạp runtime Phaser). Bảng màu và cỡ ở `config/enemyVisualConfig.ts`.
 * Ba helper `px`/`shadow`/`silhouette` được viết lại ở đây (cùng cách làm với enemySprites.ts, không nhập từ đó vì
 * enemySprites nạp Phaser lúc chạy nên không import được trong test Node).
 */
import type Phaser from 'phaser';

import { ENEMY_VARIANT_PALETTES, ENEMY_VISUALS, type EnemyVariantPalette } from '../config/enemyVisualConfig';

export type EnemyVariantId = 'swarmer' | 'brute';
export type EnemyVariantAction = 'idle' | 'walk' | 'attack' | 'death';

/** Cạnh khung (px), như sheet `enemy`/`rangedEnemy`. */
export const ENEMY_VARIANT_FRAME_SIZE = 24;

interface VariantClip {
  readonly action: EnemyVariantAction;
  readonly frames: number;
  readonly frameRate: number;
  readonly repeat: number;
}

/** Y hệt bộ clip của sheet `enemy` (enemySprites.ts ACTION_SPECS); test đối chiếu văn bản hai bảng. */
export const ENEMY_VARIANT_CLIPS: readonly VariantClip[] = [
  { action: 'idle', frames: 2, frameRate: 4, repeat: -1 },
  { action: 'walk', frames: 4, frameRate: 9, repeat: -1 },
  { action: 'attack', frames: 2, frameRate: 10, repeat: 0 },
  { action: 'death', frames: 2, frameRate: 7, repeat: 0 },
];

export const ENEMY_VARIANT_IDS: readonly EnemyVariantId[] = ['swarmer', 'brute'];

/** Tên mọi frame của một sheet theo thứ tự ô trong canvas (idle-0, idle-1, walk-0..3, attack-0..1, death-0..1). */
export function variantFrameNames(prefix: string): string[] {
  const names: string[] = [];

  for (const clip of ENEMY_VARIANT_CLIPS) {
    for (let frame = 0; frame < clip.frames; frame += 1) {
      names.push(`${prefix}-${clip.action}-${frame}`);
    }
  }

  return names;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: string;
}

function px(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width = 1,
  height = 1,
): void {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function shadow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
): void {
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

/** Vẽ viền 1 px quanh hợp của mọi hình chữ nhật (viền trước, màu sau) để các khối nối liền không có đường kẻ giữa. */
function silhouette(
  context: CanvasRenderingContext2D,
  outline: string,
  rects: readonly Rect[],
): void {
  for (const rect of rects) {
    px(context, outline, rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
  }

  for (const rect of rects) {
    px(context, rect.color, rect.x, rect.y, rect.w, rect.h);
  }
}

// ───────────────────────────── Swarmer: khối tròn nhỏ, gai trên lưng, hai mắt tròn, chân ngắn, không tay ─────────────────────────────

function drawSwarmer(
  context: CanvasRenderingContext2D,
  palette: EnemyVariantPalette,
  action: EnemyVariantAction,
  frame: number,
): void {
  const attacking = action === 'attack';
  // Nhún nhẹ khi đứng/đi; tấn công: frame 0 thu người xuống, frame 1 bật lên (pose giữ).
  const dy =
    action === 'walk'
      ? frame % 2 === 0
        ? 0
        : -1
      : action === 'idle' && frame === 1
        ? 1
        : attacking
          ? frame === 0
            ? 1
            : -1
          : 0;
  const leftLift = action === 'walk' && frame === 0;
  const rightLift = action === 'walk' && frame === 2;

  shadow(context, 12, 22.5, 8, 2);
  context.save();
  context.translate(0, dy);

  const parts: Rect[] = [
    // Gai trên lưng (kem): giữa to, hai bên nhỏ; mỗi gai >= 2x2.
    { x: 11, y: 4, w: 2, h: 2, color: palette.accent },
    { x: 10, y: 6, w: 4, h: 2, color: palette.accent },
    { x: 7, y: 6, w: 2, h: 2, color: palette.accent },
    { x: 15, y: 6, w: 2, h: 2, color: palette.accent },
    // Chân ngắn.
    { x: 7, y: 19, w: 3, h: leftLift ? 1 : 2, color: palette.dark },
    { x: 14, y: 19, w: 3, h: rightLift ? 1 : 2, color: palette.dark },
    // Thân tròn (bậc thang), phần dưới tối hơn.
    { x: 8, y: 9, w: 8, h: 1, color: palette.body },
    { x: 6, y: 10, w: 12, h: 1, color: palette.body },
    { x: 5, y: 11, w: 14, h: 2, color: palette.body },
    { x: 4, y: 13, w: 16, h: 3, color: palette.body },
    { x: 5, y: 16, w: 14, h: 1, color: palette.dark },
    { x: 6, y: 17, w: 12, h: 1, color: palette.dark },
    { x: 8, y: 18, w: 8, h: 1, color: palette.dark },
  ];

  silhouette(context, palette.outline, parts);

  // Vệt sáng phía trên bên trái.
  px(context, palette.light, 6, 11, 3, 1);
  px(context, palette.light, 5, 12, 2, 2);

  // Hai mắt tròn (kem 2x3) nhìn sang phải; tấn công: lông mày dựng và miệng há.
  px(context, palette.accent, 9, 11, 2, 3);
  px(context, palette.accent, 13, 11, 2, 3);
  px(context, palette.outline, 10, 13, 1, 1);
  px(context, palette.outline, 14, 13, 1, 1);

  if (attacking) {
    px(context, palette.outline, 8, 10, 3, 1);
    px(context, palette.outline, 13, 10, 3, 1);
    px(context, palette.outline, 10, 15, 4, 1);
    px(context, palette.accent, 11, 15, 2, 1);
  }

  context.restore();
}

function drawSwarmerDeath(
  context: CanvasRenderingContext2D,
  palette: EnemyVariantPalette,
  frame: number,
): void {
  shadow(context, 12, 22.5, 9, 2.2);

  if (frame === 0) {
    // Bị bẹp, gai văng ra hai bên.
    silhouette(context, palette.outline, [
      { x: 3, y: 11, w: 2, h: 2, color: palette.accent },
      { x: 19, y: 10, w: 2, h: 2, color: palette.accent },
      { x: 7, y: 15, w: 10, h: 1, color: palette.body },
      { x: 5, y: 16, w: 14, h: 1, color: palette.body },
      { x: 4, y: 17, w: 16, h: 3, color: palette.body },
      { x: 5, y: 20, w: 14, h: 1, color: palette.dark },
      { x: 7, y: 21, w: 10, h: 1, color: palette.dark },
    ]);
    px(context, palette.light, 6, 17, 3, 1);
    px(context, palette.accent, 8, 17, 2, 2);
    px(context, palette.accent, 14, 17, 2, 2);
    px(context, palette.outline, 8, 17, 1, 1);
    px(context, palette.outline, 9, 18, 1, 1);
    px(context, palette.outline, 14, 17, 1, 1);
    px(context, palette.outline, 15, 18, 1, 1);

    return;
  }

  // Vũng dẹt, gai nằm quanh.
  silhouette(context, palette.outline, [
    { x: 6, y: 19, w: 12, h: 1, color: palette.body },
    { x: 3, y: 20, w: 18, h: 2, color: palette.dark },
    { x: 4, y: 17, w: 2, h: 2, color: palette.accent },
    { x: 18, y: 17, w: 2, h: 2, color: palette.accent },
    { x: 11, y: 17, w: 2, h: 2, color: palette.accent },
  ]);
  px(context, palette.light, 7, 19, 3, 1);
}

// ───────────────────────────── Brute: thân hình thang rộng, đầu chìm giữa hai vai, hai nắm đấm to, mắt khe ngang ─────────────────────────────

function drawBrute(
  context: CanvasRenderingContext2D,
  palette: EnemyVariantPalette,
  action: EnemyVariantAction,
  frame: number,
): void {
  const walking = action === 'walk';
  const attacking = action === 'attack';
  const step = walking ? [-1, 0, 1, 0][frame] : 0;
  const swing = walking ? [1, 0, -1, 0][frame] : 0;
  const bob = walking ? (frame % 2 === 0 ? 0 : 1) : action === 'idle' && frame === 1 ? 1 : 0;

  // Nắm đấm: tấn công frame 0 giơ cao, frame 1 giáng xuống (giữ pose); thường thì đung đưa khi đi.
  const armY = attacking ? (frame === 0 ? 7 : 10) : 10;
  const armH = attacking ? (frame === 0 ? 3 : 7) : 4;
  const fistLeftY = attacking ? (frame === 0 ? 3 : 17) : 14 + swing;
  const fistRightY = attacking ? (frame === 0 ? 3 : 17) : 14 - swing;

  shadow(context, 12, 22.5, 8, 2);
  context.save();
  context.translate(0, bob);

  const parts: Rect[] = [
    // Chân.
    { x: 7, y: 18, w: 4, h: step > 0 ? 3 : 4, color: palette.dark },
    { x: 13, y: 18, w: 4, h: step < 0 ? 3 : 4, color: palette.dark },
    // Tay + nắm đấm to (nhô ra mỗi bên tối đa 3 px nguồn so với thân).
    { x: 3, y: armY + (attacking ? 0 : swing), w: 3, h: armH, color: palette.body },
    { x: 18, y: armY + (attacking ? 0 : -swing), w: 3, h: armH, color: palette.body },
    { x: 2, y: fistLeftY, w: 4, h: 4, color: palette.light },
    { x: 18, y: fistRightY, w: 4, h: 4, color: palette.light },
    // Thân hình thang: vai rộng, hẹp dần xuống hông.
    { x: 5, y: 10, w: 14, h: 3, color: palette.body },
    { x: 6, y: 13, w: 12, h: 2, color: palette.body },
    { x: 7, y: 15, w: 10, h: 2, color: palette.dark },
    { x: 8, y: 17, w: 8, h: 1, color: palette.dark },
    // Giáp vai và đầu chìm giữa hai vai.
    { x: 3, y: 5, w: 4, h: 5, color: palette.body },
    { x: 17, y: 5, w: 4, h: 5, color: palette.body },
    { x: 8, y: 5, w: 8, h: 5, color: palette.body },
  ];

  silhouette(context, palette.outline, parts);

  // Sáng/tối: vai, ngực, nắm đấm, hàm.
  px(context, palette.light, 3, 5, 3, 1);
  px(context, palette.light, 18, 5, 3, 1);
  px(context, palette.light, 6, 10, 4, 1);
  px(context, palette.dark, 11, 11, 2, 4);
  px(context, palette.dark, 9, 9, 6, 1);
  px(context, palette.dark, 2, fistLeftY + 3, 4, 1);
  px(context, palette.dark, 18, fistRightY + 3, 4, 1);

  // Mắt là khe ngang (kem) dưới lông mày nặng.
  px(context, palette.outline, 9, 6, 6, 1);
  px(context, palette.accent, 9, 7, 6, 2);

  if (attacking && frame === 1) {
    px(context, palette.outline, 10, 9, 4, 1);
  }

  context.restore();
}

function drawBruteDeath(
  context: CanvasRenderingContext2D,
  palette: EnemyVariantPalette,
  frame: number,
): void {
  shadow(context, 12, 22.5, 9, 2.2);

  if (frame === 0) {
    // Khuỵu xuống, đầu gục.
    silhouette(context, palette.outline, [
      { x: 7, y: 20, w: 4, h: 2, color: palette.dark },
      { x: 13, y: 20, w: 4, h: 2, color: palette.dark },
      { x: 2, y: 17, w: 4, h: 3, color: palette.light },
      { x: 18, y: 17, w: 4, h: 3, color: palette.light },
      { x: 5, y: 13, w: 14, h: 4, color: palette.body },
      { x: 6, y: 17, w: 12, h: 3, color: palette.dark },
      { x: 3, y: 11, w: 4, h: 4, color: palette.body },
      { x: 17, y: 11, w: 4, h: 4, color: palette.body },
      { x: 8, y: 10, w: 8, h: 4, color: palette.body },
    ]);
    px(context, palette.accent, 9, 12, 6, 2);
    px(context, palette.outline, 9, 11, 6, 1);

    return;
  }

  // Đổ gục thành đống, nắm đấm văng ra hai bên.
  silhouette(context, palette.outline, [
    { x: 2, y: 19, w: 4, h: 3, color: palette.light },
    { x: 18, y: 19, w: 4, h: 3, color: palette.light },
    { x: 4, y: 17, w: 16, h: 3, color: palette.body },
    { x: 5, y: 20, w: 14, h: 2, color: palette.dark },
    { x: 8, y: 14, w: 8, h: 3, color: palette.body },
  ]);
  px(context, palette.accent, 9, 15, 2, 1);
  px(context, palette.accent, 13, 15, 2, 1);
}

/** Vẽ một khung của quái mới tại ô có gốc (originX, originY). Thuần theo `context`. */
export function drawVariantFrame(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  variant: EnemyVariantId,
  action: EnemyVariantAction,
  frame: number,
): void {
  const palette = ENEMY_VARIANT_PALETTES[variant];

  context.save();
  context.translate(originX, originY);
  context.imageSmoothingEnabled = false;

  if (variant === 'swarmer') {
    if (action === 'death') {
      drawSwarmerDeath(context, palette, frame);
    } else {
      drawSwarmer(context, palette, action, frame);
    }
  } else if (action === 'death') {
    drawBruteDeath(context, palette, frame);
  } else {
    drawBrute(context, palette, action, frame);
  }

  context.restore();
}

function createVariantAnimations(
  scene: Phaser.Scene,
  textureKey: string,
  prefix: string,
  walkFps: number | undefined,
): void {
  for (const clip of ENEMY_VARIANT_CLIPS) {
    const key = `${prefix}-${clip.action}`;

    if (scene.anims.exists(key)) {
      continue;
    }

    scene.anims.create({
      key,
      frames: Array.from({ length: clip.frames }, (_, index) => ({
        key: textureKey,
        frame: `${prefix}-${clip.action}-${index}`,
      })),
      frameRate: clip.action === 'walk' && walkFps !== undefined ? walkFps : clip.frameRate,
      repeat: clip.repeat,
    });
  }
}

/** Sinh hai sheet (và anim) Swarmer/Brute; gọi từ `createEnemySpriteSheets` (PreloadScene). */
export function createEnemyVariantSheets(scene: Phaser.Scene): void {
  const totalFrames = ENEMY_VARIANT_CLIPS.reduce((total, clip) => total + clip.frames, 0);
  const size = ENEMY_VARIANT_FRAME_SIZE;

  for (const variant of ENEMY_VARIANT_IDS) {
    const visual = ENEMY_VISUALS[variant];

    if (!scene.textures.exists(visual.textureKey)) {
      const texture = scene.textures.createCanvas(visual.textureKey, size * totalFrames, size);

      if (!texture) {
        continue;
      }

      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      let frameIndex = 0;

      for (const clip of ENEMY_VARIANT_CLIPS) {
        for (let frame = 0; frame < clip.frames; frame += 1) {
          const x = frameIndex * size;

          drawVariantFrame(context, x, 0, variant, clip.action, frame);
          texture.add(`${visual.animPrefix}-${clip.action}-${frame}`, 0, x, 0, size, size);
          frameIndex += 1;
        }
      }

      texture.refresh();
    }

    createVariantAnimations(scene, visual.textureKey, visual.animPrefix, visual.walkFps);
  }
}
