/**
 * Không khí Grim Dark: chu kỳ ngày/đêm, ambient, vignette, sương mù, ánh sáng điểm, tint môi trường.
 * Giá trị về ambient/vignette/ánh sáng/tint (Giai đoạn 2) đã được duyệt làm giá trị khởi đầu
 * (xem docs/assets/COLOR_PALETTE.md); chu kỳ ngày/đêm, đêm tối và sương là giá trị thử nghiệm
 * của AI (Giai đoạn 3), chỉnh sau khi người dùng xem. Không chứa số liệu sát thương/gameplay.
 *
 * Thử nhanh không cần sửa code (thêm vào URL):
 *   ?atmo=off        tắt toàn bộ (so sánh trước/sau)
 *   ?time=day        luôn ban ngày;  ?time=night  luôn ban đêm;  mặc định chạy chu kỳ tự động
 *   ?ambient=0.5     ghi đè độ đậm ambient BAN ĐÊM (0–0.8)
 *   ?vignette=0.6    ghi đè độ đậm vignette (0–1)
 *   ?fog=off         tắt lớp sương/bóng tối ban đêm;  ?fog=1.5  nhân độ đậm sương
 */

/** Bật/tắt toàn bộ lớp không khí (false = hành vi như trước Giai đoạn 2). */
export const ATMOSPHERE_ENABLED = true;

/**
 * Chu kỳ ngày/đêm: ngày → hoàng hôn (chuyển) → đêm → bình minh (chuyển) → lặp lại.
 * Màn chơi bắt đầu vào ban ngày. Thời gian tính theo đồng hồ của scene.
 */
export const DAY_NIGHT = {
  dayMs: 150_000,
  nightMs: 90_000,
  /** Thời gian chuyển ngày↔đêm (mỗi chiều). */
  transitionMs: 20_000,
  /** Khi đổi chế độ bằng tay (nút/phím N), hệ số đêm chuyển mượt trong chừng này giây thay vì nhảy tức thì. */
  manualEaseSeconds: 1.5,
} as const;

export const AMBIENT = {
  /** Màu phủ (nhân MULTIPLY): xanh lạnh tối. */
  color: 0x20283a,
  /** Ban ngày: không phủ gì, sáng bình thường. */
  dayAlpha: 0,
  /** Ban đêm: độ đậm ambient. */
  nightAlpha: 0.45,
} as const;

/** Đêm tối: bóng tối + sương phủ kín, chỉ nhìn rõ quanh người và quanh ngọn lửa. */
export const NIGHT = {
  /** Lớp tối phủ toàn màn (NORMAL blend). */
  darknessColor: 0x04060d,
  darknessAlpha: 0.72,
  /** Bán kính tầm nhìn quanh người chơi (px); giữa trong suốt hoàn toàn, rìa mờ dần vào bóng tối/sương. */
  visionRadius: 238,
  /** Ban ngày vignette chỉ còn bấy nhiêu phần so với ban đêm. */
  dayVignetteScale: 0.35,
  /** Ban ngày ánh sáng ấm của lửa/đèn chỉ còn bấy nhiêu phần (ánh sáng ngày lấn át). */
  dayLightScale: 0.1,
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
  /** Lớp bóng tối + sương ban đêm: trên ambient, dưới ánh sáng điểm để đèn/lửa xuyên qua. */
  fog: 2701,
  /** Ánh sáng điểm nằm TRÊN ambient/sương để xuyên qua lớp tối, nhưng dưới vignette. */
  light: 2702,
  vignette: 2705,
} as const;

/** Key texture vignette / ánh sáng / sương sinh runtime. */
export const VIGNETTE_TEXTURE_KEY = 'atmosphere-vignette';
export const LIGHT_TEXTURE_KEY = 'atmosphere-light';
export const FOG_TEXTURE_KEY = 'atmosphere-fog';

// ─────────────────────────────────────────────────────────────────────────────
// SƯƠNG MÙ BAN ĐÊM. Giá trị thử nghiệm của AI, chưa duyệt chính thức.
// ─────────────────────────────────────────────────────────────────────────────

export const FOG = {
  /** Màu sương (NORMAL blend): xám xanh tối để sương hiện ra trên nền đêm mà không làm sáng lên. */
  color: 0x303c48,
  /** Cạnh texture mây lặp liền mạch (px). */
  textureSize: 256,
  /** Số "ô lưới" nhiễu của từng octave (lũy thừa 2 để lặp liền mạch). */
  octaves: [4, 8, 16],
  /**
   * Ngưỡng và dải làm mờ khi biến nhiễu thành mây: ngưỡng thấp + dải hẹp = sương phủ rộng và đặc hơn.
   * (0.4 / 0.35 phủ ~43% diện tích; 0.3 / 0.3 phủ ~75%; 0.26 / 0.28 phủ ~88%, vùng đặc ~41%.)
   */
  cloudStart: 0.26,
  cloudSpan: 0.28,
  /**
   * Các lớp sương (từ dưới lên), áp dụng khi đã là đêm hẳn. speed: px/giây trôi tự nhiên;
   * parallax: tỉ lệ bám theo camera (1 = dính với mặt đất); tileScale: phóng to mây.
   */
  layers: [
    { alpha: 0.55, speedX: 7, speedY: 2, parallax: 0.85, tileScale: 2 },
    { alpha: 0.4, speedX: -5, speedY: 3, parallax: 1.0, tileScale: 3 },
  ],
  /** Thiết bị cảm ứng: chỉ dùng lớp đầu để nhẹ hơn. */
  touchLayers: 1,
  /** Số lỗ xóa tối đa vẽ cùng lúc (người chơi + nguồn sáng trong màn hình). */
  maxClearings: 12,
  /** Key texture lỗ xóa (gradient tròn: trong suốt hoàn toàn ở giữa, mờ dần ra rìa). */
  clearTextureKey: 'atmosphere-fog-clear',
} as const;

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
 * fogClearRadius: bán kính vùng bóng tối/sương bị xua tan quanh nguồn sáng ban đêm (px).
 */
export const LIGHT_SOURCES: Readonly<
  Record<
    string,
    { offsetY: number; radius: number; alpha: number; fogClearRadius: number }
  >
> = {
  campfire: { offsetY: -18, radius: 190, alpha: 0.5, fogClearRadius: 260 },
  lamppost: { offsetY: -56, radius: 150, alpha: 0.38, fogClearRadius: 180 },
  /** Lò rèn: nguồn sáng mạnh nhất trong các công trình (lửa lò). */
  blacksmith: { offsetY: -40, radius: 130, alpha: 0.55, fogClearRadius: 170 },
  /** Quán: ánh đèn ấm qua cửa sổ. */
  tavern: { offsetY: -34, radius: 120, alpha: 0.4, fogClearRadius: 150 },
  /** Nhà thờ: ánh nến yếu, dịu. */
  church: { offsetY: -30, radius: 90, alpha: 0.25, fogClearRadius: 110 },
};

/**
 * Viền khu làng an toàn + biển tên (đồng trầm, không neon).
 * fillColor/strokeColor: mã màu 0xRRGGBB; fillAlpha/strokeAlpha/textAlpha: 0..1;
 * strokeWidth: px; textColor: chuỗi CSS '#rrggbb'.
 */
export const VILLAGE_MARKER = {
  fillColor: 0xb89a5a,
  fillAlpha: 0.03,
  strokeWidth: 3,
  strokeAlpha: 0.28,
  textColor: '#c2a463',
  textAlpha: 0.8,
} as const;

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
  /** Công trình (ngói đỏ, tường sáng): hạ độ sáng, ngả nâu đất/xám đá. Giá trị khởi điểm, tinh chỉnh khi xem game. */
  building: 0xb4a898,
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
  tavern: ENVIRONMENT_TINT.building,
  shop: ENVIRONMENT_TINT.building,
  blacksmith: ENVIRONMENT_TINT.building,
  church: ENVIRONMENT_TINT.building,
  stable: ENVIRONMENT_TINT.building,
  windmill: ENVIRONMENT_TINT.building,
  cottageA: ENVIRONMENT_TINT.building,
  cottageB: ENVIRONMENT_TINT.building,
  well: ENVIRONMENT_TINT.building,
};
