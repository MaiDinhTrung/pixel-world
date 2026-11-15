import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import type { VillagerSpec } from '../config/villageConfig';
import { createPixelTexture } from '../utils/pixelTexture';
import { NPC_ROWS, NPC_SCALE } from './Npc';

/** Dân làng trang trí: chỉ hình + bóng, không tên, không marker, không tương tác. */
export class Villager extends Phaser.GameObjects.Image {
  readonly spec: VillagerSpec;

  constructor(scene: Phaser.Scene, spec: VillagerSpec) {
    const textureKey = `villager-${spec.id}`;

    createPixelTexture(scene, textureKey, NPC_ROWS, spec.palette);
    super(scene, spec.x, spec.y, textureKey);

    this.spec = spec;
    this.setOrigin(0.5, 1).setScale(NPC_SCALE).setDepth(spec.y);
    scene.add.existing(this);

    scene.add
      .image(spec.x, spec.y - 2, TEXTURE_KEYS.shadow)
      .setDisplaySize(40, 12)
      .setAlpha(0.3)
      .setDepth(spec.y - 1);
  }
}
