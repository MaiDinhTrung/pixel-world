import {
  CHAIN_FALLOFF,
  CHAIN_MAX_HOPS,
  CHAIN_RADIUS,
  DARK_LEECH_MAX_PER_SEC_RATIO,
  DARK_LEECH_RATIO,
  ICE_STACKS_TO_FREEZE,
  ICE_STACK_WINDOW_MS,
} from '../../config/damageTypeConfig';

/** Phần logic thuần của hiệu ứng nguyên tố (không Phaser) để test được. */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ChainLink<T extends Point> {
  readonly target: T;
  /** Hệ số nhân sát thương của bước này (0.6, 0.36, …). */
  readonly mult: number;
}

/**
 * Lightning: chọn chuỗi đích lan từ `origin` — mỗi bước lấy đích gần nhất chưa trúng
 * trong `radius` tính từ đích trước đó. `exclude` là đích đã bị đánh trực tiếp.
 */
export function pickChainTargets<T extends Point>(
  origin: Point,
  candidates: readonly T[],
  exclude: readonly Point[],
  maxHops = CHAIN_MAX_HOPS,
  radius = CHAIN_RADIUS,
  falloff = CHAIN_FALLOFF,
): ChainLink<T>[] {
  const used = new Set<Point>(exclude);
  const links: ChainLink<T>[] = [];
  let from: Point = origin;
  let mult = 1;

  for (let hop = 0; hop < maxHops; hop += 1) {
    let best: T | null = null;
    let bestDist = radius;

    for (const c of candidates) {
      if (used.has(c)) {
        continue;
      }

      const d = Math.hypot(c.x - from.x, c.y - from.y);

      if (d <= bestDist) {
        best = c;
        bestDist = d;
      }
    }

    if (!best) {
      break;
    }

    mult *= falloff;
    used.add(best);
    links.push({ target: best, mult });
    from = best;
  }

  return links;
}

/** Ice: đếm tầng trong cửa sổ thời gian; trả true khi đủ tầng để đóng băng. */
export class IceStackTracker {
  private stamps: number[] = [];

  private readonly stacksToFreeze: number;
  private readonly windowMs: number;

  constructor(
    stacksToFreeze = ICE_STACKS_TO_FREEZE,
    windowMs = ICE_STACK_WINDOW_MS,
  ) {
    this.stacksToFreeze = stacksToFreeze;
    this.windowMs = windowMs;
  }

  add(now: number): boolean {
    this.stamps = this.stamps.filter((t) => now - t <= this.windowMs);
    this.stamps.push(now);

    if (this.stamps.length >= this.stacksToFreeze) {
      this.stamps = [];

      return true;
    }

    return false;
  }

  reset(): void {
    this.stamps = [];
  }
}

/**
 * Dark: hút sinh lực = 8% sát thương Dark, tích phần lẻ, tối đa 10% HP tối đa mỗi giây.
 * `take` trả số HP nguyên được hồi ngay lúc này.
 */
export class LeechLimiter {
  private carry = 0;
  private windowStart = 0;
  private healedInWindow = 0;

  take(
    darkDamage: number,
    now: number,
    maxHealth: number,
    mult = 1,
    ratio = DARK_LEECH_RATIO,
    capRatio = DARK_LEECH_MAX_PER_SEC_RATIO,
  ): number {
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.healedInWindow = 0;
    }

    this.carry += darkDamage * ratio * mult;

    const allowed = Math.max(0, maxHealth * capRatio - this.healedInWindow);
    const heal = Math.min(Math.floor(this.carry), Math.floor(allowed));

    if (heal <= 0) {
      // Phần vượt trần bị bỏ, không dồn vô hạn.
      this.carry = Math.min(this.carry, 1);

      return 0;
    }

    this.carry -= heal;
    this.healedInWindow += heal;

    return heal;
  }
}
