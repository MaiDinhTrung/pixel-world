/** Số liệu hệ thống VFX (giới hạn, chất lượng, độ sâu hiển thị). */

import { ATMOSPHERE_DEPTH } from './atmosphereConfig';
import { ELEMENT_PALETTE } from './damageTypeConfig';

/** Số sprite VFX đang hoạt động tối đa. */
export const VFX_MAX_SPRITES = 80;
/** Số particle sống đồng thời tối đa (mỗi emitter). */
export const VFX_MAX_PARTICLES = 250;
/** Thiết bị cảm ứng: nhân số lượng particle với hệ số này. */
export const VFX_TOUCH_PARTICLE_SCALE = 0.6;

/** Thứ tự vẽ (depth): số lớn hơn nằm đè lên trên. */
export const VFX_DEPTH = {
  /** Hiệu ứng trên mặt đất, nằm dưới nhân vật. */
  ground: 4,
  /** Hiệu ứng thường (vệt chém, vòng sóng). */
  normal: 3000,
  /** Hiệu ứng trúng đòn, nằm trên cùng. */
  top: 3010,
} as const;

/** Hình ảnh của Búa (đòn thường + CHẤN ĐỊA KÍCH). Chỉ ảnh hưởng hiển thị; giá trị khởi điểm, chỉnh theo mắt. */
export const HAMMER_VFX_COLOR_CORE = ELEMENT_PALETTE.physical.core; // màu lõi sáng (vòng sẵn sàng, glow, ring nhỏ)
export const HAMMER_VFX_COLOR_BODY = ELEMENT_PALETTE.physical.body; // màu thân (vệt phụ, ring lớn, tia lửa tích lực)
export const HAMMER_VFX_COLOR_ROCK = ELEMENT_PALETTE.physical.edge; // màu đá vụn tối
export const HAMMER_VFX_RAISE_SHAKE_PX = 1; // biên độ rung búa khi giữ tích lực, tăng tuyến tính 0 tới giá trị này (px)
export const HAMMER_VFX_READY_SHAKE_PX = 1.5; // biên độ rung búa khi đã sẵn sàng (px)
export const HAMMER_VFX_RING_RADIUS = 30; // bán kính vòng tiến độ quanh người (px)
export const HAMMER_VFX_RING_BREATH_MS = 500; // chu kỳ "thở" độ dày vòng khi sẵn sàng (ms)
export const HAMMER_VFX_RING_WIDTH_CHARGING = 2; // nét cung tiến độ khi chưa đủ lực (px)
export const HAMMER_VFX_RING_WIDTH_READY = 4; // nét vòng khép kín khi sẵn sàng, mức thấp nhất (px)
export const HAMMER_VFX_RING_BREATH_PX = 1.5; // độ dày thêm/bớt khi "thở" (px)
export const HAMMER_VFX_BLINK_MS = 80; // chu kỳ nhấp nháy tint búa khi sẵn sàng (ms)
export const HAMMER_VFX_PREVIEW_ALPHA_MIN = 0.06; // độ mờ vòng dự báo điểm đập lúc mới giữ
export const HAMMER_VFX_PREVIEW_ALPHA_READY = 0.3; // độ mờ vòng dự báo điểm đập khi sẵn sàng
export const HAMMER_VFX_READY_RING_RADIUS = 44; // bán kính ring.shock lúc vừa sẵn sàng (px)
export const HAMMER_VFX_READY_RING_MS = 260; // thời lượng ring.shock lúc vừa sẵn sàng (ms)
export const HAMMER_VFX_READY_GLOW_SCALE = 1.4; // scale glow.flash lúc vừa sẵn sàng
export const HAMMER_VFX_TRAIL_RADIUS = 34; // bán kính vệt chính (px)
export const HAMMER_VFX_TRAIL_SPAN = 0.9; // độ dài vệt chính (rad)
export const HAMMER_VFX_TRAIL_EXTRA_RADII: readonly number[] = [34, 28]; // bán kính các vệt phụ mờ hơn của đòn tích lực (px)
export const HAMMER_VFX_TRAIL_EXTRA_ALPHAS: readonly number[] = [0.3, 0.18]; // độ mờ các vệt phụ tương ứng
export const HAMMER_VFX_TRAIL_EXTRA_SPAN_FACTORS: readonly number[] = [1.35, 1.8]; // vệt phụ dài hơn vệt chính theo hệ số này
export const HAMMER_VFX_CRACK_RADIUS = 32; // bán kính ground.crack đòn thường (px)
export const HAMMER_VFX_DUST_COUNT = 3; // số dust.puff đòn thường
export const HAMMER_VFX_DUST_JITTER_PX = 6; // lệch ngẫu nhiên dust.puff đòn thường (px)
export const HAMMER_VFX_SPARKS = 6; // số tia lửa đòn thường
export const HAMMER_VFX_SPARKS_SPEED = 90; // tốc độ tia lửa đòn thường
export const HAMMER_VFX_ROCKS = 4; // số hạt đá vụn đòn thường
export const HAMMER_VFX_ROCKS_SPEED = 70; // tốc độ đá vụn đòn thường
export const HAMMER_VFX_HIT_RING_MS = 200; // thời lượng ring.shock khi đòn thường trúng (ms)
export const HAMMER_VFX_SHAKE_HIT = { ms: 70, intensity: 0.003 } as const; // rung camera đòn thường trúng
export const HAMMER_VFX_SHAKE_MISS = { ms: 40, intensity: 0.0015 } as const; // rung camera đòn thường trượt
export const HAMMER_VFX_CHARGED_CRACK_MIN = 2; // số ground.crack tối thiểu của đòn tích lực
export const HAMMER_VFX_CHARGED_CRACK_MAX = 4; // số ground.crack tối đa của đòn tích lực
export const HAMMER_VFX_CHARGED_CRACK_RADIUS = 56; // bán kính mỗi ground.crack đòn tích lực (px)
export const HAMMER_VFX_CHARGED_RING_OUTER = { radius: 58, ms: 260 } as const; // ring.shock lớn của đòn tích lực
export const HAMMER_VFX_CHARGED_RING_INNER = { radius: 36, ms: 180 } as const; // ring.shock nhỏ của đòn tích lực
export const HAMMER_VFX_CHARGED_DUST_MIN = 5; // số dust.puff tối thiểu của đòn tích lực
export const HAMMER_VFX_CHARGED_DUST_MAX = 6; // số dust.puff tối đa của đòn tích lực
export const HAMMER_VFX_CHARGED_DUST_JITTER_PX = 12; // lệch dust.puff quanh điểm đập đòn tích lực (px)
export const HAMMER_VFX_CHARGED_SPARKS = 14; // số tia lửa đòn tích lực
export const HAMMER_VFX_CHARGED_SPARKS_SPEED = 160; // tốc độ tia lửa đòn tích lực
export const HAMMER_VFX_CHARGED_ROCKS = 10; // số đá vụn đòn tích lực
export const HAMMER_VFX_CHARGED_ROCKS_SPEED = 110; // tốc độ đá vụn đòn tích lực
export const HAMMER_VFX_CHARGED_GLOW = { scale: 1.2, alpha: 0.8, ms: 140 } as const; // glow.flash tại điểm đập đòn tích lực
export const HAMMER_VFX_SHAKE_CHARGED = { ms: 160, intensity: 0.0075 } as const; // rung camera đòn tích lực

/** Kích thước một khung của spritesheet vệt chém. */
export const VFX_SLASH_FRAME = 96;
/** Bán kính cung chém (px trong texture) — dùng để quy đổi scale từ tầm đánh. */
export const VFX_SLASH_RADIUS = 40;
/** Số khung hình của animation vệt chém. */
export const VFX_SLASH_FRAMES = 6;
/** Bán kính vòng sóng trong texture `vfx-ring` (px). */
export const VFX_RING_RADIUS = 56;

/**
 * Độ trong suốt ban đầu của quầng sáng báo trước khi quái bắn xa nạp đạn.
 * Thấp hơn mặc định 0.9 của glow.flash để không chói trên nền đã được ambient làm tối;
 * vòng sóng (ring) vẫn là tín hiệu cảnh báo chính. Giá trị thử, chỉnh theo mắt.
 */
export const ENEMY_TELEGRAPH_GLOW_ALPHA = 0.4;

/**
 * Hình ảnh viên đạn quái khi bay (chỉ ảnh hưởng hiển thị).
 * length/width: kích thước texture (px, phải là bội của 2 để khớp lưới pixel 2×2); đạn được xoay theo hướng bay.
 * hitbox: cạnh vùng va chạm vuông đặt ở tâm — giữ 10 như đạn cũ (texture cũ 10×10) nên KHÔNG đổi gameplay.
 */
export const ENEMY_BULLET_VISUAL = {
  length: 44,
  width: 20,
  hitbox: 10,
  /**
   * Thứ tự vẽ. Đặt trên lớp ambient (2700) để đạn không bị làm tối, sáng rực như nguồn sáng.
   * Muốn về như cũ (nằm dưới nhân vật/prop, bị ambient làm tối) đặt lại 9.
   */
  depth: ATMOSPHERE_DEPTH.light,
} as const;
