import Phaser from 'phaser';

import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';

/** Độ phân giải thiết kế (theo pixel). Mọi toạ độ trong game dùng hệ này. */
export const DESIGN_WIDTH = 480;
export const DESIGN_HEIGHT = 270;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#0b0b12',

  // Pixel art: tắt làm mịn texture và bật làm tròn toạ độ khi render.
  pixelArt: true,
  roundPixels: true,

  scale: {
    // FIT: giữ đúng tỉ lệ 16:9, phóng to hết mức có thể trong màn hình.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  // Chuẩn bị sẵn cho gameplay action real-time ở các giai đoạn sau.
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  scene: [BootScene, GameScene],
};
