import Phaser from 'phaser';

import {
  CASTLE_CHUNK_HORIZONTAL,
  CASTLE_CHUNK_VERTICAL,
  CASTLE_CORNER_TOWER_HEIGHT,
  CASTLE_CORNER_TOWER_SIZE,
  CASTLE_GATE_HALF_WIDTH,
  CASTLE_GATE_TOWER_HEIGHT,
  CASTLE_GATE_TOWER_SIZE,
  CASTLE_GATE_X,
  CASTLE_GATE_Y,
  CASTLE_MERLON_GAP,
  CASTLE_MERLON_HEIGHT,
  CASTLE_MERLON_WIDTH,
  CASTLE_RISE_FROM_PX,
  CASTLE_RISE_MS,
  CASTLE_RISE_STAGGER_MS,
  CASTLE_SHEAR,
  CASTLE_WALL_HEIGHT,
  CASTLE_WALL_THICKNESS,
} from '../config/castleConfig';
import { VILLAGE_ZONE } from '../config/economyConfig';
import { spawnDust } from '../utils/effects';
import { drawBrickBox } from '../vfx/brickBox';

/**
 * Tường thành bao quanh làng, cùng kiểu gạch khối với Bất Động Thành Lũy (`vfx/brickBox.ts`).
 *
 * - Biên theo `VILLAGE_ZONE`, bốn cổng mở ở chỗ đường lát đá đi qua, tháp ở bốn góc và hai bên mỗi cổng.
 * - Mỗi đoạn tường/tháp được vẽ MỘT LẦN rồi nướng thành texture (`generateTexture`) và hiển thị bằng
 *   Image: chi phí mỗi frame chỉ là vài chục sprite, không phải chạy lại lệnh vẽ (nhẹ cho mobile).
 * - Chia đoạn ngắn để sắp xếp chiều sâu đúng khi người chơi đi dọc tường.
 * - Chặn vật lý bằng vật cản tĩnh (cùng nhóm `obstacles` với nhà/cây): người chơi và quái đều không đi xuyên.
 * - Lúc vào scene tường trồi lên từ đất theo từng đoạn, kèm bụi ở chân tháp (giống lúc dựng Thành Lũy).
 */

interface Block {
  /** Hình chiếu trên mặt đất: góc trên-trái và kích thước. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Chiều cao khối vẽ nhô lên (px). */
  readonly rise: number;
  /** true = dài theo trục x (tường Bắc/Nam, tháp); false = dài theo trục y (tường Tây/Đông). */
  readonly horizontal: boolean;
  /** Hướng nghiêng của khối: -1 ngả trái, 1 ngả phải, 0 thẳng. */
  readonly lean: -1 | 0 | 1;
}

const PAD = 4;
let nextTextureId = 0;

function extOf(rise: number, lean: number): { x: number; y: number } {
  return { x: lean * CASTLE_SHEAR * rise, y: -rise };
}

/** Vẽ một khối (thân + răng cưa) lên Graphics tại gốc (ox, oy) là góc trên-trái của hình chiếu. */
function drawBlock(
  g: Phaser.GameObjects.Graphics,
  block: Block,
  ox: number,
  oy: number,
): void {
  const { width, height, horizontal } = block;
  const thick = horizontal ? height : width;
  const length = horizontal ? width : height;
  // Hệ (u, v): ngang → dir (0,1), gốc giữa cạnh trên; dọc → dir (1,0), gốc giữa cạnh trái.
  const originX = horizontal ? ox + width / 2 : ox;
  const originY = horizontal ? oy : oy + height / 2;
  const dirX = horizontal ? 0 : 1;
  const dirY = horizontal ? 1 : 0;
  const main = extOf(block.rise, block.lean);
  const merlon = extOf(CASTLE_MERLON_HEIGHT, block.lean);

  drawBrickBox(g, {
    originX,
    originY,
    dirX,
    dirY,
    u0: 0,
    u1: thick,
    v0: -length / 2,
    v1: length / 2,
    extX: main.x,
    extY: main.y,
    height: block.rise,
  });

  // Răng cưa xếp đều trên đỉnh, căn giữa.
  const count = Math.max(
    1,
    Math.floor((length + CASTLE_MERLON_GAP) / (CASTLE_MERLON_WIDTH + CASTLE_MERLON_GAP)),
  );
  const total = count * CASTLE_MERLON_WIDTH + (count - 1) * CASTLE_MERLON_GAP;
  const inset = thick > 16 ? 4 : 1;

  for (let i = 0; i < count; i += 1) {
    const v0 = -total / 2 + i * (CASTLE_MERLON_WIDTH + CASTLE_MERLON_GAP);

    drawBrickBox(g, {
      originX: originX + main.x,
      originY: originY + main.y,
      dirX,
      dirY,
      u0: inset,
      u1: thick - inset,
      v0,
      v1: v0 + CASTLE_MERLON_WIDTH,
      extX: merlon.x,
      extY: merlon.y,
      height: CASTLE_MERLON_HEIGHT,
    });
  }
}

/** Nướng một khối thành texture và đặt Image đúng vị trí; trả về Image để làm hiệu ứng. */
function placeBlock(scene: Phaser.Scene, block: Block): Phaser.GameObjects.Image {
  const main = extOf(block.rise, block.lean);
  const merlon = extOf(CASTLE_MERLON_HEIGHT, block.lean);
  const totalX = main.x + merlon.x;
  const totalY = main.y + merlon.y;
  const ox = PAD - Math.min(0, totalX);
  const oy = PAD - Math.min(0, totalY);
  const texWidth = Math.ceil(block.width + Math.abs(totalX) + PAD * 2);
  const texHeight = Math.ceil(block.height + Math.abs(totalY) + PAD * 2);
  const key = `castle-wall-${nextTextureId}`;

  nextTextureId += 1;

  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();

    drawBlock(g, block, ox, oy);
    g.generateTexture(key, texWidth, texHeight);
    g.destroy();
  }

  return scene.add
    .image(block.x - ox, block.y - oy, key)
    .setOrigin(0, 0)
    .setDepth(block.y + block.height);
}

function addCollider(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  block: Block,
): void {
  const zone = scene.add.zone(
    block.x + block.width / 2,
    block.y + block.height / 2,
    block.width,
    block.height,
  );

  scene.physics.add.existing(zone, true);
  obstacles.add(zone);
}

/** Cắt đoạn [from, to] thành các phần không dài quá `maxLength`. */
function split(from: number, to: number, maxLength: number): Array<[number, number]> {
  const parts = Math.max(1, Math.ceil((to - from) / maxLength));
  const step = (to - from) / parts;

  return Array.from({ length: parts }, (_, i) => [from + i * step, from + (i + 1) * step]);
}

function buildBlocks(): { walls: Block[]; towers: Block[] } {
  const { x, y, width, height } = VILLAGE_ZONE;
  const x0 = x;
  const x1 = x + width;
  const y0 = y;
  const y1 = y + height;
  const t = CASTLE_WALL_THICKNESS;
  const g = CASTLE_GATE_HALF_WIDTH;
  const walls: Block[] = [];
  const towers: Block[] = [];

  // Tường Bắc/Nam: hai đoạn mỗi cạnh, chừa cổng ở CASTLE_GATE_X.
  for (const wallY of [y0, y1]) {
    for (const [from, to] of [
      [x0, CASTLE_GATE_X - g],
      [CASTLE_GATE_X + g, x1],
    ] as const) {
      for (const [a, b] of split(from, to, CASTLE_CHUNK_HORIZONTAL)) {
        walls.push({
          x: a,
          y: wallY - t / 2,
          width: b - a,
          height: t,
          rise: CASTLE_WALL_HEIGHT,
          horizontal: true,
          lean: 0,
        });
      }
    }
  }

  // Tường Tây/Đông: chừa cổng ở CASTLE_GATE_Y; ngả ra ngoài để thấy mặt gạch phía trong.
  for (const [wallX, lean] of [
    [x0, -1],
    [x1, 1],
  ] as const) {
    for (const [from, to] of [
      [y0, CASTLE_GATE_Y - g],
      [CASTLE_GATE_Y + g, y1],
    ] as const) {
      for (const [a, b] of split(from, to, CASTLE_CHUNK_VERTICAL)) {
        walls.push({
          x: wallX - t / 2,
          y: a,
          width: t,
          height: b - a,
          rise: CASTLE_WALL_HEIGHT,
          horizontal: false,
          lean,
        });
      }
    }
  }

  const tower = (cx: number, cy: number, size: number, rise: number): Block => ({
    x: cx - size / 2,
    y: cy - size / 2,
    width: size,
    height: size,
    rise,
    horizontal: true,
    lean: 0,
  });
  const cs = CASTLE_CORNER_TOWER_SIZE;
  const gs = CASTLE_GATE_TOWER_SIZE;
  const gateOffset = g + gs / 2;

  for (const cx of [x0, x1]) {
    for (const cy of [y0, y1]) {
      towers.push(tower(cx, cy, cs, CASTLE_CORNER_TOWER_HEIGHT));
    }
  }

  for (const side of [-1, 1]) {
    for (const wallY of [y0, y1]) {
      towers.push(
        tower(CASTLE_GATE_X + side * gateOffset, wallY, gs, CASTLE_GATE_TOWER_HEIGHT),
      );
    }

    for (const wallX of [x0, x1]) {
      towers.push(
        tower(wallX, CASTLE_GATE_Y + side * gateOffset, gs, CASTLE_GATE_TOWER_HEIGHT),
      );
    }
  }

  return { walls, towers };
}

/** Dựng tường thành quanh làng. Gọi một lần khi tạo thế giới. */
export function buildVillageWall(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
): void {
  const { walls, towers } = buildBlocks();
  const all = [...walls, ...towers];

  all.forEach((block, index) => {
    const image = placeBlock(scene, block);
    const restY = image.y;

    addCollider(scene, obstacles, block);

    // Trồi lên từ đất theo từng đoạn.
    image.setAlpha(0).setY(restY + CASTLE_RISE_FROM_PX);
    scene.tweens.add({
      targets: image,
      alpha: 1,
      y: restY,
      duration: CASTLE_RISE_MS,
      delay: index * CASTLE_RISE_STAGGER_MS,
      ease: 'Back.easeOut',
    });
  });

  // Bụi bốc lên ở chân các tháp khi tường dựng xong.
  scene.time.delayedCall(CASTLE_RISE_MS, () => {
    for (const tower of towers) {
      spawnDust(scene, tower.x + tower.width / 2, tower.y + tower.height);
    }
  });
}
