import type Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import { createPixelTexture } from './pixelTexture';
import { buildArt, emptyGrid } from './weaponArt';

/**
 * Hòm trang bị vẽ ở 1 texel = 1 px (24×21 sau viền), scale 1 — nhỏ bằng nửa bản cũ (48×42).
 * Dùng chung bộ dựng `buildArt` với vũ khí (đổ bóng + viền 1 px tự động).
 */
const CHEST_WIDTH = 22;
const CHEST_HEIGHT = 19;

function chestFill(open: boolean): string[] {
  const grid = emptyGrid(CHEST_WIDTH, CHEST_HEIGHT);
  const fillRect = (x0: number, y0: number, x1: number, y1: number, c: string): void => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        grid[y][x] = c;
      }
    }
  };

  // Thân hòm (hàng 9..18) và nắp (hàng 0..8 khi đóng; nắp dựng lên phía sau khi mở).
  fillRect(0, 9, 21, 18, 'B');

  if (open) {
    fillRect(1, 0, 20, 3, 'D'); // mặt trong nắp dựng ngược
    fillRect(2, 4, 19, 8, 'Y'); // ánh vàng trong lòng hòm
    fillRect(7, 5, 14, 7, 'W');
  } else {
    fillRect(0, 2, 21, 8, 'B');
    fillRect(1, 1, 20, 1, 'B'); // bo tròn mép nắp
    fillRect(3, 0, 18, 0, 'B');
  }

  // Đai vàng ngang ở mép nắp/thân và gần đáy.
  fillRect(0, 9, 21, 10, 'G');
  fillRect(0, 16, 21, 17, 'G');

  // Vân ván gỗ dọc.
  for (const x of [6, 15]) {
    for (let y = open ? 11 : 2; y <= 15; y += 1) {
      if (grid[y][x] === 'B') {
        grid[y][x] = 'D';
      }
    }
  }

  // Khóa vàng giữa hòm khi đóng.
  if (!open) {
    fillRect(9, 7, 12, 12, 'Y');
    grid[9][10] = 'O';
    grid[10][10] = 'O';
  }

  return grid.map((row) => row.join(''));
}

const NORMAL_PALETTE = {
  O: '#2a1a10',
  H: '#b07a3a',
  B: '#8a5a2b',
  b: '#6a4220',
  D: '#5a3a1a',
  G: '#e8c04a',
  Y: '#ffe066',
  W: '#ffffff',
};

const LEGENDARY_PALETTE = {
  O: '#2a1430',
  H: '#d6a022',
  B: '#b8860b',
  b: '#8a640a',
  D: '#7a5a12',
  G: '#ffe066',
  Y: '#fff2b3',
  W: '#ffffff',
};

/** Sinh 4 texture hòm (thường/huyền thoại × đóng/mở). Gọi từ PreloadScene. */
export function createChestTextures(scene: Phaser.Scene): void {
  const variants = [
    { palette: NORMAL_PALETTE, closed: TEXTURE_KEYS.chestClosed, open: TEXTURE_KEYS.chestOpen },
    {
      palette: LEGENDARY_PALETTE,
      closed: TEXTURE_KEYS.legendaryChestClosed,
      open: TEXTURE_KEYS.legendaryChestOpen,
    },
  ];

  for (const { palette, closed, open } of variants) {
    for (const [key, isOpen] of [
      [closed, false],
      [open, true],
    ] as const) {
      const art = buildArt({
        fill: chestFill(isOpen),
        palette,
        ramps: { B: ['H', 'b'] },
        outline: 'O',
      });

      createPixelTexture(scene, key, art.rows, art.palette, 1);
    }
  }
}
