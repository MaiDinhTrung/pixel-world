/**
 * Chỉ số quái THUẦN theo (bậc, archetype) (Gói M1). Công thức gốc của Enemy/RangedEnemy, nhân thêm hệ số archetype;
 * hệ số mặc định (1 / 0) cho kết quả y hệt công thức cũ.
 */
import {
  ENEMY_BULLET_DAMAGE,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_DAMAGE_TIER_STEP,
  ENEMY_HEALTH_MULT_PER_TIER,
  ENEMY_MAX_HEALTH,
  ENEMY_MAX_SPEED_MULT,
  ENEMY_SPEED,
  ENEMY_SPEED_MULT_PER_TIER,
  RANGED_ENEMY_MAX_HEALTH,
  RANGED_ENEMY_SPEED,
} from '../config/combatConfig';
import { ENEMY_ARCHETYPES, type ArchetypeId, type EnemyArchetype } from '../config/enemyConfig';

export interface MeleeStats {
  readonly maxHealth: number;
  readonly moveSpeed: number;
  readonly contactDamage: number;
}

export interface RangedStats {
  readonly maxHealth: number;
  readonly moveSpeed: number;
  /** Sát thương đạn vật lý (chưa nhân hệ số nguyên tố). */
  readonly bulletDamage: number;
}

function resolve(archetype: ArchetypeId | EnemyArchetype): EnemyArchetype {
  return typeof archetype === 'string' ? ENEMY_ARCHETYPES[archetype] : archetype;
}

export function meleeStats(tier: number, archetype: ArchetypeId | EnemyArchetype): MeleeStats {
  const def = resolve(archetype);

  return {
    maxHealth: Math.round(ENEMY_MAX_HEALTH * (1 + tier * ENEMY_HEALTH_MULT_PER_TIER) * def.healthMult),
    moveSpeed:
      ENEMY_SPEED *
      Math.min(ENEMY_MAX_SPEED_MULT, 1 + tier * ENEMY_SPEED_MULT_PER_TIER) *
      def.speedMult,
    contactDamage:
      ENEMY_CONTACT_DAMAGE + Math.floor(tier / ENEMY_DAMAGE_TIER_STEP) + def.contactDamageBonus,
  };
}

export function rangedStats(tier: number, archetype: ArchetypeId | EnemyArchetype): RangedStats {
  const def = resolve(archetype);

  return {
    maxHealth: Math.round(RANGED_ENEMY_MAX_HEALTH * (1 + tier * ENEMY_HEALTH_MULT_PER_TIER) * def.healthMult),
    moveSpeed: RANGED_ENEMY_SPEED * def.speedMult,
    bulletDamage: ENEMY_BULLET_DAMAGE + Math.floor(tier / ENEMY_DAMAGE_TIER_STEP) + def.contactDamageBonus,
  };
}
