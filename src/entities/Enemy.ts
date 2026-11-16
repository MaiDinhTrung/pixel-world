import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import { DEFAULT_MELEE_ARCHETYPE, type ArchetypeId } from '../config/enemyConfig';
import { NEON } from '../config/palette';
import { meleeStats } from '../systems/enemyStats';
import { EnemyBase, type EnemyTarget } from './EnemyBase';

/** Quái cận chiến: đuổi thẳng tới Player và gây sát thương khi chạm. */
export class Enemy extends EnemyBase {
  private readonly moveSpeed: number;
  private readonly contactDamage: number;
  private nextLungeAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tier = 0,
    archetype: ArchetypeId = DEFAULT_MELEE_ARCHETYPE,
  ) {
    const stats = meleeStats(tier, archetype);

    super(
      scene,
      x,
      y,
      TEXTURE_KEYS.enemy,
      TEXTURE_KEYS.enemy,
      stats.maxHealth,
      20,
      20,
      NEON.meleeEnemy,
    );

    this.moveSpeed = stats.moveSpeed;
    this.contactDamage = stats.contactDamage;
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
