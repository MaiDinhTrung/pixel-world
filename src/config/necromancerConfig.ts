/** Số liệu cân bằng của lớp Necromancer. Điểm khởi đầu để playtest, chưa kiểm chứng. */

/**
 * Giới hạn số đồng minh RIÊNG của từng kỹ năng triệu hồi (không còn trần chung).
 * Số tối đa = base + perLevel × (cấp − 1); cấp 0 và 1 như nhau. Máu nhân thêm
 * healthPerLevel mỗi cấp; sát thương tăng qua `SkillContext.power`.
 */
export const SKELETON_SQUAD = {
  baseMax: 3, // số bộ xương tối đa ở cấp 1
  extraPerLevel: 1, // thêm bao nhiêu bộ xương mỗi cấp node
  healthPerLevel: 0.2, // máu +20% mỗi cấp
} as const;

export const BONE_MAGE_SQUAD = {
  baseMax: 2, // số pháp sư xương tối đa ở cấp 1
  extraPerLevel: 1, // thêm bao nhiêu mỗi cấp node
  healthPerLevel: 0.2, // máu +20% mỗi cấp
} as const;

/** Đồng minh triệu hồi — hành vi chung. */
export const MINION_FOLLOW_DISTANCE = 70; // khoảng cách đứng quanh người chơi khi rảnh (px)
export const MINION_ENGAGE_RANGE = 320; // thấy quái trong tầm này (px) thì lao vào đánh
export const MINION_SPEED = 150; // tốc độ chạy (px/giây)

/** Bộ xương (cận chiến). */
export const SKELETON_LIFETIME_MS = 60000; // tồn tại 60 giây
export const SKELETON_DAMAGE = 3.5; // sát thương mỗi đòn
export const SKELETON_ATTACK_MS = 800; // nghỉ giữa hai đòn (ms)
export const SKELETON_REACH = 28; // tầm với (px)

/** Pháp sư xương (tầm xa). */
export const BONE_MAGE_LIFETIME_MS = 60000; // tồn tại 60 giây
export const BONE_MAGE_DAMAGE = 2; // sát thương mỗi phát
export const BONE_MAGE_ATTACK_MS = 1200; // nghỉ giữa hai phát (ms)
export const BONE_MAGE_RANGE = 200; // tầm bắn (px)

/** Màu chủ đạo của lớp Triệu Hồn Sư (tím). */
export const NEC_COLOR = 0x9b6bff;

/** Gai Xương: bắn gai đơn mục tiêu. */
export const BONE_SPIKE = {
  cooldownMs: 2500, // hồi chiêu (ms)
  energy: 8, // EN tiêu hao
  range: 260, // tầm (px)
  damage: 4, // sát thương gốc
  witherBonus: 1.5, // nhân sát thương lên kẻ đang bị Héo Úa
} as const;

/** Triệu Hồi Bộ Xương: tiêu xác để sinh bộ xương. */
export const RAISE_SKELETON = {
  cooldownMs: 4000, // hồi chiêu (ms)
  energy: 12, // EN tiêu hao
  corpseRadius: 200, // tìm xác trong bán kính này (px)
  corpseCost: 1, // số xác tiêu hao
} as const;

/** Héo Úa: nguyền vùng, địch trong vùng chịu thêm sát thương. */
export const WITHER = {
  cooldownMs: 9000, // hồi chiêu (ms)
  energy: 18, // EN tiêu hao
  radius: 100, // bán kính vùng nguyền (px)
  range: 240, // tầm tung (px)
  durationMs: 6000, // thời gian nguyền (ms)
  vulnerableMult: 1.2, // địch bị nguyền nhận thêm 20% sát thương
} as const;

/** Nổ Xác: kích nổ xác thành sát thương diện rộng. */
export const CORPSE_BURST = {
  cooldownMs: 7000, // hồi chiêu (ms)
  energy: 20, // EN tiêu hao
  range: 260, // tầm tung (px)
  corpseSearchRadius: 150, // tìm xác quanh điểm ngắm trong bán kính này (px)
  maxCorpses: 4, // nổ tối đa bao nhiêu xác một lần
  blastRadius: 80, // bán kính mỗi vụ nổ (px)
  baseDamage: 3, // sát thương gốc mỗi vụ nổ
  /** Sát thương thêm theo máu tối đa của quái đã chết. */
  damagePerMaxHealth: 0.25,
} as const;

/** Triệu Hồi Pháp Sư Xương. */
export const BONE_MAGE = {
  cooldownMs: 10000, // hồi chiêu (ms)
  energy: 30, // EN tiêu hao
  corpseRadius: 200, // tìm xác trong bán kính này (px)
  corpseCost: 2, // số xác tiêu hao
} as const;

/** Lồng Xương: nhốt và làm chậm mạnh địch trong vùng. */
export const BONE_CAGE = {
  cooldownMs: 11000, // hồi chiêu (ms)
  energy: 24, // EN tiêu hao
  range: 280, // tầm tung (px)
  radius: 90, // bán kính lồng (px)
  slowMult: 0.2, // địch chỉ còn 20% tốc độ
  durationMs: 3000, // thời gian nhốt (ms)
} as const;

/** Hút Hồn (nội tại lớp): hạ gục hồi EN, có cơ hội thêm xác. */
export const SOUL_SIPHON = {
  energyOnKill: 2, // EN hồi mỗi lần hạ gục
  extraCorpseChance: 0.15, // 15% cơ hội để lại thêm 1 xác
} as const;

/** Đồng minh bị quái đánh. */
export const SKELETON_HEALTH = 20; // máu bộ xương
export const BONE_MAGE_HEALTH = 12; // máu pháp sư xương
export const MINION_HIT_INVULN_MS = 700; // bất tử ngắn sau khi bị đánh (ms)
/** Quái đổi mục tiêu sang đồng minh khi nó ở trong tầm này và gần hơn người chơi. */
export const MINION_AGGRO_RANGE = 150;
/** Quái chạm đồng minh trong khoảng này (px) thì gây sát thương. */
export const MINION_CONTACT_RANGE = 26;
