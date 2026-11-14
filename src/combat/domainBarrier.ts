/**
 * Trạng thái kết giới của Lĩnh Vực Thần Minh, tách riêng (không import gì) để
 * `Player`/`EnemyBase` kiểm tra chặn sát thương mà không tạo vòng import.
 * Logic dựng/duy trì kết giới ở `skills/divineDomain.ts`.
 */
export interface DomainBarrier {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Gọi khi một đòn bị chặn; (x, y) là điểm thuộc phía bên ngoài. */
  onBlocked(x: number, y: number): void;
}

let barrier: DomainBarrier | null = null;

export function setDomainBarrier(next: DomainBarrier | null): void {
  barrier = next;
}

export function getDomainBarrier(): DomainBarrier | null {
  return barrier;
}

export function isInsideBarrier(
  b: DomainBarrier,
  x: number,
  y: number,
): boolean {
  const dx = x - b.x;
  const dy = y - b.y;

  return dx * dx + dy * dy <= b.radius * b.radius;
}

/**
 * true nếu đòn bị ranh giới chặn: nguồn và đích nằm hai phía của kết giới.
 * Không có kết giới hoặc không biết nguồn thì không chặn.
 */
export function isHitBlockedByDomain(
  sourceX: number | undefined,
  sourceY: number | undefined,
  targetX: number,
  targetY: number,
): boolean {
  if (!barrier || sourceX === undefined || sourceY === undefined) {
    return false;
  }

  const sourceInside = isInsideBarrier(barrier, sourceX, sourceY);

  if (sourceInside === isInsideBarrier(barrier, targetX, targetY)) {
    return false;
  }

  if (sourceInside) {
    barrier.onBlocked(targetX, targetY);
  } else {
    barrier.onBlocked(sourceX, sourceY);
  }

  return true;
}
