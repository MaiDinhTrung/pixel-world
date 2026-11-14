/**
 * Logic thuần của combo Song Đao (không import Phaser, test được):
 * bước 0 = dao chính chém, bước 1 = dao phụ chém ngược chiều, bước 2 = đòn kết hai dao.
 */

/** Số bước của một vòng combo. */
export const DUAL_BLADES_COMBO_STEPS = 3;

/**
 * Chọn bước dùng cho đòn đánh này.
 * `nextStep` là bước kế tiếp theo vòng combo; nếu đã nghỉ quá `windowMs` kể từ đòn trước thì về bước 0.
 */
export function resolveComboStep(
  nextStep: number,
  elapsedMs: number,
  windowMs: number,
): number {
  if (elapsedMs > windowMs || nextStep < 0 || nextStep >= DUAL_BLADES_COMBO_STEPS) {
    return 0;
  }

  return nextStep;
}

/** Bước đứng sau `step` trong vòng combo. */
export function advanceComboStep(step: number): number {
  return (step + 1) % DUAL_BLADES_COMBO_STEPS;
}
