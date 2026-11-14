import Phaser from 'phaser';

import { PLAYER_FRAME_SIZE } from '../config/assets';
import type { GearLook, HatLook } from '../config/gearLook';

export type PlayerDirection = 'down' | 'left' | 'right' | 'up';
export type PlayerAction = 'idle' | 'run' | 'attack' | 'hurt' | 'death';
export type HeroStyle = 'knight' | 'rogue' | 'mage';

export interface CharacterPalette {
  hair: string;
  scarf: string;
  armor: string;
  armorDark: string;
  skin: string;
  pants: string;
  boots: string;
  belt: string;
  eye: string;
}

const DIRECTIONS: readonly PlayerDirection[] = [
  'down',
  'left',
  'right',
  'up',
];

const ACTION_SPECS: readonly {
  action: PlayerAction;
  frames: number;
  frameRate: number;
  repeat: number;
}[] = [
  { action: 'idle', frames: 4, frameRate: 4, repeat: -1 },
  { action: 'run', frames: 6, frameRate: 11, repeat: -1 },
  { action: 'attack', frames: 4, frameRate: 13, repeat: 0 },
  { action: 'hurt', frames: 1, frameRate: 6, repeat: 0 },
  { action: 'death', frames: 4, frameRate: 7, repeat: 0 },
];

const ACTION_ROW: Record<PlayerAction, number> = {
  idle: 0,
  run: 4,
  attack: 10,
  hurt: 14,
  death: 15,
};

const GLINT = '#f8fbff';

/** Màu riêng của Đấu sĩ: lót áo choàng (cam), vạt tabard (nâu đỏ), chùm lông mũ (đỏ). */
const CAPE_LINING = '#e0902f';
const TABARD = '#7a3b2e';
const PLUME = '#c0392b';

function rect(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
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
  context.fillStyle = 'rgba(0,0,0,0.28)';
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

function sleeveColor(
  palette: CharacterPalette,
  style: HeroStyle,
): string {
  return style === 'mage' ? palette.armor : palette.armorDark;
}

function trimColor(
  palette: CharacterPalette,
  style: HeroStyle,
): string {
  return style === 'rogue' ? palette.scarf : palette.belt;
}

function drawArmVertical(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  palette: CharacterPalette,
  style: HeroStyle,
  handAtTop = false,
): void {
  const sleeve = sleeveColor(palette, style);
  const trim = trimColor(palette, style);

  rect(context, palette.eye, x - 1, y - 1, 7, height + 2);
  rect(context, sleeve, x, y, 5, height);
  rect(context, palette.armorDark, x + 1, y + 1, 2, height - 2);

  const handY = handAtTop ? y - 2 : y + height - 3;
  const cuffY = handAtTop ? handY + 4 : handY - 2;

  rect(context, palette.eye, x, handY, 6, 4);
  rect(context, palette.skin, x + 1, handY + 1, 4, 2);
  rect(context, trim, x, cuffY, 6, 1);
}

function drawArmHorizontal(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  palette: CharacterPalette,
  style: HeroStyle,
  handOnRight: boolean,
): void {
  const sleeve = sleeveColor(palette, style);
  const trim = trimColor(palette, style);

  rect(context, palette.eye, x, y - 1, length, 8);
  rect(context, sleeve, x + 1, y, length - 2, 6);
  rect(context, palette.armorDark, x + 1, y + 1, length - 2, 2);

  const handX = handOnRight ? x + length - 4 : x;
  const cuffX = handOnRight ? handX - 2 : handX + 5;

  rect(context, palette.eye, handX, y, 5, 7);
  rect(context, palette.skin, handX + 1, y + 1, 3, 5);
  rect(context, trim, cuffX, y + 1, 2, 5);
}

function drawLeg(
  context: CanvasRenderingContext2D,
  x: number,
  bob: number,
  lift: number,
  palette: CharacterPalette,
): void {
  rect(context, palette.eye, x - 1, 31 + bob, 7, 12);
  rect(context, palette.pants, x, 32 + bob, 5, 10);
  rect(context, palette.armorDark, x + 1, 34 + bob, 2, 1);

  const bootY = 39 + bob - lift;

  rect(context, palette.eye, x - 1, bootY, 7, 5);
  rect(context, palette.boots, x, bootY + 1, 5, 3);
  rect(context, palette.belt, x, bootY + 4, 5, 1);
}

function drawBackTail(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  sway: number,
  palette: CharacterPalette,
): void {
  const x = direction === 'right' ? 10 : 33;

  rect(context, palette.eye, x - 1, 22 + bob, 6, 12);
  rect(context, palette.scarf, x, 23 + bob, 4, 9);
  rect(context, palette.eye, x + sway - 1, 31 + bob, 6, 4);
  rect(context, palette.scarf, x + sway, 32 + bob, 4, 2);
}

/**
 * Áo choàng của Đấu sĩ (màu `palette.scarf`, lót cam). Nhìn nghiêng: tà áo bay
 * ra sau lưng; nhìn từ trước: chỉ thấy hai mép; nhìn từ sau: phủ kín lưng
 * (vẽ sau thân, xem `drawHero`).
 */
function drawKnightCape(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  sway: number,
  palette: CharacterPalette,
): void {
  if (direction === 'up') {
    rect(context, palette.eye, 11, 19 + bob, 26, 24);
    rect(context, palette.scarf, 12, 20 + bob, 24, 21);
    rect(context, palette.armorDark, 23, 21 + bob, 2, 19);
    rect(context, palette.armorDark, 16, 24 + bob, 1, 14);
    rect(context, palette.armorDark, 31, 24 + bob, 1, 14);
    rect(context, CAPE_LINING, 12, 39 + bob, 24, 2);
    rect(context, palette.belt, 12, 20 + bob, 24, 1);
    return;
  }

  if (direction === 'down') {
    for (const x of [10, 36]) {
      rect(context, palette.eye, x, 24 + bob, 4, 18);
      rect(context, palette.scarf, x + 1, 25 + bob, 2, 15);
      rect(context, CAPE_LINING, x + 1, 39 + bob, 2, 2);
    }
    return;
  }

  // Nhìn nghiêng: vẽ theo hướng "phải", rồi lật gương khi nhìn trái.
  const flip = direction === 'left';
  const piece = (x: number, y: number, w: number, h: number, c: string) =>
    rect(context, c, flip ? 48 - x - w : x, y, w, h);

  for (let row = 0; row < 5; row += 1) {
    const y = 20 + bob + row * 4;
    const w = 6 + row * 2;
    const x = 17 - w - (row >= 2 ? sway : 0);

    piece(x - 1, y - 1, w + 2, 6, palette.eye);
  }

  for (let row = 0; row < 5; row += 1) {
    const y = 20 + bob + row * 4;
    const w = 6 + row * 2;
    const x = 17 - w - (row >= 2 ? sway : 0);

    piece(x, y, w, 4, palette.scarf);
    piece(x, y, 1, 4, CAPE_LINING);
  }

  piece(12, 20 + bob, 5, 2, palette.belt);
}

function drawCollar(
  context: CanvasRenderingContext2D,
  bob: number,
  palette: CharacterPalette,
  style: HeroStyle,
): void {
  if (style === 'mage') {
    rect(context, palette.eye, 16, 19 + bob, 16, 3);
    rect(context, palette.belt, 17, 20 + bob, 14, 2);
    return;
  }

  rect(context, palette.eye, 16, 19 + bob, 16, 4);
  rect(context, palette.scarf, 17, 20 + bob, 14, 2);

  if (style === 'knight') {
    rect(context, palette.armor, 17, 19 + bob, 14, 1);
  }
}

function drawKnightBody(
  context: CanvasRenderingContext2D,
  bob: number,
  palette: CharacterPalette,
): void {
  rect(context, palette.eye, 12, 19 + bob, 24, 18);
  rect(context, palette.armor, 13, 20 + bob, 22, 15);
  rect(context, palette.armorDark, 13, 30 + bob, 22, 5);

  // Giáp ngực nhiều lớp.
  rect(context, palette.eye, 18, 21 + bob, 12, 10);
  rect(context, palette.armorDark, 19, 22 + bob, 10, 8);
  rect(context, palette.armor, 20, 23 + bob, 8, 4);
  rect(context, palette.belt, 20, 27 + bob, 8, 1);

  // Giáp vai và đinh tán.
  rect(context, palette.eye, 8, 18 + bob, 8, 9);
  rect(context, palette.armorDark, 9, 19 + bob, 6, 7);
  rect(context, palette.armor, 9, 19 + bob, 4, 2);
  rect(context, palette.belt, 9, 24 + bob, 6, 1);

  rect(context, palette.eye, 32, 18 + bob, 8, 9);
  rect(context, palette.armorDark, 33, 19 + bob, 6, 7);
  rect(context, palette.armor, 35, 19 + bob, 4, 2);
  rect(context, palette.belt, 33, 24 + bob, 6, 1);

  rect(context, palette.belt, 15, 21 + bob, 1, 1);
  rect(context, palette.belt, 32, 21 + bob, 1, 1);
  rect(context, palette.belt, 15, 29 + bob, 1, 1);
  rect(context, palette.belt, 32, 29 + bob, 1, 1);

  // Thắt lưng, khoá và vạt áo đỏ.
  rect(context, palette.eye, 12, 33 + bob, 24, 4);
  rect(context, palette.belt, 13, 34 + bob, 22, 2);
  rect(context, palette.armorDark, 22, 33 + bob, 4, 4);
  rect(context, palette.belt, 23, 34 + bob, 2, 2);
  rect(context, TABARD, 20, 36 + bob, 8, 5);
  rect(context, palette.armorDark, 21, 37 + bob, 6, 1);
  rect(context, palette.belt, 21, 40 + bob, 6, 1);
}

function drawRogueBody(
  context: CanvasRenderingContext2D,
  bob: number,
  palette: CharacterPalette,
): void {
  rect(context, palette.eye, 14, 20 + bob, 20, 16);
  rect(context, palette.armorDark, 15, 21 + bob, 18, 13);
  rect(context, palette.armor, 16, 22 + bob, 11, 8);
  rect(context, palette.pants, 15, 31 + bob, 18, 4);

  // Dây da chéo và khoá thắt lưng.
  rect(context, palette.belt, 20, 23 + bob, 2, 2);
  rect(context, palette.belt, 21, 25 + bob, 2, 2);
  rect(context, palette.belt, 22, 27 + bob, 2, 2);
  rect(context, palette.belt, 23, 29 + bob, 2, 2);

  rect(context, palette.eye, 11, 20 + bob, 6, 5);
  rect(context, palette.armor, 12, 21 + bob, 4, 3);
  rect(context, palette.eye, 31, 20 + bob, 6, 5);
  rect(context, palette.armor, 32, 21 + bob, 4, 3);

  rect(context, palette.eye, 15, 32 + bob, 18, 3);
  rect(context, palette.belt, 16, 33 + bob, 16, 1);
  rect(context, palette.belt, 23, 33 + bob, 2, 2);
  rect(context, GLINT, 17, 24 + bob, 1, 1);
}

function drawMageBody(
  context: CanvasRenderingContext2D,
  bob: number,
  palette: CharacterPalette,
): void {
  rect(context, palette.eye, 14, 19 + bob, 20, 22);
  rect(context, palette.armor, 15, 20 + bob, 18, 19);
  rect(context, palette.armorDark, 20, 21 + bob, 8, 16);
  rect(context, palette.armor, 21, 22 + bob, 6, 14);

  // Gấu áo xoè rộng và viền vàng.
  rect(context, palette.eye, 11, 36 + bob, 26, 7);
  rect(context, palette.armor, 12, 37 + bob, 24, 5);
  rect(context, palette.armorDark, 13, 39 + bob, 22, 1);
  rect(context, palette.belt, 12, 40 + bob, 24, 1);

  // Đai lưng và nút thắt.
  rect(context, palette.eye, 15, 31 + bob, 18, 3);
  rect(context, palette.belt, 16, 32 + bob, 16, 1);
  rect(context, palette.belt, 22, 32 + bob, 2, 3);
  rect(context, palette.armorDark, 15, 20 + bob, 18, 2);

  // Các đốm rune nhỏ trên áo.
  rect(context, palette.belt, 18, 25 + bob, 1, 1);
  rect(context, palette.belt, 28, 27 + bob, 1, 1);
  rect(context, palette.belt, 17, 30 + bob, 1, 1);
}

function drawEyes(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  y: number,
  palette: CharacterPalette,
): void {
  if (direction === 'up') {
    return;
  }

  if (direction === 'down') {
    rect(context, palette.eye, 20, y, 3, 2);
    rect(context, palette.eye, 26, y, 3, 2);
    rect(context, GLINT, 21, y, 1, 1);
    rect(context, GLINT, 27, y, 1, 1);
    return;
  }

  const x = direction === 'left' ? 19 : 26;

  rect(context, palette.eye, x, y, 3, 2);
  rect(context, GLINT, x + (direction === 'left' ? 0 : 2), y, 1, 1);
}

/** Đầu trần của Đấu sĩ: tóc, mặt, râu rậm. Mũ vẽ chồng lên bằng drawHatOverlay. */
function drawKnightHead(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  palette: CharacterPalette,
): void {
  rect(context, palette.eye, 15, 6 + bob, 18, 16);
  rect(context, palette.hair, 16, 7 + bob, 16, 14);

  if (direction === 'up') {
    rect(context, palette.armorDark, 16, 7 + bob, 16, 1);
    rect(context, palette.eye, 23, 12 + bob, 2, 6);
    return;
  }

  const faceX =
    direction === 'left' ? 17 : direction === 'right' ? 22 : 18;
  const faceW =
    direction === 'left' || direction === 'right' ? 9 : 12;

  rect(context, palette.eye, faceX, 10 + bob, faceW, 12);
  rect(context, palette.skin, faceX + 1, 11 + bob, faceW - 2, 6);
  rect(context, palette.hair, faceX + 1, 16 + bob, faceW - 2, 5);
  rect(context, palette.hair, faceX + 2, 21 + bob, faceW - 4, 1);

  if (direction === 'down') {
    rect(context, palette.eye, 20, 13 + bob, 3, 2);
    rect(context, palette.eye, 26, 13 + bob, 3, 2);
    rect(context, GLINT, 21, 13 + bob, 1, 1);
    rect(context, GLINT, 27, 13 + bob, 1, 1);
  } else {
    const eyeX = direction === 'left' ? faceX + 2 : faceX + faceW - 5;

    rect(context, palette.eye, eyeX, 13 + bob, 3, 2);
    rect(
      context,
      GLINT,
      eyeX + (direction === 'left' ? 0 : 2),
      13 + bob,
      1,
      1,
    );
  }
}

/** Mũ Đấu sĩ đang đội: khăn trùm, mũ sắt hoặc vương miện. */
function drawHatOverlay(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  palette: CharacterPalette,
  hat: HatLook,
  action: PlayerAction,
  frame: number,
): void {
  const sway =
    action === 'run' ? ([0, 1, 0, -1, 0, 1][frame] ?? 0) : 0;
  const faceFacing = direction !== 'up';
  const nasalX =
    direction === 'left' ? 19 : direction === 'right' ? 28 : 23;

  if (hat.kind === 'crown') {
    rect(context, palette.eye, 15, 4 + bob, 18, 7);
    rect(context, hat.dark, 16, 7 + bob, 16, 3);
    rect(context, hat.color, 16, 6 + bob, 16, 3);
    rect(context, hat.trim, 17, 6 + bob, 5, 1);

    for (const sx of [16, 21, 26, 30]) {
      rect(context, palette.eye, sx - 1, 1 + bob, 5, 6);
      rect(context, hat.color, sx, 2 + bob, 3, 5);
      rect(context, hat.trim, sx + 1, 2 + bob, 1, 2);
    }

    if (hat.gem && faceFacing) {
      rect(context, hat.gem, 23, 7 + bob, 2, 2);
      rect(context, GLINT, 23, 7 + bob, 1, 1);
    }

    return;
  }

  if (hat.kind === 'hood') {
    rect(context, palette.eye, 14, 3 + bob, 20, 11);
    rect(context, hat.color, 15, 4 + bob, 18, 9);
    rect(context, hat.dark, 15, 10 + bob, 18, 3);
    rect(context, palette.eye, 14, 13 + bob, 4, 9);
    rect(context, hat.dark, 15, 13 + bob, 2, 8);
    rect(context, palette.eye, 30, 13 + bob, 4, 9);
    rect(context, hat.dark, 31, 13 + bob, 2, 8);
    rect(context, hat.color, 21 + sway, 1 + bob, 6, 3);

    if (!faceFacing) {
      rect(context, hat.color, 15, 13 + bob, 18, 8);
      rect(context, hat.dark, 22, 13 + bob, 4, 8);
    }

    return;
  }

  // Mũ sắt kín mặt: chùm lông đỏ, chóp, khe nhìn và lỗ thở.
  rect(context, palette.eye, 20 + sway, 0 + bob, 8, 5);
  rect(context, PLUME, 21 + sway, 1 + bob, 6, 3);
  rect(context, hat.trim, 22 + sway, 4 + bob, 4, 1);
  rect(context, palette.eye, 14, 4 + bob, 20, 9);
  rect(context, hat.dark, 15, 5 + bob, 18, 7);
  rect(context, hat.color, 16, 5 + bob, 16, 4);
  rect(context, hat.trim, 18, 5 + bob, 6, 1);
  rect(context, hat.color, 15, 9 + bob, 18, 3);
  rect(context, hat.trim, 16, 9 + bob, 16, 1);

  if (faceFacing) {
    rect(context, palette.eye, 14, 12 + bob, 4, 8);
    rect(context, hat.dark, 15, 12 + bob, 2, 7);
    rect(context, palette.eye, 30, 12 + bob, 4, 8);
    rect(context, hat.dark, 31, 12 + bob, 2, 7);
    rect(context, palette.eye, 16, 10 + bob, 16, 11);
    rect(context, hat.dark, 17, 11 + bob, 14, 9);
    rect(context, hat.color, 17, 11 + bob, 14, 3);

    // Khe nhìn: giữa mặt khi nhìn thẳng, lệch về phía hướng nhìn khi nghiêng.
    const slitX =
      direction === 'down' ? 18 : direction === 'left' ? 17 : 24;
    const slitW = direction === 'down' ? 12 : 7;

    rect(context, palette.eye, slitX, 14 + bob, slitW, 2);
    rect(context, hat.trim, nasalX, 10 + bob, 2, 4);
    rect(context, palette.eye, slitX + 1, 18 + bob, slitW - 2, 1);
    rect(context, hat.color, 18, 17 + bob, 12, 1);
  } else {
    rect(context, palette.eye, 14, 12 + bob, 20, 9);
    rect(context, hat.dark, 15, 12 + bob, 18, 8);
    rect(context, hat.color, 16, 12 + bob, 16, 2);
    rect(context, hat.trim, 17, 15 + bob, 1, 1);
    rect(context, hat.trim, 30, 15 + bob, 1, 1);
  }
}

function drawRogueHead(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  palette: CharacterPalette,
): void {
  // Mũ trùm nhọn và các nếp gấp.
  rect(context, palette.eye, 20, 2 + bob, 8, 5);
  rect(context, palette.armorDark, 21, 3 + bob, 6, 3);
  rect(context, palette.eye, 15, 5 + bob, 18, 18);
  rect(context, palette.armorDark, 16, 6 + bob, 16, 16);
  rect(context, palette.armor, 16, 7 + bob, 2, 9);
  rect(context, palette.armorDark, 18, 19 + bob, 12, 2);

  if (direction === 'up') {
    rect(context, palette.armor, 20, 12 + bob, 8, 1);
    rect(context, palette.scarf, 22, 20 + bob, 5, 3);
    return;
  }

  const faceX =
    direction === 'left' ? 17 : direction === 'right' ? 20 : 18;
  const faceWidth =
    direction === 'left' || direction === 'right' ? 10 : 12;

  // Khuôn mặt trong bóng mũ và khăn che miệng.
  rect(context, palette.eye, faceX, 11 + bob, faceWidth, 8);
  rect(context, palette.skin, faceX + 1, 12 + bob, faceWidth - 2, 6);
  rect(context, palette.scarf, faceX, 16 + bob, faceWidth, 3);

  if (direction === 'down') {
    rect(context, palette.eye, 20, 13 + bob, 3, 2);
    rect(context, palette.eye, 26, 13 + bob, 3, 2);
    rect(context, GLINT, 21, 13 + bob, 1, 1);
    rect(context, GLINT, 27, 13 + bob, 1, 1);
  } else {
    const eyeX = direction === 'left' ? faceX + 2 : faceX + 5;
    rect(context, palette.eye, eyeX, 13 + bob, 3, 2);
    rect(context, GLINT, eyeX + 1, 13 + bob, 1, 1);
  }

  rect(context, palette.armor, 19, 7 + bob, 2, 1);
  rect(context, palette.armor, 27, 7 + bob, 2, 1);
}

function drawMageHead(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  palette: CharacterPalette,
): void {
  // Mái tóc trắng dài hai bên.
  rect(context, palette.hair, 14, 11 + bob, 4, 10);
  rect(context, palette.hair, 30, 11 + bob, 4, 10);
  rect(context, palette.eye, 17, 9 + bob, 14, 14);
  rect(context, palette.skin, 18, 10 + bob, 12, 12);

  if (direction === 'up') {
    rect(context, palette.hair, 17, 9 + bob, 14, 13);
  } else {
    drawEyes(context, direction, 14 + bob, palette);

    // Râu bạc dài của pháp sư.
    rect(context, palette.hair, 20, 18 + bob, 8, 4);
    rect(context, palette.hair, 19, 20 + bob, 10, 2);
  }

  // Mũ chóp rộng và dải vàng có viên ngọc.
  rect(context, palette.eye, 10, 6 + bob, 28, 5);
  rect(context, palette.armorDark, 11, 7 + bob, 26, 3);
  rect(context, palette.armor, 11, 7 + bob, 25, 1);
  rect(context, palette.eye, 18, 1 + bob, 12, 6);
  rect(context, palette.armor, 19, 2 + bob, 10, 5);
  rect(context, palette.eye, 21, 0 + bob, 6, 2);
  rect(context, palette.armorDark, 18, 7 + bob, 12, 2);
  rect(context, palette.belt, 18, 7 + bob, 12, 1);
  rect(context, GLINT, 23, 7 + bob, 2, 1);
}

function drawHead(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  palette: CharacterPalette,
  style: HeroStyle,
  action: PlayerAction,
  frame: number,
  hat: HatLook | null,
): void {
  if (style === 'knight') {
    drawKnightHead(context, direction, bob, palette);

    if (hat) {
      drawHatOverlay(context, direction, bob, palette, hat, action, frame);
    }
  } else if (style === 'rogue') {
    drawRogueHead(context, direction, bob, palette);
  } else {
    drawMageHead(context, direction, bob, palette);
  }
}

function drawArms(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  armSwing: number,
  palette: CharacterPalette,
  style: HeroStyle,
  attacking: boolean,
): void {
  if (direction === 'left') {
    drawArmVertical(
      context,
      30,
      22 + bob - armSwing,
      10,
      palette,
      style,
    );

    if (!attacking) {
      drawArmHorizontal(
        context,
        4,
        25 + bob + armSwing,
        10,
        palette,
        style,
        false,
      );
    }

    return;
  }

  if (direction === 'right') {
    drawArmVertical(
      context,
      12,
      22 + bob + armSwing,
      10,
      palette,
      style,
    );

    if (!attacking) {
      drawArmHorizontal(
        context,
        34,
        25 + bob - armSwing,
        10,
        palette,
        style,
        true,
      );
    }

    return;
  }

  drawArmVertical(
    context,
    9,
    22 + bob + armSwing,
    11,
    palette,
    style,
  );

  if (!attacking) {
    drawArmVertical(
      context,
      34,
      22 + bob - armSwing,
      11,
      palette,
      style,
    );
  }
}

function drawAttackArm(
  context: CanvasRenderingContext2D,
  direction: PlayerDirection,
  bob: number,
  frame: number,
  palette: CharacterPalette,
  style: HeroStyle,
): void {
  const reach = [3, 6, 9, 6][frame] ?? 3;

  if (direction === 'down') {
    drawArmVertical(
      context,
      20,
      25 + bob,
      7 + reach,
      palette,
      style,
    );
    return;
  }

  if (direction === 'up') {
    drawArmVertical(
      context,
      20,
      20 + bob - (7 + reach),
      7 + reach,
      palette,
      style,
      true,
    );
    return;
  }

  const length = 5 + reach;

  if (direction === 'left') {
    drawArmHorizontal(
      context,
      14 - length,
      27 + bob,
      length,
      palette,
      style,
      false,
    );
    return;
  }

  drawArmHorizontal(
    context,
    29,
    27 + bob,
    length,
    palette,
    style,
    true,
  );
}

function drawFallenHead(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: CharacterPalette,
  style: HeroStyle,
): void {
  if (style === 'knight') {
    rect(context, palette.eye, x - 1, y - 1, 12, 10);
    rect(context, palette.armorDark, x, y, 10, 8);
    rect(context, palette.armor, x + 1, y + 1, 8, 2);
    rect(context, palette.eye, x + 3, y + 4, 4, 1);
    rect(context, palette.hair, x + 1, y + 1, 8, 3);
    rect(context, palette.hair, x + 2, y + 5, 6, 3);
    return;
  }

  if (style === 'rogue') {
    rect(context, palette.eye, x - 1, y - 1, 12, 10);
    rect(context, palette.armorDark, x, y, 10, 8);
    rect(context, palette.skin, x + 2, y + 3, 6, 4);
    rect(context, palette.eye, x + 3, y + 4, 4, 1);
    rect(context, palette.scarf, x + 1, y + 7, 10, 2);
    return;
  }

  rect(context, palette.eye, x - 1, y, 10, 8);
  rect(context, palette.skin, x, y + 1, 8, 6);
  rect(context, palette.hair, x - 1, y - 1, 5, 7);
  rect(context, palette.hair, x + 6, y + 1, 4, 5);

  // Mũ chóp bị lệch trên đầu.
  rect(context, palette.eye, x - 2, y - 4, 14, 3);
  rect(context, palette.armorDark, x - 1, y - 3, 12, 1);
  rect(context, palette.eye, x + 2, y - 8, 7, 5);
  rect(context, palette.armor, x + 3, y - 7, 5, 4);
  rect(context, palette.belt, x + 2, y - 4, 6, 1);
  rect(context, palette.hair, x + 1, y + 4, 6, 2);
}

function drawDeath(
  context: CanvasRenderingContext2D,
  frame: number,
  palette: CharacterPalette,
  style: HeroStyle,
): void {
  shadow(context, 24, 44, 12, 4);

  const body = style === 'rogue' ? palette.armorDark : palette.armor;
  const trim = style === 'mage' ? palette.belt : palette.armorDark;

  if (frame === 0) {
    // Khuỵu xuống, hai tay buông.
    rect(context, palette.eye, 16, 35, 7, 9);
    rect(context, palette.pants, 17, 36, 5, 7);
    rect(context, palette.eye, 25, 35, 7, 9);
    rect(context, palette.pants, 26, 36, 5, 7);
    rect(context, palette.eye, 15, 42, 9, 3);
    rect(context, palette.boots, 16, 42, 7, 2);
    rect(context, palette.eye, 24, 42, 9, 3);
    rect(context, palette.boots, 25, 42, 7, 2);

    rect(context, palette.eye, 15, 27, 18, 12);
    rect(context, body, 16, 28, 16, 10);
    rect(context, trim, 16, 36, 16, 2);
    rect(context, palette.belt, 16, 38, 16, 1);

    rect(context, palette.eye, 10, 29, 5, 10);
    rect(context, palette.armorDark, 11, 30, 3, 7);
    rect(context, palette.eye, 33, 30, 5, 9);
    rect(context, palette.armorDark, 34, 31, 3, 6);

    drawFallenHead(context, 18, 16, palette, style);
    return;
  }

  if (frame === 1) {
    // Gục hẳn, đầu cúi xuống.
    rect(context, palette.eye, 13, 33, 22, 12);
    rect(context, body, 14, 34, 20, 9);
    rect(context, trim, 14, 41, 20, 2);
    rect(context, palette.belt, 14, 43, 20, 1);
    rect(context, palette.eye, 8, 37, 6, 4);
    rect(context, palette.armorDark, 9, 37, 4, 2);
    rect(context, palette.eye, 34, 37, 6, 4);
    rect(context, palette.armorDark, 35, 37, 4, 2);

    drawFallenHead(context, 20, 24, palette, style);
    return;
  }

  if (frame === 2) {
    // Nằm nghiêng.
    rect(context, palette.eye, 9, 38, 24, 7);
    rect(context, body, 10, 39, 22, 5);
    rect(context, trim, 10, 43, 22, 1);
    rect(context, palette.eye, 4, 40, 7, 4);
    rect(context, palette.armorDark, 5, 41, 5, 2);

    drawFallenHead(context, 30, 34, palette, style);
    return;
  }

  // Nằm sấp, gần như hoà vào bóng.
  rect(context, palette.eye, 8, 41, 23, 5);
  rect(context, body, 9, 42, 21, 3);
  rect(context, trim, 9, 45, 21, 1);
  rect(context, palette.eye, 4, 43, 5, 3);
  rect(context, palette.armorDark, 5, 43, 3, 1);
  rect(context, palette.eye, 34, 42, 7, 4);
  rect(context, palette.skin, 36, 43, 4, 2);

  drawFallenHead(context, 29, 38, palette, style);
}

function drawHero(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  direction: PlayerDirection,
  action: PlayerAction,
  frame: number,
  palette: CharacterPalette,
  style: HeroStyle,
  hat: HatLook | null,
): void {
  context.save();
  context.translate(originX, originY);
  context.beginPath();
  context.rect(0, 0, PLAYER_FRAME_SIZE, PLAYER_FRAME_SIZE);
  context.clip();
  context.imageSmoothingEnabled = false;

  if (action === 'death') {
    drawDeath(context, frame, palette, style);
    context.restore();
    return;
  }

  shadow(context, 24, 44, 11, 4);

  const bob =
    action === 'idle'
      ? ([0, 0, 1, 0][frame] ?? 0)
      : action === 'run'
        ? ([0, 1, 0, 0, 1, 0][frame] ?? 0)
        : 0;
  const leftLift =
    action === 'run' ? ([0, 1, 2, 1, 0, 1][frame] ?? 0) : 0;
  const rightLift =
    action === 'run' ? ([2, 1, 0, 1, 2, 1][frame] ?? 0) : 0;
  const armSwing =
    action === 'run' ? ([3, 2, 0, -3, -2, 0][frame] ?? 0) : 0;
  const sway =
    action === 'run'
      ? ([1, 2, 1, 0, -1, 0][frame] ?? 0)
      : action === 'idle'
        ? ([0, 1, 1, 0][frame] ?? 0)
        : 0;
  const hurtOffset = action === 'hurt' ? -2 : 0;

  context.translate(hurtOffset, 0);

  if (style === 'knight') {
    if (direction !== 'up') {
      drawKnightCape(context, direction, bob, sway, palette);
    }
  } else {
    drawBackTail(context, direction, bob, sway, palette);
  }

  drawLeg(context, 17, bob, leftLift, palette);
  drawLeg(context, 25, bob, rightLift, palette);

  if (style === 'knight') {
    drawKnightBody(context, bob, palette);

    if (direction === 'up') {
      drawKnightCape(context, direction, bob, sway, palette);
    }
  } else if (style === 'rogue') {
    drawRogueBody(context, bob, palette);
  } else {
    drawMageBody(context, bob, palette);
  }

  drawCollar(context, bob, palette, style);
  drawArms(
    context,
    direction,
    bob,
    armSwing,
    palette,
    style,
    action === 'attack',
  );

  drawHead(context, direction, bob, palette, style, action, frame, hat);

  if (action === 'attack') {
    drawAttackArm(context, direction, bob, frame, palette, style);
  }

  context.restore();
}

function applyGearLook(
  palette: CharacterPalette,
  look: GearLook | undefined,
): CharacterPalette {
  if (!look) {
    return palette;
  }

  return {
    ...palette,
    armor: look.armor.armor,
    armorDark: look.armor.armorDark,
    belt: look.armor.belt,
    boots: look.boots.boots,
  };
}

function paintSheet(
  texture: Phaser.Textures.CanvasTexture,
  palette: CharacterPalette,
  style: HeroStyle,
  look: GearLook | undefined,
  addFrames: boolean,
): void {
  const context = texture.getContext();
  const finalPalette = applyGearLook(palette, look);
  const hat = look ? look.hat : null;

  context.clearRect(0, 0, texture.width, texture.height);
  context.imageSmoothingEnabled = false;

  for (const spec of ACTION_SPECS) {
    DIRECTIONS.forEach((direction, directionIndex) => {
      const row = ACTION_ROW[spec.action] + directionIndex;

      for (let frame = 0; frame < spec.frames; frame += 1) {
        const x = frame * PLAYER_FRAME_SIZE;
        const y = row * PLAYER_FRAME_SIZE;

        drawHero(
          context,
          x,
          y,
          direction,
          spec.action,
          frame,
          finalPalette,
          style,
          hat,
        );

        if (addFrames) {
          texture.add(
            `${direction}-${spec.action}-${frame}`,
            0,
            x,
            y,
            PLAYER_FRAME_SIZE,
            PLAYER_FRAME_SIZE,
          );
        }
      }
    });
  }

  texture.refresh();
}

/**
 * Sinh spritesheet nhân vật. Gọi lại với `look` mới để vẽ lại theo trang bị
 * đang mặc (mũ/giáp/giày); các frame và animation giữ nguyên.
 */
export function createPlaceholderPlayerSheet(
  scene: Phaser.Scene,
  textureKey: string,
  palette: CharacterPalette,
  style: HeroStyle,
  look?: GearLook,
): void {
  const existing = scene.textures.exists(textureKey)
    ? scene.textures.get(textureKey)
    : null;

  if (existing) {
    paintSheet(
      existing as Phaser.Textures.CanvasTexture,
      palette,
      style,
      look,
      false,
    );
    return;
  }

  const texture = scene.textures.createCanvas(
    textureKey,
    PLAYER_FRAME_SIZE * 6,
    PLAYER_FRAME_SIZE * 20,
  );

  if (texture) {
    paintSheet(texture, palette, style, look, true);
  }
}

export type HeroHand = 'main' | 'off';

/**
 * Toạ độ bàn tay (so với tâm sprite) của frame đang chiếu, để gắn vũ khí vào
 * đúng tay: `main` = tay cầm vũ khí chính, `off` = tay còn lại (khiên).
 */
export function getHeroHandOffset(
  frameName: string,
  hand: HeroHand,
): { x: number; y: number } | null {
  const [direction, action, indexText] = frameName.split('-');
  const frame = Number(indexText) || 0;

  if (action === 'death' || !direction) {
    return null;
  }

  const bob =
    action === 'idle'
      ? ([0, 0, 1, 0][frame] ?? 0)
      : action === 'run'
        ? ([0, 1, 0, 0, 1, 0][frame] ?? 0)
        : 0;
  const swing =
    action === 'run' ? ([3, 2, 0, -3, -2, 0][frame] ?? 0) : 0;
  const hurt = action === 'hurt' ? -2 : 0;
  const reach = [3, 6, 9, 6][frame] ?? 3;
  const attacking = action === 'attack';
  let point: { x: number; y: number };

  if (direction === 'down') {
    point =
      hand === 'main'
        ? attacking
          ? { x: 23, y: 31 + reach }
          : { x: 12, y: 32 + bob + swing }
        : { x: 37, y: 32 + bob - swing };
  } else if (direction === 'up') {
    point =
      hand === 'main'
        ? attacking
          ? { x: 23, y: 13 - reach }
          : { x: 37, y: 32 + bob - swing }
        : { x: 12, y: 32 + bob + swing };
  } else if (direction === 'left') {
    point =
      hand === 'main'
        ? attacking
          ? { x: 11.5 - reach, y: 30.5 }
          : { x: 6.5, y: 28.5 + bob + swing }
        : { x: 33, y: 31 + bob - swing };
  } else {
    point =
      hand === 'main'
        ? attacking
          ? { x: 32.5 + reach, y: 30.5 }
          : { x: 42.5, y: 28.5 + bob - swing }
        : { x: 15, y: 31 + bob + swing };
  }

  return {
    x: point.x + hurt - PLAYER_FRAME_SIZE / 2,
    y: point.y - PLAYER_FRAME_SIZE / 2,
  };
}

export function createPlayerAnimations(
  scene: Phaser.Scene,
  animPrefix: string,
  textureKey: string,
): void {
  for (const spec of ACTION_SPECS) {
    for (const direction of DIRECTIONS) {
      const key = `${animPrefix}-${direction}-${spec.action}`;

      if (scene.anims.exists(key)) {
        continue;
      }

      const frames = Array.from({ length: spec.frames }, (_, index) => ({
        key: textureKey,
        frame: `${direction}-${spec.action}-${index}`,
      }));

      scene.anims.create({
        key,
        frames,
        frameRate: spec.frameRate,
        repeat: spec.repeat,
      });
    }
  }
}

/** Chuyển vector aim thành 1 trong 4 hướng animation. */
export function directionFromVector(
  x: number,
  y: number,
): PlayerDirection {
  if (Math.abs(x) > Math.abs(y)) {
    return x < 0 ? 'left' : 'right';
  }

  return y < 0 ? 'up' : 'down';
}
