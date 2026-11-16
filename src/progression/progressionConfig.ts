/** XP nhận được mỗi khi hạ một quái. */
export const XP_PER_KILL = 15;

/**
 * M2 (M-D1): EXP quái sinh theo vùng = round(XP_PER_KILL * xpMult của archetype * (1 + XP_TIER_BONUS * bậc)).
 * Mỗi bậc cộng thêm ngần này (0.1 = +10% mỗi bậc). Giá trị KHỞI ĐIỂM. Hàm thuần: `killXp` ở systems/enemyStats.ts.
 */
export const XP_TIER_BONUS = 0.1;

/** XP cần cho level 2. */
export const XP_BASE = 20;

/** Mỗi level sau, ngưỡng XP tăng thêm hệ số này (1.15 = +15% mỗi level). */
export const XP_GROWTH = 1.15;

/** Số lựa chọn buff khi lên level. */
export const LEVEL_UP_CHOICES = 3;
