import Phaser from 'phaser';

import {
  DRAGON_BOW_ARROW_LIFETIME_MS,
  DRAGON_BOW_ARROW_SPEED,
  DRAGON_BOW_COOLDOWN_MS,
  DRAGON_BOW_DIRECT_DAMAGE,
  DRAGON_BOW_ENERGY_COST,
  DRAGON_BOW_EXPLODE_DAMAGE,
  DRAGON_BOW_EXPLODE_RADIUS,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import type { Player } from '../entities/Player';
import { spawnHitSpark } from '../utils/effects';
import { nextProjectileId } from '../utils/projectile';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  getMuzzlePoint,
  placeWeaponImage,
} from './weaponSprite';
import { getDrawFrameCount, getDrawTextureKey } from '../utils/weaponTextures';

export type ExplodeCallback = (
  x: number,
  y: number,
  radius: number,
  damage: number,
) => void;

/** DRAGON BOW: mũi tên phát nổ khi trúng hoặc hết thời gian bay. */
export class DragonBowWeapon implements Weapon {
  readonly id = 'dragon_bow';
  readonly name = 'CUNG RỒNG';
  readonly energyCost = DRAGON_BOW_ENERGY_COST;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly bullets: Phaser.Physics.Arcade.Group;
  private readonly onExplode: ExplodeCallback;
  private readonly sprite: Phaser.GameObjects.Image;

  private cooldownUntil = 0;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    bullets: Phaser.Physics.Arcade.Group,
    onExplode: ExplodeCallback,
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    this.onExplode = onExplode;

    this.sprite = createWeaponImage(scene, 'dragon_bow', player.x, player.y);
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);
  }

  update(_time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'dragon_bow', aim);
  }

  /** Cung Rồng bắn tức thì nên không có sạc lực; thay vào đó hiện nhanh dây căng rồi bật về khi buông. */
  private playReleaseFlash(): void {
    const last = getDrawFrameCount('dragon_bow') - 1;
    const steps: [number, string][] = [
      [0, getDrawTextureKey('dragon_bow', last)],
      [60, getDrawTextureKey('dragon_bow', 1)],
      [120, TEXTURE_KEYS.dragonBow],
    ];

    for (const [delay, key] of steps) {
      this.scene.time.delayedCall(delay, () => {
        if (this.sprite.active) {
          this.sprite.setTexture(key);
        }
      });
    }
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead() || time < this.cooldownUntil) {
      return false;
    }

    if (!this.player.consumeShotEnergy(DRAGON_BOW_ENERGY_COST, time)) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      DRAGON_BOW_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getRangedAttackCooldownMultiplier(time);

    this.playReleaseFlash();

    const angle = aim.angle();
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const { x: muzzleX, y: muzzleY } = getMuzzlePoint(
      this.player,
      'dragon_bow',
      directionX,
      directionY,
    );
    const arrow = this.bullets.get(
      muzzleX,
      muzzleY,
      TEXTURE_KEYS.arrow,
    ) as Phaser.Physics.Arcade.Sprite | null;

    if (!arrow) {
      return false;
    }

    const shotId = nextProjectileId();
    const damage =
      DRAGON_BOW_DIRECT_DAMAGE *
      stats.rangedDamageMultiplier *
      stats.damageMultiplier;
    const explodeDamage =
      DRAGON_BOW_EXPLODE_DAMAGE *
      stats.rangedDamageMultiplier *
      stats.damageMultiplier;

    arrow.setData('shotId', shotId);
    arrow.setData('damage', damage);
    arrow.setData('chillMs', 0);
    arrow.setData('pierce', 0);
    arrow.setData('explodeRadius', DRAGON_BOW_EXPLODE_RADIUS);
    arrow.setData('explodeDamage', explodeDamage);
    arrow.enableBody(true, muzzleX, muzzleY, true, true);
    arrow.setDepth(9);
    arrow.setScale(1);
    arrow.setTint(0xff8a4d);
    arrow.setBlendMode(Phaser.BlendModes.ADD);
    arrow.setRotation(angle);
    arrow.setVelocity(
      directionX * DRAGON_BOW_ARROW_SPEED,
      directionY * DRAGON_BOW_ARROW_SPEED,
    );

    this.scene.time.delayedCall(DRAGON_BOW_ARROW_LIFETIME_MS, () => {
      if (arrow.active && arrow.getData('shotId') === shotId) {
        this.onExplode(
          arrow.x,
          arrow.y,
          DRAGON_BOW_EXPLODE_RADIUS,
          explodeDamage,
        );
        arrow.disableBody(true, true);
      }
    });

    spawnHitSpark(this.scene, muzzleX, muzzleY, 0xff8a4d);

    return true;
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}
