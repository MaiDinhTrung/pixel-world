import type { GearId, GearSlot } from './gearConfig';
import { GEAR_SLOTS } from './gearConfig';

/** Mã từng loại ngọc. */
export type GemId =
  | 'lifesteal'
  | 'damage'
  | 'energy_leech'
  | 'thorns'
  | 'vitality'
  | 'bulwark'
  | 'evasion';

/** Tổng chỉ số do ngọc đang khảm trên đồ đang mặc mang lại. */
export interface GemBonuses {
  lifestealPercent: number; // % sát thương gây ra được hồi thành máu
  damagePercent: number; // + % sát thương
  energyLeech: number; // EN hồi mỗi lần đánh trúng
  thornsDamage: number; // sát thương phản lên kẻ địch gần nhất mỗi lần bị đánh
  maxHealth: number; // + máu tối đa (điểm)
  maxArmor: number; // + giáp tối đa (điểm)
  dodgePercent: number; // + % né đòn
}

export interface GemInfo {
  readonly id: GemId;
  readonly name: string;
  readonly description: string;
  readonly colorCss: string;
  readonly color: number;
  /** Giá trị cộng cho MỖI viên ngọc (đơn vị theo `stat`). */
  readonly value: number;
  readonly stat: keyof GemBonuses;
  /** Dòng chỉ số hiển thị cho n viên (ví dụ "+4% HÚT MÁU"). */
  readonly format: (total: number) => string;
}

/** Số ô đục tối đa trên một món trang bị. */
export const MAX_SOCKETS = 3;

/** Bảng toàn bộ ngọc. Muốn đổi sức mạnh ngọc nào thì sửa `value` của loại đó. */
export const GEM_INFO: Record<GemId, GemInfo> = {
  lifesteal: {
    id: 'lifesteal',
    name: 'NGỌC HÚT MÁU',
    description: 'Đánh trúng hồi máu theo % sát thương gây ra.',
    colorCss: '#ff4d6d',
    color: 0xff4d6d,
    value: 4, // +4% sát thương gây ra → máu
    stat: 'lifestealPercent',
    format: (total) => `+${total}% HÚT MÁU`,
  },
  damage: {
    id: 'damage',
    name: 'NGỌC SÁT THƯƠNG',
    description: 'Tăng sát thương của mọi đòn đánh và kỹ năng.',
    colorCss: '#ff9f43',
    color: 0xff9f43,
    value: 6, // +6% sát thương
    stat: 'damagePercent',
    format: (total) => `+${total}% SÁT THƯƠNG`,
  },
  energy_leech: {
    id: 'energy_leech',
    name: 'NGỌC HÚT KI',
    description: 'Mỗi lần đánh trúng hồi năng lượng.',
    colorCss: '#5fe0ff',
    color: 0x5fe0ff,
    value: 1, // +1 EN mỗi lần đánh trúng
    stat: 'energyLeech',
    format: (total) => `+${total} EN MỖI ĐÒN TRÚNG`,
  },
  thorns: {
    id: 'thorns',
    name: 'NGỌC PHẢN ĐÒN',
    description: 'Khi bị đánh, phản sát thương cho kẻ địch gần nhất.',
    colorCss: '#b6ff5f',
    color: 0xb6ff5f,
    value: 2, // phản 2 sát thương mỗi lần bị đánh
    stat: 'thornsDamage',
    format: (total) => `PHẢN ${total} SÁT THƯƠNG MỖI LẦN BỊ ĐÁNH`,
  },
  vitality: {
    id: 'vitality',
    name: 'NGỌC SINH LỰC',
    description: 'Tăng máu tối đa.',
    colorCss: '#4dffa6',
    color: 0x4dffa6,
    value: 1, // +1 máu tối đa
    stat: 'maxHealth',
    format: (total) => `+${total} HP TỐI ĐA`,
  },
  bulwark: {
    id: 'bulwark',
    name: 'NGỌC GIÁP',
    description: 'Tăng giáp tối đa.',
    colorCss: '#9aa7ff',
    color: 0x9aa7ff,
    value: 1, // +1 giáp tối đa
    stat: 'maxArmor',
    format: (total) => `+${total} GIÁP TỐI ĐA`,
  },
  evasion: {
    id: 'evasion',
    name: 'NGỌC NÉ ĐÒN',
    description: 'Có xác suất né hoàn toàn một đòn.',
    colorCss: '#c9b6ff',
    color: 0xc9b6ff,
    value: 3, // +3% né đòn
    stat: 'dodgePercent',
    format: (total) => `+${total}% NÉ ĐÒN`,
  },
};

export const GEM_IDS = Object.keys(GEM_INFO) as GemId[];

export function isGemId(value: unknown): value is GemId {
  return typeof value === 'string' && value in GEM_INFO;
}

/** Số ngọc đang có trong túi theo từng loại. */
export type GemCounts = Record<GemId, number>;

/** Ô ngọc từng món trang bị: độ dài mảng = số lỗ đã đục; null = lỗ trống. */
export type GearSockets = Partial<Record<GearId, (GemId | null)[]>>;

export function createEmptyGemCounts(): GemCounts {
  return {
    lifesteal: 0,
    damage: 0,
    energy_leech: 0,
    thorns: 0,
    vitality: 0,
    bulwark: 0,
    evasion: 0,
  };
}

export function createEmptyGemBonuses(): GemBonuses {
  return {
    lifestealPercent: 0,
    damagePercent: 0,
    energyLeech: 0,
    thornsDamage: 0,
    maxHealth: 0,
    maxArmor: 0,
    dodgePercent: 0,
  };
}

/** Cộng ngọc của các ô được mang; đồ cất trong túi không tính. */
export function computeGemBonuses(
  equipped: Readonly<Record<GearSlot, GearId | null>>,
  sockets: Readonly<GearSockets>,
): GemBonuses {
  const result = createEmptyGemBonuses();

  for (const slot of GEAR_SLOTS) {
    const gearId = equipped[slot];

    for (const gemId of (gearId && sockets[gearId]) || []) {
      if (gemId) {
        const info = GEM_INFO[gemId];

        result[info.stat] += info.value;
      }
    }
  }

  return result;
}

/** Các dòng chỉ số ngọc đang mang lại (dùng hiển thị). */
export function getGemBonusLines(bonuses: Readonly<GemBonuses>): string[] {
  const lines: string[] = [];

  for (const gemId of GEM_IDS) {
    const info = GEM_INFO[gemId];
    const total = bonuses[info.stat];

    if (total > 0) {
      lines.push(info.format(total));
    }
  }

  return lines;
}
