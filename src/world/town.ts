import Phaser from 'phaser';

import { VILLAGE } from '../config/assets';
import { TEXTURE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { VILLAGE_NPCS, VILLAGE_ZONE } from '../config/economyConfig';
import { Npc } from '../entities/Npc';
import {
  addGroundWash,
  addPointLight,
  applyEnvironmentTint,
} from '../vfx/atmosphere';
import { buildVillageWall } from './castleWall';

type VillageAssetKey = keyof typeof VILLAGE;

interface BuildingSpec {
  asset: VillageAssetKey;
  x: number;
  baseY: number;
  scale: number;
}

interface PropSpec {
  asset: VillageAssetKey;
  x: number;
  y: number;
  scale: number;
  obstacleWidth?: number;
  obstacleHeight?: number;
}

export interface TownInfo {
  playerSpawn: { x: number; y: number };
  enemySpawns: { x: number; y: number }[];
  /** NPC trong làng (thương nhân, thợ rèn). */
  npcs: Npc[];
}

const BUILDINGS: readonly BuildingSpec[] = [
  { asset: 'tavern', x: 1520, baseY: 1420, scale: 2 },
  { asset: 'shop', x: 2280, baseY: 1340, scale: 2 },
  { asset: 'cottageA', x: 760, baseY: 1020, scale: 2 },
  { asset: 'cottageB', x: 1080, baseY: 960, scale: 2 },
  { asset: 'blacksmith', x: 1330, baseY: 1700, scale: 2 },
  { asset: 'church', x: 2510, baseY: 1720, scale: 2 },
  { asset: 'stable', x: 2860, baseY: 1800, scale: 2 },
  { asset: 'windmill', x: 760, baseY: 2050, scale: 2 },
  { asset: 'cottageA', x: 1500, baseY: 2200, scale: 2 },
  { asset: 'cottageB', x: 2600, baseY: 2180, scale: 2 },
  { asset: 'cottageA', x: 3160, baseY: 1250, scale: 2 },
  { asset: 'market', x: 1480, baseY: 1560, scale: 2 },
  { asset: 'market', x: 2360, baseY: 1560, scale: 2 },
  { asset: 'well', x: 1920, baseY: 1230, scale: 2 },
];

const TREES: readonly { x: number; y: number }[] = [
  { x: 1000, y: 400 },
  { x: 1700, y: 500 },
  { x: 2500, y: 520 },
  { x: 3300, y: 500 },
  { x: 1250, y: 1150 },
  { x: 2570, y: 1150 },
  { x: 1250, y: 1680 },
  { x: 2570, y: 1680 },
  { x: 1600, y: 1680 },
  { x: 2250, y: 1680 },
  { x: 450, y: 1400 },
  { x: 1100, y: 1400 },
  { x: 2900, y: 1450 },
  { x: 3500, y: 1400 },
  { x: 400, y: 1900 },
  { x: 1150, y: 1900 },
  { x: 2300, y: 1900 },
  { x: 3500, y: 2300 },
  { x: 1200, y: 2400 },
  { x: 1900, y: 2400 },
  { x: 2600, y: 2420 },
];

const PROPS: readonly PropSpec[] = [
  { asset: 'lamppost', x: 1400, y: 980, scale: 2 },
  { asset: 'lamppost', x: 2440, y: 980, scale: 2 },
  { asset: 'lamppost', x: 1400, y: 1580, scale: 2 },
  { asset: 'lamppost', x: 2440, y: 1580, scale: 2 },
  { asset: 'lamppost', x: 1880, y: 1120, scale: 2 },
  { asset: 'lamppost', x: 1960, y: 1500, scale: 2 },
  { asset: 'bench', x: 1780, y: 1380, scale: 2 },
  { asset: 'bench', x: 2060, y: 1380, scale: 2 },
  { asset: 'bench', x: 1700, y: 1150, scale: 2 },
  { asset: 'barrel', x: 1640, y: 1360, scale: 2 },
  { asset: 'barrel', x: 2190, y: 1360, scale: 2 },
  { asset: 'crate', x: 1660, y: 1390, scale: 2 },
  { asset: 'crate', x: 2210, y: 1390, scale: 2 },
  { asset: 'cart', x: 2400, y: 1660, scale: 2 },
  { asset: 'sign', x: 1850, y: 1520, scale: 2 },
  { asset: 'flag', x: 1520, y: 1230, scale: 2 },
  { asset: 'flag', x: 2320, y: 1230, scale: 2 },
  { asset: 'flower', x: 1800, y: 1300, scale: 2 },
  { asset: 'flower', x: 2040, y: 1300, scale: 2 },
  { asset: 'flower', x: 1800, y: 1450, scale: 2 },
  { asset: 'flower', x: 2040, y: 1450, scale: 2 },
  { asset: 'flower', x: 1750, y: 1200, scale: 2 },
  { asset: 'flower', x: 1700, y: 1620, scale: 2 },
  { asset: 'flower', x: 2100, y: 1620, scale: 2 },
  { asset: 'flower', x: 1550, y: 1750, scale: 2 },
  { asset: 'flower', x: 2300, y: 1750, scale: 2 },
  { asset: 'bush', x: 1420, y: 1100, scale: 2 },
  { asset: 'bush', x: 2420, y: 1120, scale: 2 },
  { asset: 'bush', x: 1250, y: 1750, scale: 2 },
  { asset: 'bush', x: 2650, y: 1800, scale: 2 },
  { asset: 'haystack', x: 2920, y: 1860, scale: 2 },
  { asset: 'scarecrow', x: 3200, y: 1870, scale: 2 },
  { asset: 'campfire', x: 600, y: 1500, scale: 2 },
  { asset: 'bucket', x: 1980, y: 1400, scale: 2 },
];

const ENEMY_SPAWNS = [
  { x: 1050, y: 1150 },
  { x: 2750, y: 1150 },
  { x: 1050, y: 1750 },
  { x: 2750, y: 1750 },
  { x: 1000, y: 400 },
  { x: 3300, y: 600 },
  { x: 1100, y: 2350 },
  { x: 2900, y: 2350 },
] as const;

function addGround(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
): Phaser.GameObjects.TileSprite {
  return scene.add
    .tileSprite(x, y, width, height, key)
    .setOrigin(0, 0)
    .setDepth(depth);
}

/** Bóng đổ dùng image (batch được) thay cho Ellipse shape (mỗi cái một draw call). */
function addShadow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
  depth: number,
): void {
  scene.add
    .image(x, y, TEXTURE_KEYS.shadow)
    .setDisplaySize(width, height)
    .setAlpha(alpha)
    .setDepth(depth);
}

function addObstacle(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const zone = scene.add.zone(x, y, width, height);

  scene.physics.add.existing(zone, true);
  group.add(zone);
}

function addBuilding(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  spec: BuildingSpec,
): void {
  const image = scene.add
    .image(spec.x, spec.baseY, VILLAGE[spec.asset].key)
    .setOrigin(0.5, 1)
    .setScale(spec.scale)
    .setDepth(spec.baseY);

  applyEnvironmentTint(image, spec.asset);

  addShadow(scene, spec.x, spec.baseY - 2, image.displayWidth * 0.68, 14, 0.22, spec.baseY - 1);

  addObstacle(
    scene,
    obstacles,
    spec.x,
    spec.baseY - 14,
    image.displayWidth * 0.72,
    28,
  );
}

function addTree(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
): void {
  const tree = scene.add
    .image(x, y, VILLAGE.oak.key)
    .setOrigin(0.5, 1)
    .setScale(2)
    .setDepth(y);

  applyEnvironmentTint(tree, 'oak');

  addShadow(scene, x, y - 2, 30, 10, 0.2, y - 1);

  addObstacle(scene, obstacles, x, y - 8, 26, 14);
}

function addProp(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  spec: PropSpec,
): void {
  const prop = scene.add
    .image(spec.x, spec.y, VILLAGE[spec.asset].key)
    .setOrigin(0.5, 1)
    .setScale(spec.scale)
    .setDepth(spec.y);

  applyEnvironmentTint(prop, spec.asset);
  addPointLight(scene, spec.asset, spec.x, spec.y);

  if (spec.obstacleWidth && spec.obstacleHeight) {
    addObstacle(
      scene,
      obstacles,
      spec.x,
      spec.y - spec.obstacleHeight / 2,
      spec.obstacleWidth,
      spec.obstacleHeight,
    );
  }
}

/** Viền vùng làng an toàn + biển tên, để người chơi biết đâu quái không vào được. */
function addVillageMarkers(scene: Phaser.Scene): void {
  const { x, y, width, height } = VILLAGE_ZONE;

  scene.add
    .rectangle(x, y, width, height, 0x4dffa6, 0.04)
    .setOrigin(0, 0)
    .setStrokeStyle(3, 0x4dffa6, 0.35)
    .setDepth(2);

  scene.add
    .text(x + width / 2, y + 28, 'LÀNG — KHU AN TOÀN', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#4dffa6',
      fontStyle: 'bold',
      backgroundColor: '#0b0c12',
      padding: { x: 8, y: 4 },
    })
    .setOrigin(0.5)
    .setAlpha(0.85)
    .setDepth(3);
}

/** Dựng town lớn 3840×2560 từ bộ tile CC0. */
export function buildTown(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
): TownInfo {
  // Nền
  addGround(scene, VILLAGE.grass.key, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0);
  addGroundWash(scene);

  // Đường chính + quảng trường trung tâm
  addGround(
    scene,
    VILLAGE.cobble.key,
    0,
    1248,
    WORLD_WIDTH,
    64,
    1,
  );
  addGround(
    scene,
    VILLAGE.cobble.key,
    1888,
    0,
    64,
    WORLD_HEIGHT,
    1,
  );
  addGround(
    scene,
    VILLAGE.cobble.key,
    1344,
    928,
    1152,
    572,
    1,
  );

  // Đường đất nối các khu
  addGround(scene, VILLAGE.dirt.key, 800, 1000, 560, 48, 1);
  addGround(scene, VILLAGE.dirt.key, 1200, 1020, 48, 360, 1);
  addGround(scene, VILLAGE.dirt.key, 2496, 1480, 360, 48, 1);
  addGround(scene, VILLAGE.dirt.key, 2380, 980, 48, 300, 1);
  addGround(scene, VILLAGE.dirt.key, 1200, 1900, 48, 300, 1);
  addGround(scene, VILLAGE.dirt.key, 2400, 2000, 360, 48, 1);

  // Hồ nước + va chạm
  applyEnvironmentTint(
    addGround(scene, VILLAGE.water.key, 256, 320, 512, 384, 1),
    'water',
  );
  addObstacle(scene, obstacles, 512, 512, 500, 372);

  addGround(
    scene,
    VILLAGE.stoneWall.key,
    256,
    316,
    128,
    16,
    2,
  );
  addGround(
    scene,
    VILLAGE.stoneWall.key,
    640,
    316,
    128,
    16,
    2,
  );
  addGround(
    scene,
    VILLAGE.stoneWall.key,
    256,
    704,
    512,
    16,
    2,
  );

  // Đồng ruộng
  addGround(scene, VILLAGE.farmland.key, 2880, 1900, 512, 384, 1);

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const crop = scene.add
        .image(2920 + column * 96, 1960 + row * 80, VILLAGE.crop.key)
        .setOrigin(0.5, 1)
        .setScale(2)
        .setDepth(1901 + row * 80);

      applyEnvironmentTint(crop, 'crop');
    }
  }

  for (const building of BUILDINGS) {
    addBuilding(scene, obstacles, building);
  }

  for (const tree of TREES) {
    addTree(scene, obstacles, tree.x, tree.y);
  }

  for (const prop of PROPS) {
    addProp(scene, obstacles, prop);
  }

  addVillageMarkers(scene);
  buildVillageWall(scene, obstacles);

  const npcs = VILLAGE_NPCS.map((spec) => {
    const npc = new Npc(scene, spec);

    addObstacle(scene, obstacles, spec.x, spec.y - 10, 30, 20);
    return npc;
  });

  return {
    playerSpawn: { x: 1920, y: 1440 },
    enemySpawns: ENEMY_SPAWNS.map((point) => ({ ...point })),
    npcs,
  };
}
