import Phaser from 'phaser';

/**
 * Scene khởi động: nơi tải asset dùng chung ở các giai đoạn sau.
 * Giai đoạn 0 chưa có asset nên chuyển thẳng vào GameScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
