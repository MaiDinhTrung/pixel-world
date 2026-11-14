/** Số liệu hiển thị số sát thương (Damage Number). Không chứa công thức sát thương. */

import { ELEMENT_PALETTE, type DamageType } from './damageTypeConfig';

/** Bật/tắt toàn bộ số sát thương (false = không tạo số nào). */
export const DAMAGE_NUMBERS_ENABLED = true;

/** Loại hiển thị = 6 loại sát thương + độc (độc không phải DamageType nên có màu riêng). */
export type DamageNumberKind = DamageType | 'poison';

/** Màu số sát thương gây lên quái (tint nhân với glyph trắng). */
export const DAMAGE_NUMBER_COLORS: Record<DamageNumberKind, number> = {
  physical: ELEMENT_PALETTE.physical.core, // trắng ngà (dùng màu lõi để số vật lý sáng, dễ đọc)
  fire: ELEMENT_PALETTE.fire.body, // cam
  ice: ELEMENT_PALETTE.ice.body, // xanh băng
  lightning: ELEMENT_PALETTE.lightning.body, // vàng điện
  wind: ELEMENT_PALETTE.wind.body, // xanh ngọc xám
  dark: ELEMENT_PALETTE.dark.body, // tím
  poison: 0x4fb83a, // xanh lục đậm (tách khỏi Wind); chưa là hệ nguyên tố chính thức
};

/** Số trên người chơi: nguyên tố giữ màu loại, vật lý đổi sang đỏ để khác đòn mình gây. */
export const PLAYER_PHYSICAL_NUMBER_COLOR = 0xff5a5a;

/** Trần số đang bay cùng lúc. */
export const DAMAGE_NUMBER_MAX_ACTIVE = 36;
export const DAMAGE_NUMBER_MAX_ACTIVE_TOUCH = 20;

/** Cùng mục tiêu + cùng loại trong khoảng này (ms) thì cộng dồn vào số đang bay. */
export const DAMAGE_NUMBER_MERGE_MS = 120;
/** DoT cộng dồn theo mục tiêu + loại, mỗi chừng này ms mới hiện một số. */
export const DAMAGE_NUMBER_DOT_FLUSH_MS = 1000;
/** Phần của đòn nhỏ hơn tỉ lệ này (so với tổng) bị bỏ khỏi hiển thị (trừ phần lớn nhất). */
export const DAMAGE_NUMBER_MIN_PART_RATIO = 0.1;

/** Từ ngưỡng này số được rút gọn dạng "12k". */
export const DAMAGE_NUMBER_K_THRESHOLD = 10000;

/** Kích cỡ (nhân với scale gốc của font). */
export const DAMAGE_NUMBER_SCALE = 1;
export const DAMAGE_NUMBER_CRIT_SCALE = 1.5;
export const DAMAGE_NUMBER_DOT_SCALE = 0.7;
export const DAMAGE_NUMBER_PLAYER_SCALE = 1.2;

/** Thời gian sống (ms) và quãng bay lên (px). */
export const DAMAGE_NUMBER_LIFE_MS = 700;
export const DAMAGE_NUMBER_CRIT_LIFE_MS = 950;
export const DAMAGE_NUMBER_DOT_LIFE_MS = 550;
export const DAMAGE_NUMBER_RISE = 28;
export const DAMAGE_NUMBER_DOT_RISE = 16;
/** Thời gian "nảy" lúc xuất hiện (ms) và hệ số phóng đại ban đầu. */
export const DAMAGE_NUMBER_POP_MS = 80;
export const DAMAGE_NUMBER_POP_SCALE = 1.35;
/** Tỉ lệ đầu đời giữ nguyên alpha = 1 trước khi mờ dần. */
export const DAMAGE_NUMBER_HOLD_RATIO = 0.6;

/** Độ lệch ngang ngẫu nhiên khi xuất hiện (px) và khoảng cách giữa các số của cùng một đòn. */
export const DAMAGE_NUMBER_JITTER_X = 12;
export const DAMAGE_NUMBER_PART_SPREAD_X = 16;
export const DAMAGE_NUMBER_PART_SPREAD_Y = 10;
export const DAMAGE_NUMBER_PART_STAGGER_MS = 40;
/** Khoảng cách dọc giữa hai số cùng mục tiêu khi còn gần nhau. */
export const DAMAGE_NUMBER_LANE_STEP = 12;
/** Một số được coi là "còn gần" nếu mới xuất hiện trong khoảng này (ms). */
export const DAMAGE_NUMBER_LANE_WINDOW_MS = 300;

/** Depth: trên mọi thứ y-sorted (quái dùng y + 20) và trên floatText cũ (9000). */
export const DAMAGE_NUMBER_DEPTH = 9500;

/** Font số sinh runtime: ô glyph 5×7 "pixel nghệ thuật", phóng ×PIXEL. */
export const DAMAGE_NUMBER_FONT_PIXEL = 2;
