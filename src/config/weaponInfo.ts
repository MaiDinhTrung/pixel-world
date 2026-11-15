import type { WeaponId } from '../combat/Weapon';
import { TEXTURE_KEYS } from './constants';

/** Độ hiếm của vũ khí: thường / đặc biệt / huyền thoại. */
export type WeaponRarity = 'common' | 'special' | 'legendary';

/** Thông tin hiển thị của một vũ khí (tên, loại, mô tả, màu...). Số liệu chiến đấu nằm ở combatConfig.ts. */
export interface WeaponInfo {
  readonly id: WeaponId; // mã vũ khí
  readonly name: string; // tên hiển thị
  readonly type: 'CẬN CHIẾN' | 'TẦM XA';
  readonly rarity: WeaponRarity; // độ hiếm
  readonly description: string; // mô tả ngắn
  readonly colorCss: string; // màu chữ theo độ hiếm
  readonly energyCost: number; // EN tiêu hao mỗi lần đánh (chỉ để hiển thị)
  readonly textureKey: string; // tên ảnh của vũ khí
}

/** Nhãn tiếng Việt của từng độ hiếm. */
export const WEAPON_RARITY_LABELS: Record<WeaponRarity, string> = {
  common: 'THƯỜNG',
  special: 'ĐẶC BIỆT',
  legendary: 'HUYỀN THOẠI',
};

/** Màu chữ của từng độ hiếm (xám / xanh / cam). */
export const WEAPON_RARITY_COLORS: Record<WeaponRarity, string> = {
  common: '#9aa0ad',
  special: '#4da3ff',
  legendary: '#ffb347',
};

/** Bảng thông tin của toàn bộ vũ khí trong game. */
export const WEAPON_INFO: Record<WeaponId, WeaponInfo> = {
  sword: {
    id: 'sword',
    name: 'KIẾM',
    type: 'CẬN CHIẾN',
    rarity: 'common',
    description:
      'Giữ nút để nối combo: Trảm Kích, Truy Kích, rồi Liên Hoàn Trảm lao tới chém 3 nhát.',
    colorCss: WEAPON_RARITY_COLORS.common,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.sword,
  },
  shield: {
    id: 'shield',
    name: 'KHIÊN',
    type: 'CẬN CHIẾN',
    rarity: 'common',
    description: 'Húc quái ở gần và giữ vững tuyến phòng thủ.',
    colorCss: WEAPON_RARITY_COLORS.common,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.shield,
  },
  blaster: {
    id: 'blaster',
    name: 'SÚNG NĂNG LƯỢNG',
    type: 'TẦM XA',
    rarity: 'common',
    description: 'Bắn liên tiếp các tia năng lượng.',
    colorCss: WEAPON_RARITY_COLORS.common,
    energyCost: 4,
    textureKey: TEXTURE_KEYS.blaster,
  },
  bow: {
    id: 'bow',
    name: 'CUNG',
    type: 'TẦM XA',
    rarity: 'special',
    description: 'Giương cung để bắn mũi tên xuyên thấu.',
    colorCss: WEAPON_RARITY_COLORS.special,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.bow,
  },
  scythe: {
    id: 'scythe',
    name: 'LIỀM',
    type: 'CẬN CHIẾN',
    rarity: 'special',
    description:
      'Chém trái, chém phải, nhát 3 đâm giáo lao tới, nhát 4 xoay một vòng. Giữ nút 2 giây rồi thả để xoay lốc xoáy.',
    colorCss: WEAPON_RARITY_COLORS.special,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.scythe,
  },
  staff: {
    id: 'staff',
    name: 'TRƯỢNG',
    type: 'TẦM XA',
    rarity: 'special',
    description:
      'Bấm nhanh phóng quả cầu phép xuyên thấu. Giữ nút 1 giây rồi thả để bắn một quả cầu lớn, sát thương gấp 3.',
    colorCss: WEAPON_RARITY_COLORS.special,
    energyCost: 8,
    textureKey: TEXTURE_KEYS.staff,
  },
  wand: {
    id: 'wand',
    name: 'ĐŨA PHÉP',
    type: 'TẦM XA',
    rarity: 'common',
    description: 'Bắn nhanh các tia phép.',
    colorCss: WEAPON_RARITY_COLORS.common,
    energyCost: 5,
    textureKey: TEXTURE_KEYS.wand,
  },
  dual_blades: {
    id: 'dual_blades',
    name: 'SONG ĐAO',
    type: 'CẬN CHIẾN',
    rarity: 'special',
    description: 'Hai lưỡi dao chém nhanh luân phiên, tầm ngắn.',
    colorCss: WEAPON_RARITY_COLORS.special,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.dualBlades,
  },
  hammer: {
    id: 'hammer',
    name: 'BÚA',
    type: 'CẬN CHIẾN',
    rarity: 'special',
    description:
      'GIÁNG BÚA (nhấn): đập vùng, choáng và đẩy lùi. CHẤN ĐỊA KÍCH (giữ 1 giây rồi thả): vùng lớn, sát thương nặng, choáng dài.',
    colorCss: WEAPON_RARITY_COLORS.special,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.hammer,
  },
  excalibur: {
    id: 'excalibur',
    name: 'EXCALIBUR',
    type: 'CẬN CHIẾN',
    rarity: 'legendary',
    description:
      'Thương vàng: giữ nút tích lực 0,5–2 giây rồi thả để phóng thương xuyên thấu, đẩy lui kẻ địch. Tích càng lâu sát thương càng lớn.',
    colorCss: WEAPON_RARITY_COLORS.legendary,
    energyCost: 0,
    textureKey: TEXTURE_KEYS.excalibur,
  },
  dragon_bow: {
    id: 'dragon_bow',
    name: 'CUNG RỒNG',
    type: 'TẦM XA',
    rarity: 'legendary',
    description: 'Mũi tên nổ gây sát thương diện rộng.',
    colorCss: WEAPON_RARITY_COLORS.legendary,
    energyCost: 8,
    textureKey: TEXTURE_KEYS.dragonBow,
  },
  void_staff: {
    id: 'void_staff',
    name: 'TRƯỢNG HƯ KHÔNG',
    type: 'TẦM XA',
    rarity: 'legendary',
    description: 'Mở hố đen hút và nghiền nát quái.',
    colorCss: WEAPON_RARITY_COLORS.legendary,
    energyCost: 30,
    textureKey: TEXTURE_KEYS.voidStaff,
  },
};

/** Danh sách mã mọi vũ khí. */
export const WEAPON_IDS = Object.keys(WEAPON_INFO) as WeaponId[];

/** Kiểm tra một giá trị có phải mã vũ khí hợp lệ không (dùng khi đọc save). */
export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && value in WEAPON_INFO;
}
