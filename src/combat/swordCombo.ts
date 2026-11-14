/** Logic thuần (không phụ thuộc Phaser) của combo Kiếm, để kiểm thử độc lập. */

export interface ComboState {
  /** Đòn kế tiếp sẽ tung: 0, 1 hoặc 2. */
  step: number;
  /** Quá thời điểm này (ms) mà chưa đánh tiếp thì combo reset. */
  expireAt: number;
}

export const COMBO_STEPS = 3;

/** Trả về đòn sẽ tung tại `time` (reset về 0 nếu combo đã hết hạn). */
export function resolveComboStep(state: ComboState, time: number): number {
  return time > state.expireAt ? 0 : state.step;
}

/** Ghi nhận đã tung đòn `step`; đòn kế tiếp lặp vòng, hết hạn sau `cooldownEndAt + resetMs`. */
export function advanceCombo(
  state: ComboState,
  step: number,
  cooldownEndAt: number,
  resetMs: number,
): void {
  state.step = (step + 1) % COMBO_STEPS;
  state.expireAt = cooldownEndAt + resetMs;
}

/** (dx, dy) tính từ tâm có nằm trong hình quạt (hướng `angle`, nửa góc `halfArc`, bán kính `range`) không. */
export function isInSector(
  dx: number,
  dy: number,
  angle: number,
  halfArc: number,
  range: number,
): boolean {
  if (dx * dx + dy * dy > range * range) {
    return false;
  }

  let diff = Math.atan2(dy, dx) - angle;

  diff = Math.atan2(Math.sin(diff), Math.cos(diff));

  return Math.abs(diff) <= halfArc;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Quãng lao thực tế: tối đa `maxPx`, dừng cách kẻ địch đầu tiên nằm trong hành lang phía trước `marginPx`
 * để không lao xuyên hay chồng lên quái.
 */
export function clampLunge(
  origin: Point,
  dirX: number,
  dirY: number,
  maxPx: number,
  marginPx: number,
  corridorHalfWidthPx: number,
  blockers: Iterable<Point>,
): number {
  let distance = maxPx;

  for (const b of blockers) {
    const dx = b.x - origin.x;
    const dy = b.y - origin.y;
    const along = dx * dirX + dy * dirY;
    const lateral = Math.abs(dx * dirY - dy * dirX);

    if (along > 0 && lateral <= corridorHalfWidthPx) {
      distance = Math.min(distance, Math.max(0, along - marginPx));
    }
  }

  return distance;
}
