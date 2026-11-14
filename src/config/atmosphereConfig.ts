/**
 * Không khí Grim Dark (Giai đoạn 2): ambient tối lạnh, vignette, ánh sáng điểm, tint môi trường.
 * Các giá trị ở đây đã được duyệt làm giá trị khởi đầu (xem docs/assets/COLOR_PALETTE.md);
 * chỉ chỉnh sau khi kiểm tra khả năng nhìn rõ nhân vật, quái, địa hình và gameplay, và phải
 * qua phê duyệt. Không chứa số liệu sát thương/gameplay.
 *
 * Thử nhanh không cần sửa code (thêm vào URL):
 *   ?atmo=off        tắt toàn bộ (so sánh trước/sau)
 *   ?ambient=0.35    ghi đè độ đậm ambient (0–0.8)
 *   ?vignette=0.6    ghi đè độ đậm vignette (0–1)
 */

/** Bật/tắt toàn bộ lớp không khí (false = hành vi như trước Giai đoạn 2). */
export const ATMOSPHERE_ENABLED = true;

export const AMBIENT = {
  /** Màu phủ (nhân MULTIPLY): xanh lạnh tối. */
  color: 0x20283a,
  /** Độ đậm khởi điểm 0.25. Chỉ tăng khi có căn cứ từ kiểm tra khả năng nhìn rõ. */
  alpha: 0.25,
} as const;

export const VIGNETTE = {
  /** Độ đen ở góc màn hình (0 = không có). */
  strength: 0.5,
  /** Phần bán kính còn hoàn toàn trong suốt ở giữa (0–1), giữ tâm thoáng để đọc gameplay. */
  clearRadius: 0.55,
} as const;

/**
 * Độ sâu (depth) của các lớp.
 * Thực thể/prop sắp theo y (tối đa khoảng WORLD_HEIGHT + 30 ≈ 2590), VFX ở 3000–3010,
 * HUD từ 5000, số sát thương 9500. Ambient nằm trên thực thể nhưng dưới VFX
 * để VFX và số sát thương không bị làm tối.
 */
export const ATMOSPHERE_DEPTH = {
  ambient: 2700,
  /** Ánh sáng điểm nằm TRÊN ambient để xuyên qua lớp tối, nhưng dưới vignette. */
  light: 2702,
  vignette: 2705,
} as const;

/** Key texture vignette / ánh sáng sinh runtime. */
export const VIGNETTE_TEXTURE_KEY = 'atmosphere-vignette';
export const LIGHT_TEXTURE_KEY = 'atmosphere-light';

// ─────────────────────────────────────────────────────────────────────────────
// 2b — ÁNH SÁNG ĐIỂM (ấm).
// ─────────────────────────────────────────────────────────────────────────────

export const POINT_LIGHT = {
  /** Màu ánh sáng ấm (blend ADD). */
  color: 0xff9a30,
  /** Nhấp nháy: biên độ scale/alpha (tỉ lệ) và khoảng thời gian một nhịp (ms). */
  flickerScale: 0.06,
  flickerAlpha: 0.14,
  flickerMinMs: 380,
  flickerMaxMs: 620,
} as const;

/**
 * Nguồn sáng theo loại asset làng (khóa = khóa trong `VILLAGE`).
 * offsetY: lệch dọc so với điểm đặt prop (âm = lên trên, về phía ngọn lửa/đèn).
 * radius: bán kính vầng sáng (px). alpha: độ mạnh tại tâm.
 */
export const LIGHT_SOURCES: Readonly<
  Record<string, { offsetY: number; radius: number; alpha: number }>
> = {
  campfire: { offsetY: -18, radius: 190, alpha: 0.5 },
  lamppost: { offsetY: -56, radius: 150, alpha: 0.38 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2c — TINT MÔI TRƯỜNG (runtime, nhân màu; KHÔNG sửa PNG).
// ─────────────────────────────────────────────────────────────────────────────

/** Lớp "rửa" màu xám-rêu phủ lên nền cỏ (NORMAL blend) để giảm độ bão hòa; tint nhân không làm được. */
export const GROUND_WASH = { color: 0x3c4636, alpha: 0.38, depth: 0.5 } as const;

export const ENVIRONMENT_TINT = {
  /** Nước: nhân về xám xanh tù. */
  water: 0x90a89c,
  /** Cây, bụi, cây trồng, bồn hoa: kéo bớt kênh xanh lá để giảm bão hòa, ngả rêu ô-liu (tint nhân không desaturate được nếu giảm đều 3 kênh). */
  foliage: 0xd0a0c0,
  /** Cờ: giảm độ rực đỏ/vàng. */
  flag: 0xa89880,
  /** Sạp chợ (mái sọc đỏ trắng): giảm độ vui mắt, giữ asset hiện tại. */
  market: 0xb8a898,
} as const;

/** Khóa asset (trong `VILLAGE`) → màu tint nhân. */
export const TINT_BY_ASSET: Readonly<Record<string, number>> = {
  water: ENVIRONMENT_TINT.water,
  oak: ENVIRONMENT_TINT.foliage,
  bush: ENVIRONMENT_TINT.foliage,
  hedge: ENVIRONMENT_TINT.foliage,
  crop: ENVIRONMENT_TINT.foliage,
  flower: ENVIRONMENT_TINT.foliage,
  flag: ENVIRONMENT_TINT.flag,
  market: ENVIRONMENT_TINT.market,
};
