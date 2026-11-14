import Phaser from 'phaser';

import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_DAMAGE_TIER_STEP,
  ENEMY_HEALTH_MULT_PER_TIER,
  ENEMY_MAX_HEALTH,
  ENEMY_MAX_SPEED_MULT,
  ENEMY_SPEED,
  ENEMY_SPEED_MULT_PER_TIER,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import { EnemyBase, type EnemyTarget } from './EnemyBase';

/** Quái cận chiến: đuổi thẳng tới Player và gây sát thương khi chạm. */
export class Enemy extends EnemyBase {
  private readonly moveSpeed: number;
  private readonly contactDamage: number;
  private nextLungeAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, tier = 0) {
    super(
      scene,
      x,
      y,
      TEXTURE_KEYS.enemy,
      TEXTURE_KEYS.enemy,
      Math.round(ENEMY_MAX_HEALTH * (1 + tier * ENEMY_HEALTH_MULT_PER_TIER)),
      20,
      20,
      NEON.meleeEnemy,
    );

    this.moveSpeed =
      ENEMY_SPEED *
      Math.min(
        ENEMY_MAX_SPEED_MULT,
        1 + tier * ENEMY_SPEED_MULT_PER_TIER,
      );
    this.contactDamage =
      ENEMY_CONTACT_DAMAGE + Math.floor(tier / ENEMY_DAMAGE_TIER_STEP);
  }

  override getContactDamage(): number {
    return this.contactDamage;
  }

  updateAI(target: EnemyTarget, time: number): void {
    if (!this.canAct(time)) {
      return;
    }

    const direction = new Phaser.Math.Vector2(
      target.x - this.x,
      target.y - this.y,
    );

    if (direction.lengthSq() < 1) {
      this.setVelocity(0, 0);
      return;
    }

    const distance = direction.length();

    // Vồ tới khi áp sát: animation gồng vuốt giúp quái có nhịp tấn công rõ.
    if (distance <= 64 && time >= this.nextLungeAt) {
      this.nextLungeAt = time + 620;
      this.playAttackAnimation(260);
    }

    direction
      .normalize()
      .scale(this.moveSpeed * this.getSpeedMultiplier(time));
    this.setVelocity(direction.x, direction.y);
    this.setFlipX(direction.x < 0);
  }
}
