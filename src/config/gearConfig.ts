import type { CombatStats } from '../progression/buffTypes';
import { TEXTURE_KEYS } from './constants';
import {
  toDisplayEnergy,
  toDisplayHealth,
} from './scaleConfig';
import {
  ELEMENT_LABELS,
  ELEMENT_TYPES,
  GEAR_RESIST_LEVELS_PER_POINT,
  GEAR_RESIST_LEVEL_BONUS_MAX,
  GEAR_RESIST_PER_ITEM_MAX,
  type ElementType,
} from './damageTypeConfig';
import {
  WEAPON_RARITY_COLORS,
  type WeaponRarity,
} from './weaponInfo';

/** Ô trang bị: mũ / giáp / giày. */
export type GearSlot = 'hat' | 'armor' | 'boots';
/** Độ hiếm trang bị dùng chung bảng với vũ khí (thường / đặc biệt / huyền thoại). */
export type GearRarity = WeaponRarity;

/** Mã từng món trang bị. */
export type GearId =
  | 'cloth_hood'
  | 'iron_helm'
  | 'dragon_crown'
  | 'cloth_robe'
  | 'iron_cuirass'
  | 'dragon_plate'
  | 'worn_boots'
  | 'swift_greaves'
  | 'void_treads';

/** Chỉ số một món đồ cộng thêm (bỏ trống = không cộng). */
export interface GearBonuses {
  readonly maxHealth?: number; // + máu tối đa (điểm)
  readonly maxArmor?: number; // + giáp tối đa (điểm)
  readonly maxEnergy?: number; // + EN tối đa
  readonly damagePercent?: number; // + % sát thương
  readonly cooldownPercent?: number; // − % hồi chiêu (trần 70)
  readonly moveSpeedPercent?: number; // + % tốc chạy (trần 200)
  /** + điểm % kháng từng nguyên tố; không scale ×1.25/cấp (xem getScaledGearBonuses). */
  readonly resist?: Partial<Record<ElementType, number>>;
}

/** Cấp của một món đồ; đồ rơi từ boss càng về sau càng có cấp cao. */
export type GearLevels = Partial<Record<GearId, number>>;

/** Cấp tối đa của một món đồ. */
export const MAX_GEAR_LEVEL = 99;

/** Cấp tối thiểu hiển thị/áp dụng là 1. */
export function getGearItemLevel(
  levels: Readonly<GearLevels> | undefined,
  gearId: GearId,
): number {
  const raw = levels?.[gearId];

  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 1;
  }

  return Math.min(
    MAX_GEAR_LEVEL,
    Math.max(1, Math.floor(raw)),
  );
}

/** Bonus gốc được khuếch đại 25% mỗi cấp đồ. */
export function getScaledGearBonuses(
  gearId: GearId,
  level = 1,
): GearBonuses {
  const bonuses = GEAR_INFO[gearId].bonuses;
  const scale = 1 + (Math.max(1, Math.floor(level)) - 1) * 0.25;
  const result: {
    maxHealth?: number;
    maxArmor?: number;
    maxEnergy?: number;
    damagePercent?: number;
    cooldownPercent?: number;
    moveSpeedPercent?: number;
    resist?: Partial<Record<ElementType, number>>;
  } = {};

  if (bonuses.maxHealth) {
    result.maxHealth = Math.ceil(bonuses.maxHealth * scale);
  }

  if (bonuses.maxArmor) {
    result.maxArmor = Math.ceil(bonuses.maxArmor * scale);
  }

  if (bonuses.maxEnergy) {
    result.maxEnergy = Math.ceil(bonuses.maxEnergy * scale);
  }

  if (bonuses.damagePercent) {
    result.damagePercent = Math.min(
      300,
      Math.round(bonuses.damagePercent * scale),
    );
  }

  if (bonuses.cooldownPercent) {
    result.cooldownPercent = Math.min(
      70,
      Math.round(bonuses.cooldownPercent * scale),
    );
  }

  if (bonuses.moveSpeedPercent) {
    result.moveSpeedPercent = Math.min(
      200,
      Math.round(bonuses.moveSpeedPercent * scale),
    );
  }

  if (bonuses.resist) {
    // Kháng tăng chậm theo cấp đồ (không ×25 ở cấp 99) và có trần mỗi món.
    const levelBonus = Math.min(
      GEAR_RESIST_LEVEL_BONUS_MAX,
      Math.floor((Math.max(1, Math.floor(level)) - 1) / GEAR_RESIST_LEVELS_PER_POINT),
    );
    const scaled: Partial<Record<ElementType, number>> = {};

    for (const type of ELEMENT_TYPES) {
      const base = bonuses.resist[type];

      if (base) {
        scaled[type] = Math.min(GEAR_RESIST_PER_ITEM_MAX, base + levelBonus);
      }
    }

    result.resist = scaled;
  }

  return result;
}

/** Thông tin một món đồ: tên, ô, độ hiếm, mô tả và chỉ số gốc (cấp 1). */
export interface GearInfo {
  readonly id: GearId;
  readonly name: string;
  readonly slot: GearSlot;
  readonly rarity: GearRarity;
  readonly description: string;
  readonly textureKey: string;
  readonly colorCss: string;
  readonly bonuses: GearBonuses;
}

/** Danh sách ô trang bị theo thứ tự hiển thị. */
export const GEAR_SLOTS: readonly GearSlot[] = ['hat', 'armor', 'boots'];

/** Nhãn tiếng Việt của từng ô. */
export const GEAR_SLOT_LABELS: Record<GearSlot, string> = {
  hat: 'MŨ',
  armor: 'GIÁP',
  boots: 'GIÀY',
};

/** Bảng toàn bộ trang bị. Muốn đổi sức mạnh món nào thì sửa dòng `bonuses` của món đó. */
export const GEAR_INFO: Record<GearId, GearInfo> = {
  cloth_hood: {
    id: 'cloth_hood',
    name: 'MŨ VẢI',
    slot: 'hat',
    rarity: 'common',
    description: 'Vải nhẹ, giúp tập trung năng lượng.',
    textureKey: TEXTURE_KEYS.clothHood,
    colorCss: WEAPON_RARITY_COLORS.common,
    bonuses: { maxEnergy: 10, resist: { dark: 5 } }, // +10 EN tối đa, +5% kháng bóng tối
  },
  iron_helm: {
    id: 'iron_helm',
    name: 'MŨ SẮT',
    slot: 'hat',
    rarity: 'special',
    description: 'Mũ sắt dày, bảo vệ đầu và tăng giáp.',
    textureKey: TEXTURE_KEYS.ironHelm,
    colorCss: WEAPON_RARITY_COLORS.special,
    bonuses: { maxArmor: 2, maxHealth: 1, resist: { fire: 10 } }, // +2 giáp, +1 máu, +10% kháng hỏa
  },
  dragon_crown: {
    id: 'dragon_crown',
    name: 'VƯƠNG MIỆN RỒNG',
    slot: 'hat',
    rarity: 'legendary',
    description: 'Vương miện rồng: sinh lực, mana và hồi chiêu.',
    textureKey: TEXTURE_KEYS.dragonCrown,
    colorCss: WEAPON_RARITY_COLORS.legendary,
    bonuses: {
      maxHealth: 3,
      maxEnergy: 15,
      cooldownPercent: 8,
      resist: { fire: 15, lightning: 10 },
    }, // +3 máu, +15 EN, −8% hồi chiêu, +15% kháng hỏa, +10% kháng sét
  },
  cloth_robe: {
    id: 'cloth_robe',
    name: 'ÁO CHOÀNG VẢI',
    slot: 'armor',
    rarity: 'common',
    description: 'Áo choàng nhẹ, cân bằng giáp và mana.',
    textureKey: TEXTURE_KEYS.clothRobe,
    colorCss: WEAPON_RARITY_COLORS.common,
    bonuses: { maxArmor: 2, maxEnergy: 5, resist: { ice: 6 } }, // +2 giáp, +5 EN, +6% kháng băng
  },
  iron_cuirass: {
    id: 'iron_cuirass',
    name: 'GIÁP NGỰC SẮT',
    slot: 'armor',
    rarity: 'special',
    description: 'Giáp sắt nặng, tăng mạnh giáp và máu.',
    textureKey: TEXTURE_KEYS.ironCuirass,
    colorCss: WEAPON_RARITY_COLORS.special,
    bonuses: { maxArmor: 4, maxHealth: 2, resist: { ice: 10 } }, // +4 giáp, +2 máu, +10% kháng băng
  },
  dragon_plate: {
    id: 'dragon_plate',
    name: 'GIÁP RỒNG',
    slot: 'armor',
    rarity: 'legendary',
    description: 'Giáp vảy rồng, gần như không thể xuyên phá.',
    textureKey: TEXTURE_KEYS.dragonPlate,
    colorCss: WEAPON_RARITY_COLORS.legendary,
    bonuses: { maxArmor: 7, maxHealth: 4, resist: { fire: 20, dark: 10 } }, // +7 giáp, +4 máu, +20% kháng hỏa, +10% kháng bóng tối
  },
  worn_boots: {
    id: 'worn_boots',
    name: 'GIÀY CŨ',
    slot: 'boots',
    rarity: 'common',
    description: 'Giày cũ nhưng vẫn giúp chạy nhanh hơn.',
    textureKey: TEXTURE_KEYS.wornBoots,
    colorCss: WEAPON_RARITY_COLORS.common,
    bonuses: { moveSpeedPercent: 5, resist: { wind: 5 } }, // +5% tốc chạy, +5% kháng phong
  },
  swift_greaves: {
    id: 'swift_greaves',
    name: 'GIÀY TỐC HÀNH',
    slot: 'boots',
    rarity: 'special',
    description: 'Giày nhẹ, tăng tốc di chuyển rõ rệt.',
    textureKey: TEXTURE_KEYS.swiftGreaves,
    colorCss: WEAPON_RARITY_COLORS.special,
    bonuses: { moveSpeedPercent: 9, resist: { wind: 12, lightning: 6 } }, // +9% tốc chạy, +12% kháng phong, +6% kháng sét
  },
  void_treads: {
    id: 'void_treads',
    name: 'GIÀY HƯ KHÔNG',
    slot: 'boots',
    rarity: 'legendary',
    description: 'Bước đi trong hư không, cực nhanh và thêm mana.',
    textureKey: TEXTURE_KEYS.voidTreads,
    colorCss: WEAPON_RARITY_COLORS.legendary,
    bonuses: {
      moveSpeedPercent: 14,
      maxEnergy: 6,
      resist: { dark: 20, wind: 10 },
    }, // +14% tốc chạy, +6 EN, +20% kháng bóng tối, +10% kháng phong
  },
};

/** Danh sách mã mọi món đồ. */
export const GEAR_IDS = Object.keys(GEAR_INFO) as GearId[];

/** Kiểm tra giá trị có phải mã trang bị hợp lệ không (dùng khi đọc save). */
export function isGearId(value: unknown): value is GearId {
  return typeof value === 'string' && value in GEAR_INFO;
}

/** Bộ trang bị trống (chưa mặc gì). */
export function createEmptyGearLoadout(): Record<GearSlot, GearId | null> {
  return { hat: null, armor: null, boots: null };
}

/** Cộng bonus của các món đang trang bị vào chỉ số combat hiện tại. */
export function applyGearBonuses(
  stats: Readonly<CombatStats>,
  equipped: Readonly<Record<GearSlot, GearId | null>>,
  levels?: Readonly<GearLevels>,
): CombatStats {
  const result: CombatStats = { ...stats };
  const resist: Partial<Record<ElementType, number>> = { ...stats.resist };

  for (const slot of GEAR_SLOTS) {
    const gearId = equipped[slot];

    if (!gearId) {
      continue;
    }

    const bonuses = getScaledGearBonuses(
      gearId,
      getGearItemLevel(levels, gearId),
    );

    result.maxHealthBonus += bonuses.maxHealth ?? 0;
    result.maxArmorBonus += bonuses.maxArmor ?? 0;
    result.maxEnergyBonus += bonuses.maxEnergy ?? 0;
    result.damageMultiplier *= 1 + (bonuses.damagePercent ?? 0) / 100;
    result.cooldownMultiplier *= 1 - (bonuses.cooldownPercent ?? 0) / 100;
    result.moveSpeedMultiplier *= 1 + (bonuses.moveSpeedPercent ?? 0) / 100;

    for (const type of ELEMENT_TYPES) {
      const points = bonuses.resist?.[type];

      if (points) {
        resist[type] = (resist[type] ?? 0) + points / 100;
      }
    }
  }

  result.resist = resist;

  return result;
}

/** Danh sách bonus dạng chữ để hiển thị trong bảng trang bị. */
export function getGearBonusLines(
  gear: GearInfo,
  level = 1,
): string[] {
  const bonuses = getScaledGearBonuses(gear.id, level);
  const lines: string[] = [];

  if (bonuses.maxHealth) {
    lines.push(`+${toDisplayHealth(bonuses.maxHealth)} HP TỐI ĐA`);
  }

  if (bonuses.maxArmor) {
    lines.push(`+${toDisplayHealth(bonuses.maxArmor)} GIÁP TỐI ĐA`);
  }

  if (bonuses.maxEnergy) {
    lines.push(`+${toDisplayEnergy(bonuses.maxEnergy)} NĂNG LƯỢNG TỐI ĐA`);
  }

  if (bonuses.damagePercent) {
    lines.push(`+${bonuses.damagePercent}% SÁT THƯƠNG`);
  }

  if (bonuses.cooldownPercent) {
    lines.push(`-${bonuses.cooldownPercent}% HỒI CHIÊU`);
  }

  if (bonuses.moveSpeedPercent) {
    lines.push(`+${bonuses.moveSpeedPercent}% TỐC CHẠY`);
  }

  for (const type of ELEMENT_TYPES) {
    const points = bonuses.resist?.[type];

    if (points) {
      lines.push(`+${points}% KHÁNG ${ELEMENT_LABELS[type]}`);
    }
  }

  return lines;
}
