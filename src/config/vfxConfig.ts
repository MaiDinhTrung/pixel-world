/** Số liệu hệ thống VFX (giới hạn, chất lượng, độ sâu hiển thị). */

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
