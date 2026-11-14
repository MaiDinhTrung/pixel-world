/** Số liệu hệ 6 loại sát thương. Mọi hằng số cân bằng của resolveDamage nằm ở đây. */

/** 6 loại sát thương. */
export type DamageType =
  | 'physical'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'wind'
  | 'dark';

/** 5 loại nguyên tố (mọi loại trừ vật lý). */
export type ElementType = Exclude<DamageType, 'physical'>;

export const ELEMENT_TYPES: readonly ElementType[] = [
  'fire',
  'ice',
  'lightning',
  'wind',
  'dark',
];

/** Kháng tối đa của người chơi (0.75 = luôn nhận ít nhất 25%). */
export const RES_CAP_PLAYER = 0.75;
/** Kháng tối đa của boss (thấp hơn để không thể miễn nhiễm hoàn toàn). */
export const RES_CAP_BOSS = 0.5;
/** Kháng thấp nhất (âm = nhận thêm sát thương). */
export const RES_MIN = -0.5;
/** Tổng điểm kháng bị bỏ qua tối đa từ resPen + resShred (0.5 = 50 điểm %). */
export const RES_IGNORE_MAX = 0.5;
/** Trần xuyên giáp (tỉ lệ bể giáp / giảm vật lý bị bỏ qua). */
export const ARMOR_PEN_MAX = 0.5;

/** Trần cộng sát thương theo loại (2 = +200%). */
export const TYPE_DAMAGE_MAX = 2;

/** Chí mạng: hệ số nền (khớp CRIT_BASE_DAMAGE_MULT trong combatConfig), trần hệ số và trần tỉ lệ. */
export const CRIT_MULT_BASE = 1.5;
export const CRIT_MULT_MAX = 3;
export const CRIT_CHANCE_MAX = 0.75;

/** Tỉ lệ sát thương bể giáp đỡ được theo loại. */
export const POOL_SHARE_PHYSICAL = 1;
export const POOL_SHARE_ELEMENTAL = 0.5;

/** Sàn tổng: sau mọi lớp giảm, sát thương nhận ≥ tỉ lệ này so với sát thương gốc. */
export const MIN_TAKEN_RATIO = 0.2;
export const MIN_TAKEN_RATIO_BOSS = 0.3;

// ─────────────────────────────────────────────────────────────────────────────
// HIỆU ỨNG NGUYÊN TỐ (GĐ3)
// ─────────────────────────────────────────────────────────────────────────────

/** Fire · Thiêu: DPS = tỉ lệ này × sát thương lửa gây ra, kéo dài ms (làm mới, không cộng dồn). */
export const FIRE_BURN_DPS_RATIO = 0.3;
export const FIRE_BURN_MS = 3000;

/** Ice · mỗi đòn băng làm chậm (hệ số tốc độ) trong ms; đủ số tầng trong cửa sổ thì đóng băng. */
export const ICE_CHILL_MULT = 0.7;
export const ICE_CHILL_MS = 2000;
export const ICE_STACKS_TO_FREEZE = 3;
export const ICE_STACK_WINDOW_MS = 3000;
export const ICE_FREEZE_MS = 1200;
/** Sau khi đóng băng, miễn đóng băng thêm ms kể từ lúc bắt đầu (chống khóa cứng). */
export const ICE_FREEZE_IMMUNE_MS = 6000;
/** Boss không đóng băng và chỉ bị chậm tối đa 40% (tốc độ không thấp hơn hệ số này). */
export const BOSS_MIN_SPEED_MULT = 0.6;

/** Lightning · lan tối đa N đích kế tiếp trong bán kính (px), mỗi bước nhân hệ số này. */
export const CHAIN_MAX_HOPS = 2;
export const CHAIN_RADIUS = 140;
export const CHAIN_FALLOFF = 0.6;

/** Wind · tốc độ đẩy (px/giây) khi đòn gió trúng; boss chịu hệ số bên dưới. */
export const WIND_PUSH_SPEED = 360;
export const WIND_PUSH_STUN_MS = 180;
export const WIND_BOSS_PUSH_MULT = 0.3;

/** Dark · nguyền (+10% sát thương nhận, ms) và hút sinh lực. */
export const DARK_CURSE_MULT = 1.1;
export const DARK_CURSE_MS = 4000;
export const DARK_LEECH_RATIO = 0.08;
/** Hút sinh lực tối đa mỗi giây, tính theo tỉ lệ HP tối đa. */
export const DARK_LEECH_MAX_PER_SEC_RATIO = 0.1;
/** Boss hút sinh lực kém hơn. */
export const DARK_LEECH_BOSS_MULT = 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// QUÁI & BOSS NGUYÊN TỐ (GĐ5)
// ─────────────────────────────────────────────────────────────────────────────

/** Bật/tắt quái và boss tấn công bằng nguyên tố (false = mọi đòn quái là vật lý như trước). */
export const ELEMENTAL_ENEMIES_ENABLED = true;
/** Quái bắn xa chỉ có thể mang nguyên tố từ tier này trở lên. */
export const ELEMENTAL_ENEMY_MIN_TIER = 2;
/** Xác suất một quái bắn xa (đủ tier) mang nguyên tố. */
export const ELEMENTAL_ENEMY_CHANCE = 0.5;
/** Nguyên tố quái thường có thể mang (Wind chưa có vì chưa có đẩy lùi lên người chơi). */
export const ELEMENTAL_ENEMY_TYPES: readonly ElementType[] = [
  'fire',
  'ice',
  'lightning',
  'dark',
];
/** Đạn nguyên tố yếu hơn đạn vật lý (HP người chơi rất thấp). */
export const ELEMENTAL_ENEMY_DAMAGE_MULT = 0.7;
/** Quái mang nguyên tố nào thì kháng 50% nguyên tố đó. */
export const ELEMENTAL_ENEMY_OWN_RESIST = 0.5;

/** Chiêu boss → nguyên tố (slam giữ vật lý, triệu hồi không gây sát thương). */
export const BOSS_METEOR_TYPE: ElementType = 'fire';
export const BOSS_NOVA_TYPE: ElementType = 'dark';
export const BOSS_FAN_TYPE: ElementType = 'ice';

/**
 * Bảng màu nguyên tố — NGUỒN DUY NHẤT (art direction: Grim Dark Fantasy Pixel Art).
 * core = lõi sáng, body = thân (màu nhận diện hệ), edge = viền/glow tối để tách khỏi nền cỏ/đá.
 * Giá trị khởi đầu, có thể chỉnh sau khi xem trong game.
 */
export const ELEMENT_PALETTE: Record<DamageType, { core: number; body: number; edge: number }> = {
  physical: { core: 0xf2e8cc, body: 0xcdbf9c, edge: 0x5a4a30 },
  fire: { core: 0xffd070, body: 0xe0702a, edge: 0x8e2a10 },
  ice: { core: 0xe8f6fc, body: 0x7cc0d8, edge: 0x24506e },
  lightning: { core: 0xfff4b0, body: 0xe8c030, edge: 0x8a5c14 },
  // Wind xanh ngọc xám (không xanh lá thuần) để không chìm vào cỏ.
  wind: { core: 0xeef8f2, body: 0x8ec4b0, edge: 0x36705f },
  dark: { core: 0xd8c4ff, body: 0x8a62c8, edge: 0x2e1850 },
};

/** Màu đạn / vòng báo trước theo nguyên tố (= màu thân của ELEMENT_PALETTE). */
export const ELEMENT_COLORS: Record<DamageType, number> = {
  physical: ELEMENT_PALETTE.physical.body,
  fire: ELEMENT_PALETTE.fire.body,
  ice: ELEMENT_PALETTE.ice.body,
  lightning: ELEMENT_PALETTE.lightning.body,
  wind: ELEMENT_PALETTE.wind.body,
  dark: ELEMENT_PALETTE.dark.body,
};

// ─────────────────────────────────────────────────────────────────────────────
// KHÁNG TRÊN TRANG BỊ (GĐ6)
// ─────────────────────────────────────────────────────────────────────────────

/** Nhãn tiếng Việt từng nguyên tố. */
export const ELEMENT_LABELS: Record<ElementType, string> = {
  fire: 'HỎA',
  ice: 'BĂNG',
  lightning: 'SÉT',
  wind: 'PHONG',
  dark: 'BÓNG TỐI',
};

/** Kháng trên đồ KHÔNG nhân ×1.25 mỗi cấp như chỉ số khác: cộng cố định thêm mỗi N cấp đồ… */
export const GEAR_RESIST_LEVELS_PER_POINT = 10;
/** …tối đa chừng này điểm % thêm. */
export const GEAR_RESIST_LEVEL_BONUS_MAX = 5;
/** Trần kháng một loại trên MỘT món đồ (điểm %). */
export const GEAR_RESIST_PER_ITEM_MAX = 25;
