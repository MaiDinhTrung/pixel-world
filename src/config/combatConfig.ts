/**
 * SỐ LIỆU CÂN BẰNG COMBAT — chỉnh ở đây để đổi độ khó / sức mạnh.
 *
 * Quy ước đơn vị (áp dụng cho cả file):
 *  - `_MS`      : mili-giây (1000 = 1 giây).
 *  - khoảng cách, `RADIUS`, `RANGE`, `DISTANCE`: pixel (đã scale ×2 theo độ phân giải 960×540).
 *  - `SPEED`    : pixel / giây.
 *  - `DEGREES`  : độ (góc).
 *  - `DAMAGE`   : sát thương gốc, sẽ được nhân với chỉ số sát thương của người chơi.
 *  - `MULT`     : hệ số nhân (1 = giữ nguyên, 1.5 = +50%).
 *  - Máu / giáp của người chơi tính theo "điểm" (6 máu = 6 điểm, mỗi đòn thường trừ 1).
 */

// ─────────────────────────────────────────────────────────────────────────────
// NGƯỜI CHƠI (chỉ số nền, trước khi cộng chỉ số/trang bị/cây kỹ năng)
// ─────────────────────────────────────────────────────────────────────────────

/** Máu tối đa nền của người chơi (điểm). */
export const PLAYER_MAX_HEALTH = 6;
/** Lượng máu (kể cả máu ảo) mỗi ô trên thanh máu trên đầu nhân vật. */
export const HP_BAR_POINTS_PER_CELL = 2;
/** Giáp tối đa nền (giáp bị trừ trước máu). */
export const PLAYER_MAX_ARMOR = 5;
/** Năng lượng (EN) tối đa nền — dùng để tung kỹ năng. */
export const PLAYER_MAX_ENERGY = 100;
/** Tốc độ hồi EN tự nhiên mỗi giây. */
export const PLAYER_ENERGY_REGEN_PER_SECOND = 7;
/** Thời gian bất tử ngắn ngay sau khi bị trúng đòn (ms) — tránh bị đánh liên tục. */
export const PLAYER_INVULNERABLE_MS = 900;
/** Giáp tự hồi sau khi Player không bị sát thương một khoảng thời gian. */
export const PLAYER_ARMOR_REGEN_DELAY_MS = 4000;
/** Sau khi bắt đầu hồi giáp, cứ mỗi khoảng này (ms) hồi thêm 1 điểm giáp. */
export const PLAYER_ARMOR_REGEN_INTERVAL_MS = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// QUÁI THƯỜNG (cận chiến)
// ─────────────────────────────────────────────────────────────────────────────

/** Máu quái cận chiến ở tier 0. */
export const ENEMY_MAX_HEALTH = 17;
/** Tốc độ chạy của quái (px/giây). */
export const ENEMY_SPEED = 135;
/** Sát thương quái gây ra khi chạm người chơi. */
export const ENEMY_CONTACT_DAMAGE = 1;
/** Tốc độ bị đẩy lùi khi quái trúng đòn (px/giây). */
export const ENEMY_KNOCKBACK_SPEED = 220;
/** Thời gian quái đứng khựng sau khi trúng đòn (ms). */
export const ENEMY_STUN_MS = 120;
/** Thời gian quái nháy trắng khi trúng đòn (ms) — chỉ là hiệu ứng nhìn. */
export const ENEMY_FLASH_MS = 70;

// ─────────────────────────────────────────────────────────────────────────────
// XÁC CHẾT (nguyên liệu của Triệu Hồn Sư)
// ─────────────────────────────────────────────────────────────────────────────

/** Số xác tối đa tồn tại cùng lúc; quá số này thì xác cũ nhất biến mất. */
export const CORPSE_MAX_COUNT = 10;
/** Thời gian một xác tồn tại trước khi tan biến (ms). */
export const CORPSE_LIFETIME_MS = 4 * 60 * 1000; // 4 phút
/** Màu dấu hiệu hiển thị trên xác. */
export const CORPSE_MARKER_COLOR = 0x9b6bff;

// ─────────────────────────────────────────────────────────────────────────────
// TRẠNG THÁI TRÊN QUÁI (đốt / độc / đánh dấu / nguyền) VÀ CHÍ MẠNG
// ─────────────────────────────────────────────────────────────────────────────

/** Sát thương theo thời gian (đốt, độc) cứ mỗi khoảng này (ms) gây một nhịp. */
export const STATUS_DOT_TICK_MS = 500;
/** Hệ số thời gian trạng thái áp lên boss (0.5 = boss chịu trạng thái ngắn bằng một nửa). */
export const STATUS_BOSS_DURATION_MULT = 0.5;
/** Trần hệ số sát thương nhận thêm khi cộng dồn mark + curse (1.6 = tối đa +60%). */
export const STATUS_VULNERABLE_MAX_MULT = 1.6;
/** Hệ số sát thương nền của một đòn chí mạng từ passive (Đánh Lén, Nhãn Quang): 1.5 = +50%. */
export const CRIT_BASE_DAMAGE_MULT = 1.5;
/** Đánh Lén: đòn tính là "từ phía sau" khi nằm trong ±góc này quanh hướng lưng quái. */
export const BEHIND_HIT_HALF_ANGLE_DEG = 60;

// ─────────────────────────────────────────────────────────────────────────────
// SỐ LƯỢNG & ĐỘ MẠNH QUÁI THEO "THREAT TIER" (độ khó tăng dần theo thời gian)
// ─────────────────────────────────────────────────────────────────────────────

/** Số quái tối đa sống cùng lúc ở tier 0 (tăng dần theo tier, xem THREAT_ALIVE_BONUS). */
export const ENEMY_MAX_ALIVE = 6;
/** Khoảng chờ giữa hai lần sinh quái ở tier 0 (ms). */
export const ENEMY_RESPAWN_MS = 2000;

/** Mỗi tier tăng thêm bao nhiêu % máu quái (0.35 = +35% mỗi tier). */
export const ENEMY_HEALTH_MULT_PER_TIER = 0.35;
/** Mỗi tier tăng thêm bao nhiêu % tốc độ quái. */
export const ENEMY_SPEED_MULT_PER_TIER = 0.05;
/** Trần hệ số tốc độ quái (1.3 = nhanh tối đa +30%). */
export const ENEMY_MAX_SPEED_MULT = 1.3;
/** Cứ mỗi N tier thì sát thương chạm/đạn của quái +1. */
export const ENEMY_DAMAGE_TIER_STEP = 3;

// ─────────────────────────────────────────────────────────────────────────────
// VŨ KHÍ CẬN CHIẾN
// ─────────────────────────────────────────────────────────────────────────────

/** Kiếm: sát thương mỗi nhát. */
export const SWORD_DAMAGE = 3;
/** Kiếm: tầm chém (px). */
export const SWORD_RANGE = 56;
/** Nửa góc của vệt chém, tính bằng độ (tổng cung = 2 × giá trị này). */
export const SWORD_ARC_HALF_DEGREES = 60;
/** Kiếm: thời gian chờ giữa hai nhát (ms) — càng nhỏ càng đánh nhanh. */
export const SWORD_COOLDOWN_MS = 320;
/** Kiếm: thời lượng animation vung kiếm (ms). */
export const SWORD_SWING_MS = 120;

/** Khiên: đòn đẩy tầm ngắn, sát thương thấp nhưng góc rộng. */
export const SHIELD_DAMAGE = 2;
/** Khiên: tầm đánh (px). */
export const SHIELD_RANGE = 46;
/** Khiên: nửa góc quét (độ). */
export const SHIELD_ARC_HALF_DEGREES = 75;
/** Khiên: thời gian chờ giữa hai đòn (ms). */
export const SHIELD_COOLDOWN_MS = 420;
/** Khiên: thời lượng animation đập khiên (ms). */
export const SHIELD_BASH_MS = 140;
/** Khiên (luôn giơ khi cầm): nửa góc phía trước đỡ được đòn (độ). */
export const SHIELD_GUARD_ARC_HALF_DEGREES = 70;
/** Khiên (đỡ): tỉ lệ sát thương bị giảm với đòn từ phía trước (0.6 = giảm 60%). */
export const SHIELD_GUARD_REDUCTION = 0.6;
/** Khiên (đỡ): tỉ lệ giảm với đòn của boss (0.35 = giảm 35%). */
export const SHIELD_GUARD_BOSS_REDUCTION = 0.35;

/** Song Thủ Khiên: hệ số sát thương nhận (0.75 = giảm 25%). */
export const DUAL_GUARD_DAMAGE_TAKEN = 0.75;
/** Song Thủ Khiên: hệ số tốc chạy khi cầm khiên + vũ khí khác (0.6 = chậm 40%). */
export const DUAL_GUARD_SPEED_FACTOR = 0.6;
/** Song Thủ Khiên: hệ số tốc chạy khi chuyển sang cầm khiên bằng hai tay (0.5 = chậm 50%). */
export const DUAL_GUARD_TWO_HAND_SPEED_FACTOR = 0.5;
/** Song Thủ Khiên: EN tiêu hao mỗi giây cho tới khi tắt chiêu. */
export const DUAL_GUARD_ENERGY_PER_SECOND = 12;
/** Song Thủ Khiên: EN trừ lúc bật chiêu. */
export const DUAL_GUARD_START_ENERGY = 8;
/** Song Thủ Khiên: hồi chiêu sau khi tắt (ms). */
export const DUAL_GUARD_COOLDOWN_MS = 1500;

// Bất Động Thành Lũy (kỹ năng Khiên): cắm khiên dựng tường chắn, đứng yên, tiêu EN liên tục.
/** HP tường = máu tối đa của người chơi lúc tung × hệ số này. */
export const FORTRESS_HP_MULT = 5;
/** EN tiêu hao mỗi giây trong lúc duy trì. */
export const FORTRESS_ENERGY_PER_SECOND = 15;
/** EN trừ lúc tung (kiểm tra đủ EN trước khi dựng). */
export const FORTRESS_START_ENERGY = 10;
/** Hồi chiêu tính từ lúc kỹ năng kết thúc (ms). */
export const FORTRESS_COOLDOWN_MS = 8000;
/** Nửa góc chắn thẳng phía trước (độ): chỉ đòn từ trong góc này bị tường đỡ; hai bên, sau lưng và đòn từ trên xuống không được che. */
export const FORTRESS_ARC_HALF_DEGREES = 45;
/** Khoảng cách từ người chơi tới mặt phẳng tường (px); bề ngang tường tự tính khớp góc chắn. */
export const FORTRESS_RADIUS = 66;
/** Độ dày bức tường (px). */
export const FORTRESS_THICKNESS = 22;
/** Chiều cao bức tường vẽ nhô lên (px). */
export const FORTRESS_HEIGHT = 46;
/** Khoảng cắm khiên trước người (px). */
export const FORTRESS_PLANT_DISTANCE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// SÚNG BLASTER
// ─────────────────────────────────────────────────────────────────────────────

/** Sát thương một viên đạn blaster. */
export const BLASTER_DAMAGE = 1;
/** EN tiêu hao mỗi phát bắn. */
export const BLASTER_ENERGY_COST = 4;
/** Thời gian chờ giữa hai phát (ms). */
export const BLASTER_COOLDOWN_MS = 170;
/** Góc lệch giữa các viên đạn khi bắn nhiều phát (multishot). */
export const BLASTER_SPREAD_DEGREES = 7;
/** Tốc độ đạn người chơi (px/giây). */
export const BULLET_SPEED = 680;
/** Đạn bay tối đa bao lâu thì biến mất (ms) => quyết định tầm bắn. */
export const BULLET_LIFETIME_MS = 900;
/** Số đạn người chơi tối đa tồn tại cùng lúc (kích thước pool). */
export const MAX_BULLETS = 40;

// ─────────────────────────────────────────────────────────────────────────────
// QUÁI BẮN XA
// ─────────────────────────────────────────────────────────────────────────────

/** Máu quái bắn xa. */
export const RANGED_ENEMY_MAX_HEALTH = 5;
/** Tốc độ chạy quái bắn xa (px/giây). */
export const RANGED_ENEMY_SPEED = 110;
/** Khoảng cách quái muốn giữ với người chơi (px) — gần hơn thì lùi ra. */
export const RANGED_ENEMY_PREFERRED_DISTANCE = 320;
/** Trong tầm này (px) quái mới bắn. */
export const RANGED_ENEMY_SHOOT_RANGE = 520;
/** Thời gian "ngắm" báo trước trước khi quái bắn (ms) — cho người chơi kịp né. */
export const RANGED_ENEMY_TELEGRAPH_MS = 480;
/** Thời gian chờ giữa hai lượt bắn (ms). */
export const RANGED_ENEMY_COOLDOWN_MS = 1500;
/** Từ tier này trở lên quái bắn xa bắn chùm 3 viên. */
export const RANGED_ENEMY_TRIPLE_SHOT_TIER = 2;
/** Góc xòe giữa các viên trong chùm 3 (độ). */
export const RANGED_ENEMY_SPREAD_DEGREES = 14;

/** Đạn của quái: sát thương gây lên người chơi. */
export const ENEMY_BULLET_DAMAGE = 5;
/** Đạn của quái: tốc độ (px/giây). */
export const ENEMY_BULLET_SPEED = 340;
/** Đạn của quái: thời gian tồn tại (ms). */
export const ENEMY_BULLET_LIFETIME_MS = 3000;
/** Số đạn quái tối đa cùng lúc (kích thước pool). */
export const MAX_ENEMY_BULLETS = 80;

// ─────────────────────────────────────────────────────────────────────────────
// CƠ ĐỘNG / DI CHUYỂN CỦA TỪNG LỚP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cờ rollback: bật lại Dash chung (phím Shift + nút LƯỚT) cho mọi lớp.
 * Mặc định tắt — cơ động là kỹ năng riêng của từng lớp.
 */
export const GENERIC_DASH_ENABLED = false;

/** Xung Phong Khiên (Đấu sĩ): lao có giáp cứng, không bất tử. */
// ── Cuồng Nộ (Đấu sĩ, id `blade_storm`) ──
export const BERSERK_DURATION_MS = 40000; // thời gian Cuồng Nộ
export const BERSERK_COOLDOWN_MS = 180000; // hồi chiêu, tính từ lúc kích hoạt
export const BERSERK_EXHAUST_MS = 30000; // Kiệt Quệ sau Cuồng Nộ
export const BERSERK_HEALTH_MULT = 3; // HP tối đa (và hiện tại) ×3
export const BERSERK_DAMAGE_MULT = 1.5; // sát thương gây ra
export const BERSERK_ARMOR_MULT = 1.5; // mọi loại giáp (bể giáp + kháng nguyên tố)
export const BERSERK_SCALE = 1.3; // kích thước nhân vật
export const EXHAUST_DAMAGE_MULT = 0.5; // sát thương gây ra khi Kiệt Quệ
export const EXHAUST_HEALTH = 1; // HP đặt chính xác khi hết Cuồng Nộ

// ── Tự Bạo (Đấu sĩ) ──
export const SELF_DESTRUCT_COOLDOWN_MS = 60000;
export const SELF_DESTRUCT_ENERGY_COST = 0;
export const SELF_DESTRUCT_FUSE_MS = 3000; // thời gian nạp quả cầu năng lượng trước khi nổ
export const SELF_DESTRUCT_PULL_SPEED = 150; // tốc độ hút địch trong vòng về phía nhân vật (px/s)
export const SELF_DESTRUCT_PULL_MIN_DISTANCE = 34; // địch bị hút dừng ở khoảng cách này (px)
export const SELF_DESTRUCT_PULL_BOSS_FACTOR = 0.3; // boss bị hút yếu hơn
export const SELF_DESTRUCT_RADIUS = 170; // bán kính vụ nổ (px)
export const SELF_DESTRUCT_DAMAGE_MULT = 2.0; // damage = maxHealthSnapshot × hệ số này (+100%)
export const SELF_DESTRUCT_UNLOCK_LEVEL = 13;

export const CHARGE_DISTANCE = 220; // quãng lao tối đa (px)
export const CHARGE_DURATION_MS = 240; // thời gian lao (ms)
export const CHARGE_COOLDOWN_MS = 9000; // hồi chiêu (ms)
export const CHARGE_ENERGY_COST = 15; // EN tiêu hao
export const CHARGE_DAMAGE_REDUCTION = 0.3; // giảm 30% sát thương nhận khi đang lao
export const CHARGE_STUN_MS = 600; // thời gian choáng địch sau cú đập khiên
export const CHARGE_STOP_MARGIN = 38; // dừng cách kẻ địch đầu tiên bấy nhiêu px

/** Lướt Bóng (Sát thủ): lướt tích lượt, xuyên quái, bất tử rất ngắn. */
export const SHADOW_DASH_DISTANCE = 170; // quãng lướt (px)
export const SHADOW_DASH_DURATION_MS = 140; // thời gian lướt (ms)
export const SHADOW_DASH_INVULNERABLE_MS = 220; // bất tử trong lúc lướt (ms)
export const SHADOW_DASH_MAX_CHARGES = 2; // số lượt lướt tích trữ tối đa
export const SHADOW_DASH_RECHARGE_MS = 4500; // mỗi lượt hồi lại sau (ms)
export const SHADOW_DASH_GAP_MS = 400; // khoảng nghỉ tối thiểu giữa hai lần lướt (ms)
export const SHADOW_DASH_SPEED_BOOST = 1.2; // tăng 20% tốc chạy sau khi lướt
export const SHADOW_DASH_SPEED_BOOST_MS = 2000; // thời gian tăng tốc (ms)

/** Dịch Chuyển (Pháp sư, tuỳ chọn). */
export const BLINK_DISTANCE = 200; // quãng dịch chuyển (px)
export const BLINK_COOLDOWN_MS = 7000; // hồi chiêu (ms)
export const BLINK_ENERGY_COST = 20; // EN tiêu hao
export const BLINK_INVULNERABLE_MS = 150; // bất tử ngắn khi dịch chuyển (ms)

/** Kỹ năng Dash (chỉ dùng khi GENERIC_DASH_ENABLED). */
export const DASH_DISTANCE = 220; // quãng dash (px)
export const DASH_DURATION_MS = 170; // thời gian dash (ms)
export const DASH_COOLDOWN_MS = 1800; // hồi chiêu (ms)
export const DASH_INVULNERABLE_MS = 260; // bất tử khi dash (ms)
/** Tốc độ dash suy ra từ quãng ÷ thời gian (px/giây) — không sửa tay. */
export const DASH_SPEED = DASH_DISTANCE / (DASH_DURATION_MS / 1000);

/** Kỹ năng Nova (sóng nổ quanh người). */
export const NOVA_RADIUS = 190; // bán kính nổ (px)
export const NOVA_DAMAGE = 4; // sát thương gốc
export const NOVA_ENERGY_COST = 30; // EN tiêu hao
export const NOVA_COOLDOWN_MS = 6000; // hồi chiêu (ms)

// ─────────────────────────────────────────────────────────────────────────────
// HÒM VŨ KHÍ
// ─────────────────────────────────────────────────────────────────────────────

/** Xác suất quái chết rơi hòm vũ khí (đang để 0.8 = 80% để test; mặc định cân bằng là 0.28). */
export const WEAPON_CHEST_DROP_CHANCE = 0.8;
/** Số hòm vũ khí tối đa tồn tại cùng lúc. */
export const MAX_WEAPON_CHESTS = 5; // test; mặc định 2
/** Chạm vào trong bán kính này thì hòm tự mở. */
export const CHEST_OPEN_RADIUS = 34;
/** Trong bán kính này thì bấm F để nhặt vũ khí đã lộ. */
export const CHEST_INTERACT_RADIUS = 80;
/** Hòm tự biến mất sau (ms) nếu không ai nhặt. */
export const CHEST_LIFETIME_MS = 30000;

// ─────────────────────────────────────────────────────────────────────────────
// BOSS: xuất hiện sau một khoảng thời gian và mạnh dần theo từng lần
// ─────────────────────────────────────────────────────────────────────────────

/** Boss đầu tiên xuất hiện sau (ms) kể từ lúc vào trận. */
export const BOSS_FIRST_DELAY_MS = 120000; // 2 phút
/** Thời gian cảnh báo trước khi boss xuất hiện (ms). */
export const BOSS_WARNING_MS = 10000;
/** Sau khi boss chết, bao lâu thì boss kế tiếp tới (ms). */
export const BOSS_RESPAWN_MS = 150000;
/** Máu boss ở tier 0. */
export const BOSS_BASE_HEALTH = 400;
/** Máu boss cộng thêm mỗi tier. */
export const BOSS_HEALTH_PER_TIER = 220;
/** Máu boss cộng thêm mỗi level của người chơi. */
export const BOSS_HEALTH_PER_PLAYER_LEVEL = 20;
/** Tốc độ chạy boss ở tier 0 (px/giây). */
export const BOSS_BASE_SPEED = 110;
/** Tốc độ boss cộng thêm mỗi tier. */
export const BOSS_SPEED_PER_TIER = 8;
/** Trần tốc độ boss. */
export const BOSS_MAX_SPEED = 250;
/** Sát thương khi boss chạm người chơi. */
export const BOSS_BASE_CONTACT_DAMAGE = 5;
/** Sát thương cú đập đất của boss. */
export const BOSS_BASE_SLAM_DAMAGE = 8;
/** Bán kính cú đập đất ở tier 0 (px). */
export const BOSS_SLAM_RADIUS = 160;
/** Bán kính đập đất cộng thêm mỗi tier (px). */
export const BOSS_SLAM_RADIUS_PER_TIER = 10;
/** Thời gian nghỉ chung giữa hai kỹ năng của boss. */
export const BOSS_SKILL_COOLDOWN_MS = 3400;
/** Mỗi tier rút ngắn thời gian nghỉ này bấy nhiêu (ms). */
export const BOSS_SKILL_COOLDOWN_PER_TIER_MS = 250;
/** Thời gian nghỉ tối thiểu giữa hai kỹ năng boss (ms). */
export const BOSS_MIN_SKILL_COOLDOWN_MS = 1700;
/** Thời gian báo trước cú đập đất (ms) — vùng đỏ hiện lên. */
export const BOSS_SLAM_TELEGRAPH_MS = 750;
/** Boss chỉ đập đất khi người chơi trong tầm này (px). */
export const BOSS_SLAM_TRIGGER_RANGE = 360;

/** Kỹ năng đạn của boss. */
export const BOSS_BULLET_DAMAGE = 10; // sát thương mỗi viên
export const BOSS_BULLET_SPEED = 500; // tốc độ đạn (px/giây)
export const BOSS_NOVA_TELEGRAPH_MS = 800; // báo trước vòng đạn tròn (ms)
export const BOSS_NOVA_BASE_BULLETS = 15; // số viên của vòng đạn ở tier 0
export const BOSS_NOVA_BULLETS_PER_TIER = 2; // cộng thêm mỗi tier
export const BOSS_NOVA_MAX_BULLETS = 24; // trần số viên
export const BOSS_FAN_TELEGRAPH_MS = 600; // báo trước chùm đạn hình quạt (ms)
export const BOSS_FAN_BASE_BULLETS = 5; // số viên của chùm quạt
export const BOSS_FAN_SPREAD_DEGREES = 16; // góc xòe giữa các viên (độ)

/** Mưa thiên thạch: nhiều vùng nổ nhỏ quanh Player. */
export const BOSS_METEOR_TELEGRAPH_MS = 950; // báo trước mỗi vùng nổ (ms)
export const BOSS_METEOR_BASE_COUNT = 4; // số thiên thạch ở tier 0
export const BOSS_METEOR_MAX_COUNT = 9; // trần số thiên thạch
export const BOSS_METEOR_RADIUS = 78; // bán kính mỗi vùng nổ (px)
export const BOSS_METEOR_SCATTER = 240; // độ tản quanh người chơi (px)

/** Triệu hồi quái hộ tống. */
export const BOSS_SUMMON_TELEGRAPH_MS = 700; // báo trước (ms)
export const BOSS_SUMMON_COOLDOWN_MS = 14000; // hồi chiêu triệu hồi (ms)
export const BOSS_SUMMON_BASE_COUNT = 2; // số quái triệu hồi mỗi lần
export const BOSS_SUMMON_MAX_COUNT = 4; // trần số quái mỗi lần
export const BOSS_SUMMON_MAX_MINIONS = 6; // tổng quái hộ tống tối đa cùng lúc

/** Cuồng nộ khi HP còn dưới ngưỡng này (0–1). */
export const BOSS_ENRAGE_HEALTH_RATIO = 0.5; // dưới 50% máu thì cuồng nộ
export const BOSS_ENRAGE_SPEED_MULT = 1.5; // chạy nhanh hơn 25%
export const BOSS_ENRAGE_COOLDOWN_MULT = 0.65; // hồi chiêu chỉ còn 65% (ra skill nhanh hơn)
export const BOSS_ENRAGE_EXTRA_BULLETS = 5; // bắn thêm 2 viên mỗi chùm

// ─────────────────────────────────────────────────────────────────────────────
// THREAT SCALING THEO THỜI GIAN (game càng lâu càng khó)
// ─────────────────────────────────────────────────────────────────────────────

/** Cứ mỗi khoảng này (ms) tăng 1 tier. */
export const THREAT_INTERVAL_MS = 60000;
/** Mỗi tier cho phép thêm bấy nhiêu quái sống cùng lúc. */
export const THREAT_ALIVE_BONUS = 2;
/** Tier tối đa. */
export const MAX_THREAT_TIER = 6;
/** Trần số quái sống cùng lúc bất kể tier. */
export const MAX_ALIVE_CAP = 18;
/** Mỗi tier rút ngắn thời gian sinh quái bấy nhiêu (ms). */
export const RESPAWN_REDUCTION_PER_TIER = 250;
/** Thời gian sinh quái tối thiểu (ms). */
export const MIN_RESPAWN_MS = 700;

// ─────────────────────────────────────────────────────────────────────────────
// HÒM / VŨ KHÍ LEGENDARY (hiếm)
// ─────────────────────────────────────────────────────────────────────────────

/** Xác suất rơi hòm legendary (đang để 0.12 = 12% để test; mặc định là 0.015). */
export const LEGENDARY_CHEST_DROP_CHANCE = 0.12;
/** Số hòm legendary tối đa cùng lúc. */
export const MAX_LEGENDARY_CHESTS = 2; // test; mặc định 1
/** Hòm legendary tồn tại (ms). */
export const LEGENDARY_CHEST_LIFETIME_MS = 45000;

/**
 * Excalibur (thương vàng): giữ nút để tích lực rồi thả ra phóng một đường thương xuyên thấu.
 * Phải tích tối thiểu EXCALIBUR_MIN_CHARGE_MS mới bắn được (thả sớm hơn = hủy); tích càng lâu
 * (tới EXCALIBUR_MAX_CHARGE_MS) sát thương, tầm, bề rộng và lực đẩy lui càng lớn. Các số *_MIN ứng với
 * mức tích tối thiểu, *_MAX ứng với tích đầy.
 */
export const EXCALIBUR_MIN_CHARGE_MS = 500; // tích tối thiểu để bắn được (ms)
export const EXCALIBUR_MAX_CHARGE_MS = 2000; // tích đầy (ms)
export const EXCALIBUR_DAMAGE_MIN = 14; // sát thương khi tích tối thiểu
export const EXCALIBUR_DAMAGE_MAX = 42; // sát thương khi tích đầy
export const EXCALIBUR_RANGE_MIN = 440; // độ dài đường thương khi tích tối thiểu (px)
export const EXCALIBUR_RANGE_MAX = 620; // độ dài đường thương khi tích đầy (px)
export const EXCALIBUR_HALF_WIDTH_MIN = 40; // nửa bề rộng đường thương khi tích tối thiểu (px)
export const EXCALIBUR_HALF_WIDTH_MAX = 70; // nửa bề rộng đường thương khi tích đầy (px)
export const EXCALIBUR_KNOCKBACK_SPEED_MIN = 600; // tốc độ đẩy lui khi tích tối thiểu (px/giây)
export const EXCALIBUR_KNOCKBACK_SPEED_MAX = 950; // tốc độ đẩy lui khi tích đầy (px/giây)
export const EXCALIBUR_KNOCKBACK_MS_MIN = 200; // thời gian bị đẩy lui khi tích tối thiểu (ms)
export const EXCALIBUR_KNOCKBACK_MS_MAX = 320; // thời gian bị đẩy lui khi tích đầy (ms)
export const EXCALIBUR_COOLDOWN_MS = 700; // nghỉ sau mỗi phát bắn (ms)

/** Cung Rồng: mũi tên nổ khi trúng. */
export const DRAGON_BOW_DIRECT_DAMAGE = 3; // sát thương trúng trực tiếp
export const DRAGON_BOW_EXPLODE_DAMAGE = 4; // sát thương vụ nổ lan
export const DRAGON_BOW_EXPLODE_RADIUS = 110; // bán kính vụ nổ (px)
export const DRAGON_BOW_COOLDOWN_MS = 750; // thời gian chờ giữa hai phát (ms)
export const DRAGON_BOW_ENERGY_COST = 8; // EN tiêu hao mỗi phát
export const DRAGON_BOW_ARROW_SPEED = 700; // tốc độ mũi tên (px/giây)
export const DRAGON_BOW_ARROW_LIFETIME_MS = 1500; // mũi tên bay tối đa (ms)

/** Trượng Hư Không (Void Staff): tạo vùng hút địch rồi nổ. */
export const VOID_RADIUS = 200; // bán kính vùng (px)
export const VOID_DURATION_MS = 2200; // vùng tồn tại (ms)
export const VOID_PULL_SPEED = 110; // tốc độ hút địch vào tâm (px/giây)
export const VOID_TICK_MS = 400; // khoảng giữa hai nhịp sát thương (ms)
export const VOID_TICK_DAMAGE = 1; // sát thương mỗi nhịp
export const VOID_FINAL_DAMAGE = 6; // sát thương vụ nổ cuối khi vùng kết thúc
export const VOID_COOLDOWN_MS = 3500; // thời gian chờ giữa hai lần tạo vùng (ms)
export const VOID_ENERGY_COST = 30; // EN tiêu hao

// ─────────────────────────────────────────────────────────────────────────────
// CÁC VŨ KHÍ KHÁC
// ─────────────────────────────────────────────────────────────────────────────

/** Cung: giữ nút để sạc, thả để bắn. Sạc càng lâu càng mạnh/nhanh/xuyên nhiều. */
export const BOW_CHARGE_MS = 700; // thời gian sạc đầy (ms)
export const BOW_MIN_DAMAGE = 2; // sát thương khi sạc 0%
export const BOW_MAX_DAMAGE = 6; // sát thương khi sạc 100%
export const BOW_MIN_SPEED = 600; // tốc độ tên khi sạc 0% (px/giây)
export const BOW_MAX_SPEED = 1100; // tốc độ tên khi sạc 100% (px/giây)
export const BOW_COOLDOWN_MS = 260; // nghỉ sau mỗi phát bắn (ms)
export const BOW_SPREAD_DEGREES = 6; // góc xòe khi bắn nhiều mũi
export const BOW_BASE_PIERCE = 1; // số quái xuyên được ở mức nền
export const BOW_ARROW_LIFETIME_MS = 1200; // mũi tên bay tối đa (ms)
export const BOW_TRAIL_LENGTH_MIN = 8; // vệt đuôi mũi tên khi sạc 0% (px)
export const BOW_TRAIL_LENGTH_MAX = 16; // vệt đuôi mũi tên khi sạc 100% (px)
export const BOW_TRAIL_MAX_TRACKED = 24; // số mũi tên tối đa được vẽ vệt/hiệu ứng trúng cùng lúc (giữ nhẹ cho di động)
export const BOW_RELEASE_KICK_PX = 3; // cung giật lùi khi buông dây (px)
export const BOW_RELEASE_KICK_MS = 90; // thời gian cung giật về lại vị trí (ms)

/**
 * Lưỡi hái — 3 kiểu đòn:
 *  - Đánh thường (chạm rồi thả): nhát 1 chém bên trái, nhát 2 chém bên phải,
 *    nhát 3 đâm giáo lao tới, nhát 4 xoay một vòng quanh người. Combo reset nếu không đánh tiếp trong SCYTHE_COMBO_WINDOW_MS.
 *  - Giữ nút SCYTHE_CHARGE_MS rồi thả: xoay lốc xoáy SCYTHE_WHIRL_MS, sát thương theo nhịp.
 */
export const SCYTHE_DAMAGE = 4; // sát thương mỗi nhát chém
export const SCYTHE_SLASH_RANGE = 97; // tầm nhát chém cung (px)
export const SCYTHE_SLASH_HALF_ARC_DEGREES = 80; // nửa góc cung chém (độ, tổng cung = 160°)
export const SCYTHE_SLASH_OFFSET_DEGREES = 35; // cung chém lệch bao nhiêu độ về phía chém: nhát trái lệch trái, nhát phải lệch phải
export const SCYTHE_SLASH_COOLDOWN_MS = 360; // nghỉ sau mỗi nhát chém (ms)
export const SCYTHE_SLASH_MS = 140; // thời lượng animation một nhát chém (ms)
export const SCYTHE_COMBO_WINDOW_MS = 800; // thời gian tối đa giữa hai nhát để nối combo (ms)

// Nhát 3 của combo: cầm giáo đâm thẳng về phía trước và phi người theo một đoạn.
export const SCYTHE_THRUST_LUNGE_PX = 110; // quãng người phi tới khi đâm (px)
export const SCYTHE_THRUST_LUNGE_MS = 170; // thời gian phi người (ms)
export const SCYTHE_THRUST_REACH_PX = 70; // mũi giáo vươn thêm bao xa sau cú phi (px)
export const SCYTHE_THRUST_HALF_WIDTH_PX = 26; // nửa bề ngang vùng trúng đòn đâm (px)
export const SCYTHE_THRUST_STOP_MARGIN_PX = 34; // phi dừng trước kẻ địch đầu tiên chừng này (px)
export const SCYTHE_THRUST_HIT_DELAY_MS = 80; // độ trễ từ lúc bấm tới lúc mũi giáo đâm trúng (ms)
export const SCYTHE_THRUST_DAMAGE_MULT = 1.6; // hệ số sát thương nhát đâm
export const SCYTHE_THRUST_COOLDOWN_MS = 460; // nghỉ sau nhát đâm (ms)

export const SCYTHE_RADIUS = 132; // bán kính nhát xoay một vòng (nhát thứ 4) (px)
export const SCYTHE_SPIN_MS = 300; // thời lượng nhát xoay một vòng (ms)
export const SCYTHE_SPIN_DAMAGE_MULT = 1.4; // hệ số sát thương nhát xoay một vòng
export const SCYTHE_COOLDOWN_MS = 600; // nghỉ sau nhát xoay một vòng (ms)

export const SCYTHE_CHARGE_MS = 2000; // giữ nút bao lâu thì thả ra mới tung lốc xoáy (ms)
export const SCYTHE_WHIRL_MS = 2000; // thời lượng lốc xoáy (ms)
export const SCYTHE_WHIRL_TURNS = 10; // số vòng xoay trong suốt lốc xoáy (hiển thị)
export const SCYTHE_WHIRL_RADIUS = 98; // bán kính lốc xoáy (px)
export const SCYTHE_WHIRL_TICK_MS = 200; // nhịp gây sát thương của lốc xoáy (ms)
export const SCYTHE_WHIRL_DAMAGE_MULT = 0.7; // hệ số sát thương mỗi nhịp lốc xoáy
export const SCYTHE_WHIRL_COOLDOWN_MS = 500; // nghỉ sau khi lốc xoáy kết thúc (ms)

/** Song đao (Sát thủ cận chiến): chém luân phiên hai tay, nhanh, tầm ngắn hơn kiếm. */
export const DUAL_BLADES_DAMAGE = 2; // sát thương mỗi nhát
export const DUAL_BLADES_RANGE = 50; // tầm chém (px; đã +20% so với 42)
export const DUAL_BLADES_ARC_HALF_DEGREES = 71; // nửa góc vệt chém (độ; đã +30% so với 55)
export const DUAL_BLADES_COOLDOWN_MS = 190; // thời gian chờ giữa hai nhát (ms)
export const DUAL_BLADES_SWING_MS = 90; // thời lượng animation vung một lưỡi (ms)
export const DUAL_BLADES_COMBO_WINDOW_MS = 500; // nghỉ quá thời gian này giữa hai đòn thì combo về nhát 1 (ms)
export const DUAL_BLADES_HIT_FRACTION = 0.45; // lưỡi dao qua tới đâu (0..1 của pha vung) thì gây sát thương
export const DUAL_BLADES_FINISHER_GAP_MS = 90; // đòn kết: lượt chém thứ hai bắt đầu sau lượt đầu (ms)
export const DUAL_BLADES_FINISHER_HIT_MULT = 0.25; // đòn kết có 4 nhát (2 lượt × 2 dao); mỗi nhát nhân hệ số này → tổng bằng một nhát thường
export const DUAL_BLADES_TRAIL_FADE_MS = 110; // vệt chém mờ dần sau khi dao chém xong (ms)
export const DUAL_BLADES_TRAIL_THICKNESS = 5; // độ dày tối đa ở giữa vệt chém (px)

/** Búa (Đấu sĩ): đập chậm, nặng; sát thương vùng tròn tại điểm đầu búa chạm đất. Có 2 kiểu: GIÁNG BÚA (nhấn) và CHẤN ĐỊA KÍCH (giữ rồi thả). */
export const HAMMER_DAMAGE = 8; // sát thương đòn thường
export const HAMMER_REACH = 40; // khoảng cách từ người chơi tới tâm điểm va chạm (px)
export const HAMMER_IMPACT_RADIUS = 44; // bán kính vùng va chạm đòn thường (px)
export const HAMMER_COOLDOWN_MS = 560; // thời gian chờ giữa hai đòn thường, tính từ lúc BẮT ĐẦU giáng (ms)
export const HAMMER_WINDUP_MS = 170; // nâng búa ra sau (ms)
export const HAMMER_SWING_MS = 80; // vung xuống tới lúc va chạm; sát thương gây ở cuối pha này (ms)
export const HAMMER_RECOVER_MS = 230; // khựng va chạm rồi kéo búa về tư thế nghỉ, đã bao gồm khựng (ms)
export const HAMMER_PUSH_SPEED = 240; // lực đẩy lùi kẻ địch bị trúng (px/giây)
export const HAMMER_REST_DEGREES = 70; // góc búa gác lên vai khi nghỉ (độ, lệch khỏi hướng ngắm)
export const HAMMER_RAISE_DEGREES = 120; // góc nâng cao nhất lúc lấy đà (độ)
export const HAMMER_STRIKE_DEGREES = 25; // góc cuối lúc giáng xuống (độ, lệch về phía dưới)
export const HAMMER_STUN_MS = 450; // thời gian choáng kẻ địch trúng đòn thường (ms)
export const HAMMER_CHARGE_READY_MS = 1000; // giữ nút đủ thời gian này (tính từ lúc nhấn) thì búa sẵn sàng CHẤN ĐỊA KÍCH (ms)
export const HAMMER_CHARGED_DAMAGE = 24; // sát thương đòn tích lực
export const HAMMER_CHARGED_REACH = 52; // khoảng cách từ người chơi tới tâm va chạm đòn tích lực (px)
export const HAMMER_CHARGED_IMPACT_RADIUS = 84; // bán kính vùng va chạm đòn tích lực (px)
export const HAMMER_CHARGED_STUN_MS = 1200; // thời gian choáng kẻ địch trúng đòn tích lực (ms)
export const HAMMER_CHARGED_PUSH_SPEED = 360; // lực đẩy lùi đòn tích lực (px/giây)
export const HAMMER_CHARGED_SWING_MS = 100; // vung xuống đòn tích lực tới lúc va chạm (ms)
export const HAMMER_CHARGED_RECOVER_MS = 300; // khựng va chạm rồi kéo về sau đòn tích lực, đã bao gồm khựng (ms)
export const HAMMER_CHARGED_COOLDOWN_MS = 700; // thời gian chờ sau đòn tích lực, tính từ lúc BẮT ĐẦU giáng (ms)
export const HAMMER_CHARGED_STRIKE_DEGREES = 35; // góc cuối lúc giáng đòn tích lực (độ, lớn hơn đòn thường)
export const HAMMER_CHARGED_LAUNCH_HEIGHT = 36; // độ cao hất tung kẻ địch (px, chỉ hiển thị)
export const HAMMER_CHARGED_LAUNCH_MS = 450; // thời gian kẻ địch bị hất tung bay lên rồi rơi (ms)
export const HAMMER_CHARGED_MAX_LAUNCHED = 8; // số kẻ địch gần nhất tối đa bị hất tung (không tính boss)
export const HAMMER_CHARGE_MOVE_FACTOR = 0.6; // hệ số tốc chạy khi nâng/giữ/sẵn sàng tích lực
export const HAMMER_SWING_MOVE_FACTOR = 0.4; // hệ số tốc chạy khi giáng/hồi đòn thường
export const HAMMER_CHARGED_SWING_MOVE_FACTOR = 0.2; // hệ số tốc chạy khi giáng/hồi đòn tích lực
export const HAMMER_IMPACT_HOLD_MS = 50; // búa khựng ở góc va chạm đòn thường, nằm trong HAMMER_RECOVER_MS (ms)
export const HAMMER_CHARGED_IMPACT_HOLD_MS = 90; // búa khựng ở góc va chạm đòn tích lực, nằm trong HAMMER_CHARGED_RECOVER_MS (ms)

/** Trượng: bắn orb lớn, xuyên rất nhiều quái. */
export const STAFF_DAMAGE = 3; // sát thương
export const STAFF_ENERGY_COST = 8; // EN tiêu hao mỗi phát
export const STAFF_COOLDOWN_MS = 950; // thời gian chờ (ms)
export const STAFF_ORB_SPEED = 300; // tốc độ orb (px/giây)
export const STAFF_ORB_LIFETIME_MS = 1500; // orb bay tối đa (ms)
export const STAFF_ORB_PIERCE = 99; // số quái xuyên (99 = gần như vô hạn)
export const STAFF_SPREAD_DEGREES = 8; // góc xòe khi bắn nhiều orb
export const STAFF_CHARGE_MS = 1000; // giữ nút ít nhất chừng này rồi thả = bắn quả cầu lớn (ms); thả sớm hơn = orb thường
export const STAFF_BIG_ORB_DAMAGE_MULT = 3; // sát thương quả cầu lớn so với orb thường
export const STAFF_BIG_ORB_SCALE = 2.5; // kích thước hiển thị và hitbox quả cầu lớn (×orb thường)
export const STAFF_BIG_ORB_SPEED_MULT = 0.8; // tốc độ quả cầu lớn so với orb thường
export const STAFF_BIG_ORB_ENERGY_MULT = 2; // EN tiêu hao của quả cầu lớn so với orb thường

/** Đũa phép: bắn nhanh hơn, đạn nhỏ và ít xuyên hơn trượng. */
export const WAND_DAMAGE = 2; // sát thương
export const WAND_ENERGY_COST = 5; // EN tiêu hao mỗi phát
export const WAND_COOLDOWN_MS = 650; // thời gian chờ (ms)
export const WAND_ORB_SPEED = 360; // tốc độ orb (px/giây)
export const WAND_ORB_LIFETIME_MS = 1200; // orb bay tối đa (ms)
export const WAND_ORB_PIERCE = 3; // số quái xuyên
export const WAND_SPREAD_DEGREES = 6; // góc xòe khi bắn nhiều orb

// ── Đập Đất (Đấu sĩ, id `ground_slam`): nhảy rồi đâm vũ khí xuống đất ──
export const GROUND_SLAM_MIN_RANGE = 40; // tầm nhảy tối thiểu (px)
export const GROUND_SLAM_MAX_RANGE = 240; // tầm nhảy tối đa (px)
export const GROUND_SLAM_QUICK_REACH = 0.6; // chạm nhanh không kéo: nhảy 60% tầm theo hướng mặt
export const GROUND_SLAM_ANTICIPATION_MS = 160; // khuỵu xuống
export const GROUND_SLAM_ASCEND_MS = 270; // bật lên tới đỉnh
export const GROUND_SLAM_DESCEND_MS = 190; // lao xuống (tăng tốc)
export const GROUND_SLAM_RECOVERY_MS = 240; // hoàn tất tiếp đất
export const GROUND_SLAM_PEAK_HEIGHT = 84; // độ cao hiển thị tối đa (px)
export const GROUND_SLAM_RADIUS = 105; // bán kính vùng sát thương
export const GROUND_SLAM_STUN_MS = 1540; // choáng (boss tự giảm theo quy tắc kháng khống chế)
export const GROUND_SLAM_LAUNCH_HEIGHT = 46; // độ cao quái bị hất tung (px, chỉ hiển thị)
export const GROUND_SLAM_LAUNCH_MS = 520; // thời gian quái bay
export const GROUND_SLAM_MAX_LAUNCHED = 10; // số quái hất tung tối đa mỗi lần (giữ FPS)

// ── Nhiễm điện (Xung Phong của Đấu sĩ): kẻ bị đâm bị giật, tê liệt rồi chậm ──
export const ELECTRIFY_PARALYZE_MS = 250; // tê liệt ngay khi bị đâm
export const ELECTRIFY_SLOW_MULT = 0.45; // tốc chạy còn 45% (boss tự giảm hiệu lực)
export const ELECTRIFY_SLOW_MS = 2500; // thời gian bị làm chậm
export const ELECTRIFY_ARC_INTERVAL_MS = 150; // nhịp tia điện giật quanh mục tiêu

// ── Vạn Thương Ảnh (Đấu sĩ, id `whirlwind`): tụ lực → liên hoàn → cú đâm cuối ──
export const MYRIAD_COOLDOWN_MS = 12000; // hồi chiêu
export const MYRIAD_ENERGY_COST = 24; // EN tiêu hao
export const MYRIAD_CHARGE_MS = 220; // giai đoạn tụ lực (ngắn để không chậm chạp)
export const MYRIAD_PULSES = 8; // số đợt đâm gây sát thương (không tính bóng thương hình ảnh)
export const MYRIAD_PULSE_INTERVAL_MS = 90; // nhịp giữa hai đợt đâm
export const MYRIAD_PULSE_DAMAGE_MULT = 1.1; // sát thương mỗi đợt (nhân sát thương cận chiến)
export const MYRIAD_FINISH_DAMAGE_MULT = 3.4; // sát thương cú đâm cuối
export const MYRIAD_RANGE = 230; // tầm các đợt đâm (px)
export const MYRIAD_HALF_ARC_DEG = 28; // nửa góc quạt đâm (độ), đi theo hướng ngắm
export const MYRIAD_FINISH_RANGE_MULT = 1.25; // cú đâm cuối vươn xa hơn
export const MYRIAD_FINISH_HALF_ARC_DEG = 40; // cú đâm cuối rộng hơn
export const MYRIAD_RECOVERY_MS = 200; // nghỉ sau cú đâm cuối

// ── Sét lan (Nhiễm điện của Xung Phong / Đập Đất): đánh quái này, quái bên cạnh cũng bị giật ──
export const ELECTRIFY_CHAIN_RADIUS = 120; // bán kính lan từ quái bị đâm (px)
export const ELECTRIFY_CHAIN_MAX_TARGETS = 3; // số quái lan tối đa cho mỗi quái bị đâm
export const ELECTRIFY_CHAIN_DAMAGE_RATIO = 0.4; // sát thương lan = 40% sát thương đòn gốc

/** Trọng số rơi từ hòm thường (mặc định 1 = như mọi món khác). Số lớn hơn → dễ rơi hơn. */
export const CHEST_LOOT_WEIGHTS: Readonly<Record<string, number>> = {
  dual_blades: 3, // song đao
  hammer: 3, // búa
};

/** Vũ Điệu Bóng Tối (Sát thủ): lướt nhanh quanh mục tiêu, mỗi lần lướt qua là một nhát chém lớn; bất tử suốt lúc lướt. */
export const SHADOW_DANCE_DASHES = 10; // số lần lướt qua mục tiêu
export const SHADOW_DANCE_DASH_MS = 100; // thời gian mỗi lần lướt (ms) — càng nhỏ càng nhanh
export const SHADOW_DANCE_ORBIT_RADIUS = 110; // bán kính vòng lướt quanh mục tiêu (px)
export const SHADOW_DANCE_SLASH_RADIUS = 60; // vùng chém quanh mục tiêu khi lướt qua (px)
export const SHADOW_DANCE_DAMAGE = 5; // sát thương mỗi nhát chém (trước hệ số)
export const SHADOW_DANCE_STAR_POINTS = 5; // số đỉnh của hình ngôi sao quanh mục tiêu
export const SHADOW_DANCE_STAR_SKIP = 2; // mỗi lần lướt nhảy qua chừng này đỉnh (5 đỉnh, bước 2 = sao năm cánh)
export const SHADOW_DANCE_RANGE = 480; // tầm chọn mục tiêu (px)
export const SHADOW_DANCE_RETARGET_RADIUS = 260; // mục tiêu chết giữa chừng: tìm mục tiêu mới trong bán kính này quanh nó (px)
export const SHADOW_DANCE_INVULN_PAD_MS = 150; // bất tử kéo dài thêm sau lần lướt cuối (ms)
export const SHADOW_DANCE_STEALTH_MS = 1500; // tàng hình sau khi kết thúc (ms)

/** Tàng Hình (Sát thủ): bật/tắt, không giới hạn thời gian; tiêu EN mỗi giây, ra đòn hoặc dùng skill khác sẽ phá. */
export const VANISH_ENERGY_PER_SECOND = 10; // EN tiêu hao mỗi giây khi đang tàng hình
export const VANISH_LEVEL3_DRAIN_MULT = 0.75; // mốc cấp 3: tiêu hao EN nhân hệ số này
export const VANISH_SPEED_MULT = 0.7; // hệ số tốc chạy khi tàng hình (0.7 = chậm đi 30%)
export const VANISH_REFRESH_MS = 300; // mỗi frame gia hạn trạng thái tàng hình thêm chừng này (ms) để kéo dài vô hạn
export const VANISH_STOP_COOLDOWN_MS = 3000; // hồi chiêu sau khi tắt tàng hình (ms)

/** Nhát Đao Đoạt Mệnh (Sát thủ, id `hunters_mark`): nhảy ra sau lưng mục tiêu, đâm hai đao gây choáng + sát thương lớn, rồi về chỗ cũ. */
export const DEATH_STAB_DAMAGE = 14; // tổng sát thương gốc (chia đều cho hai nhát đâm)
export const DEATH_STAB_STUN_MS = 500; // thời gian choáng mục tiêu (ms)
export const DEATH_STAB_BEHIND_PX = 42; // đứng cách mục tiêu bấy nhiêu px ở phía sau lưng
export const DEATH_STAB_RANGE = 480; // tầm chọn mục tiêu (px)
export const DEATH_STAB_SECOND_HIT_MS = 130; // nhát đâm thứ hai sau nhát đầu (ms)
export const DEATH_STAB_RETURN_MS = 420; // dịch chuyển về vị trí cũ sau bấy nhiêu ms kể từ lúc đáp
export const DEATH_STAB_KILL_COOLDOWN_REDUCTION = 0.7; // hạ gục mục tiêu bằng kỹ năng này: giảm chừng này (0.7 = 70%) thời gian hồi chiêu còn lại

/** Khi người chơi tàng hình, quái vẫn hoạt động (di chuyển, tấn công) nhưng chỉ nhận ra người chơi ở gần. */
export const STEALTH_DETECT_RANGE = 130; // quái chỉ truy đuổi người chơi tàng hình khi ở trong bán kính này (px)
export const STEALTH_WANDER_RADIUS = 240; // quái chưa phát hiện đi lang thang tới điểm ngẫu nhiên trong bán kính này (px)
export const STEALTH_WANDER_MIN_MS = 1800; // đổi điểm lang thang sau tối thiểu (ms)
export const STEALTH_WANDER_MAX_MS = 3600; // đổi điểm lang thang sau tối đa (ms)
