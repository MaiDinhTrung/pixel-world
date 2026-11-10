import Phaser from 'phaser';

/**
 * Scene gameplay chính. Giai đoạn 0 chỉ dựng khung và kiểm tra render.
 * Nhân vật, bản đồ, quái vật và chiến đấu sẽ được thêm ở các giai đoạn sau.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 8, 'PIXEL WORLD', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e8e6f0',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 16, 'Phase 0 — foundation ready', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#7b7a8f',
      })
      .setOrigin(0.5);
  }
}
