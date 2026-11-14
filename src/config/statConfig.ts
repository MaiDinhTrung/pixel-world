/** Mã 6 chỉ số người chơi có thể cộng điểm. */
export type StatId =
  | 'vitality'
  | 'guard'
  | 'energy'
  | 'power'
  | 'haste'
  | 'agility';

/** Số điểm người chơi đã cộng vào từng chỉ số. */
export interface StatAllocation {
  vitality: number; // Sinh lực: máu tối đa
  guard: number; // Phòng thủ: giáp tối đa
  energy: number; // Năng lượng: EN tối đa
  power: number; // Sức mạnh: % sát thương
  haste: number; // Tốc độ đánh: giảm hồi chiêu
  agility: number; // Nhanh nhẹn: tốc chạy
}

/** Mô tả hiển thị của một chỉ số trong bảng nhân vật. */
export interface StatDefinition {
  readonly id: StatId;
  readonly name: string;
  readonly description: string;
  readonly color: number;
  readonly colorCss: string;
}

/** Số điểm chỉ số nhận được mỗi lần lên cấp. */
export const STAT_POINTS_PER_LEVEL = 5;

/**
 * Danh sách chỉ số. Hiệu quả thật của mỗi điểm được tính ở `progression/StatSheet.ts`
 * (cột `description` bên dưới chỉ là chữ hiển thị — đổi số ở StatSheet thì sửa cả chữ ở đây).
 */

export const STAT_DEFINITIONS: readonly StatDefinition[] = [
  {
    id: 'vitality',
    name: 'SINH LỰC',
    description: '+100 HP tối đa mỗi điểm',
    color: 0xe8434f,
    colorCss: '#e8434f',
  },
  {
    id: 'guard',
    name: 'PHÒNG THỦ',
    description: '+100 giáp tối đa mỗi điểm',
    color: 0x9aa0ad,
    colorCss: '#9aa0ad',
  },
  {
    id: 'energy',
    name: 'NĂNG LƯỢNG',
    description: '+100 năng lượng tối đa mỗi điểm',
    color: 0x3d8bfd,
    colorCss: '#3d8bfd',
  },
  {
    id: 'power',
    name: 'SỨC MẠNH',
    description: '+10 sát thương (Sức đánh) mỗi điểm',
    color: 0xffb347,
    colorCss: '#ffb347',
  },
  {
    id: 'haste',
    name: 'TỐC ĐỘ ĐÁNH',
    description: '-2% hồi chiêu mỗi điểm',
    color: 0x7dff9a,
    colorCss: '#7dff9a',
  },
  {
    id: 'agility',
    name: 'NHANH NHẸN',
    description: '+2% tốc chạy mỗi điểm',
    color: 0x5fe0ff,
    colorCss: '#5fe0ff',
  },
];

/** Bảng điểm trống (mọi chỉ số = 0), dùng khi tạo nhân vật mới / reset. */
export function createEmptyAllocation(): StatAllocation {
  return {
    vitality: 0,
    guard: 0,
    energy: 0,
    power: 0,
    haste: 0,
    agility: 0,
  };
}

/** Kiểm tra dữ liệu đọc từ save có đúng dạng bảng điểm (số nguyên ≥ 0) không. */
export function isStatAllocation(value: unknown): value is StatAllocation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const allocation = value as Partial<StatAllocation>;

  return STAT_DEFINITIONS.every((definition) => {
    const points = allocation[definition.id];

    return (
      typeof points === 'number' &&
      Number.isFinite(points) &&
      points >= 0 &&
      Math.floor(points) === points
    );
  });
}
