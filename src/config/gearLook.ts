import type { GearId, GearSlot } from './gearConfig';

/** Hình dạng mũ vẽ lên đầu nhân vật. */
export type HatKind = 'hood' | 'helm' | 'crown';

export interface HatLook {
  readonly kind: HatKind;
  readonly color: string; // màu chính
  readonly dark: string; // màu tối (viền/bóng)
  readonly trim: string; // màu viền, đinh tán
  readonly gem?: string; // viên ngọc (nếu có)
}

export interface ArmorLook {
  readonly armor: string; // màu chính của giáp
  readonly armorDark: string; // phần tối
  readonly belt: string; // viền/đinh tán/thắt lưng
}

export interface BootsLook {
  readonly boots: string; // màu giày
}

/** Ngoại hình trang bị đang mặc, dùng để vẽ lại sprite nhân vật. */
export interface GearLook {
  readonly hat: HatLook | null;
  readonly armor: ArmorLook;
  readonly boots: BootsLook;
}

/** Ngoại hình từng món mũ. Muốn đổi màu/hình mũ thì sửa ở đây. */
export const HAT_LOOKS: Partial<Record<GearId, HatLook>> = {
  cloth_hood: { kind: 'hood', color: '#6d5a8e', dark: '#4a3c66', trim: '#cfae5a' },
  iron_helm: { kind: 'helm', color: '#9aa4ba', dark: '#4f5870', trim: '#d8e0ef' },
  dragon_crown: {
    kind: 'crown',
    color: '#d9b44f',
    dark: '#8a6628',
    trim: '#f6e08a',
    gem: '#e23b3b',
  },
};

/** Ngoại hình từng món giáp. */
export const ARMOR_LOOKS: Partial<Record<GearId, ArmorLook>> = {
  cloth_robe: { armor: '#6d5a8e', armorDark: '#4a3c66', belt: '#cfae5a' },
  iron_cuirass: { armor: '#9aa4ba', armorDark: '#4f5870', belt: '#d9b45a' },
  dragon_plate: { armor: '#b3262e', armorDark: '#6e1219', belt: '#f0c040' },
};

/** Ngoại hình từng đôi giày. */
export const BOOTS_LOOKS: Partial<Record<GearId, BootsLook>> = {
  worn_boots: { boots: '#4a3428' },
  swift_greaves: { boots: '#3f8f8a' },
  void_treads: { boots: '#6b3fb5' },
};

/** Khi chưa mặc giáp: áo thường. */
const BARE_ARMOR: ArmorLook = {
  armor: '#7b6a55',
  armorDark: '#5a4c3c',
  belt: '#8a6a3a',
};

/** Khi chưa mang giày: giày rách. */
const BARE_BOOTS: BootsLook = { boots: '#3a2a20' };

export function resolveGearLook(
  equipped: Record<GearSlot, GearId | null>,
): GearLook {
  const hat = equipped.hat ? (HAT_LOOKS[equipped.hat] ?? null) : null;
  const armor = equipped.armor
    ? (ARMOR_LOOKS[equipped.armor] ?? BARE_ARMOR)
    : BARE_ARMOR;
  const boots = equipped.boots
    ? (BOOTS_LOOKS[equipped.boots] ?? BARE_BOOTS)
    : BARE_BOOTS;

  return { hat, armor, boots };
}

/** Khoá so sánh: chỉ vẽ lại sprite khi ngoại hình thực sự đổi. */
export function gearLookKey(look: GearLook): string {
  return JSON.stringify(look);
}
