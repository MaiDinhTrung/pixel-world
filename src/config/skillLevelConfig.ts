/**
 * Hiệu quả của cấp kỹ năng (cấp 1–5 từ cây kỹ năng).
 * Cấp 0 (chưa đầu tư) và cấp 1 cho kết quả như nhau: skill live luôn dùng được
 * theo level nhân vật, điểm kỹ năng chỉ nâng thêm từ cấp 2 trở đi.
 * Điểm khởi đầu để playtest, chưa kiểm chứng.
 */
/** Mỗi cấp node (từ cấp 2) tăng sát thương skill thêm 10%. */
export const SKILL_LEVEL_DAMAGE_PER_LEVEL = 0.1;
/** Mỗi cấp node (từ cấp 2) giảm hồi chiêu skill 4%. */
export const SKILL_LEVEL_COOLDOWN_PER_LEVEL = 0.04;

/** Số cấp được tính thưởng: cấp 0 và 1 đều = 0. */
function bonusLevels(level: number): number {
  return Math.max(0, Math.floor(level) - 1);
}

/** Hệ số sát thương của skill ở cấp `level` (cấp 5 = ×1.4). */
export function getSkillPower(level: number): number {
  return 1 + SKILL_LEVEL_DAMAGE_PER_LEVEL * bonusLevels(level);
}

/** Hệ số hồi chiêu của skill ở cấp `level` (cấp 5 = ×0.84). */
export function getSkillCooldownMult(level: number): number {
  return 1 - SKILL_LEVEL_COOLDOWN_PER_LEVEL * bonusLevels(level);
}
