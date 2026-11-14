import Phaser from 'phaser';

/** Bảng màu Hỏa Kiếm: đỏ thẫm → đỏ cam → vàng → lõi trắng vàng. */
export const FIRE = {
  dark: 0xb3201a,
  red: 0xe63a1c,
  orange: 0xff7a1a,
  gold: 0xffd84a,
  white: 0xfff3c4,
} as const;

/** Các lớp vệt từ viền lửa ngoài vào lõi sáng; `k` = tỉ lệ bề dày so với lớp ngoài. */
const CRESCENT_LAYERS: readonly { k: number; color: number; alpha: number }[] = [
  { k: 1, color: FIRE.red, alpha: 0.9 },
  { k: 0.68, color: FIRE.orange, alpha: 1 },
  { k: 0.38, color: FIRE.gold, alpha: 1 },
  { k: 0.14, color: FIRE.white, alpha: 1 },
];
const CRESCENT_SEGMENTS = 14;
/** Mảng điểm dùng lại giữa các lần vẽ để không cấp phát mỗi frame. */
const POINTS: Phaser.Math.Vector2[] = Array.from(
  { length: (CRESCENT_SEGMENTS + 1) * 2 },
  () => new Phaser.Math.Vector2(),
);

/**
 * Vẽ vệt chém trăng khuyết bằng đa giác đặc (không viền bo, không blur): hai đầu thuôn nhọn,
 * giữa dày nhất, mép ngoài phình ra ngoài hơn mép trong. `progress` (0-1) là phần cung đã quét.
 * Graphics đặt ở tâm người chơi; góc theo radian.
 */
export function drawFireCrescent(
  g: Phaser.GameObjects.Graphics,
  startAngle: number,
  endAngle: number,
  radius: number,
  thick: number,
  progress: number,
): void {
  g.clear();

  if (progress < 0.04) {
    return;
  }

  const visibleEnd = startAngle + (endAngle - startAngle) * Math.min(1, progress);

  for (const layer of CRESCENT_LAYERS) {
    const half = (thick * layer.k) / 2;
    let n = 0;

    for (let i = 0; i <= CRESCENT_SEGMENTS; i += 1) {
      const s = i / CRESCENT_SEGMENTS;
      const a = startAngle + (visibleEnd - startAngle) * s;
      const r = radius + half * 1.2 * Math.sin(Math.PI * s) ** 0.8;

      POINTS[n].x = Math.round(Math.cos(a) * r);
      POINTS[n].y = Math.round(Math.sin(a) * r);
      n += 1;
    }

    for (let i = CRESCENT_SEGMENTS; i >= 0; i -= 1) {
      const s = i / CRESCENT_SEGMENTS;
      const a = startAngle + (visibleEnd - startAngle) * s;
      const r = radius - half * 0.5 * Math.sin(Math.PI * s) ** 0.8;

      POINTS[n].x = Math.round(Math.cos(a) * r);
      POINTS[n].y = Math.round(Math.sin(a) * r);
      n += 1;
    }

    g.fillStyle(layer.color, layer.alpha);
    g.fillPoints(POINTS, true, true);
  }

}

const STAR_LAYERS: readonly { k: number; color: number }[] = [
  { k: 1, color: FIRE.red },
  { k: 0.72, color: FIRE.orange },
  { k: 0.48, color: FIRE.gold },
  { k: 0.24, color: FIRE.white },
];
const STAR_SPIKES = 8;
const STAR_POINTS: Phaser.Math.Vector2[] = Array.from(
  { length: STAR_SPIKES * 2 },
  () => new Phaser.Math.Vector2(),
);

/** Vụ nổ hình sao nhọn nhiều lớp (nhát kết): các tia dài xen kẽ tia ngắn, một tia hướng theo `angle`. */
export function drawFireStarburst(
  g: Phaser.GameObjects.Graphics,
  radius: number,
  angle: number,
): void {
  g.clear();

  for (const layer of STAR_LAYERS) {
    for (let i = 0; i < STAR_SPIKES * 2; i += 1) {
      const long = i % 2 === 0;
      const r = radius * layer.k * (long ? (i % 4 === 0 ? 1 : 0.7) : 0.3);
      const a = angle + (Math.PI * i) / STAR_SPIKES;

      STAR_POINTS[i].x = Math.round(Math.cos(a) * r);
      STAR_POINTS[i].y = Math.round(Math.sin(a) * r);
    }

    g.fillStyle(layer.color, 1);
    g.fillPoints(STAR_POINTS, true, true);
  }
}
