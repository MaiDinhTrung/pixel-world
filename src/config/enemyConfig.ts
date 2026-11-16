/**
 * Archetype quái (Gói M1, docs/GAMEPLAY_LOOP_M.md §4): "loại quái" là DỮ LIỆU. Bảng sinh theo vùng
 * (`worldConfig.ts` → `spawnTable.pattern`) chứa id archetype ở đây. Hằng chiến đấu gốc (HP, tốc độ, sát thương
 * theo bậc) vẫn ở `combatConfig.ts`; archetype chỉ nhân/cộng thêm lên các giá trị đó.
 * Thuần: không phụ thuộc Phaser/scene/entity.
 */

/** Cách quái hành động: `melee` = lớp `Enemy` (đuổi và chạm), `ranged` = lớp `RangedEnemy` (giữ khoảng cách và bắn). */
export type ArchetypeKind = 'melee' | 'ranged';

export interface EnemyArchetype {
  /** Lớp hành vi dùng để tạo quái. */
  readonly kind: ArchetypeKind;
  /** Hệ số nhân máu tối đa (1 = như hiện tại). Phải > 0. */
  readonly healthMult: number;
  /** Hệ số nhân tốc độ di chuyển, nhân SAU trần tốc độ theo bậc (1 = như hiện tại). Phải > 0. */
  readonly speedMult: number;
  /** Sát thương cộng thêm (số nguyên, 0 = như hiện tại): cận chiến cộng vào sát thương chạm, bắn xa cộng vào sát thương đạn. */
  readonly contactDamageBonus: number;
  /** Hệ số nhân EXP khi hạ. CHƯA DÙNG ở M1 (M2 sẽ nối vào WorldScene). Phải > 0. */
  readonly xpMult: number;
  /** Hệ số nhân vàng khi hạ. CHƯA DÙNG ở M1 (M2 sẽ nối vào dropLoot). Phải > 0. */
  readonly goldMult: number;
}

export const ENEMY_ARCHETYPES = {
  /** Cận chiến thường: đúng quái cận chiến hiện tại. */
  grunt: {
    kind: 'melee',
    healthMult: 1,
    speedMult: 1,
    contactDamageBonus: 0,
    xpMult: 1,
    goldMult: 1,
  },
  /** Bắn xa thường: đúng quái bắn xa hiện tại. */
  caster: {
    kind: 'ranged',
    healthMult: 1,
    speedMult: 1,
    contactDamageBonus: 0,
    xpMult: 1,
    goldMult: 1,
  },
} as const satisfies Record<string, EnemyArchetype>;

export type ArchetypeId = keyof typeof ENEMY_ARCHETYPES;

/** Archetype mặc định của từng lớp hành vi (Enemy → grunt, RangedEnemy → caster). */
export const DEFAULT_MELEE_ARCHETYPE: ArchetypeId = 'grunt';
export const DEFAULT_RANGED_ARCHETYPE: ArchetypeId = 'caster';

/** Tra archetype theo id chuỗi bất kỳ; id không có → undefined. */
export function findArchetype(id: string): EnemyArchetype | undefined {
  return Object.prototype.hasOwnProperty.call(ENEMY_ARCHETYPES, id)
    ? (ENEMY_ARCHETYPES as Record<string, EnemyArchetype>)[id]
    : undefined;
}
