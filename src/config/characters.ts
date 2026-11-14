import type { WeaponId } from '../combat/Weapon';
import type { GearId } from './gearConfig';
import type { ElementType } from './damageTypeConfig';
import type { SkillId } from '../skills/skills';
import {
  SHADOW_DASH_MAX_CHARGES,
  SHADOW_DASH_RECHARGE_MS,
} from './combatConfig';
import type {
  CharacterPalette,
  HeroStyle,
} from '../utils/placeholderPlayer';

/** Mã 4 nhân vật chơi được. */
export type CharacterId = 'knight' | 'ranger' | 'mage' | 'necromancer';

/** Khai báo đầy đủ một nhân vật: hiển thị, chỉ số nền, vũ khí, trang bị, kỹ năng. */
export interface CharacterDefinition {
  readonly id: CharacterId; // mã nhân vật
  readonly name: string; // tên ngắn
  readonly title: string; // tiêu đề ở màn chọn nhân vật
  readonly description: string; // mô tả lối chơi
  readonly textureKey: string; // tên ảnh sprite
  readonly animPrefix: string; // tiền tố tên animation
  readonly accent: string; // màu nhấn của lớp (mã #hex)
  readonly style: HeroStyle; // kiểu dáng vẽ nhân vật
  readonly palette: CharacterPalette; // bảng màu quần áo
  readonly baseHealth: number; // máu nền (điểm)
  readonly baseArmor: number; // giáp nền (điểm)
  readonly baseEnergy: number; // EN nền
  /** Kháng nguyên tố tự nhiên của lớp (0.1 = 10%); bỏ trống = không có. */
  readonly baseResist?: Partial<Record<ElementType, number>>;
  readonly speedMultiplier: number; // hệ số tốc chạy (1 = bình thường)
  /** Hệ số sát thương riêng của class, nhân vào mọi đòn đánh/kỹ năng. */
  readonly damageMultiplier: number;
  /** Hai vũ khí cầm sẵn ở ô 1 và ô 2 khi bắt đầu. */
  readonly startingWeapons: readonly [WeaponId, WeaponId];
  /** Vũ khí lớp này được cầm: hòm chỉ rơi loại này và không trang bị được loại khác. */
  readonly allowedWeapons: readonly WeaponId[];
  /** Trang bị mặc sẵn khi bắt đầu. */
  readonly startingGear: {
    readonly hat: GearId;
    readonly armor: GearId;
    readonly boots: GearId;
  };
  /** Toàn bộ kỹ năng riêng của class, theo thứ tự mở khoá 1/3/5/7/9/11. */
  readonly skills: readonly SkillId[];
  /** Kỹ năng chủ động mở khoá bằng điểm kỹ năng trong cây (cần học node). */
  readonly treeSkills: readonly SkillId[];
  /** Ba kỹ năng mặc định gắn vào ô phím 3 / 4 / 5. */
  readonly defaultSkillLoadout: readonly [SkillId, SkillId, SkillId];
  /** Lượt lướt tích trữ (chỉ Sát thủ); bỏ trống = không có. */
  readonly dashCharges?: {
    readonly max: number;
    readonly rechargeMs: number;
  };
}

/** Màu da và mắt dùng chung cho mọi nhân vật. */
const SHARED_PALETTE = {
  skin: '#f2c7a0',
  eye: '#14141c',
} as const;

/** Bảng 4 nhân vật. Chỉ số nền (máu/giáp/EN/tốc chạy/sát thương) chỉnh ở đây. */
export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  knight: {
    id: 'knight',
    name: 'ĐẤU SĨ',
    title: 'ĐẤU SĨ · KIẾM & KHIÊN',
    description: 'Tank cận chiến: giáp dày, xung phong khiên áp sát, kiếm xuyên tầm xa, đập đất, áp chế quái, Cuồng Nộ và Tự Bạo.',
    textureKey: 'player-knight',
    animPrefix: 'knight',
    accent: '#5f8dff',
    style: 'knight',
    palette: {
      ...SHARED_PALETTE,
      hair: '#4a3022', // râu nâu sẫm
      scarf: '#6b3f8f', // áo choàng tím (lót cam vẽ trong placeholderPlayer)
      armor: '#9aa4ba', // giáp thép
      armorDark: '#4f5870', // phần tối của giáp
      pants: '#33384a', // quần xám than rộng
      boots: '#4a3428', // ủng da nâu
      belt: '#ecd27c', // viền/đinh tán vàng sáng
    },
    baseHealth: 12, // máu nền
    baseArmor: 4, // máu ảo nền
    baseEnergy: 70, // EN nền
    speedMultiplier: 0.92, // hệ số tốc chạy (nhân với PLAYER_SPEED)
    damageMultiplier: 1.05, // hệ số sát thương riêng của lớp
    startingWeapons: ['sword', 'shield'],
    allowedWeapons: ['sword', 'shield', 'scythe', 'excalibur', 'hammer'],
    startingGear: {
      hat: 'iron_helm',
      armor: 'iron_cuirass',
      boots: 'worn_boots',
    },
    skills: [
      'shield_bash',
      'dual_guard',
      'fortress_stand',
      'whirlwind',
      'ground_slam',
      'iron_will',
      'war_cry',
      'blade_storm',
      'self_destruct',
    ],
    treeSkills: [
      'living_fortress',
      'cyclone',
      'sword_tempest',
      'grapple_chain',
      'titan_roar',
    ],
    defaultSkillLoadout: ['shield_bash', 'whirlwind', 'ground_slam'],
  },
  ranger: {
    id: 'ranger',
    name: 'SÁT THỦ',
    title: 'SÁT THỦ · SÚNG & CUNG',
    description: 'Sát thủ cơ động: lướt tích lượt, tàng hình, tốc biến và hút máu. Máu thấp, sống nhờ né.',
    textureKey: 'player-ranger',
    animPrefix: 'ranger',
    accent: '#7dff9a',
    style: 'rogue',
    palette: {
      ...SHARED_PALETTE,
      hair: '#5a3b1f',
      scarf: '#e8c04a',
      armor: '#3f8f45',
      armorDark: '#2f6b34',
      pants: '#2b3b2b',
      boots: '#4a3428',
      belt: '#c9a227',
    },
    baseHealth: 6, // máu nền
    baseArmor: 2, // máu ảo nền
    baseEnergy: 90, // EN nền
    speedMultiplier: 1.18, // hệ số tốc chạy (nhân với PLAYER_SPEED)
    damageMultiplier: 1, // hệ số sát thương riêng của lớp
    startingWeapons: ['blaster', 'bow'],
    // Sát thủ có hai hướng: tầm xa (súng + cung) hoặc cận chiến (song đao).
    allowedWeapons: ['blaster', 'bow', 'dragon_bow', 'dual_blades'],
    startingGear: {
      hat: 'cloth_hood',
      armor: 'cloth_robe',
      boots: 'swift_greaves',
    },
    skills: [
      'triple_volley',
      'evasive_roll',
      'poison_trap',
      'arrow_rain',
      'hunters_mark',
      'storm_barrage',
    ],
    treeSkills: [
      'shadow_step',
      'venom_trap',
      'plague_flask',
      'deadly_bloom',
      'arrow_storm',
    ],
    defaultSkillLoadout: ['evasive_roll', 'triple_volley', 'poison_trap'],
    dashCharges: { max: SHADOW_DASH_MAX_CHARGES, rechargeMs: SHADOW_DASH_RECHARGE_MS },
  },
  mage: {
    id: 'mage',
    name: 'PHÁP SƯ',
    title: 'PHÁP SƯ · TRƯỢNG PHÉP',
    description: 'Pháp sư: sát thương diện rộng và khống chế bằng băng/lửa; máu thấp, sống nhờ giữ khoảng cách.',
    textureKey: 'player-mage',
    animPrefix: 'mage',
    accent: '#c36bff',
    style: 'mage',
    palette: {
      ...SHARED_PALETTE,
      hair: '#e8e6f0',
      scarf: '#c36bff',
      armor: '#7a4bc4',
      armorDark: '#56308f',
      pants: '#2b2440',
      boots: '#3a2f52',
      belt: '#b98cff',
    },
    baseHealth: 5, // máu nền
    baseArmor: 1, // máu ảo nền
    baseEnergy: 160, // EN nền
    baseResist: { fire: 0.1, ice: 0.1, lightning: 0.1 }, // pháp sư kháng 3 nguyên tố sở trường
    speedMultiplier: 0.98, // hệ số tốc chạy (nhân với PLAYER_SPEED)
    damageMultiplier: 1, // hệ số sát thương riêng của lớp
    startingWeapons: ['staff', 'wand'],
    allowedWeapons: ['staff', 'wand', 'void_staff'],
    startingGear: {
      hat: 'cloth_hood',
      armor: 'cloth_robe',
      boots: 'worn_boots',
    },
    skills: [
      'arcane_nova',
      'frost_nova',
      'arcane_shield',
      'meteor',
      'blink',
      'void_rift',
    ],
    treeSkills: [
      'flame_burst',
      'fire_wall',
      'ice_lance',
      'arcane_chain',
      'absolute_zero',
    ],
    defaultSkillLoadout: ['arcane_nova', 'frost_nova', 'arcane_shield'],
  },
  necromancer: {
    id: 'necromancer',
    name: 'TRIỆU HỒN SƯ',
    title: 'TRIỆU HỒN SƯ · TRƯỢNG & ĐŨA',
    description: 'Dùng xác quái: dựng bộ xương, nổ xác, nguyền rủa. Máu thấp, sống nhờ đồng minh.',
    textureKey: 'player-necromancer',
    animPrefix: 'necromancer',
    accent: '#9b6bff',
    // Dùng lại hình dáng pháp sư, khác bảng màu (chưa có sprite riêng).
    style: 'mage',
    palette: {
      ...SHARED_PALETTE,
      hair: '#cfcfd8',
      scarf: '#4a2f7a',
      armor: '#2c2438',
      armorDark: '#1a1424',
      pants: '#1a1a24',
      boots: '#2a2030',
      belt: '#9b6bff',
    },
    baseHealth: 5, // máu nền
    baseArmor: 1, // máu ảo nền
    baseEnergy: 130, // EN nền
    baseResist: { dark: 0.15 }, // triệu hồn sư quen với bóng tối
    speedMultiplier: 0.98, // hệ số tốc chạy (nhân với PLAYER_SPEED)
    damageMultiplier: 1, // hệ số sát thương riêng của lớp
    startingWeapons: ['staff', 'wand'],
    allowedWeapons: ['staff', 'wand', 'void_staff'],
    startingGear: {
      hat: 'cloth_hood',
      armor: 'cloth_robe',
      boots: 'worn_boots',
    },
    skills: [
      'nec_bone_spike',
      'nec_raise_skeleton',
      'nec_wither',
      'nec_corpse_burst',
      'nec_bone_mage',
      'nec_bone_cage',
    ],
    treeSkills: [],
    defaultSkillLoadout: ['nec_bone_spike', 'nec_raise_skeleton', 'nec_wither'],
  },
};

export const CHARACTER_LIST = [
  CHARACTERS.knight,
  CHARACTERS.ranger,
  CHARACTERS.mage,
  CHARACTERS.necromancer,
] as const;

export const DEFAULT_CHARACTER_ID: CharacterId = 'knight';

export function isCharacterId(value: string): value is CharacterId {
  return (
    value === 'knight' ||
    value === 'ranger' ||
    value === 'mage' ||
    value === 'necromancer'
  );
}

export const WEAPON_LABELS: Record<WeaponId, string> = {
  sword: 'KIẾM',
  shield: 'KHIÊN',
  blaster: 'SÚNG NĂNG LƯỢNG',
  bow: 'CUNG',
  scythe: 'LIỀM',
  staff: 'TRƯỢNG',
  wand: 'ĐŨA PHÉP',
  excalibur: 'EXCALIBUR',
  dragon_bow: 'CUNG RỒNG',
  void_staff: 'TRƯỢNG HƯ KHÔNG',
  dual_blades: 'SONG ĐAO',
  hammer: 'BÚA',
};
