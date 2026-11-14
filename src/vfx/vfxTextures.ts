import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import {
  ELEMENT_PALETTE,
  ELEMENT_TYPES,
  type DamageType,
} from '../config/damageTypeConfig';
import { NEON } from '../config/palette';
import {
  ENEMY_BULLET_VISUAL,
  VFX_RING_RADIUS,
  VFX_SLASH_FRAME,
  VFX_SLASH_FRAMES,
  VFX_SLASH_RADIUS,
} from '../config/vfxConfig';

/** Ô lưới pixel của mọi texture VFX (giữ khối pixel đồng nhất). */
const CELL = 2;

export const VFX_TEXTURES = {
  pixel: 'vfx-pixel',
  ring: 'vfx-ring',
  slash: 'vfx-slash',
  crack: 'vfx-crack',
  aura: 'vfx-aura',
  spear: 'vfx-spear',
  spearSharp: 'vfx-spear-sharp',
  ellipse: 'vfx-ellipse',
  bolt: 'vfx-bolt',
} as const;

export const VFX_ANIMS = {
  slash: 'vfx.slash.arc',
} as const;

type Cell = (cx: number, cy: number) => number;

/** Tô từng ô CELL×CELL; hàm trả alpha (0 = bỏ qua). Màu gốc luôn trắng để tint. */
function paint(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  cell: Cell,
  frames = 1,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({}, false);

  for (let y = 0; y < height; y += CELL) {
    for (let x = 0; x < width; x += CELL) {
      const alpha = cell(x + CELL / 2, y + CELL / 2);

      if (alpha > 0) {
        graphics.fillStyle(0xffffff, alpha);
        graphics.fillRect(x, y, CELL, CELL);
      }
    }
  }

  graphics.generateTexture(key, width, height);
  graphics.destroy();

  if (frames > 1) {
    const texture = scene.textures.get(key);
    const frameWidth = width / frames;

    for (let i = 0; i < frames; i += 1) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, height);
    }
  }
}

/** Số giả ngẫu nhiên cố định để texture giống nhau mỗi lần chạy. */
function seeded(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function createSlash(scene: Phaser.Scene): void {
  const size = VFX_SLASH_FRAME;
  const center = size / 2;
  const start = Phaser.Math.DegToRad(-55);
  const end = Phaser.Math.DegToRad(55);
  const trail = Phaser.Math.DegToRad(75);

  paint(
    scene,
    VFX_TEXTURES.slash,
    size * VFX_SLASH_FRAMES,
    size,
    (px, py) => {
      const frame = Math.floor(px / size);
      const dx = px - frame * size - center;
      const dy = py - center;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const head = start + (end - start) * ((frame + 1) / VFX_SLASH_FRAMES);
      const tail = Math.max(start, head - trail);

      if (angle < tail || angle > head) {
        return 0;
      }

      const t = (angle - tail) / Math.max(0.001, head - tail);
      const thickness = 2 + 10 * t;
      const outer = VFX_SLASH_RADIUS;

      if (radius > outer || radius < outer - thickness) {
        return 0;
      }

      // Mép ngoài sáng nhất, đuôi mờ dần.
      const edge = radius > outer - 3 ? 1 : 0.7;

      return Math.min(1, (0.25 + 0.75 * t) * edge);
    },
    VFX_SLASH_FRAMES,
  );

  if (!scene.anims.exists(VFX_ANIMS.slash)) {
    scene.anims.create({
      key: VFX_ANIMS.slash,
      frames: Array.from({ length: VFX_SLASH_FRAMES }, (_, i) => ({
        key: VFX_TEXTURES.slash,
        frame: i,
      })),
      frameRate: 30,
    });
  }
}

function createRing(scene: Phaser.Scene): void {
  const size = 128;
  const center = size / 2;

  paint(scene, VFX_TEXTURES.ring, size, size, (px, py) => {
    const radius = Math.hypot(px - center, py - center);
    const delta = VFX_RING_RADIUS - radius;

    if (delta < -2 || delta > 6) {
      return 0;
    }

    return delta < 2 ? 1 : 0.5;
  });
}

function createCrack(scene: Phaser.Scene): void {
  const size = 128;
  const center = size / 2;
  const random = seeded(7);
  const hit = new Set<string>();

  for (let branch = 0; branch < 9; branch += 1) {
    let angle = (Math.PI * 2 * branch) / 9 + (random() - 0.5) * 0.5;
    let x = center;
    let y = center;
    const length = 46 + random() * 14;

    for (let step = 0; step < length; step += CELL) {
      angle += (random() - 0.5) * 0.7;
      x += Math.cos(angle) * CELL;
      y += Math.sin(angle) * CELL;
      const gx = Math.floor(x / CELL) * CELL;
      const gy = Math.floor(y / CELL) * CELL;

      hit.add(`${gx},${gy}`);

      if (step < 20) {
        hit.add(`${gx + CELL},${gy}`);
      }
    }
  }

  paint(scene, VFX_TEXTURES.crack, size, size, (px, py) => {
    const gx = Math.floor(px / CELL) * CELL;
    const gy = Math.floor(py / CELL) * CELL;

    return hit.has(`${gx},${gy}`) ? 1 : 0;
  });
}

function createAura(scene: Phaser.Scene): void {
  const width = 96;
  const height = 48;

  paint(scene, VFX_TEXTURES.aura, width, height, (px, py) => {
    const nx = (px - width / 2) / (width / 2 - 2);
    const ny = (py - height / 2) / (height / 2 - 2);
    const radius = Math.hypot(nx, ny);

    if (radius > 1 || radius < 0.86) {
      return 0;
    }

    // Đứt đoạn theo góc để giống vòng rune.
    const segment = Math.floor((Math.atan2(ny, nx) + Math.PI) / (Math.PI / 12));

    return segment % 2 === 0 ? 1 : 0.45;
  });
}

/**
 * Mũi thương hướng sang phải (gốc ở mép trái, origin 0, 0.5).
 * - Thường (Vạn Thương Ảnh): hình lá — nhỏ sát người, phình ở giữa, thu về mũi nhọn.
 * - `sharp` (Xung Phong / Đập Đất): thân thon phình dần, đầu mũi tên có ngạnh rồi thu thẳng
 *   thành mũi kim rất nhọn.
 */
function createSpear(scene: Phaser.Scene, key: string, sharp: boolean): void {
  const width = 128;
  const height = 16;
  const mid = height / 2;

  paint(scene, key, width, height, (px, py) => {
    const t = px / width;
    const dy = Math.abs(py - mid);
    let half: number;

    if (sharp) {
      // Theo hình vẽ: thân thon → ngạnh loe ra nhanh (cánh xoè về sau) → hai cạnh THẲNG hội tụ ở mũi kim.
      const shaftEnd = 0.42; // hết thân, bắt đầu loe ngạnh
      const barb = 0.6; // chỗ rộng nhất (đầu ngạnh)

      if (t < shaftEnd) {
        half = 0.8 + 2.2 * (t / shaftEnd); // 0.8 → 3.0
      } else if (t < barb) {
        half = 3.0 + 4.7 * ((t - shaftEnd) / (barb - shaftEnd)); // 3.0 → 7.7
      } else {
        half = 7.7 * (1 - (t - barb) / (1 - barb)); // cạnh thẳng tới mũi nhọn
      }
    } else {
      const peak = 0.5;
      const maxHalf = 7.5;
      const rootHalf = 0.8;

      if (t < peak) {
        const u = t / peak;

        half = rootHalf + (maxHalf - rootHalf) * (u * u * (3 - 2 * u));
      } else {
        half = maxHalf * Math.pow(1 - (t - peak) / (1 - peak), 1.8);
      }
    }

    if (dy > half) {
      return 0;
    }

    // Lõi sáng ở giữa, mép mờ hơn; phần gốc mờ dần vào nhân vật.
    const fade = 0.4 + 0.6 * Math.min(1, t / 0.25);

    return (dy <= 1 ? 1 : 0.85) * fade;
  });
}

/**
 * Vòng sóng elip đôi (hai đường lồng nhau, nét đều): trục ngắn dọc trục x, trục dài dọc trục y.
 * Xoay theo hướng thương nên trục ngắn nằm dọc thân thương.
 */
function createEllipse(scene: Phaser.Scene): void {
  const width = 32;
  const height = 128;
  const a = width / 2 - 1;
  const b = height / 2 - 1;

  paint(scene, VFX_TEXTURES.ellipse, width, height, (px, py) => {
    const r = Math.hypot((px - width / 2) / a, (py - height / 2) / b);

    // Đường ngoài đậm, đường trong nhạt hơn.
    if (r > 0.88 && r <= 1) {
      return 1;
    }

    return r > 0.66 && r <= 0.74 ? 0.7 : 0;
  });
}

/** Tia sét ngoằn ngoèo từ trái sang phải (origin 0, 0.5); kéo giãn/xoay để nối hai điểm. */
function createBolt(scene: Phaser.Scene): void {
  const width = 128;
  const height = 32;
  const random = seeded(23);
  const hit = new Set<string>();
  const points: { x: number; y: number }[] = [{ x: 0, y: height / 2 }];

  for (let x = 12; x < width; x += 12) {
    points.push({ x, y: height / 2 + (random() - 0.5) * 20 });
  }

  points.push({ x: width - 2, y: height / 2 });

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5);

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const gx = Math.floor((a.x + (b.x - a.x) * t) / CELL) * CELL;
      const gy = Math.floor((a.y + (b.y - a.y) * t) / CELL) * CELL;

      hit.add(`${gx},${gy}`);
    }
  }

  paint(scene, VFX_TEXTURES.bolt, width, height, (px, py) => {
    const gx = Math.floor(px / CELL) * CELL;
    const gy = Math.floor(py / CELL) * CELL;

    if (hit.has(`${gx},${gy}`)) {
      return 1;
    }

    // Quầng sáng mờ quanh tia.
    return hit.has(`${gx},${gy - CELL}`) || hit.has(`${gx},${gy + CELL}`)
      ? 0.35
      : 0;
  });
}

interface BulletColors {
  core: number;
  body: number;
  edge: number;
}

/** Trộn hai màu 0xRRGGBB theo tỉ lệ t (0 = a, 1 = b). */
function mixColor(a: number, b: number, t: number): number {
  const channel = (shift: number): number =>
    Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);

  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Texture đạn quái của một hệ; không có hệ (hoặc vật lý) dùng texture mặc định. */
export function enemyBulletTextureKey(type?: DamageType): string {
  return type && type !== 'physical'
    ? `${TEXTURE_KEYS.enemyBullet}-${type}`
    : TEXTURE_KEYS.enemyBullet;
}

/**
 * Tô từng ô CELL×CELL với màu riêng (khác `paint` chỉ tô trắng để tint).
 * Hàm trả null = bỏ qua ô.
 */
function paintColored(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  cell: (x: number, y: number) => { color: number; alpha: number } | null,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({}, false);

  for (let y = 0; y < height; y += CELL) {
    for (let x = 0; x < width; x += CELL) {
      const fill = cell(x + CELL / 2, y + CELL / 2);

      if (fill && fill.alpha > 0) {
        graphics.fillStyle(fill.color, fill.alpha);
        graphics.fillRect(x, y, CELL, CELL);
      }
    }
  }

  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

/**
 * Một viên đạn quái hình TRỤ (viên thuốc: thân đều, hai đầu bo tròn), nằm ngang và được xoay theo
 * hướng bay. Ba lớp màu lấy từ thuộc tính: viền/quầng ngoài (edge), thân (body), lõi sáng (core).
 */
function createEnemyBulletTexture(
  scene: Phaser.Scene,
  key: string,
  colors: BulletColors,
): void {
  const { length, width } = ENEMY_BULLET_VISUAL;
  const cx = length / 2;
  const cy = width / 2;
  const radius = width / 2;
  const axis = length / 2 - radius; // nửa độ dài đoạn thẳng của viên thuốc

  /** Khoảng cách tới trục dọc của viên thuốc có nửa độ dài trục `half`. */
  const distance = (x: number, y: number, half: number): number =>
    Math.hypot(Math.max(Math.abs(x - cx) - half, 0), y - cy);

  paintColored(scene, key, length, width, (x, y) => {
    if (distance(x, y, axis - 2) <= radius * 0.3) {
      return { color: colors.core, alpha: 1 };
    }

    if (distance(x, y, axis) <= radius * 0.7) {
      return { color: colors.body, alpha: 1 };
    }

    if (distance(x, y, axis) <= radius) {
      return { color: colors.edge, alpha: 0.85 };
    }

    return null;
  });
}

/** Sinh texture đạn quái: một texture mặc định (vật lý) + một cho từng hệ nguyên tố. */
function createEnemyBullets(scene: Phaser.Scene): void {
  const body = NEON.enemyBullet;

  createEnemyBulletTexture(scene, enemyBulletTextureKey(), {
    core: mixColor(body, 0xffffff, 0.65),
    body,
    edge: mixColor(body, 0x000000, 0.5),
  });

  for (const type of ELEMENT_TYPES) {
    createEnemyBulletTexture(
      scene,
      enemyBulletTextureKey(type),
      ELEMENT_PALETTE[type],
    );
  }
}

/** Sinh toàn bộ texture/anim VFX; gọi một lần từ PreloadScene. */
export function createVfxTextures(scene: Phaser.Scene): void {
  paint(scene, VFX_TEXTURES.pixel, CELL, CELL, () => 1);
  createEnemyBullets(scene);
  createSlash(scene);
  createRing(scene);
  createCrack(scene);
  createAura(scene);
  createSpear(scene, VFX_TEXTURES.spear, false);
  createSpear(scene, VFX_TEXTURES.spearSharp, true);
  createBolt(scene);
  createEllipse(scene);
}
