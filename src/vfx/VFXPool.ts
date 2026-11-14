import Phaser from 'phaser';

/**
 * Pool sprite dùng lại cho VFX: không tạo/hủy đối tượng khi đang chơi.
 * Khi chạm trần `maxActive`, `acquire` trả về null (hiệu ứng bị bỏ qua).
 */
export class VFXPool {
  private readonly free: Phaser.GameObjects.Sprite[] = [];
  private active = 0;

  private readonly scene: Phaser.Scene;
  private readonly maxActive: number;

  constructor(scene: Phaser.Scene, maxActive: number) {
    this.scene = scene;
    this.maxActive = maxActive;
  }

  acquire(
    texture: string,
    frame?: string | number,
  ): Phaser.GameObjects.Sprite | null {
    if (this.active >= this.maxActive) {
      return null;
    }

    let sprite = this.free.pop();

    if (!sprite) {
      sprite = this.scene.add.sprite(0, 0, texture, frame);
    } else {
      sprite.setTexture(texture, frame);
    }

    this.active += 1;
    sprite
      .setActive(true)
      .setVisible(true)
      .setAlpha(1)
      .setScale(1)
      .setRotation(0)
      .setOrigin(0.5)
      .setFlip(false, false)
      .clearTint()
      .setBlendMode(Phaser.BlendModes.NORMAL);

    return sprite;
  }

  release(sprite: Phaser.GameObjects.Sprite): void {
    if (!sprite.active) {
      return;
    }

    this.scene.tweens.killTweensOf(sprite);
    sprite.anims.stop();
    sprite.removeAllListeners();
    sprite.setActive(false).setVisible(false);
    this.active -= 1;
    this.free.push(sprite);
  }

  getActiveCount(): number {
    return this.active;
  }

  destroy(): void {
    this.free.length = 0;
    this.active = 0;
  }
}
