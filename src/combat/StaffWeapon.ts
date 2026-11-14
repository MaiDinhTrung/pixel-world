import Phaser from 'phaser';

import {
  STAFF_BIG_ORB_DAMAGE_MULT,
  STAFF_BIG_ORB_ENERGY_MULT,
  STAFF_BIG_ORB_SCALE,
  STAFF_BIG_ORB_SPEED_MULT,
  STAFF_CHARGE_MS,
  STAFF_COOLDOWN_MS,
  STAFF_DAMAGE,
  STAFF_ENERGY_COST,
  STAFF_ORB_LIFETIME_MS,
  STAFF_ORB_PIERCE,
  STAFF_ORB_SPEED,
  STAFF_SPREAD_DEGREES,
  WAND_COOLDOWN_MS,
  WAND_DAMAGE,
  WAND_ENERGY_COST,
  WAND_ORB_LIFETIME_MS,
  WAND_ORB_PIERCE,
  WAND_ORB_SPEED,
  WAND_SPREAD_DEGREES,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import type { Player } from '../entities/Player';
import { spawnBurst, spawnHitSpark, spawnRing } from '../utils/effects';
import { nextProjectileId } from '../utils/projectile';
import type { Weapon, WeaponId } from './Weapon';
import {
  createWeaponImage,
  getMuzzlePoint,
  placeWeaponImage,
} from './weaponSprite';

export interface StaffWeaponConfig {
  readonly id: WeaponId;
  readonly name: string;
  readonly textureKey: string;
  readonly damage: number;
  readonly energyCost: number;
  readonly cooldownMs: number;
  readonly orbSpeed: number;
  readonly orbLifetimeMs: number;
  readonly pierce: number;
  readonly spreadDegrees: number;
  /** Giữ nút ≥ chừng này (ms) rồi thả = quả cầu lớn; 0 = vũ khí không có cơ chế sạc (bắn ngay khi bấm). */
  readonly chargeMs: number;
}

export const STAFF_WEAPON_CONFIG: StaffWeaponConfig = {
  id: 'staff',
  name: 'TRƯỢNG',
  textureKey: TEXTURE_KEYS.staff,
  damage: STAFF_DAMAGE,
  energyCost: STAFF_ENERGY_COST,
  cooldownMs: STAFF_COOLDOWN_MS,
  orbSpeed: STAFF_ORB_SPEED,
  orbLifetimeMs: STAFF_ORB_LIFETIME_MS,
  pierce: STAFF_ORB_PIERCE,
  spreadDegrees: STAFF_SPREAD_DEGREES,
  chargeMs: STAFF_CHARGE_MS,
};

export const WAND_WEAPON_CONFIG: StaffWeaponConfig = {
  id: 'wand',
  name: 'ĐŨA PHÉP',
  textureKey: TEXTURE_KEYS.wand,
  damage: WAND_DAMAGE,
  energyCost: WAND_ENERGY_COST,
  cooldownMs: WAND_COOLDOWN_MS,
  orbSpeed: WAND_ORB_SPEED,
  orbLifetimeMs: WAND_ORB_LIFETIME_MS,
  pierce: WAND_ORB_PIERCE,
  spreadDegrees: WAND_SPREAD_DEGREES,
  chargeMs: 0,
};

/** Trượng: bắn orb arcane lớn, xuyên qua nhiều quái. */
export class StaffWeapon implements Weapon {
  readonly id: WeaponId;
  readonly name: string;
  readonly energyCost: number;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly bullets: Phaser.Physics.Arcade.Group;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly config: StaffWeaponConfig;

  private cooldownUntil = 0;
  private charging = false;
  private chargeStart = 0;
  private fullChargeShown = false;
  private chargeGlow: Phaser.GameObjects.Image | null = null;
  private chargeCore: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    bullets: Phaser.Physics.Arcade.Group,
    config: StaffWeaponConfig = STAFF_WEAPON_CONFIG,
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.energyCost = config.energyCost;

    this.sprite = createWeaponImage(scene, config.id, player.x, player.y);
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.cancelCharge();
    }
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, this.config.id, aim);

    if (!this.charging) {
      return;
    }

    if (this.player.isDead()) {
      this.cancelCharge();
      return;
    }

    const ratio = Phaser.Math.Clamp(
      (time - this.chargeStart) / this.config.chargeMs,
      0,
      1,
    );
    const tip = getMuzzlePoint(this.player, this.config.id, aim.x, aim.y);

    // Quả cầu năng lượng tụ dần ở đầu trượng, càng sạc càng to và sáng; đầy thì nhấp nháy mạnh.
    const pulse =
      ratio >= 1 ? 1 + 0.15 * Math.sin(time / 55) : 1;

    this.chargeGlow
      ?.setPosition(tip.x, tip.y)
      .setScale((0.4 + ratio * 1.3) * pulse)
      .setAlpha(0.5 + ratio * 0.5);
    // Lõi trắng nhỏ bên trong: làm điểm tụ sáng rõ hơn quầng tím.
    this.chargeCore
      ?.setPosition(tip.x, tip.y)
      .setScale((0.15 + ratio * 0.65) * pulse)
      .setAlpha(0.4 + ratio * 0.6);
    // Trượng ánh lên theo mức sạc: tint từ trắng sang tím sáng nhấp nháy khi đầy (không blur, chỉ đổi màu).
    this.sprite.setTint(
      ratio >= 1 && Math.sin(time / 55) > 0 ? 0xffffff : 0xe9c9ff,
    );

    if (ratio >= 1 && !this.fullChargeShown) {
      this.fullChargeShown = true;
      spawnRing(this.scene, tip.x, tip.y, 26, NEON.staff, 240);
      spawnBurst(this.scene, tip.x, tip.y, NEON.staff, 6, 80);
    }
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.config.chargeMs <= 0) {
      return this.fireNormal(time, aim);
    }

    // Có cơ chế sạc: bấm = bắt đầu tụ lực, bắn khi thả nút (`releaseAttack`).
    if (this.charging || this.player.isDead() || time < this.cooldownUntil) {
      return false;
    }

    this.charging = true;
    this.chargeStart = time;
    this.fullChargeShown = false;
    this.chargeGlow = this.scene.add
      .image(this.player.x, this.player.y, TEXTURE_KEYS.glow)
      .setDepth(12)
      .setTint(NEON.staff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.4)
      .setAlpha(0.5);
    this.chargeCore = this.scene.add
      .image(this.player.x, this.player.y, TEXTURE_KEYS.glow)
      .setDepth(13)
      .setTint(0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.15)
      .setAlpha(0.4);

    return true;
  }

  releaseAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (!this.charging) {
      return false;
    }

    const big = time - this.chargeStart >= this.config.chargeMs;

    this.cancelCharge();

    return big ? this.fireBig(time, aim) : this.fireNormal(time, aim);
  }

  private cancelCharge(): void {
    this.charging = false;
    this.chargeGlow?.destroy();
    this.chargeGlow = null;
    this.chargeCore?.destroy();
    this.chargeCore = null;
    this.sprite.clearTint();
  }

  /** Quả cầu lớn: một quả duy nhất, to, chậm hơn, sát thương ×`STAFF_BIG_ORB_DAMAGE_MULT`, tốn EN gấp đôi. */
  private fireBig(time: number, aim: Phaser.Math.Vector2): boolean {
    const cost = this.config.energyCost * STAFF_BIG_ORB_ENERGY_MULT;

    if (!this.player.consumeShotEnergy(cost, time)) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      this.config.cooldownMs *
        stats.cooldownMultiplier *
        this.player.getRangedAttackCooldownMultiplier(time);

    const damage =
      this.config.damage *
      STAFF_BIG_ORB_DAMAGE_MULT *
      stats.rangedDamageMultiplier *
      stats.damageMultiplier;
    const pierce = this.config.pierce + stats.bulletPierce;

    this.spawnOrb(
      aim.angle(),
      damage,
      pierce,
      STAFF_BIG_ORB_SCALE,
      this.config.orbSpeed * STAFF_BIG_ORB_SPEED_MULT,
    );

    const flash = getMuzzlePoint(this.player, this.config.id, aim.x, aim.y);

    spawnHitSpark(this.scene, flash.x, flash.y, NEON.staff);
    spawnRing(this.scene, flash.x, flash.y, 36, NEON.staff, 260);
    spawnBurst(this.scene, flash.x, flash.y, NEON.staff, 8, 110);
    this.scene.cameras.main.shake(70, 0.002);

    return true;
  }

  private fireNormal(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead() || time < this.cooldownUntil) {
      return false;
    }

    if (!this.player.consumeShotEnergy(this.config.energyCost, time)) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      this.config.cooldownMs *
        stats.cooldownMultiplier *
        this.player.getRangedAttackCooldownMultiplier(time);

    const orbCount = 1 + stats.bulletCountBonus;
    const damage =
      this.config.damage *
      stats.rangedDamageMultiplier *
      stats.damageMultiplier;
    const pierce = this.config.pierce + stats.bulletPierce;
    const baseAngle = aim.angle();

    for (let i = 0; i < orbCount; i += 1) {
      const offsetDegrees =
        (i - (orbCount - 1) / 2) * this.config.spreadDegrees;
      const angle = baseAngle + Phaser.Math.DegToRad(offsetDegrees);

      this.spawnOrb(angle, damage, pierce);
    }

    const flash = getMuzzlePoint(this.player, this.config.id, aim.x, aim.y);

    spawnHitSpark(this.scene, flash.x, flash.y, NEON.staff);

    return true;
  }

  destroy(): void {
    this.cancelCharge();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  private spawnOrb(
    angle: number,
    damage: number,
    pierce: number,
    scale = 1,
    speed = this.config.orbSpeed,
  ): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const { x: muzzleX, y: muzzleY } = getMuzzlePoint(
      this.player,
      this.config.id,
      directionX,
      directionY,
    );

    const orb = this.bullets.get(
      muzzleX,
      muzzleY,
      TEXTURE_KEYS.orb,
    ) as Phaser.Physics.Arcade.Sprite | null;

    if (!orb) {
      return;
    }

    const shotId = nextProjectileId();

    orb.setData('shotId', shotId);
    orb.setData('damage', damage);
    orb.setData('chillMs', 0);
    orb.setData('pierce', pierce);
    orb.enableBody(true, muzzleX, muzzleY, true, true);
    orb.setDepth(9);
    orb.setScale(scale);
    orb.setBlendMode(Phaser.BlendModes.ADD);
    orb.setRotation(0);
    orb.setVelocity(directionX * speed, directionY * speed);

    this.scene.time.delayedCall(this.config.orbLifetimeMs, () => {
      if (orb.active && orb.getData('shotId') === shotId) {
        orb.disableBody(true, true);
      }
    });
  }
}
