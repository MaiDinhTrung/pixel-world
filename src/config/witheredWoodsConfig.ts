/**
 * Region "Rừng Úa" — Map "Rừng Sâu" (P4b, `map.withered_woods`, dựng bởi `world/witheredWoods.ts`, chạy trong `WorldScene`):
 * kích thước, vùng Bìa Rừng / Lõi Rừng, điểm sinh quái, bố cục cây/vật thể, ánh sáng hoàng hôn cố định, cổng nối map chính.
 * MỌI SỐ Ở ĐÂY LÀ GIÁ TRỊ KHỞI ĐIỂM, chỉnh sau khi chơi thử. Chỉ dùng hình ảnh có sẵn của làng (`VILLAGE.*`), không asset mới.
 * Không import worldConfig (tránh vòng phụ thuộc): worldConfig đọc các hằng ở đây.
 */
import {
  BOSS_ARENA_PORTAL_CHARGE_MS,
  BOSS_ARENA_RETURN_COLOR,
  BOSS_ARENA_RETURN_COLOR_CSS,
} from './bossArenaConfig';
import { MAX_THREAT_TIER } from './combatConfig';

// ── Kích thước, điểm xuất hiện, cổng về ─────────────────────────────────────

export const WOODS_WIDTH = 2560;
export const WOODS_HEIGHT = 1920;

/** Điểm xuất hiện mặc định (phía Nam, giữa map, trên lối đất); lệch ≥ 120 px khỏi cổng về để không chạm lại ngay. */
export const WOODS_PLAYER_SPAWN = { x: 1280, y: 1680 } as const;
/** Cổng về Hoang Địa (sát mép Nam, ngay dưới điểm xuất hiện). */
export const WOODS_RETURN_PORTAL = { x: 1280, y: 1820 } as const;

// ── Vùng ────────────────────────────────────────────────────────────────────

/** Bìa Rừng = nửa Nam (biên tính cả cạnh). Lõi Rừng là "phần còn lại" (bounds null). */
export const WOODS_EDGE_BOUNDS = { x: 0, y: 960, width: 2560, height: 960 } as const;

/** Bìa Rừng: bậc = clamp(bậc thời gian + offset, floor, MAX_THREAT_TIER) → bậc khởi điểm 1. */
export const WOODS_EDGE_TIER_OFFSET = 1;
export const WOODS_EDGE_TIER_FLOOR = 1;
/** Lõi Rừng: bậc khởi điểm 3, luôn ≥ Bìa Rừng. */
export const WOODS_DEEP_TIER_OFFSET = 3;
export const WOODS_DEEP_TIER_FLOOR = 3;
/** Trần bậc dùng trần chung (không nâng trần). */
export const WOODS_TIER_CAP = MAX_THREAT_TIER;

/** Mẫu sinh quái (archetype có sẵn ở `enemyConfig.ts`). */
export const WOODS_EDGE_SPAWN_PATTERN = ['grunt', 'swarmer', 'caster', 'grunt'] as const;
export const WOODS_DEEP_SPAWN_PATTERN = ['caster', 'swarmer', 'brute', 'caster', 'swarmer'] as const;
/** Elite nền (luật hiện có: phải cận chiến). */
export const WOODS_EDGE_ELITE_SLOTS = ['grunt'] as const;
export const WOODS_DEEP_ELITE_SLOTS = ['brute'] as const;

/**
 * Điểm sinh quái: 4 ở Bìa Rừng (y ≥ 960) rồi 4 ở Lõi Rừng; mọi điểm cách điểm xuất hiện và cổng về ≥ 350 px
 * (test witheredWoods.test.ts khóa). Không đặt cây trong bán kính ~110 px quanh các điểm này.
 */
export const WOODS_ENEMY_SPAWNS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 420, y: 1520 },
  { x: 2140, y: 1520 },
  { x: 600, y: 1100 },
  { x: 1960, y: 1100 },
  { x: 400, y: 440 },
  { x: 2180, y: 720 },
  { x: 1280, y: 240 },
  { x: 820, y: 720 },
];

// ── Bố cục (asset làng có sẵn) ──────────────────────────────────────────────

/** Lối đất chính từ cổng về (Nam) lên tận Lõi Rừng (Bắc) + hai nhánh ngang; cây không đặt trên các dải này. */
export const WOODS_PATHS: readonly { x: number; y: number; width: number; height: number }[] = [
  { x: 1248, y: 160, width: 64, height: 1760 },
  { x: 560, y: 1296, width: 1440, height: 48 },
  { x: 480, y: 560, width: 1600, height: 48 },
];

/** Hồ nước (có vật cản) ở Lõi Rừng. */
export const WOODS_POND = { x: 1650, y: 180, width: 448, height: 256 } as const;

/** Cây sồi (có vật cản như làng). Bìa Rừng thưa hơn, Lõi Rừng dày hơn; chừa lối đi và quanh điểm sinh. */
export const WOODS_TREE_POSITIONS: readonly { readonly x: number; readonly y: number }[] = [
  // Bìa Rừng (20)
  { x: 160, y: 1880 }, { x: 520, y: 1880 }, { x: 880, y: 1880 }, { x: 1680, y: 1880 }, { x: 2040, y: 1880 }, { x: 2400, y: 1880 },
  { x: 300, y: 1660 }, { x: 700, y: 1660 }, { x: 1000, y: 1660 }, { x: 1600, y: 1660 }, { x: 1860, y: 1660 }, { x: 2300, y: 1660 },
  { x: 160, y: 1440 }, { x: 900, y: 1460 }, { x: 1560, y: 1460 }, { x: 2420, y: 1440 },
  { x: 300, y: 1180 }, { x: 1000, y: 1180 }, { x: 1600, y: 1180 }, { x: 2280, y: 1180 },
  // Lõi Rừng (27)
  { x: 160, y: 920 }, { x: 560, y: 920 }, { x: 1000, y: 920 }, { x: 1560, y: 920 }, { x: 1900, y: 920 }, { x: 2420, y: 920 },
  { x: 300, y: 760 }, { x: 1060, y: 780 }, { x: 1500, y: 760 }, { x: 1800, y: 780 }, { x: 2440, y: 760 },
  { x: 160, y: 500 }, { x: 680, y: 480 }, { x: 1000, y: 480 }, { x: 1560, y: 500 }, { x: 1880, y: 500 }, { x: 2340, y: 500 },
  { x: 200, y: 320 }, { x: 760, y: 360 }, { x: 1020, y: 320 }, { x: 1500, y: 340 }, { x: 2300, y: 340 },
  { x: 160, y: 140 }, { x: 560, y: 160 }, { x: 960, y: 140 }, { x: 1560, y: 140 }, { x: 2400, y: 160 },
];

/**
 * Vật trang trí thuần hình ảnh (không vật cản): bụi ven lối, hedge đánh dấu ranh giới hai vùng.
 * Không dùng `fence`/`cart` (đang tạm ẩn ở làng theo yêu cầu).
 */
export const WOODS_DECOR: readonly { readonly asset: 'bush' | 'hedge'; readonly x: number; readonly y: number; readonly angle?: number }[] = [
  // Bụi hai bên lối đất chính.
  { asset: 'bush', x: 1200, y: 1520 }, { asset: 'bush', x: 1364, y: 1440 },
  { asset: 'bush', x: 1196, y: 1120 }, { asset: 'bush', x: 1366, y: 1040 },
  { asset: 'bush', x: 1200, y: 760 }, { asset: 'bush', x: 1364, y: 680 },
  { asset: 'bush', x: 1196, y: 420 }, { asset: 'bush', x: 1366, y: 360 },
  // Bụi rải rác.
  { asset: 'bush', x: 760, y: 1560 }, { asset: 'bush', x: 1780, y: 1560 },
  { asset: 'bush', x: 440, y: 1240 }, { asset: 'bush', x: 2160, y: 1240 },
  { asset: 'bush', x: 440, y: 640 }, { asset: 'bush', x: 2100, y: 900 },
  { asset: 'bush', x: 860, y: 240 }, { asset: 'bush', x: 2220, y: 260 },
  // Hedge um tùm dọc ranh Bìa/Lõi (y ≈ 960), chừa khe ở lối chính.
  { asset: 'hedge', x: 360, y: 980 }, { asset: 'hedge', x: 424, y: 978, angle: 3 },
  { asset: 'hedge', x: 760, y: 980 }, { asset: 'hedge', x: 824, y: 982 },
  { asset: 'hedge', x: 1760, y: 980 }, { asset: 'hedge', x: 1824, y: 978, angle: -3 },
  { asset: 'hedge', x: 2160, y: 980 }, { asset: 'hedge', x: 2224, y: 982 },
];

/** Tàn tích tường đá (dải phẳng `stoneWall` có sẵn, không vật cản) ở Lõi Rừng. */
export const WOODS_RUINS: readonly { x: number; y: number; width: number; height: number }[] = [
  { x: 1640, y: 172, width: 128, height: 16 },
  { x: 1980, y: 172, width: 128, height: 16 },
  { x: 1640, y: 436, width: 464, height: 16 },
];

// ── Ánh sáng cố định kiểu hoàng hôn ─────────────────────────────────────────

/** Lớp ambient MULTIPLY phủ màn hình (hoàng hôn xanh lục). */
export const WOODS_AMBIENT_COLOR = 0x2b3d2a;
export const WOODS_AMBIENT_ALPHA = 0.4;
/** Tint nhân cho nền cỏ có sẵn (cỏ úa, tối hơn làng). */
export const WOODS_GRASS_TINT = 0x9aa889;
/** Lớp phủ màu nền (đất/rêu tối) trên cỏ, dưới lối đi/nước. */
export const WOODS_GROUND_WASH_COLOR = 0x1f2a1c;
export const WOODS_GROUND_WASH_ALPHA = 0.5;
/** Vignette: CHỈ tái dùng texture vignette có sẵn của không khí làng (không sinh texture mới); không có thì bỏ qua. */
export const WOODS_VIGNETTE = { enabled: true, alpha: 0.9 } as const;

// ── Cổng nối map chính ──────────────────────────────────────────────────────

/**
 * Cổng vào Rừng ở map chính: cuối đường lát đá phía Đông (y 1248–1312), trong Hoang Địa Sâu (ngoài WILDS_NEAR_BOUNDS
 * 700..3100 × 700..2000); cách mọi ENEMY_SPAWNS của town.ts ≥ 300 px.
 */
export const WOODS_ENTRANCE = { x: 3600, y: 1280 } as const;
/** Điểm xuất hiện ở map chính khi về từ Rừng: trên đường lát đá, phía Tây cổng vào 140 px. */
export const WOODS_ARRIVAL_IN_LANDS = { x: 3460, y: 1280 } as const;
export const WOODS_PORTAL_CHARGE_MS = BOSS_ARENA_PORTAL_CHARGE_MS;
/** Màu cổng: dùng lại màu xanh có sẵn của cổng về (đỏ dành cho Boss; không màu mới → không key texture mới). */
export const WOODS_PORTAL_COLOR = BOSS_ARENA_RETURN_COLOR;
export const WOODS_PORTAL_COLOR_CSS = BOSS_ARENA_RETURN_COLOR_CSS;
/** Màu mờ màn hình khi qua cổng (RGB 0..255). */
export const WOODS_FADE_TO_WOODS = { r: 20, g: 48, b: 24 } as const;
export const WOODS_FADE_TO_LANDS = { r: 10, g: 90, b: 70 } as const;
export const WOODS_ENTRANCE_LABEL = 'Rừng Sâu';
export const WOODS_RETURN_LABEL = 'Về Hoang Địa';
export const WOODS_ENTER_PROMPT = 'VÀO RỪNG SÂU';
export const WOODS_RETURN_PROMPT = 'VỀ HOANG ĐỊA';
