import { describe, expect, it } from 'vitest';

import { ENEMY_ARCHETYPES } from '../config/enemyConfig';
import { REGION_WILDS_FAR, REGION_WILDS_NEAR, WORLD } from '../config/worldConfig';
import { pickArchetype } from './spawnPattern';

describe('pickArchetype', () => {
  it('quay vòng pattern[i % length]', () => {
    const pattern = ['a', 'b', 'c'] as const;

    expect(pickArchetype(pattern, 0)).toBe('a');
    expect(pickArchetype(pattern, 1)).toBe('b');
    expect(pickArchetype(pattern, 2)).toBe('c');
    expect(pickArchetype(pattern, 3)).toBe('a');
    expect(pickArchetype(pattern, 100)).toBe('b');
  });

  it('pattern rỗng → null', () => {
    expect(pickArchetype([], 0)).toBeNull();
    expect(pickArchetype([], 7)).toBeNull();
  });

  it('mẫu mặc định của hai vùng wilds: 300 chỉ số đầu khớp i % 3 === 2 ? ranged : melee', () => {
    const regions = WORLD.maps
      .flatMap((map) => map.regions)
      .filter((region) => region.id === REGION_WILDS_NEAR || region.id === REGION_WILDS_FAR);

    expect(regions).toHaveLength(2);

    for (const region of regions) {
      for (let i = 0; i < 300; i += 1) {
        const id = pickArchetype(region.spawnTable.pattern, i);

        expect(id, `${region.id} #${i}`).not.toBeNull();
        expect(ENEMY_ARCHETYPES[id as keyof typeof ENEMY_ARCHETYPES].kind, `${region.id} #${i}`).toBe(
          i % 3 === 2 ? 'ranged' : 'melee',
        );
      }
    }
  });
});

describe('dữ liệu ENEMY_ARCHETYPES', () => {
  it('chỉ có grunt (melee) và caster (ranged); hệ số > 0; bonus nguyên >= 0', () => {
    expect(Object.keys(ENEMY_ARCHETYPES).sort()).toEqual(['caster', 'grunt']);
    expect(ENEMY_ARCHETYPES.grunt.kind).toBe('melee');
    expect(ENEMY_ARCHETYPES.caster.kind).toBe('ranged');

    for (const [id, def] of Object.entries(ENEMY_ARCHETYPES)) {
      for (const key of ['healthMult', 'speedMult', 'xpMult', 'goldMult'] as const) {
        expect(def[key], `${id}.${key}`).toBeGreaterThan(0);
      }

      expect(Number.isInteger(def.contactDamageBonus), id).toBe(true);
      expect(def.contactDamageBonus, id).toBeGreaterThanOrEqual(0);
    }
  });

  it('M1: archetype mặc định có mọi hệ số 1 và bonus 0', () => {
    for (const def of Object.values(ENEMY_ARCHETYPES)) {
      expect(def.healthMult).toBe(1);
      expect(def.speedMult).toBe(1);
      expect(def.xpMult).toBe(1);
      expect(def.goldMult).toBe(1);
      expect(def.contactDamageBonus).toBe(0);
    }
  });

  it('pattern của mọi vùng chỉ chứa id có thật', () => {
    for (const region of WORLD.maps.flatMap((map) => map.regions)) {
      for (const id of region.spawnTable.pattern) {
        expect(Object.prototype.hasOwnProperty.call(ENEMY_ARCHETYPES, id), `${region.id}: ${id}`).toBe(true);
      }
    }
  });
});
