/**
 * Thang số hiển thị. Logic chiến đấu giữ nguyên đơn vị gốc (máu 12, Kiếm 3 sát thương, EN 70) để cân bằng
 * không đổi; mọi con số người chơi nhìn thấy (bảng chỉ số, số sát thương, chữ mô tả) nhân với hệ số ở đây.
 *
 * Quy đổi: +1 Sinh lực = +1 máu gốc = +100 HP hiển thị; +1 Năng lượng = +5 EN gốc = +100 EN hiển thị;
 * sát thương gốc 1 = 50 hiển thị (Kiếm 3 → 150 ở Sức đánh 100).
 */

/** Máu và giáp người chơi (gồm sát thương người chơi nhận): hiển thị = gốc × hệ số. */
export const HEALTH_DISPLAY_SCALE = 100;
/** Năng lượng: hiển thị = gốc × hệ số. */
export const ENERGY_DISPLAY_SCALE = 20;
/** Sát thương người chơi gây ra và máu quái: hiển thị = gốc × hệ số. */
export const DAMAGE_DISPLAY_SCALE = 50;

/** Sức đánh gốc của nhân vật (chưa cộng điểm Sức mạnh, trang bị). Sát thương cuối = SỨC ĐÁNH / giá trị này × sát thương gốc vũ khí. */
export const ATTACK_POWER_BASE = 100;
/** Mỗi điểm Sức mạnh cộng thêm bấy nhiêu Sức đánh (trên nền ATTACK_POWER_BASE = +10%). */
export const ATTACK_POWER_PER_POWER_POINT = 10;

export function toDisplayHealth(value: number): number {
  return Math.round(value * HEALTH_DISPLAY_SCALE);
}

export function toDisplayEnergy(value: number): number {
  return Math.round(value * ENERGY_DISPLAY_SCALE);
}

export function toDisplayDamage(value: number): number {
  return Math.round(value * DAMAGE_DISPLAY_SCALE);
}
