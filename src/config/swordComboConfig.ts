/**
 * Combo đánh thường của Kiếm: Trảm Kích → Truy Kích → Liên Hoàn Trảm (giữ nút để tự nối).
 * Sát thương = (SWORD_DAMAGE + bonus) × hệ số của từng nhát; số cơ bản ở `combatConfig.ts`.
 */

/** Thông số một nhát chém đơn (đòn 1 và 2). */
export interface SwordSlashSpec {
  readonly name: string;
  /** Hệ số sát thương so với sát thương cơ bản của Kiếm. */
  readonly damageMult: number;
  /** Tầm chém (px), chưa tính `swordRangeBonus`. */
  readonly range: number;
  /** Nửa góc cung trúng đòn (độ), chưa tính `swordArcBonusDegrees`. */
  readonly halfArcDeg: number;
  /** Cung lệch khỏi hướng ngắm (độ): đòn chéo. */
  readonly tiltDeg: number;
  /** +1 = quét xuôi chiều kim đồng hồ, -1 = quét ngược (đòn 2 quét ngược lại đòn 1). */
  readonly sweep: 1 | -1;
  /** Thời lượng animation vung kiếm (ms). */
  readonly swingMs: number;
  /** Từ lúc bấm tới lúc hitbox có hiệu lực (ms): khớp giữa cú vung. */
  readonly hitDelayMs: number;
  /** Nhích người về trước khi chém (px). */
  readonly stepPx: number;
  /** Nghỉ trước khi ra đòn kế (ms, chưa nhân cooldown). */
  readonly cooldownMs: number;
  /** Bề dày tối đa của vệt lửa ở giữa (px); hai đầu thuôn nhọn về 0. */
  readonly trailThick: number;
}

export const SWORD_COMBO_SLASHES: readonly [SwordSlashSpec, SwordSlashSpec] = [
  {
    name: 'TRẢM KÍCH',
    damageMult: 1,
    range: 60,
    halfArcDeg: 55,
    tiltDeg: 0,
    sweep: 1,
    swingMs: 100,
    hitDelayMs: 40,
    stepPx: 0,
    cooldownMs: 280,
    trailThick: 8,
  },
  {
    name: 'TRUY KÍCH',
    damageMult: 1.5,
    range: 76,
    halfArcDeg: 70,
    tiltDeg: 20,
    sweep: -1,
    swingMs: 130,
    hitDelayMs: 60,
    stepPx: 10,
    cooldownMs: 340,
    trailThick: 16,
  },
];

/** Thông số một nhát trong chuỗi Liên Hoàn Trảm. */
export interface SwordChainStrikeSpec {
  /** Thời điểm bắt đầu nhát, tính từ lúc bắt đầu đòn 3 (ms). */
  readonly atMs: number;
  readonly damageMult: number;
  readonly range: number;
  readonly halfArcDeg: number;
  /** Quãng lao tối đa trước nhát này (px). */
  readonly lungePx: number;
  readonly swingMs: number;
  /** Từ lúc bắt đầu nhát tới lúc hitbox có hiệu lực (ms). */
  readonly hitDelayMs: number;
  /** Bề dày tối đa của vệt lửa (px). */
  readonly trailThick: number;
  readonly finisher: boolean;
}

export const SWORD_CHAIN_STRIKES: readonly SwordChainStrikeSpec[] = [
  { atMs: 0, damageMult: 0.7, range: 62, halfArcDeg: 55, lungePx: 36, swingMs: 80, hitDelayMs: 35, trailThick: 9, finisher: false },
  { atMs: 110, damageMult: 0.7, range: 62, halfArcDeg: 55, lungePx: 36, swingMs: 80, hitDelayMs: 35, trailThick: 9, finisher: false },
  { atMs: 220, damageMult: 1.6, range: 82, halfArcDeg: 75, lungePx: 30, swingMs: 130, hitDelayMs: 55, trailThick: 20, finisher: true },
];

/** Thời gian đòn 3 chạy hết (ms): tới khi nhát kết xong. */
export const SWORD_CHAIN_TOTAL_MS = 220 + 130;
/** Nghỉ sau đòn 3 trước khi đánh tiếp (ms): cái giá của sát thương cao. */
export const SWORD_CHAIN_RECOVERY_MS = 520;
/** Thời lượng mỗi đoạn lao (ms), dài hơn khoảng cách giữa hai nhát để lao liền mạch. */
export const SWORD_CHAIN_DASH_MS = 115;
/** Lao dừng cách kẻ địch đầu tiên trên đường đi chừng này (px). */
export const SWORD_CHAIN_STOP_MARGIN_PX = 30;
/** Nửa bề ngang hành lang lao dùng để tìm kẻ địch chắn đường (px). */
export const SWORD_CHAIN_CORRIDOR_HALF_WIDTH_PX = 30;

/** Ngừng đánh quá khoảng này sau khi hết nghỉ thì combo reset về đòn 1 (ms). */
export const SWORD_COMBO_RESET_MS = 600;
