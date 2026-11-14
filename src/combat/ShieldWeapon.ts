import Phaser from 'phaser';

import {
  FORTRESS_PLANT_DISTANCE,
  SHIELD_ARC_HALF_DEGREES,
  SHIELD_BASH_MS,
  SHIELD_COOLDOWN_MS,
  SHIELD_DAMAGE,
  SHIELD_RANGE,
} from '../config/combatConfig';
import { NEON } from '../config/palette';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import { spawnHitSpark } from '../utils/effects';
import type { Weapon } from './Weapon';
import { createWeaponImage } from './weaponSprite';

/** Khiên: đẩy quái tầm gần theo một cung rộng, sát thương thấp nhưng liên tục. */
export class ShieldWeapon implements Weapon {
  readonly id = 'shield';
  readonly name = 'KHIÊN';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly getEnemies: () => EnemyBase[];
  private readonly sprite: Phaser.GameObjects.Image;

  private cooldownUntil = 0;
  private bashingUntil = 0;
  private active = false;
  /** Song Thủ: khiên cầm tay phụ khi vũ khí chính là vũ khí khác (không đỡ, chỉ hiển thị). */
  private offHand = false;
  /** Hướng cắm khiên khi Bất Động Thành Lũy đang chạy; null = không cắm. */
  private plantAngle: number | null = null;

  constructor(scene: Phaser.Scene, player: Player, getEnemies: () => EnemyBase[]) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.sprite = createWeaponImage(scene, 'shield', player.x, player.y);
  }

  setActive(active: boolean): void {
    this.active = active;
    this.sprite.setVisible(active || this.offHand);

    if (!active) {
      this.plantAngle = null;
    }

    if (!active) {
      this.clearGuard();
    }
  }

  setOffHand(offHand: boolean): void {
    this.offHand = offHand;
    this.sprite.setVisible(this.active || offHand);
  }

  /** Bất Động Thành Lũy: cắm khiên xuống đất trước người (null = nhổ lên, trở lại bình thường). */
  setPlanted(aimAngle: number | null): void {
    this.plantAngle = aimAngle;

    if (aimAngle === null) {
      this.sprite.setScale(Math.sign(this.sprite.scaleX) || 1, 1);
      return;
    }

    // Giáng xuống: to rồi thu về đúng cỡ (tween trên scale nên không xung đột với vị trí do update đặt).
    const sx = Math.sign(this.sprite.scaleX) || 1;

    this.sprite.setScale(sx * 1.5, 1.5);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: sx,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeIn',
    });
  }

  private clearGuard(): void {
    this.player.setGuard(false);
  }

  destroy(): void {
    this.clearGuard();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    this.sprite.setDepth(this.player.y + 21);

    if (!this.active) {
      // Khiên phụ (Song Thủ): đeo bên hông, không đỡ đòn.
      if (this.offHand) {
        const hand = this.player.getHandPoint('off', aim, 6);

        this.sprite.setPosition(hand.x, hand.y);
        this.sprite.setRotation(0);
      }

      return;
    }

    // Cầm khiên là luôn giơ khiên đỡ theo hướng ngắm (cắm khiên thì tường lo phần chắn, khiên không đỡ nữa).
    this.player.setGuard(
      !this.player.isDead() && this.plantAngle === null,
      aim.angle(),
    );

    // Đang cắm khiên: khiên cắm đứng trước người, không theo tay.
    if (this.plantAngle !== null) {
      this.sprite.setPosition(
        this.player.x + Math.cos(this.plantAngle) * FORTRESS_PLANT_DISTANCE,
        this.player.y + Math.sin(this.plantAngle) * FORTRESS_PLANT_DISTANCE + 6,
      );
      this.sprite.setRotation(0);
      return;
    }

    // Trong lúc bash, tween đang điều khiển vị trí/rotation.
    if (time >= this.bashingUntil) {
      const hand = this.player.getHandPoint('off', aim, 12);

      this.sprite.setPosition(hand.x, hand.y);
      this.sprite.setRotation(0);
    }
  }

  /** Nút đánh: đập khiên (khiên vẫn luôn giơ đỡ đòn phía trước). */
  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (
      this.player.isDead() ||
      this.plantAngle !== null ||
      time < this.cooldownUntil
    ) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      SHIELD_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getMeleeAttackCooldownMultiplier(time);
    this.bashingUntil = time + SHIELD_BASH_MS;

    const baseAngle = aim.angle();
    const halfArc = Phaser.Math.DegToRad(SHIELD_ARC_HALF_DEGREES);
    const range = SHIELD_RANGE + stats.swordRangeBonus;
    const damage =
      (SHIELD_DAMAGE + stats.meleeDamageBonus) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier;

    this.sprite.setRotation(0);

    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + aim.x * 10,
      y: this.sprite.y + aim.y * 10,
      duration: SHIELD_BASH_MS,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    this.spawnBash(baseAngle, halfArc, range);
    this.hitEnemies(baseAngle, halfArc, range, damage);

    return true;
  }

  private hitEnemies(
    baseAngle: number,
    halfArc: number,
    range: number,
    damage: number,
  ): void {
    const rangeSq = range * range;

    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;

      if (dx * dx + dy * dy > rangeSq) {
        continue;
      }

      const angleToEnemy = Math.atan2(dy, dx);

      if (Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - baseAngle)) > halfArc) {
        continue;
      }

      enemy.takeDamage(damage, this.player.x, this.player.y);
      spawnHitSpark(this.scene, enemy.x, enemy.y, NEON.sword);
    }
  }

  private spawnBash(
    baseAngle: number,
    halfArc: number,
    range: number,
  ): void {
    const arc = this.scene.add.graphics();

    arc.setPosition(this.player.x, this.player.y);
    arc.setDepth(12);
    arc.lineStyle(5, NEON.sword, 0.75);
    arc.beginPath();
    arc.arc(0, 0, range - 6, baseAngle - halfArc, baseAngle + halfArc);
    arc.strokePath();

    this.scene.tweens.add({
      targets: arc,
      alpha: 0,
      duration: SHIELD_BASH_MS + 80,
      ease: 'Quad.easeOut',
      onComplete: () => arc.destroy(),
    });
  }
}
