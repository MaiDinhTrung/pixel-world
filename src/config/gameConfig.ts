import Phaser from 'phaser';

import { BootScene } from '../scenes/BootScene';
import { CharacterPanelScene } from '../scenes/CharacterPanelScene';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { VillageShopScene } from '../scenes/VillageShopScene';
import { WorldScene } from '../scenes/WorldScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './constants';

/** Cấu hình khởi tạo Phaser: độ phân giải, pixel-art, co giãn màn hình, vật lý, danh sách scene. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#0b0b12',

  // Pixel art: tắt làm mịn texture và bật làm tròn toạ độ khi render.
  pixelArt: true,
  roundPixels: true,

  // Ưu tiên GPU rời (laptop có 2 card) và không bật antialias cho pixel art.
  render: {
    powerPreference: 'high-performance',
    antialias: false,
    antialiasGL: false,
  },

  // Cảm ứng đa điểm: joystick di chuyển + joystick ngắm + nút bấm.
  input: {
    activePointers: 4,
  },

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
      // Bước vật lý theo delta thực của từng frame (thay vì cố định 60 Hz) để vị trí
      // cập nhật đều mỗi frame, khớp màn 90/120 Hz và không còn frame "bỏ bước".
      fixedStep: false,
      debug: false,
    },
  },

  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    CharacterSelectScene,
    WorldScene,
    CharacterPanelScene,
    VillageShopScene,
  ],
};
