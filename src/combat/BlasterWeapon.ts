import Phaser from 'phaser';

import {
  BLASTER_COOLDOWN_MS,
  BLASTER_DAMAGE,
  BLASTER_ENERGY_COST,
  BLASTER_SPREAD_DEGREES,
  BULLET_LIFETIME_MS,
  BULLET_SPEED,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import type { Player } from '../entities/Player';
import { spawnHitSpark } from '../utils/effects';
import { nextProjectileId } from '../utils/projectile';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  getMuzzlePoint,
  placeWeaponImage,
} from './weaponSprite';

/** Súng năng lượng: tiêu energy để bắn projectile về hướng ngắm. */
export class BlasterWeapon implements Weapon {
  readonly id = 'blaster';
  readonly name = 'SÚNG NĂNG LƯỢNG';
  readonly energyCost = BLASTER_ENERGY_COST;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly bullets: Phaser.Physics.Arcade.Group;
  private readonly sprite: Phaser.GameObjects.Image;

  private cooldownUntil = 0;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    bullets: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;

    this.sprite = createWeaponImage(scene, 'blaster', player.x, player.y);
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);
  }

  destroy(): void {
    this.sprite.destroy();
  }

  update(_time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'blaster', aim);
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (time < this.cooldownUntil) {
      return false;
    }

    if (!this.player.consumeShotEnergy(BLASTER_ENERGY_COST, time)) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      BLASTER_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getRangedAttackCooldownMultiplier(time);

    const bulletCount = 1 + stats.bulletCountBonus;
    const baseAngle = aim.angle();
    const damage =
      BLASTER_DAMAGE * stats.rangedDamageMultiplier * stats.damageMultiplier;
    const speed = BULLET_SPEED * stats.bulletSpeedMultiplier;

    for (let i = 0; i < bulletCount; i += 1) {
      const offsetDegrees =
        (i - (bulletCount - 1) / 2) * BLASTER_SPREAD_DEGREES;
      const angle = baseAngle + Phaser.Math.DegToRad(offsetDegrees);

      this.spawnBullet(angle, damage, stats.bulletPierce, speed);
    }

    const flash = getMuzzlePoint(this.player, 'blaster', aim.x, aim.y);

    spawnHitSpark(this.scene, flash.x, flash.y, NEON.playerBullet);

    return true;
  }

  private spawnBullet(
    angle: number,
    damage: number,
    pierce: number,
    speed: number,
  ): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const { x: muzzleX, y: muzzleY } = getMuzzlePoint(
      this.player,
      'blaster',
      directionX,
      directionY,
    );
    const bullet = this.bullets.get(
      muzzleX,
      muzzleY,
      TEXTURE_KEYS.bullet,
    ) as Phaser.Physics.Arcade.Sprite | null;

    if (!bullet) {
      return;
    }

    const shotId = nextProjectileId();

    bullet.setData('shotId', shotId);
    bullet.setData('damage', damage);
    bullet.setData('chillMs', 0);
    bullet.setData('pierce', pierce);
    bullet.enableBody(true, muzzleX, muzzleY, true, true);
    bullet.setDepth(9);
    bullet.setScale(1); // pool dùng chung: tránh thừa scale từ quả cầu lớn của Trượng
    bullet.setRotation(angle);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    bullet.setVelocity(directionX * speed, directionY * speed);

    // Chỉ tắt viên đạn nếu nó chưa bị tái sử dụng cho phát bắn khác.
    this.scene.time.delayedCall(BULLET_LIFETIME_MS, () => {
      if (bullet.active && bullet.getData('shotId') === shotId) {
        bullet.disableBody(true, true);
      }
    });
  }
}
