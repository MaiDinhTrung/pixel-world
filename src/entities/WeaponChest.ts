import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import { spawnBurst, spawnGlow } from '../utils/effects';

/** Độ cao (px) đồ nổi lên phía trên tâm hòm; hòm vẽ 24×21 px ở scale 1. */
const CHEST_ICON_REST_Y = -22;
/** Icon đồ lớn hơn cạnh này (px) sẽ hiện ở nửa kích thước. */
const CHEST_ICON_MAX_FULL_SIZE = 36;

/**
 * Hòm trang bị rơi từ quái (vũ khí hoặc giáp/mũ/giày).
 * Đứng gần và nhấn F để mở; WorldScene quyết định món đồ nhận được.
 */
export class WeaponChest extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Image;
  private readonly chest: Phaser.GameObjects.Image;
  private readonly weaponIcon: Phaser.GameObjects.Image;
  private readonly bobTween: Phaser.Tweens.Tween;
  private readonly glowTween: Phaser.Tweens.Tween;
  private iconTween: Phaser.Tweens.Tween | null = null;
  private readonly legendary: boolean;
  private opened = false;
  private weaponId: string | null = null;
  private weaponName = '';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    legendary = false,
  ) {
    super(scene, x, y);

    this.legendary = legendary;

    this.glow = scene.add
      .image(0, 0, TEXTURE_KEYS.glow)
      .setTint(legendary ? NEON.legendary : NEON.chest)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(legendary ? 1.1 : 0.8)
      .setAlpha(legendary ? 0.7 : 0.5);

    this.chest = scene.add.image(
      0,
      0,
      legendary
        ? TEXTURE_KEYS.legendaryChestClosed
        : TEXTURE_KEYS.chestClosed,
    );
    this.weaponIcon = scene.add
      .image(0, CHEST_ICON_REST_Y, TEXTURE_KEYS.bow)
      .setVisible(false);

    this.add([this.glow, this.chest, this.weaponIcon]);
    this.setDepth(y + 20);

    scene.add.existing(this);

    this.bobTween = scene.tweens.add({
      targets: this.chest,
      y: -2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const glowFrom = legendary ? 0.5 : 0.35;
    const glowTo = legendary ? 0.85 : 0.7;
    const scaleFrom = legendary ? 0.9 : 0.75;
    const scaleTo = legendary ? 1.15 : 0.95;

    this.glowTween = scene.tweens.add({
      targets: this.glow,
      alpha: { from: glowFrom, to: glowTo },
      scale: { from: scaleFrom, to: scaleTo },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  isOpened(): boolean {
    return this.opened;
  }

  isLegendary(): boolean {
    return this.legendary;
  }

  getItemId(): string | null {
    return this.weaponId;
  }

  getItemName(): string {
    return this.weaponName;
  }

  /** Mở nắp và lộ món đồ bên trong; chưa nhặt. */
  open(itemId: string, itemName: string, textureKey: string): void {
    if (this.opened) {
      return;
    }

    this.opened = true;
    this.weaponId = itemId;
    this.weaponName = itemName;
    this.bobTween.stop();
    this.chest.setTexture(
      this.legendary
        ? TEXTURE_KEYS.legendaryChestOpen
        : TEXTURE_KEYS.chestOpen,
    );

    this.weaponIcon.setTexture(textureKey).setVisible(true);

    // Đồ trong hòm hiện ở 1:1 (mũ/giáp/giày ~20 px); vũ khí dài hơn ngưỡng thì thu một nửa cho vừa tầm nhìn.
    const largestSide = Math.max(this.weaponIcon.width, this.weaponIcon.height, 1);

    this.weaponIcon.setScale(largestSide > CHEST_ICON_MAX_FULL_SIZE ? 0.5 : 1);
    this.iconTween = this.scene.tweens.add({
      targets: this.weaponIcon,
      y: CHEST_ICON_REST_Y - 5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const color = this.legendary ? NEON.legendary : NEON.chest;
    spawnBurst(this.scene, this.x, this.y, color, 10, 120);
    spawnGlow(this.scene, this.x, this.y, color, 1.5, 400);
  }

  destroy(fromScene?: boolean): void {
    this.bobTween.stop();
    this.glowTween.stop();
    this.iconTween?.stop();
    super.destroy(fromScene);
  }
}
