import Phaser from 'phaser';

import { SCENE_KEYS } from '../config/constants';

/**
 * Scene khởi động: cấu hình ban đầu và chuyển ngay sang nạp tài nguyên.
 * Ở các giai đoạn sau có thể bổ sung thiết lập dùng chung tại đây.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    this.scene.start(SCENE_KEYS.preload);
  }
}
