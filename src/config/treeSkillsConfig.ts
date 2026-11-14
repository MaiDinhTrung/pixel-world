/**
 * Số liệu của các kỹ năng chủ động lấy từ cây kỹ năng (cần học node).
 * Điểm khởi đầu để playtest, chưa kiểm chứng. Sát thương là bội số của
 * hệ số sát thương người chơi (nhân thêm `power` theo cấp node).
 */

// ── Đấu sĩ ────────────────────────────────────────────────────────────────────
/**
 * Lĩnh Vực Thần Minh (Đấu sĩ, ultimate; trước là Thành Trì Bất Diệt): kết giới tròn
 * cô lập bên trong khỏi bên ngoài. Id kỹ năng/node vẫn là `living_fortress`.
 */
export const DIVINE_DOMAIN = {
  cooldownMs: 75000, // hồi chiêu (ms)
  energy: 40, // EN tiêu hao
  radius: 160, // bán kính (px)
  durationMs: 8000, // thời gian hiệu lực (ms)
  tickMs: 200, // khoảng giữa hai nhịp tác dụng (ms)
  armorOnCast: 4, // giáp được cộng ngay khi tung
  edgeMargin: 12, // thực thể bị giữ cách ranh giới ngần này (px) để không đè lên viền
  damageReductionLevel: 3, // từ cấp này: người chơi bên trong giảm sát thương nhận
  damageReduction: 0.2, // mức giảm (20%)
  edgeMoteCount: 90, // số tia sáng bốc lên từ viền ngoài (tái dùng, không sinh thêm đối tượng)
  edgeMoteRise: 72, // độ cao tia sáng bốc lên (px)
  edgeMoteLifeMs: 1300, // vòng đời một tia sáng (ms)
  rippleMax: 8, // số gợn sóng tối đa cùng lúc (giữ hiệu năng trên di động)
  rippleThrottleMs: 70, // khoảng tối thiểu giữa hai gợn sóng (ms)
} as const;

/** Lốc Xoáy (Đấu sĩ): xoay kiếm đánh quanh người. */
export const CYCLONE = {
  cooldownMs: 7000, // hồi chiêu (ms)
  energy: 22, // EN tiêu hao
  radius: 70, // bán kính (px)
  durationMs: 2000, // thời gian hiệu lực (ms)
  tickMs: 350, // khoảng giữa hai nhịp tác dụng (ms)
  damage: 3, // sát thương gốc (nhân với sát thương người chơi và cấp node)
} as const;

/** Bão Kiếm (Đấu sĩ): buff cận chiến. */
export const SWORD_TEMPEST = {
  cooldownMs: 70000, // hồi chiêu (ms)
  energy: 40, // EN tiêu hao
  durationMs: 6000, // thời gian hiệu lực (ms)
  damageMult: 1.3, // sát thương cận chiến ×1.3
  attackSpeedMult: 1.3, // tốc đánh ×1.3
} as const;

/** Xích Kéo (Đấu sĩ): kéo địch về trước mặt. */
export const GRAPPLE_CHAIN = {
  cooldownMs: 9000, // hồi chiêu (ms)
  energy: 18, // EN tiêu hao
  range: 260, // tầm tung (px)
  pullRadius: 50, // kéo luôn địch quanh mục tiêu trong bán kính này (px)
  holdDistance: 54, // khoảng cách địch bị kéo tới trước mặt (px)
  damage: 2.4, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  slowMult: 0.5, // địch bị kéo còn 50% tốc độ
  slowMs: 1000, // thời gian làm chậm (ms)
} as const;

/** Tiếng Gầm Cự Nhân (Đấu sĩ, ultimate): choáng và xử tử địch yếu. */
export const TITAN_ROAR = {
  cooldownMs: 80000, // hồi chiêu (ms)
  energy: 45, // EN tiêu hao
  radius: 260, // bán kính (px)
  windupMs: 600, // thời gian khởi động trước khi gầm (ms)
  stunMs: 1500, // thời gian choáng (ms)
  executeBelow: 0.2, // địch dưới 20% máu bị xử tử ngay
} as const;

// ── Pháp sư ───────────────────────────────────────────────────────────────────
/** Hỏa Bạo (Pháp sư): nổ lửa tại điểm ngắm và gây Thiêu. */
export const FLAME_BURST = {
  cooldownMs: 4000, // hồi chiêu (ms)
  energy: 18, // EN tiêu hao
  range: 280, // tầm tung (px)
  radius: 70, // bán kính (px)
  damage: 4, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  burnDps: 1.5, // sát thương Thiêu mỗi giây
  burnMs: 3000, // thời gian Thiêu (ms)
} as const;

/** Tường Lửa (Pháp sư): tường chặn đạn, đốt kẻ chạm vào. */
export const FIRE_WALL = {
  cooldownMs: 10000, // hồi chiêu (ms)
  energy: 28, // EN tiêu hao
  range: 260, // tầm tung (px)
  length: 220, // chiều dài tường (px)
  thickness: 22, // độ dày vùng gây sát thương (px)
  durationMs: 5000, // thời gian hiệu lực (ms)
  tickMs: 500, // khoảng giữa hai nhịp tác dụng (ms)
  damage: 1.5, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  burnDps: 1.5, // sát thương Thiêu mỗi giây
  burnMs: 3000, // thời gian Thiêu (ms)
} as const;

/** Băng Thương (Pháp sư): thương băng xuyên nhiều mục tiêu. */
export const ICE_LANCE = {
  cooldownMs: 4000, // hồi chiêu (ms)
  energy: 16, // EN tiêu hao
  range: 420, // tầm tung (px)
  damage: 5, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  pierce: 3, // số mục tiêu xuyên qua
  speed: 900, // tốc độ bay (px/giây)
} as const;

/** Xích Tinh (Pháp sư): tia nảy giữa các địch. */
export const ARCANE_CHAIN = {
  cooldownMs: 6000, // hồi chiêu (ms)
  energy: 20, // EN tiêu hao
  range: 360, // tầm tung (px)
  bounceRadius: 150, // tìm mục tiêu nảy kế tiếp trong bán kính này (px)
  baseBounces: 3, // số lần nảy ở cấp thấp (chưa tính mục tiêu đầu)
  /** Cấp node ≥ mốc này được nảy thêm 1 lần. */
  extraBounceLevel: 3,
  damage: 3.5, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  /** Mỗi lần nảy giữ lại tỉ lệ sát thương này. */
  falloff: 0.85,
  /** Mốc cấp 5: kéo địch về phía người chơi sau mỗi lần nảy. */
  pullLevel: 5,
  pullDistance: 22, // quãng kéo địch về phía người chơi mỗi lần nảy (px)
} as const;

/** Độ Không Tuyệt Đối (Pháp sư, ultimate): vùng đóng băng rồi vỡ. */
export const ABSOLUTE_ZERO = {
  cooldownMs: 80000, // hồi chiêu (ms)
  energy: 60, // EN tiêu hao
  range: 300, // tầm tung (px)
  radius: 170, // bán kính (px)
  durationMs: 4000, // thời gian hiệu lực (ms)
  slowMult: 0.4, // địch trong vùng còn 40% tốc độ
  freezeAfterMs: 1500, // sau bấy lâu địch bị đóng băng (ms)
  freezeMs: 2500, // thời gian đóng băng (ms)
  vulnerableMult: 1.2, // địch trong vùng nhận thêm 20% sát thương
  shatterDamage: 8, // sát thương khi băng vỡ lúc hết hạn
} as const;

// ── Sát thủ ───────────────────────────────────────────────────────────────────
/** Ảnh Bộ (Sát thủ): dịch ra sau lưng địch và đâm. */
export const SHADOW_STEP = {
  cooldownMs: 8000, // hồi chiêu (ms)
  energy: 22, // EN tiêu hao
  range: 300, // tầm tung (px)
  behindDistance: 40, // đứng cách địch bấy nhiêu px ở phía sau
  damage: 6, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  backstabBonus: 1.5, // đâm từ sau lưng ×1.5 sát thương
  invulnerableMs: 150, // bất tử ngắn khi dịch chuyển (ms)
} as const;

/** Bẫy Độc (Sát thủ): đặt bẫy nổ mây độc. */
export const VENOM_TRAP = {
  cooldownMs: 5000, // hồi chiêu (ms)
  energy: 14, // EN tiêu hao
  range: 200, // tầm tung (px)
  maxTraps: 2, // số bẫy tối đa cùng lúc
  lifetimeMs: 20000, // bẫy tự biến mất sau (ms)
  triggerRadius: 30, // địch bước vào bán kính này thì bẫy nổ (px)
  cloudRadius: 80, // bán kính mây độc (px)
  cloudMs: 4000, // mây độc tồn tại (ms)
  tickMs: 500, // khoảng giữa hai nhịp tác dụng (ms)
  poisonDps: 1.5, // sát thương Độc mỗi giây
  poisonMs: 4000, // thời gian Độc (ms)
} as const;

/** Bình Dịch (Sát thủ): ném bình tạo mây độc nặng. */
export const PLAGUE_FLASK = {
  cooldownMs: 9000, // hồi chiêu (ms)
  energy: 20, // EN tiêu hao
  range: 260, // tầm tung (px)
  radius: 100, // bán kính (px)
  durationMs: 5000, // thời gian hiệu lực (ms)
  tickMs: 500, // khoảng giữa hai nhịp tác dụng (ms)
  poisonDps: 3, // sát thương Độc mỗi giây
  poisonMs: 4000, // thời gian Độc (ms)
  slowMult: 0.85, // địch trong mây còn 85% tốc độ
} as const;

/** Hoa Tử Thần (Sát thủ, ultimate): hoa nở, kích nổ Độc. */
export const DEADLY_BLOOM = {
  cooldownMs: 70000, // hồi chiêu (ms)
  energy: 50, // EN tiêu hao
  range: 300, // tầm tung (px)
  radius: 140, // bán kính (px)
  windupMs: 1500, // thời gian chờ hạt nở (ms)
  baseDamage: 4, // sát thương mọi địch trong vùng
  damagePerPoisonedEnemy: 6, // sát thương thêm lên địch đang bị Độc (và tiêu hết Độc)
} as const;

/** Bão Tên (Sát thủ, ultimate): bắn liên tục theo hướng đã ngắm. */
export const ARROW_STORM = {
  cooldownMs: 75000, // hồi chiêu (ms)
  energy: 50, // EN tiêu hao
  durationMs: 4000, // thời gian hiệu lực (ms)
  intervalMs: 250, // khoảng giữa hai mũi tên (ms)
  damage: 3, // sát thương gốc (nhân với sát thương người chơi và cấp node)
  pierce: 2, // số mục tiêu mỗi mũi xuyên qua
  spreadDegrees: 3, // độ lệch ngẫu nhiên ± (độ)
  speed: 1000, // tốc độ tên (px/giây)
} as const;

// ── Passive từ cây (hiệu ứng riêng, không phải skill chủ động) ────────────────
/** Giáp Vỡ Phản Chấn: xung kích khi giáp bị đánh về 0. */
export const SHATTER_WARD = {
  radius: 110,
  damage: 3,
  restoreArmorLevel: 5,
  restoreArmor: 2,
} as const;

/** Độc Tố: tầng Độc gắn bởi đòn đánh trúng. */
export const TOXIN = {
  dpsPerStack: 1.2,
  durationMs: 4000,
} as const;

/** Uy Nghiêm: hoảng sợ = đứng khựng trong thời gian ngắn (boss miễn). */
export const DREAD_FEAR_MS = 900;
/** Chu kỳ quét aura / Lạnh quanh người chơi. */
export const PASSIVE_SCAN_MS = 250;

/** Skill Hỏa cộng Nhiệt (Quá Nhiệt). */
export const OVERHEAT_SKILLS: readonly string[] = ['flame_burst', 'fire_wall', 'meteor'];
/** Nhiệt từ mức này trở lên làm chậm hồi EN. */
export const OVERHEAT_PENALTY_HEAT = 3;
/** Skill chủ động có thể vang lại (Dư Chấn); loại các skill dịch chuyển/ultimate. */
export const SPELL_ECHO_SKILLS: readonly string[] = [
  'arcane_nova',
  'frost_nova',
  'flame_burst',
  'fire_wall',
  'ice_lance',
  'arcane_chain',
];
/** Băng Thương gây Lạnh cho kẻ trúng đạn. */
export const ICE_LANCE_CHILL = { mult: 0.6, durationMs: 2500 } as const;
