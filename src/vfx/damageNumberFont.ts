import Phaser from 'phaser';

import { DAMAGE_NUMBER_FONT_PIXEL } from '../config/damageNumberConfig';

/**
 * Font số sinh runtime cho số sát thương (BitmapText, một texture → một batch).
 * Glyph 5×7 tô trắng (hàng dưới xám nhạt để có chuyển sắc) nên `setTint` đổi được màu;
 * viền đen cố định không bị tint làm đổi màu.
 * - `normal`: viền đen 1 px.
 * - `crit`: viền đen 1 px + viền ngoài trắng 1 px (thành quầng sáng cùng màu tint).
 */

export const DAMAGE_FONT_KEYS = {
  normal: 'dmgnum',
  crit: 'dmgnum-crit',
} as const;

/** Thứ tự ký tự trong atlas; chuỗi hiển thị chỉ được dùng các ký tự này. */
export const DAMAGE_FONT_CHARS = '0123456789k!';

const GLYPH_W = 5;
const GLYPH_H = 7;
const FILL_TOP = 0xffffff;
const FILL_BOTTOM = 0xd2d2d2;
/** Số hàng phía trên dùng màu sáng. */
const FILL_TOP_ROWS = 4;

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  k: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
};

interface FontVariant {
  readonly key: string;
  /** Số pixel nghệ thuật viền quanh glyph (1 = đen; 2 = đen + trắng ngoài). */
  readonly outline: 1 | 2;
}

const VARIANTS: readonly FontVariant[] = [
  { key: DAMAGE_FONT_KEYS.normal, outline: 1 },
  { key: DAMAGE_FONT_KEYS.crit, outline: 2 },
];

/** Khoảng cách Chebyshev (≤ max) từ ô (x, y) tới pixel tô gần nhất; Infinity nếu xa hơn. */
function distanceToFill(
  rows: readonly string[],
  x: number,
  y: number,
  max: number,
): number {
  let best = Number.POSITIVE_INFINITY;

  for (let dy = -max; dy <= max; dy += 1) {
    for (let dx = -max; dx <= max; dx += 1) {
      if (rows[y + dy]?.[x + dx] === '#') {
        best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
  }

  return best;
}

/** Sinh texture + đăng ký BitmapFont cho cả hai biến thể. Gọi từ PreloadScene. */
export function createDamageNumberFonts(scene: Phaser.Scene): void {
  const scale = DAMAGE_NUMBER_FONT_PIXEL;

  for (const variant of VARIANTS) {
    if (scene.cache.bitmapFont.exists(variant.key)) {
      continue;
    }

    const pad = variant.outline;
    const cellW = (GLYPH_W + pad * 2) * scale;
    const cellH = (GLYPH_H + pad * 2) * scale;
    const graphics = scene.make.graphics({}, false);

    [...DAMAGE_FONT_CHARS].forEach((char, index) => {
      const rows = GLYPHS[char];
      const originX = index * cellW;

      for (let y = -pad; y < GLYPH_H + pad; y += 1) {
        for (let x = -pad; x < GLYPH_W + pad; x += 1) {
          const dist = rows[y]?.[x] === '#'
            ? 0
            : distanceToFill(rows, x, y, pad);
          let color: number | null = null;

          if (dist === 0) {
            color = y < FILL_TOP_ROWS ? FILL_TOP : FILL_BOTTOM;
          } else if (dist === 1) {
            color = 0x000000;
          } else if (dist === 2) {
            color = 0xffffff;
          }

          if (color === null) {
            continue;
          }

          graphics.fillStyle(color, 1);
          graphics.fillRect(
            originX + (x + pad) * scale,
            (y + pad) * scale,
            scale,
            scale,
          );
        }
      }
    });

    graphics.generateTexture(variant.key, cellW * DAMAGE_FONT_CHARS.length, cellH);
    graphics.destroy();

    const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: variant.key,
      width: cellW,
      height: cellH,
      chars: DAMAGE_FONT_CHARS,
      charsPerRow: DAMAGE_FONT_CHARS.length,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 0,
    });

    // Bước tiến hẹp hơn ô: viền hai glyph kề nhau chồng lên nhau thay vì để hở.
    // Khoảng hở giữa hai phần tô = pad + 1 pixel (2 với viền thường, 3 với viền crit).
    const advance = (GLYPH_W + pad + 1) * scale;
    const chars = (entry as unknown as {
      data: { chars: Record<number, { xAdvance: number }> };
    }).data.chars;

    for (const glyph of Object.values(chars)) {
      glyph.xAdvance = advance;
    }

    scene.cache.bitmapFont.add(variant.key, entry);
  }
}
