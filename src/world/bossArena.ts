import Phaser from 'phaser';

import { VILLAGE } from '../config/assets';
import { ATMOSPHERE_DEPTH, POINT_LIGHT } from '../config/atmosphereConfig';
import {
  BOSS_ARENA_AMBIENT_ALPHA,
  BOSS_ARENA_AMBIENT_COLOR,
  BOSS_ARENA_BRAZIERS,
  BOSS_ARENA_CENTER,
  BOSS_ARENA_CORNER_CUT,
  BOSS_ARENA_FLOOR_DARK,
  BOSS_ARENA_FLOOR_LIGHT,
  BOSS_ARENA_FLOOR_MORTAR,
  BOSS_ARENA_FOG_ALPHA,
  BOSS_ARENA_FOG_COLOR,
  BOSS_ARENA_FOG_PATCHES,
  BOSS_ARENA_FOG_PATCHES_TOUCH,
  BOSS_ARENA_FOG_RADIUS,
  BOSS_ARENA_FOG_SPEED,
  BOSS_ARENA_HEIGHT,
  BOSS_ARENA_LIGHT_ALPHA,
  BOSS_ARENA_LIGHT_RADIUS,
  BOSS_ARENA_MINION_SPAWNS,
  BOSS_ARENA_PILLAR_DIAGONAL_DISTANCE,
  BOSS_ARENA_PILLAR_RISE,
  BOSS_ARENA_PILLAR_SIZE,
  BOSS_ARENA_PLAYER_SPAWN,
  BOSS_ARENA_RETURN_COLOR,
  BOSS_ARENA_RETURN_COLOR_CSS,
  BOSS_ARENA_RETURN_LABEL,
  BOSS_ARENA_RETURN_PORTAL,
  BOSS_ARENA_RUNE_ALPHA,
  BOSS_ARENA_RUNE_COLOR,
  BOSS_ARENA_RUNE_RADIUS,
  BOSS_ARENA_STEP,
  BOSS_ARENA_VIGNETTE_CLEAR_RADIUS,
  BOSS_ARENA_VIGNETTE_STRENGTH,
  BOSS_ARENA_WALL_RISE,
  BOSS_ARENA_WALL_THICKNESS,
  BOSS_ARENA_WALL_TINT,
  BOSS_ARENA_WIDTH,
} from '../config/bossArenaConfig';
import {
  CASTLE_CHUNK_HORIZONTAL,
  CASTLE_CHUNK_VERTICAL,
  CASTLE_MERLON_GAP,
  CASTLE_MERLON_HEIGHT,
  CASTLE_MERLON_WIDTH,
  CASTLE_SHEAR,
} from '../config/castleConfig';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/constants';
import { isTouchDevice } from '../utils/device';
import { drawBrickBox } from '../vfx/brickBox';
import { createPortal } from './portal';
import type { TownInfo } from './town';

/**
 * Dựng Đấu Trường Boss: sàn gạch xám-tím, tường gạch biên (vát 4 góc dạng bậc thang), 4 cột đá,
 * vòng ma pháp ở tâm, brazier kèm đèn, ánh sáng CỐ ĐỊNH (không theo ngày/đêm) và cổng về.
 * Toạ độ cục bộ, gốc (0, 0) ở góc trên-trái; kích thước ở `config/bossArenaConfig.ts`.
 * Mọi texture sinh một lần cho cả game (khoá cố định, kiểm tra tồn tại) nên vào lại không tạo thêm.
 */

interface Block {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rise: number;
  readonly horizontal: boolean;
  readonly lean: -1 | 0 | 1;
  /** Có răng cưa trên đỉnh (tường) hay không (cột). */
  readonly crown: boolean;
}

const PAD = 4;
const RADIAL_KEY = 'arena-radial';
const RADIAL_SIZE = 128;
const VIGNETTE_KEY = 'arena-vignette';

function ensureRadialTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(RADIAL_KEY)) {
    return;
  }

  const texture = scene.textures.createCanvas(RADIAL_KEY, RADIAL_SIZE, RADIAL_SIZE);

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const c = RADIAL_SIZE / 2;
  const gradient = context.createRadialGradient(c, c, 0, c, c, c);

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, RADIAL_SIZE, RADIAL_SIZE);
  texture.refresh();
}

function ensureVignetteTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(VIGNETTE_KEY)) {
    return;
  }

  const texture = scene.textures.createCanvas(
    VIGNETTE_KEY,
    DESIGN_WIDTH,
    DESIGN_HEIGHT,
  );

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const cx = DESIGN_WIDTH / 2;
  const cy = DESIGN_HEIGHT / 2;
  const gradient = context.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    Math.hypot(cx, cy),
  );

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(BOSS_ARENA_VIGNETTE_CLEAR_RADIUS, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${BOSS_ARENA_VIGNETTE_STRENGTH})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  texture.refresh();
}

/** Sàn: texture 64×64 gồm 2×2 ô gạch 32px xen kẽ hai tông, viền vữa. */
function addFloor(scene: Phaser.Scene): void {
  const key = 'arena-floor';

  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        g.fillStyle(
          (row + col) % 2 === 0 ? BOSS_ARENA_FLOOR_DARK : BOSS_ARENA_FLOOR_LIGHT,
          1,
        );
        g.fillRect(col * 32, row * 32, 32, 32);
      }
    }

    g.lineStyle(2, BOSS_ARENA_FLOOR_MORTAR, 1);

    for (let i = 0; i < 2; i += 1) {
      g.lineBetween(i * 32, 0, i * 32, 64);
      g.lineBetween(0, i * 32, 64, i * 32);
    }

    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  scene.add
    .tileSprite(0, 0, BOSS_ARENA_WIDTH, BOSS_ARENA_HEIGHT, key)
    .setOrigin(0, 0)
    .setDepth(0);
}

/** Vòng ma pháp mờ ở tâm sàn (hai vòng + hình sao sáu cánh). */
function addRune(scene: Phaser.Scene): void {
  const key = 'arena-rune';
  const radius = BOSS_ARENA_RUNE_RADIUS;
  const size = radius * 2 + 8;

  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();
    const c = size / 2;

    g.lineStyle(3, BOSS_ARENA_RUNE_COLOR, 1);
    g.strokeCircle(c, c, radius);
    g.strokeCircle(c, c, radius * 0.82);
    g.lineStyle(2, BOSS_ARENA_RUNE_COLOR, 1);
    g.strokeCircle(c, c, radius * 0.45);

    for (const offset of [0, Math.PI / 6]) {
      const points = [0, 1, 2].map((i) => {
        const angle = offset - Math.PI / 2 + (i / 3) * Math.PI * 2;

        return {
          x: c + Math.cos(angle) * radius * 0.82,
          y: c + Math.sin(angle) * radius * 0.82,
        };
      });

      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];

        g.lineBetween(point.x, point.y, next.x, next.y);
      });
    }

    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;

      g.fillStyle(BOSS_ARENA_RUNE_COLOR, 1);
      g.fillRect(
        c + Math.cos(angle) * radius * 0.91 - 3,
        c + Math.sin(angle) * radius * 0.91 - 3,
        6,
        6,
      );
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  scene.add
    .image(BOSS_ARENA_CENTER.x, BOSS_ARENA_CENTER.y, key)
    .setAlpha(BOSS_ARENA_RUNE_ALPHA)
    .setDepth(1);
}

function extOf(rise: number, lean: number): { x: number; y: number } {
  return { x: lean * CASTLE_SHEAR * rise, y: -rise };
}

/** Vẽ một khối gạch (thân + răng cưa nếu có) tại gốc (ox, oy) = góc trên-trái hình chiếu. */
function drawBlock(
  g: Phaser.GameObjects.Graphics,
  block: Block,
  ox: number,
  oy: number,
): void {
  const { width, height, horizontal } = block;
  const thick = horizontal ? height : width;
  const length = horizontal ? width : height;
  const originX = horizontal ? ox + width / 2 : ox;
  const originY = horizontal ? oy : oy + height / 2;
  const dirX = horizontal ? 0 : 1;
  const dirY = horizontal ? 1 : 0;
  const main = extOf(block.rise, block.lean);

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

  if (!block.crown) {
    return;
  }

  const merlon = extOf(CASTLE_MERLON_HEIGHT, block.lean);
  const count = Math.max(
    1,
    Math.floor(
      (length + CASTLE_MERLON_GAP) / (CASTLE_MERLON_WIDTH + CASTLE_MERLON_GAP),
    ),
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

/** Nướng khối thành texture (khoá cố định theo `id`, dùng lại nếu có) và đặt Image. */
function placeBlock(
  scene: Phaser.Scene,
  block: Block,
  id: string,
): Phaser.GameObjects.Image {
  const main = extOf(block.rise, block.lean);
  const merlon = extOf(block.crown ? CASTLE_MERLON_HEIGHT : 0, block.lean);
  const totalX = main.x + merlon.x;
  const totalY = main.y + merlon.y;
  const ox = PAD - Math.min(0, totalX);
  const oy = PAD - Math.min(0, totalY);
  const texWidth = Math.ceil(block.width + Math.abs(totalX) + PAD * 2);
  const texHeight = Math.ceil(block.height + Math.abs(totalY) + PAD * 2);
  const key = `arena-block-${id}`;

  if (!scene.textures.exists(key)) {
    const g = scene.add.graphics();

    drawBlock(g, block, ox, oy);
    g.generateTexture(key, texWidth, texHeight);
    g.destroy();
  }

  return scene.add
    .image(block.x - ox, block.y - oy, key)
    .setOrigin(0, 0)
    .setTint(BOSS_ARENA_WALL_TINT)
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

function split(from: number, to: number, maxLength: number): Array<[number, number]> {
  const parts = Math.max(1, Math.ceil((to - from) / maxLength));
  const step = (to - from) / parts;

  return Array.from({ length: parts }, (_, i) => [from + i * step, from + (i + 1) * step]);
}

/** Tường biên + bậc thang vát 4 góc. */
function buildWallBlocks(): Block[] {
  const w = BOSS_ARENA_WIDTH;
  const h = BOSS_ARENA_HEIGHT;
  const t = BOSS_ARENA_WALL_THICKNESS;
  const rise = BOSS_ARENA_WALL_RISE;
  const blocks: Block[] = [];

  for (const wallY of [0, h - t]) {
    for (const [a, b] of split(0, w, CASTLE_CHUNK_HORIZONTAL)) {
      blocks.push({
        x: a,
        y: wallY,
        width: b - a,
        height: t,
        rise,
        horizontal: true,
        lean: 0,
        crown: true,
      });
    }
  }

  for (const [wallX, lean] of [
    [0, -1],
    [w - t, 1],
  ] as const) {
    for (const [a, b] of split(t, h - t, CASTLE_CHUNK_VERTICAL)) {
      blocks.push({
        x: wallX,
        y: a,
        width: t,
        height: b - a,
        rise,
        horizontal: false,
        lean,
        crown: true,
      });
    }
  }

  // Góc vát: các hàng ngang ngắn dần, xếp bậc thang từ mép ngoài vào.
  for (let k = 1; ; k += 1) {
    const rowWidth = BOSS_ARENA_CORNER_CUT - k * BOSS_ARENA_STEP;

    if (rowWidth <= t) {
      break;
    }

    for (const right of [false, true]) {
      for (const bottom of [false, true]) {
        blocks.push({
          x: right ? w - rowWidth : 0,
          y: bottom ? h - (k + 1) * BOSS_ARENA_STEP : k * BOSS_ARENA_STEP,
          width: rowWidth,
          height: BOSS_ARENA_STEP,
          rise,
          horizontal: true,
          lean: 0,
          crown: true,
        });
      }
    }
  }

  return blocks;
}

function buildPillarBlocks(): Block[] {
  const d = BOSS_ARENA_PILLAR_DIAGONAL_DISTANCE / Math.SQRT2;
  const s = BOSS_ARENA_PILLAR_SIZE;

  return [-1, 1].flatMap((sx) =>
    [-1, 1].map<Block>((sy) => ({
      x: BOSS_ARENA_CENTER.x + sx * d - s / 2,
      y: BOSS_ARENA_CENTER.y + sy * d - s / 2,
      width: s,
      height: s,
      rise: BOSS_ARENA_PILLAR_RISE,
      horizontal: true,
      lean: 0,
      crown: false,
    })),
  );
}

interface BrazierLight {
  readonly image: Phaser.GameObjects.Image;
  readonly baseScale: number;
  readonly phase: number;
  readonly periodMs: number;
}

/** Ánh sáng cố định: ambient + vignette + đèn brazier nhấp nháy + sương mỏng. Không đọc chu kỳ ngày/đêm. */
function addFixedLighting(scene: Phaser.Scene): void {
  ensureRadialTexture(scene);
  ensureVignetteTexture(scene);

  scene.add
    .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, BOSS_ARENA_AMBIENT_COLOR, 1)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setAlpha(BOSS_ARENA_AMBIENT_ALPHA)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setDepth(ATMOSPHERE_DEPTH.ambient);
  scene.add
    .image(0, 0, VIGNETTE_KEY)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(ATMOSPHERE_DEPTH.vignette);

  const lights: BrazierLight[] = BOSS_ARENA_BRAZIERS.map((point) => {
    const baseScale = (BOSS_ARENA_LIGHT_RADIUS * 2) / RADIAL_SIZE;

    return {
      image: scene.add
        .image(point.x, point.y - 18, RADIAL_KEY)
        .setTint(POINT_LIGHT.color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(BOSS_ARENA_LIGHT_ALPHA)
        .setScale(baseScale)
        .setDepth(ATMOSPHERE_DEPTH.light),
      baseScale,
      phase: Math.random() * Math.PI * 2,
      periodMs: Phaser.Math.Between(POINT_LIGHT.flickerMinMs, POINT_LIGHT.flickerMaxMs),
    };
  });

  const fogCount = isTouchDevice()
    ? BOSS_ARENA_FOG_PATCHES_TOUCH
    : BOSS_ARENA_FOG_PATCHES;
  const span = BOSS_ARENA_WIDTH + BOSS_ARENA_FOG_RADIUS * 2;
  const fog = Array.from({ length: fogCount }, (_, i) => ({
    image: scene.add
      .image(0, 0, RADIAL_KEY)
      .setTint(BOSS_ARENA_FOG_COLOR)
      .setAlpha(BOSS_ARENA_FOG_ALPHA)
      .setScale((BOSS_ARENA_FOG_RADIUS * 2) / RADIAL_SIZE)
      .setDepth(ATMOSPHERE_DEPTH.fog),
    x0: (i / fogCount) * span,
    y: 180 + ((i * 397) % (BOSS_ARENA_HEIGHT - 360)),
    dir: i % 2 === 0 ? 1 : -1,
  }));

  const update = (): void => {
    const now = scene.time.now;

    for (const light of lights) {
      const wave = Math.sin((now / light.periodMs) * Math.PI * 2 + light.phase);

      light.image
        .setAlpha(
          BOSS_ARENA_LIGHT_ALPHA * (1 - POINT_LIGHT.flickerAlpha * (0.5 - 0.5 * wave)),
        )
        .setScale(light.baseScale * (1 + POINT_LIGHT.flickerScale * wave));
    }

    for (const patch of fog) {
      const travelled = (patch.x0 + (now / 1000) * BOSS_ARENA_FOG_SPEED * patch.dir) % span;
      const x = ((travelled + span) % span) - BOSS_ARENA_FOG_RADIUS;

      patch.image.setPosition(x, patch.y);
    }
  };

  update();
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  });
}

function addBraziers(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
): void {
  for (const point of BOSS_ARENA_BRAZIERS) {
    scene.add
      .image(point.x, point.y, VILLAGE.campfire.key)
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(point.y);

    const zone = scene.add.zone(point.x, point.y - 8, 26, 16);

    scene.physics.add.existing(zone, true);
    obstacles.add(zone);
  }
}

/** Dựng toàn bộ Arena; trả về thông tin map theo cùng dạng `TownInfo` của map chính. */
export function buildBossArena(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
): TownInfo {
  addFloor(scene);
  addRune(scene);

  const walls = buildWallBlocks();
  const pillars = buildPillarBlocks();

  [...walls, ...pillars].forEach((block, index) => {
    placeBlock(scene, block, `${index}`);
    addCollider(scene, obstacles, block);
  });

  addBraziers(scene, obstacles);
  addFixedLighting(scene);

  const portal = createPortal(scene, {
    x: BOSS_ARENA_RETURN_PORTAL.x,
    y: BOSS_ARENA_RETURN_PORTAL.y,
    kind: 'return',
    color: BOSS_ARENA_RETURN_COLOR,
    label: BOSS_ARENA_RETURN_LABEL,
    labelColor: BOSS_ARENA_RETURN_COLOR_CSS,
  });

  return {
    playerSpawn: { ...BOSS_ARENA_PLAYER_SPAWN },
    enemySpawns: BOSS_ARENA_MINION_SPAWNS.map((point) => ({ ...point })),
    npcs: [],
    portal,
  };
}
