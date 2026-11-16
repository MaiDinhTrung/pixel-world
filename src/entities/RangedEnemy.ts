import Phaser from 'phaser';

import {
  ENEMY_BULLET_SPEED,
  RANGED_ENEMY_COOLDOWN_MS,
  RANGED_ENEMY_PREFERRED_DISTANCE,
  RANGED_ENEMY_SHOOT_RANGE,
  RANGED_ENEMY_SPREAD_DEGREES,
  RANGED_ENEMY_TELEGRAPH_MS,
  RANGED_ENEMY_TRIPLE_SHOT_TIER,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { DEFAULT_RANGED_ARCHETYPE, type ArchetypeId } from '../config/enemyConfig';
import { rangedStats } from '../systems/enemyStats';
import { NEON } from '../config/palette';
import { ENEMY_TELEGRAPH_GLOW_ALPHA } from '../config/vfxConfig';
import { spawnGlow, spawnHitSpark, spawnRing } from '../utils/effects';
import {
  ELEMENTAL_ENEMIES_ENABLED,
  ELEMENTAL_ENEMY_CHANCE,
  ELEMENTAL_ENEMY_DAMAGE_MULT,
  ELEMENTAL_ENEMY_MIN_TIER,
  ELEMENTAL_ENEMY_OWN_RESIST,
  ELEMENTAL_ENEMY_TYPES,
  ELEMENT_COLORS,
  type ElementType,
} from '../config/damageTypeConfig';
import { fireEnemyBullet } from '../utils/projectile';
import { EnemyBase, type EnemyTarget } from './EnemyBase';

/**
 * Quái bắn xa: giữ khoảng cách, telegraph rồi bắn orb magenta về phía Player.
 */
export class RangedEnemy extends EnemyBase {
  private readonly projectiles: Phaser.Physics.Arcade.Group;
  private readonly tier: number;
  private readonly bulletDamage: number;
  private readonly moveSpeed: number;
  /** Nguyên tố của đạn; undefined = vật lý. */
  private element: ElementType | undefined;

  private nextShotAt = 0;
  private charging = false;
  private fireAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    projectiles: Phaser.Physics.Arcade.Group,
    tier = 0,
    archetype: ArchetypeId = DEFAULT_RANGED_ARCHETYPE,
  ) {
    const stats = rangedStats(tier, archetype);

    super(
      scene,
      x,
      y,
      TEXTURE_KEYS.rangedEnemy,
      TEXTURE_KEYS.rangedEnemy,
      stats.maxHealth,
      20,
      20,
      NEON.rangedEnemy,
    );

    this.projectiles = projectiles;
    this.tier = tier;
    this.moveSpeed = stats.moveSpeed;
    const physicalDamage = stats.bulletDamage;

    if (
      ELEMENTAL_ENEMIES_ENABLED &&
      tier >= ELEMENTAL_ENEMY_MIN_TIER &&
      Math.random() < ELEMENTAL_ENEMY_CHANCE
    ) {
      const type = Phaser.Utils.Array.GetRandom([...ELEMENTAL_ENEMY_TYPES]);

      this.element = type;
      this.defense = { resist: { [type]: ELEMENTAL_ENEMY_OWN_RESIST } };
      this.bulletDamage = Math.max(
        1,
        Math.round(physicalDamage * ELEMENTAL_ENEMY_DAMAGE_MULT),
      );
    } else {
      this.bulletDamage = physicalDamage;
    }
  }

  updateAI(target: EnemyTarget, time: number): void {
    if (!this.canAct(time)) {
      return;
    }

    if (this.charging) {
      this.setVelocity(0, 0);

      if (time >= this.fireAt) {
        this.charging = false;
        this.nextShotAt = time + RANGED_ENEMY_COOLDOWN_MS;
        this.fire(target);
      }

      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      target.x,
      target.y,
    );

    if (distance <= RANGED_ENEMY_SHOOT_RANGE && time >= this.nextShotAt) {
      this.charging = true;
      this.fireAt = time + RANGED_ENEMY_TELEGRAPH_MS;
      this.setVelocity(0, 0);
      this.playAttackAnimation(RANGED_ENEMY_TELEGRAPH_MS);

      const telegraphColor = this.element
        ? ELEMENT_COLORS[this.element]
        : NEON.enemyBullet;

      spawnRing(
        this.scene,
        this.x,
        this.y,
        80,
        telegraphColor,
        RANGED_ENEMY_TELEGRAPH_MS,
      );
      spawnGlow(
        this.scene,
        this.x,
        this.y,
        telegraphColor,
        0.8,
        RANGED_ENEMY_TELEGRAPH_MS,
        ENEMY_TELEGRAPH_GLOW_ALPHA,
      );

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

    const normalized = direction.normalize();
    const speed = this.moveSpeed * this.getSpeedMultiplier(time);

    if (distance > RANGED_ENEMY_PREFERRED_DISTANCE + 80) {
      this.setVelocity(
        normalized.x * speed,
        normalized.y * speed,
      );
    } else if (distance < RANGED_ENEMY_PREFERRED_DISTANCE - 80) {
      this.setVelocity(
        -normalized.x * speed,
        -normalized.y * speed,
      );
    } else {
      this.setVelocity(0, 0);
    }

    this.setFlipX(normalized.x < 0);
  }

  private fire(target: EnemyTarget): void {
    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
    const spread = Phaser.Math.DegToRad(RANGED_ENEMY_SPREAD_DEGREES);
    const offsets =
      this.tier >= RANGED_ENEMY_TRIPLE_SHOT_TIER
        ? [-spread, 0, spread]
        : [0];

    for (const offset of offsets) {
      const angle = baseAngle + offset;

      fireEnemyBullet(
        this.scene,
        this.projectiles,
        this.x + Math.cos(angle) * 20,
        this.y + Math.sin(angle) * 20,
        angle,
        ENEMY_BULLET_SPEED,
        this.bulletDamage,
        false,
        this.element,
      );
    }

    spawnHitSpark(
      this.scene,
      this.x + Math.cos(baseAngle) * 20,
      this.y + Math.sin(baseAngle) * 20,
      NEON.enemyBullet,
    );
  }
}
