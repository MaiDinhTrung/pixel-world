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
  /** Hệ số nhân EXP khi hạ (M2: dùng trong `killXp` của `enemyStats.ts`). Phải > 0. */
  readonly xpMult: number;
  /** Hệ số nhân vàng khi hạ. CHƯA DÙNG (M-D1 chỉ đổi EXP; để dành cho gói cân bằng drop). Phải > 0. */
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
  /**
   * Cận chiến nhỏ, nhanh, mỏng máu (M2): đông và dễ hạ. Giá trị là KHỞI ĐIỂM, chỉnh sau khi chơi thử.
   * Hình vẽ riêng: `enemyVisualConfig.ts` (texture `enemy-swarmer`).
   */
  swarmer: {
    kind: 'melee',
    healthMult: 0.5,
    speedMult: 1.35,
    contactDamageBonus: 0,
    xpMult: 0.8,
    goldMult: 1,
  },
  /**
   * Cận chiến to, chậm, trâu máu, chạm đau hơn (M2): KHỞI ĐIỂM, chỉnh sau khi chơi thử.
   * Hình vẽ riêng: `enemyVisualConfig.ts` (texture `enemy-bruiser`; id archetype là `brute`).
   */
  brute: {
    kind: 'melee',
    healthMult: 2.5,
    speedMult: 0.75,
    contactDamageBonus: 1,
    xpMult: 2,
    goldMult: 1,
  },
} as const satisfies Record<string, EnemyArchetype>;

export type ArchetypeId = keyof typeof ENEMY_ARCHETYPES;

// ── Elite (Gói M3, docs/GAMEPLAY_LOOP_M.md §3c E1–E7) ───────────────────────────────────────────────
// Mọi giá trị dưới đây là KHỞI ĐIỂM, chỉnh sau khi chơi thử. Luật sinh/chọn affix ở `world/eliteRules.ts`.

/** Số quái thường hạ trong một vùng để Elite xuất hiện (đếm theo VỊ TRÍ CHẾT; Elite, escort, minion Boss không đếm). */
export const ELITE_KILLS_INTERVAL = 25;
/** Số Elite sống tối đa cùng lúc. */
export const ELITE_MAX_ALIVE = 1;
/** Hệ số nhân máu tối đa của Elite so với archetype nền (xác của Triệu Hồn Sư vẫn tính theo máu nền, không ×5). */
export const ELITE_HEALTH_MULT = 5;
/** Hệ số nhân EXP khi hạ Elite so với archetype nền. */
export const ELITE_XP_MULT = 8;
/** Số ngọc rơi khi hạ Elite (cùng cách rơi như ngọc của Boss). */
export const ELITE_GEM_COUNT = 2;
/** Khoảng chờ tối thiểu (ms) giữa hai lần Elite xuất hiện. */
export const ELITE_MIN_GAP_MS = 30000;
/** Elite sinh tại điểm sinh của vùng gần người chơi nhất nhưng cách người chơi ít nhất ngần này px. */
export const ELITE_SPAWN_MIN_PLAYER_DISTANCE = 600;
/** Archetype của quái hộ tống (affix `escorted`). */
export const ELITE_ESCORT_ARCHETYPE: ArchetypeId = 'swarmer';
/** Bán kính (px) vòng hộ tống quanh Elite lúc sinh. */
export const ELITE_ESCORT_RADIUS = 64;
/** Toast khi hạ Elite. */
export const ELITE_KILL_LABEL = 'HẠ TINH ANH!';

export type EliteAffixId = 'swift' | 'armored' | 'escorted';

export interface EliteAffix {
  /** Dòng toast khi Elite xuất hiện. */
  readonly label: string;
  /** Hệ số nhân tốc độ di chuyển (bỏ trống = 1). */
  readonly speedMult?: number;
  /** Hệ số nhân sát thương NHẬN VÀO (bỏ trống = 1; 0.7 = nhận 70%). */
  readonly damageTakenMult?: number;
  /** Số quái hộ tống sinh kèm (bỏ trống = 0). */
  readonly escortCount?: number;
}

/** Thứ tự xoay vòng xác định: Elite thứ `n` (từ 0) có affix `ELITE_AFFIX_ORDER[n % độ dài]`. */
export const ELITE_AFFIX_ORDER: readonly EliteAffixId[] = ['swift', 'armored', 'escorted'];

export const ELITE_AFFIXES: Readonly<Record<EliteAffixId, EliteAffix>> = {
  /** Thần tốc: chạy nhanh hơn. */
  swift: { label: 'TINH ANH THẦN TỐC XUẤT HIỆN', speedMult: 1.4 },
  /** Giáp dày: nhận ít sát thương hơn. */
  armored: { label: 'TINH ANH GIÁP DÀY XUẤT HIỆN', damageTakenMult: 0.7 },
  /** Có hộ tống: kèm theo quái hộ tống (`ELITE_ESCORT_ARCHETYPE`). */
  escorted: { label: 'TINH ANH CÓ HỘ TỐNG XUẤT HIỆN', escortCount: 3 },
};

/** Archetype mặc định của từng lớp hành vi (Enemy → grunt, RangedEnemy → caster). */
export const DEFAULT_MELEE_ARCHETYPE: ArchetypeId = 'grunt';
export const DEFAULT_RANGED_ARCHETYPE: ArchetypeId = 'caster';

/** Tra archetype theo id chuỗi bất kỳ; id không có → undefined. */
export function findArchetype(id: string): EnemyArchetype | undefined {
  return Object.prototype.hasOwnProperty.call(ENEMY_ARCHETYPES, id)
    ? (ENEMY_ARCHETYPES as Record<string, EnemyArchetype>)[id]
    : undefined;
}
