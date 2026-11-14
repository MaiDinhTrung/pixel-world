import {
  DAMAGE_NUMBER_K_THRESHOLD,
  DAMAGE_NUMBER_MIN_PART_RATIO,
  type DamageNumberKind,
} from '../config/damageNumberConfig';

/**
 * Hàm thuần (không import Phaser) cho bố cục số sát thương, để test được.
 * Không tính sát thương: chỉ nhận số đã tính xong và quyết định cách hiển thị.
 */

export interface PartAmount {
  readonly type: DamageNumberKind;
  readonly amount: number;
}

/**
 * Chuỗi hiển thị. `value` ≤ 0 → '' (không hiện). Số dương nhỏ hơn 0.5 vẫn hiện "1"
 * vì đòn đã thật sự gây sát thương. Từ `kThreshold` trở lên rút gọn "12k".
 */
export function formatDamage(
  value: number,
  kThreshold = DAMAGE_NUMBER_K_THRESHOLD,
): string {
  if (!(value > 0)) {
    return '';
  }

  const rounded = Math.max(1, Math.round(value));

  return rounded >= kThreshold
    ? `${Math.round(rounded / 1000)}k`
    : String(rounded);
}

/**
 * Chuẩn hóa các phần của một đòn: bỏ phần ≤ 0, sắp giảm dần, gộp các phần nhỏ hơn
 * `minRatio` × tổng vào phần lớn nhất (tổng hiển thị giữ nguyên, không có số "1" rác).
 */
export function consolidateParts(
  parts: readonly PartAmount[],
  minRatio = DAMAGE_NUMBER_MIN_PART_RATIO,
): PartAmount[] {
  const positive = parts
    .filter((part) => part.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (positive.length <= 1) {
    return positive;
  }

  const total = positive.reduce((sum, part) => sum + part.amount, 0);
  const kept: PartAmount[] = [];
  let leftover = 0;

  for (const part of positive) {
    if (kept.length === 0 || part.amount >= total * minRatio) {
      kept.push(part);
    } else {
      leftover += part.amount;
    }
  }

  if (leftover > 0) {
    kept[0] = { type: kept[0].type, amount: kept[0].amount + leftover };
  }

  return kept;
}

/**
 * Độ lệch của số thứ `index` trong cùng một đòn: số 0 ở giữa, các số sau tỏa
 * luân phiên phải/trái và thấp dần để không chồng nhau.
 */
export function partOffset(
  index: number,
  spreadX: number,
  spreadY: number,
): { x: number; y: number } {
  if (index <= 0) {
    return { x: 0, y: 0 };
  }

  const side = index % 2 === 1 ? 1 : -1;
  const ring = Math.ceil(index / 2);

  return { x: side * ring * spreadX, y: ring * spreadY };
}

/** Khoá gộp: cùng mục tiêu, cùng loại, cùng nhóm (đòn thường / DoT). */
export function mergeKey(
  targetId: number,
  type: DamageNumberKind,
  dot: boolean,
): string {
  return `${targetId}:${type}:${dot ? 'd' : 'h'}`;
}
