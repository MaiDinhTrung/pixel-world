import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import {
  MINION_HIT_INVULN_MS,
  MINION_ENGAGE_RANGE,
  MINION_FOLLOW_DISTANCE,
  MINION_SPEED,
} from '../config/necromancerConfig';
import { spawnBurst, spawnHitSpark } from '../utils/effects';
import type { EnemyBase } from './EnemyBase';

export type MinionKind = 'skeleton' | 'bone_mage';

export interface MinionSpec {
  readonly kind: MinionKind;
  readonly lifetimeMs: number;
  readonly health: number;
  readonly damage: number;
  readonly attackMs: number;
  /** Khoảng cách tối đa để ra đòn. */
  readonly reach: number;
  readonly color: number;
}

/**
 * Đồng minh đơn giản: bám người chơi, lao vào quái gần nhất và đánh.
 * Không va chạm với ai; chưa bị quái làm hại (giới hạn đã biết).
 */
export class Minion extends Phaser.Physics.Arcade.Sprite {
  readonly spec: MinionSpec;
  private readonly expiresAt: number;
  private nextAttackAt = 0;
  private gone = false;
  private health: number;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, spec: MinionSpec) {
    super(scene, x, y, TEXTURE_KEYS.skeleton);

    this.spec = spec;
    this.expiresAt = scene.time.now + spec.lifetimeMs;
    this.health = spec.health;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5);
    this.setDepth(7);
    this.setCollideWorldBounds(true);

    if (spec.kind === 'bone_mage') {
      this.setTint(0xb48bff);
    }
  }

  isGone(): boolean {
    return this.gone;
  }

  /** Nhận sát thương từ quái; có khoảng bất tử ngắn sau mỗi lần trúng. */
  takeHit(amount: number, time: number): void {
    if (this.gone || time < this.invulnerableUntil) {
      return;
    }

    this.invulnerableUntil = time + MINION_HIT_INVULN_MS;
    this.health -= amount;
    spawnHitSpark(this.scene, this.x, this.y, 0xff6b6b);

    if (this.health <= 0) {
      spawnBurst(this.scene, this.x, this.y, this.spec.color, 10, 150);
      this.expire();
    }
  }

  /** Gọi mỗi frame bởi MinionManager. */
  tick(
    time: number,
    player: { x: number; y: number },
    enemies: readonly EnemyBase[],
    damageMult: number,
  ): void {
    if (this.gone) {
      return;
    }

    if (time >= this.expiresAt) {
      this.expire();
      return;
    }

    // Nhấp nháy báo sắp biến mất.
    this.setAlpha(
      this.expiresAt - time < 1500 && Math.floor(time / 120) % 2 === 0
        ? 0.35
        : 1,
    );

    const target = this.pickTarget(enemies);

    if (target) {
      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        target.x,
        target.y,
      );

      if (distance > this.spec.reach) {
        this.moveToward(target.x, target.y);
      } else {
        this.setVelocity(0, 0);
      }

      if (distance <= this.spec.reach + 8 && time >= this.nextAttackAt) {
        this.nextAttackAt = time + this.spec.attackMs;
        target.takeDamage(this.spec.damage * damageMult, this.x, this.y);
        spawnHitSpark(this.scene, target.x, target.y, this.spec.color);
      }

      return;
    }

    const toPlayer = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y,
    );

    if (toPlayer > MINION_FOLLOW_DISTANCE) {
      this.moveToward(player.x, player.y);
    } else {
      this.setVelocity(0, 0);
    }
  }

  private pickTarget(enemies: readonly EnemyBase[]): EnemyBase | null {
    let best: EnemyBase | null = null;
    let bestDistance = MINION_ENGAGE_RANGE;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        enemy.x,
        enemy.y,
      );

      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }

    return best;
  }

  private moveToward(x: number, y: number): void {
    const angle = Math.atan2(y - this.y, x - this.x);

    this.setVelocity(
      Math.cos(angle) * MINION_SPEED,
      Math.sin(angle) * MINION_SPEED,
    );
    this.setFlipX(Math.cos(angle) < 0);
  }

  expire(): void {
    if (this.gone) {
      return;
    }

    this.gone = true;
    this.destroy();
  }
}
