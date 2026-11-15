import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import type { NpcRole, NpcSpec } from '../config/economyConfig';
import { createPixelTexture } from '../utils/pixelTexture';

export const NPC_ROWS: readonly string[] = [
  '....hhhh....',
  '...hhhhhh...',
  '...ffffff...',
  '...fefefe...',
  '...ffffff...',
  '....ffff....',
  '..cccccccc..',
  '.cccccccccc.',
  '.fcccccccfc.',
  '.fcccccccfc.',
  '..cccccccc..',
  '..cccccccc..',
  '..cc....cc..',
  '..cc....cc..',
  '..bb....bb..',
  '.bbb....bbb.',
];

const NPC_PALETTES: Record<NpcRole, Record<string, string>> = {
  merchant: { h: '#8a5a2b', f: '#f2c9a0', e: '#2a1f1a', c: '#e0b43a', b: '#4a3320' },
  blacksmith: { h: '#555566', f: '#e8b88e', e: '#2a1f1a', c: '#c9732a', b: '#2f2f38' },
  elder: { h: '#d8d2c0', f: '#d9b896', e: '#2a1f1a', c: '#5c7a9e', b: '#2c2a38' },
};

export const NPC_SCALE = 3;

/** NPC đứng yên có tên + biểu tượng nổi (`spec.marker`); người chơi lại gần và nhấn F để mở cửa hàng hoặc nghe Trưởng làng. */
export class Npc extends Phaser.GameObjects.Image {
  readonly role: NpcRole;
  readonly spec: NpcSpec;

  constructor(scene: Phaser.Scene, spec: NpcSpec) {
    const textureKey = `npc-${spec.role}`;

    createPixelTexture(scene, textureKey, NPC_ROWS, NPC_PALETTES[spec.role]);
    super(scene, spec.x, spec.y, textureKey);

    this.role = spec.role;
    this.spec = spec;
    this.setOrigin(0.5, 1).setScale(NPC_SCALE).setDepth(spec.y);
    scene.add.existing(this);

    scene.add
      .image(spec.x, spec.y - 2, TEXTURE_KEYS.shadow)
      .setDisplaySize(40, 12)
      .setAlpha(0.3)
      .setDepth(spec.y - 1);

    scene.add
      .text(spec.x, spec.y - 78, spec.name, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: spec.colorCss,
        fontStyle: 'bold',
        backgroundColor: '#0b0c12',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(spec.y + 1);

    scene.add
      .text(spec.x, spec.y - 62, spec.title, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#cfd2dd',
      })
      .setOrigin(0.5, 1)
      .setDepth(spec.y + 1);

    const marker = scene.add
      .text(spec.x, spec.y - 96, spec.marker, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: spec.colorCss,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setDepth(spec.y + 1);

    scene.tweens.add({
      targets: marker,
      y: marker.y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
