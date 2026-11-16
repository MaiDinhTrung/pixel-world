import { describe, expect, it } from 'vitest';

import {
  ENEMY_BULLET_DAMAGE,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_DAMAGE_TIER_STEP,
  ENEMY_HEALTH_MULT_PER_TIER,
  ENEMY_MAX_HEALTH,
  ENEMY_MAX_SPEED_MULT,
  ENEMY_SPEED,
  ENEMY_SPEED_MULT_PER_TIER,
  MAX_THREAT_TIER,
  RANGED_ENEMY_MAX_HEALTH,
  RANGED_ENEMY_SPEED,
} from '../config/combatConfig';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../config/enemyConfig';
import { meleeStats, rangedStats } from './enemyStats';

// Công thức CŨ của Enemy/RangedEnemy (trước M1), viết độc lập từ hằng combatConfig.
const oldMelee = (tier: number) => ({
  maxHealth: Math.round(ENEMY_MAX_HEALTH * (1 + tier * ENEMY_HEALTH_MULT_PER_TIER)),
  moveSpeed: ENEMY_SPEED * Math.min(ENEMY_MAX_SPEED_MULT, 1 + tier * ENEMY_SPEED_MULT_PER_TIER),
  contactDamage: ENEMY_CONTACT_DAMAGE + Math.floor(tier / ENEMY_DAMAGE_TIER_STEP),
});
const oldRanged = (tier: number) => ({
  maxHealth: Math.round(RANGED_ENEMY_MAX_HEALTH * (1 + tier * ENEMY_HEALTH_MULT_PER_TIER)),
  moveSpeed: RANGED_ENEMY_SPEED,
  bulletDamage: ENEMY_BULLET_DAMAGE + Math.floor(tier / ENEMY_DAMAGE_TIER_STEP),
});

describe('enemyStats', () => {
  it('grunt ở bậc 0..MAX_THREAT_TIER y hệt công thức cũ của Enemy', () => {
    expect(MAX_THREAT_TIER).toBeGreaterThanOrEqual(6);

    for (let tier = 0; tier <= MAX_THREAT_TIER; tier += 1) {
      expect(meleeStats(tier, 'grunt'), `bậc ${tier}`).toEqual(oldMelee(tier));
    }
  });

  it('caster ở bậc 0..MAX_THREAT_TIER y hệt công thức cũ của RangedEnemy', () => {
    for (let tier = 0; tier <= MAX_THREAT_TIER; tier += 1) {
      expect(rangedStats(tier, 'caster'), `bậc ${tier}`).toEqual(oldRanged(tier));
    }
  });

  it('hệ số archetype được áp dụng (healthMult, speedMult, bonus)', () => {
    const custom: EnemyArchetype = {
      ...ENEMY_ARCHETYPES.grunt,
      healthMult: 2,
      speedMult: 0.5,
      contactDamageBonus: 2,
    };
    const base = oldMelee(3);
    const stats = meleeStats(3, custom);

    expect(stats.maxHealth).toBe(Math.round(ENEMY_MAX_HEALTH * (1 + 3 * ENEMY_HEALTH_MULT_PER_TIER) * 2));
    expect(stats.moveSpeed).toBeCloseTo(base.moveSpeed * 0.5, 9);
    expect(stats.contactDamage).toBe(base.contactDamage + 2);

    const ranged = rangedStats(3, { ...ENEMY_ARCHETYPES.caster, speedMult: 2, contactDamageBonus: 1 });

    expect(ranged.moveSpeed).toBe(RANGED_ENEMY_SPEED * 2);
    expect(ranged.bulletDamage).toBe(oldRanged(3).bulletDamage + 1);
  });

  it('trần tốc độ theo bậc vẫn áp dụng ở bậc rất cao', () => {
    expect(meleeStats(50, 'grunt').moveSpeed).toBe(ENEMY_SPEED * ENEMY_MAX_SPEED_MULT);
  });
});
