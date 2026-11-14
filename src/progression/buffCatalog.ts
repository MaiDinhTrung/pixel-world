import type {
  BuffDefinition,
  BuffRarity,
  BuffTag,
  SynergyDefinition,
} from './buffTypes';

export const RARITY_COLORS: Record<BuffRarity, string> = {
  common: '#9aa0ad',
  rare: '#4da3ff',
};

export const RARITY_LABELS: Record<BuffRarity, string> = {
  common: 'THƯỜNG',
  rare: 'HIẾM',
};

export const TAG_LABELS: Record<BuffTag, string> = {
  projectile: 'ĐẠN',
  melee: 'CẬN CHIẾN',
  speed: 'TỐC ĐỘ',
  survival: 'SINH TỒN',
  energy: 'NĂNG LƯỢNG',
};

export const BUFFS: readonly BuffDefinition[] = [
  {
    id: 'power_shot',
    name: 'ĐẠN MẠNH',
    description: '+25% sát thương đạn mỗi bậc.',
    tags: ['projectile'],
    rarity: 'common',
    maxStacks: 3,
    apply: (stats) => {
      stats.rangedDamageMultiplier += 0.25;
    },
  },
  {
    id: 'quick_hands',
    name: 'TAY NHANH',
    description: '-12% hồi chiêu mỗi bậc.',
    tags: ['speed'],
    rarity: 'common',
    maxStacks: 3,
    apply: (stats) => {
      stats.cooldownMultiplier *= 0.88;
    },
  },
  {
    id: 'sharp_edge',
    name: 'LƯỠI SẮC',
    description: '+1 sát thương kiếm mỗi bậc.',
    tags: ['melee'],
    rarity: 'common',
    maxStacks: 3,
    apply: (stats) => {
      stats.meleeDamageBonus += 1;
    },
  },
  {
    id: 'swift_boots',
    name: 'GIÀY NHANH',
    description: '+10% tốc chạy mỗi bậc.',
    tags: ['speed'],
    rarity: 'common',
    maxStacks: 3,
    apply: (stats) => {
      stats.moveSpeedMultiplier += 0.1;
    },
  },
  {
    id: 'iron_guard',
    name: 'HỘ VỆ SẮT',
    description: '+2 giáp tối đa mỗi bậc.',
    tags: ['survival'],
    rarity: 'common',
    maxStacks: 3,
    apply: (stats) => {
      stats.maxArmorBonus += 2;
    },
  },
  {
    id: 'vitality',
    name: 'SINH LỰC',
    description: '+1 máu tối đa mỗi bậc.',
    tags: ['survival'],
    rarity: 'common',
    maxStacks: 3,
    apply: (stats) => {
      stats.maxHealthBonus += 1;
    },
  },
  {
    id: 'energy_core',
    name: 'LÕI NĂNG LƯỢNG',
    description: '+20 năng lượng tối đa, +25% hồi năng lượng mỗi bậc.',
    tags: ['energy'],
    rarity: 'common',
    maxStacks: 2,
    apply: (stats) => {
      stats.maxEnergyBonus += 20;
      stats.energyRegenMultiplier += 0.25;
    },
  },
  {
    id: 'wide_swing',
    name: 'CHÉM RỘNG',
    description: '+25° cung chém, +2 tầm kiếm mỗi bậc.',
    tags: ['melee'],
    rarity: 'common',
    maxStacks: 2,
    apply: (stats) => {
      stats.swordArcBonusDegrees += 25;
      stats.swordRangeBonus += 2;
    },
  },
  {
    id: 'multishot',
    name: 'ĐA TIA',
    description: '+1 đạn mỗi phát; +10% hồi chiêu mỗi bậc.',
    tags: ['projectile'],
    rarity: 'rare',
    maxStacks: 2,
    apply: (stats) => {
      stats.bulletCountBonus += 1;
      stats.cooldownMultiplier *= 1.1;
    },
  },
  {
    id: 'piercing_rounds',
    name: 'ĐẠN XUYÊN',
    description: 'Đạn xuyên thêm 1 quái mỗi bậc.',
    tags: ['projectile'],
    rarity: 'rare',
    maxStacks: 2,
    apply: (stats) => {
      stats.bulletPierce += 1;
    },
  },
  {
    id: 'bloodthirst',
    name: 'KHÁT MÁU',
    description: 'Hạ quái hồi 1 máu mỗi bậc.',
    tags: ['survival'],
    rarity: 'rare',
    maxStacks: 2,
    apply: (stats) => {
      stats.killHeal += 1;
    },
  },
  {
    id: 'overcharge',
    name: 'QUÁ TẢI',
    description: '+20% sát thương đạn và +30% tốc độ đạn.',
    tags: ['projectile', 'energy'],
    rarity: 'rare',
    maxStacks: 1,
    apply: (stats) => {
      stats.rangedDamageMultiplier += 0.2;
      stats.bulletSpeedMultiplier += 0.3;
    },
  },
];

export const SYNERGIES: readonly SynergyDefinition[] = [
  {
    id: 'storm_barrage',
    name: 'LOẠT ĐẠN BÃO',
    description: '+1 đạn mỗi phát và -10% hồi chiêu.',
    requiredBuffIds: ['multishot', 'quick_hands'],
    apply: (stats) => {
      stats.bulletCountBonus += 1;
      stats.cooldownMultiplier *= 0.9;
    },
  },
  {
    id: 'executioner',
    name: 'ĐAO PHỦ',
    description: '+2 sát thương kiếm và +20° cung chém.',
    requiredBuffIds: ['sharp_edge', 'wide_swing'],
    apply: (stats) => {
      stats.meleeDamageBonus += 2;
      stats.swordArcBonusDegrees += 20;
    },
  },
  {
    id: 'juggernaut',
    name: 'KHỐI THÉP',
    description: '+1 máu tối đa và +2 giáp tối đa.',
    requiredBuffIds: ['iron_guard', 'vitality'],
    apply: (stats) => {
      stats.maxHealthBonus += 1;
      stats.maxArmorBonus += 2;
    },
  },
  {
    id: 'arcane_battery',
    name: 'PIN HUYỀN BÍ',
    description: '+20 năng lượng tối đa và +15% sát thương đạn.',
    requiredBuffIds: ['energy_core', 'overcharge'],
    apply: (stats) => {
      stats.maxEnergyBonus += 20;
      stats.rangedDamageMultiplier += 0.15;
    },
  },
  {
    id: 'vampire_lord',
    name: 'HUYẾT TỘC VƯƠNG',
    description: 'Hạ quái hồi thêm 1 máu.',
    requiredBuffIds: ['bloodthirst', 'quick_hands'],
    apply: (stats) => {
      stats.killHeal += 1;
    },
  },
];

export function getBuffById(id: string): BuffDefinition | undefined {
  return BUFFS.find((buff) => buff.id === id);
}
