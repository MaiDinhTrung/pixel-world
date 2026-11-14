import type { ElementType } from '../config/damageTypeConfig';

/** Các tag dùng để gắn buff với nhóm lối chơi. */
export type BuffTag = 'projectile' | 'melee' | 'speed' | 'survival' | 'energy';

/** Độ hiếm của buff: thường / hiếm. */
export type BuffRarity = 'common' | 'rare';

/**
 * Chỉ số combat được tính lại từ danh sách buff đã sở hữu.
 * Buff và synergy chỉ được phép thay đổi object này.
 */
export interface CombatStats {
  moveSpeedMultiplier: number; // hệ số tốc chạy (1 = bình thường, 1.1 = +10%)
  damageMultiplier: number; // hệ số sát thương chung cho mọi đòn và kỹ năng
  meleeDamageMultiplier: number; // hệ số sát thương riêng cho vũ khí cận chiến
  rangedDamageMultiplier: number; // hệ số sát thương riêng cho đạn / vũ khí tầm xa
  meleeDamageBonus: number; // sát thương cận chiến cộng thẳng (+1 = thêm 1 sát thương mỗi đòn)
  /** Hệ số hồi chiêu: nhỏ hơn 1 nghĩa là hồi chiêu nhanh hơn (0.88 = nhanh 12%). */
  cooldownMultiplier: number;
  swordRangeBonus: number; // tầm chém kiếm cộng thêm (px)
  swordArcBonusDegrees: number; // góc chém kiếm rộng thêm (độ)
  bulletCountBonus: number; // số đạn bắn thêm mỗi phát (multishot)
  bulletPierce: number; // số quái đạn xuyên thêm
  bulletSpeedMultiplier: number; // hệ số tốc độ đạn (cũng ảnh hưởng tầm bắn)
  energyRegenMultiplier: number; // hệ số tốc độ hồi EN
  maxEnergyBonus: number; // EN tối đa cộng thêm
  maxHealthBonus: number; // máu tối đa cộng thêm (điểm)
  maxArmorBonus: number; // giáp tối đa cộng thêm (điểm)
  killHeal: number; // máu hồi mỗi lần hạ gục quái
  /** Kháng nguyên tố của người chơi (0.25 = −25% sát thương loại đó); trần ở damageTypeConfig. */
  resist: Partial<Record<ElementType, number>>;
  /** Tỉ lệ bể giáp của mình bị bỏ qua / giáp địch bị bỏ qua (chưa dùng cho đòn của người chơi). */
  armorPen: number;
}

/** Một buff chọn được khi lên cấp. `apply` sửa CombatStats cho mỗi bậc đã sở hữu. */
export interface BuffDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly BuffTag[];
  readonly rarity: BuffRarity;
  readonly maxStacks: number; // số bậc tối đa có thể cộng dồn
  apply(stats: CombatStats): void;
}

/** Hiệu ứng thưởng khi sở hữu đủ một tổ hợp buff (`requiredBuffIds`). */
export interface SynergyDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredBuffIds: readonly string[];
  apply(stats: CombatStats): void;
}

/** Dữ liệu hiển thị của một thẻ buff trong LevelUpScene. */
export interface LevelUpChoice {
  id: string;
  name: string;
  description: string;
  tags: readonly BuffTag[];
  rarity: BuffRarity;
  stacks: number;
  maxStacks: number;
}

export interface LevelUpData {
  level: number;
  choices: LevelUpChoice[];
}

/** CombatStats gốc (mọi hệ số = 1, mọi cộng thêm = 0) — điểm xuất phát trước khi cộng chỉ số/buff/trang bị. */
export function createBaseStats(): CombatStats {
  return {
    moveSpeedMultiplier: 1,
    damageMultiplier: 1,
    meleeDamageMultiplier: 1,
    rangedDamageMultiplier: 1,
    meleeDamageBonus: 0,
    cooldownMultiplier: 1,
    swordRangeBonus: 0,
    swordArcBonusDegrees: 0,
    bulletCountBonus: 0,
    bulletPierce: 0,
    bulletSpeedMultiplier: 1,
    energyRegenMultiplier: 1,
    maxEnergyBonus: 0,
    maxHealthBonus: 0,
    maxArmorBonus: 0,
    killHeal: 0,
    resist: {},
    armorPen: 0,
  };
}
