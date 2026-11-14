/**
 * Tính điểm tiếp đất của cú nhảy (thuần toán học, không phụ thuộc Phaser nên test được).
 * Đi dọc tia từ điểm xuất phát theo hướng đã khoá; dừng ở điểm hợp lệ xa nhất,
 * không băng qua vật cản và không ra ngoài bản đồ.
 */
export interface LandingInput {
  startX: number;
  startY: number;
  /** Hướng đã khoá (không cần chuẩn hoá; (0,0) = không nhảy). */
  dirX: number;
  dirY: number;
  /** Độ lớn đầu vào 0..1 (theo mức kéo nút kỹ năng). */
  reach: number;
  minRange: number;
  maxRange: number;
  /** Khung hợp lệ của tâm nhân vật. */
  bounds: { left: number; top: number; right: number; bottom: number };
  /** true = vị trí này bị vật cản chặn. */
  isBlocked: (x: number, y: number) => boolean;
  /** Bước dò dọc tia (px). */
  step?: number;
}

export interface LandingResult {
  x: number;
  y: number;
  distance: number;
  /** true nếu điểm mong muốn bị dời vì vật cản/ngoài bản đồ. */
  adjusted: boolean;
}

export function computeLanding(input: LandingInput): LandingResult {
  const length = Math.hypot(input.dirX, input.dirY);
  const stay: LandingResult = {
    x: input.startX,
    y: input.startY,
    distance: 0,
    adjusted: false,
  };

  if (length === 0) {
    return stay;
  }

  const nx = input.dirX / length;
  const ny = input.dirY / length;
  const reach = Math.min(1, Math.max(0, input.reach));
  const wanted = input.minRange + (input.maxRange - input.minRange) * reach;
  const step = input.step ?? 8;
  const { bounds } = input;
  let lastFree = 0;
  let blockedAt: number | null = null;

  for (let d = step; d <= wanted + 0.001; d += step) {
    const x = input.startX + nx * d;
    const y = input.startY + ny * d;
    const outside =
      x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;

    if (outside || input.isBlocked(x, y)) {
      blockedAt = d;
      break;
    }

    lastFree = d;
  }

  // Bước cuối lẻ (wanted không chia hết cho step): thử đúng điểm mong muốn.
  if (blockedAt === null && lastFree < wanted) {
    const x = input.startX + nx * wanted;
    const y = input.startY + ny * wanted;
    const outside =
      x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;

    if (!outside && !input.isBlocked(x, y)) {
      lastFree = wanted;
    } else {
      blockedAt = wanted;
    }
  }

  if (lastFree <= 0) {
    return { ...stay, adjusted: true };
  }

  return {
    x: input.startX + nx * lastFree,
    y: input.startY + ny * lastFree,
    distance: lastFree,
    adjusted: blockedAt !== null,
  };
}
