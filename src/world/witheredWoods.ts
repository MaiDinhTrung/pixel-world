import Phaser from 'phaser';

import { VILLAGE } from '../config/assets';
import { ATMOSPHERE_DEPTH, VIGNETTE_TEXTURE_KEY } from '../config/atmosphereConfig';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/constants';
import {
  WOODS_AMBIENT_ALPHA,
  WOODS_AMBIENT_COLOR,
  WOODS_DECOR,
  WOODS_ENEMY_SPAWNS,
  WOODS_GRASS_TINT,
  WOODS_GROUND_WASH_ALPHA,
  WOODS_GROUND_WASH_COLOR,
  WOODS_HEIGHT,
  WOODS_PATHS,
  WOODS_POND,
  WOODS_PORTAL_COLOR,
  WOODS_PORTAL_COLOR_CSS,
  WOODS_RETURN_LABEL,
  WOODS_RETURN_PORTAL,
  WOODS_RUINS,
  WOODS_TREE_POSITIONS,
  WOODS_VIGNETTE,
  WOODS_WIDTH,
} from '../config/witheredWoodsConfig';
import { CONN_WOODS_TO_LANDS } from '../config/worldConfig';
import { applyEnvironmentTint } from '../vfx/atmosphere';
import { createPortal } from './portal';
import { addDecor, addGround, addObstacle, addTree, type TownInfo } from './town';

/**
 * Rừng Sâu (P4b, Map `map.withered_woods`, Region Rừng Úa): dựng CHỈ bằng hình ảnh có sẵn của làng (`VILLAGE.*`)
 * + hình chữ nhật màu/tint; không sinh texture mới. Số liệu ở `config/witheredWoodsConfig.ts`.
 * Ánh sáng cố định kiểu hoàng hôn (ambient MULTIPLY + vignette tái dùng nếu có), không chu kỳ ngày/đêm.
 */

/** Ánh sáng cố định: ambient MULTIPLY phủ màn hình + vignette CHỈ khi texture vignette có sẵn đã tồn tại. */
function addWoodsLighting(scene: Phaser.Scene): void {
  scene.add
    .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, WOODS_AMBIENT_COLOR, 1)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setAlpha(WOODS_AMBIENT_ALPHA)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setDepth(ATMOSPHERE_DEPTH.ambient);

  if (WOODS_VIGNETTE.enabled && scene.textures.exists(VIGNETTE_TEXTURE_KEY)) {
    scene.add
      .image(0, 0, VIGNETTE_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(WOODS_VIGNETTE.alpha)
      .setDepth(ATMOSPHERE_DEPTH.vignette);
  }
}

export function buildWitheredWoods(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
): TownInfo {
  // Nền: cỏ có sẵn tô úa + lớp phủ rêu tối.
  addGround(scene, VILLAGE.grass.key, 0, 0, WOODS_WIDTH, WOODS_HEIGHT, 0).setTint(WOODS_GRASS_TINT);
  scene.add
    .rectangle(0, 0, WOODS_WIDTH, WOODS_HEIGHT, WOODS_GROUND_WASH_COLOR, WOODS_GROUND_WASH_ALPHA)
    .setOrigin(0, 0)
    .setDepth(0.5);

  // Lối đất.
  for (const path of WOODS_PATHS) {
    addGround(scene, VILLAGE.dirt.key, path.x, path.y, path.width, path.height, 1);
  }

  // Hồ nước + va chạm, tàn tích tường đá quanh hồ.
  applyEnvironmentTint(
    addGround(scene, VILLAGE.water.key, WOODS_POND.x, WOODS_POND.y, WOODS_POND.width, WOODS_POND.height, 1),
    'water',
  );
  addObstacle(
    scene,
    obstacles,
    WOODS_POND.x + WOODS_POND.width / 2,
    WOODS_POND.y + WOODS_POND.height / 2,
    WOODS_POND.width - 12,
    WOODS_POND.height - 12,
  );

  for (const ruin of WOODS_RUINS) {
    addGround(scene, VILLAGE.stoneWall.key, ruin.x, ruin.y, ruin.width, ruin.height, 2);
  }

  for (const tree of WOODS_TREE_POSITIONS) {
    addTree(scene, obstacles, tree.x, tree.y);
  }

  for (const decor of WOODS_DECOR) {
    addDecor(scene, decor);
  }

  addWoodsLighting(scene);

  // Cổng về Hoang Địa (luôn mở, loại 'enter' theo luật suy ra từ lockRules).
  const returnPortal = createPortal(scene, {
    x: WOODS_RETURN_PORTAL.x,
    y: WOODS_RETURN_PORTAL.y,
    kind: 'enter',
    connectionId: CONN_WOODS_TO_LANDS,
    color: WOODS_PORTAL_COLOR,
    label: WOODS_RETURN_LABEL,
    labelColor: WOODS_PORTAL_COLOR_CSS,
  });

  return {
    enemySpawns: WOODS_ENEMY_SPAWNS.map((point) => ({ ...point })),
    npcs: [],
    portals: [returnPortal],
  };
}
