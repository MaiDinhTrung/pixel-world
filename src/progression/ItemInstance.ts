import type { WeaponId } from '../combat/Weapon';
import type { GearId } from '../config/gearConfig';
import type { GemId } from '../config/gemConfig';

/** Loại đồ trong kho: vũ khí hoặc trang bị. */
export type ItemKind = 'weapon' | 'gear';

/** Một vũ khí cụ thể của một nhân vật (luôn cấp 1, không có lỗ ngọc). */
export type WeaponInstance = {
  /** Định danh duy nhất TRONG một nhân vật, ví dụ 'w1'. */
  uid: string;
  kind: 'weapon';
  defId: WeaponId;
  level: 1;
};

/** Một món trang bị cụ thể của một nhân vật. */
export type GearInstance = {
  /** Định danh duy nhất TRONG một nhân vật, ví dụ 'g3'. */
  uid: string;
  kind: 'gear';
  defId: GearId;
  /** Cấp món đồ, trong [1, MAX_GEAR_LEVEL]. */
  level: number;
  /** Lỗ ngọc (null = lỗ trống); luôn là mảng, tối đa MAX_SOCKETS phần tử. */
  sockets: (GemId | null)[];
};

export type ItemInstance = WeaponInstance | GearInstance;
