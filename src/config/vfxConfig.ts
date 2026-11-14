/** Số liệu hệ thống VFX (giới hạn, chất lượng, độ sâu hiển thị). */

import { ATMOSPHERE_DEPTH } from './atmosphereConfig';

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
