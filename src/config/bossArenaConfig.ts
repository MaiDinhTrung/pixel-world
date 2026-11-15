import { NPC_INTERACT_RADIUS } from './economyConfig';
import { NEON } from './palette';

/**
 * Đấu Trường Boss (`scenes/BossArenaScene.ts`): cổng dịch chuyển, kích thước, bố cục, ánh sáng,
 * quái con. Số liệu của chính Boss (`BOSS_*`) vẫn ở `combatConfig.ts`, không lặp ở đây.
 * Tất cả là giá trị khởi điểm, chỉnh sau khi chơi thử.
 */

// ── Cổng dịch chuyển ────────────────────────────────────────────────────────

/** Chống bấm lặp: sau khi vừa qua cổng, chờ chừng này mới dùng được cổng (ms). */
export const BOSS_ARENA_PORTAL_COOLDOWN_MS = 1500;
/** Thời gian "sạc" khi nhấn F cạnh cổng, trước khi dịch chuyển (ms). */
export const BOSS_ARENA_PORTAL_CHARGE_MS = 800;
/** Từ lúc vào Arena (khi Boss đã chờ sẵn) đến lúc Boss xuất hiện (ms). */
export const BOSS_ARENA_ENTRY_SPAWN_DELAY_MS = 2500;
/** Đứng trong bán kính này (px) mới tương tác được với cổng. */
export const BOSS_ARENA_PORTAL_INTERACT_RADIUS = NPC_INTERACT_RADIUS;
/** Vùng sạch quanh cổng về (px): Boss/quái không bước vào và không sinh trong đó. */
export const BOSS_ARENA_PORTAL_SAFE_RADIUS = 160;
/** Thời gian mờ màn hình khi qua cổng (ms, < 1 giây). */
export const BOSS_ARENA_PORTAL_FADE_MS = 450;
/** Bất tử thêm (ms) ngoài thời gian mờ màn hình khi đang qua cổng (đủ che khoảng chuyển scene). */
export const BOSS_ARENA_PORTAL_EXTRA_INVULNERABLE_MS = 1000;
/** Chống spam toast "cổng khóa": khoảng tối thiểu giữa hai toast (ms). */
export const BOSS_ARENA_PORTAL_TOAST_COOLDOWN_MS = 1200;
/** Tốc độ (px/giây) đẩy quái ra khỏi vùng sạch của cổng về. */
export const BOSS_ARENA_PORTAL_REPEL_SPEED = 220;
/** Màu mờ màn hình: vào Arena ngả đỏ, về làng ngả xanh ngọc (RGB 0..255). */
export const BOSS_ARENA_FADE_TO_ARENA = { r: 120, g: 8, b: 24 } as const;
export const BOSS_ARENA_FADE_TO_WORLD = { r: 10, g: 90, b: 70 } as const;

/** Cổng vào (đỏ) ngoài làng, ngay phía Bắc cổng thành Bắc, trên trục đường lát đá x = 1920. */
export const BOSS_ARENA_ENTRANCE = { x: 1920, y: 700 } as const;
/** Hai trụ đèn làm khung cổng vào: lệch ngang so với tâm cổng (px). */
export const BOSS_ARENA_ENTRANCE_POST_OFFSET = 78;
export const BOSS_ARENA_ENTRANCE_LABEL = 'Đấu Trường Boss';
export const BOSS_ARENA_RETURN_LABEL = 'Về Làng';

/** Màu cổng. */
export const BOSS_ARENA_ENTRY_COLOR = NEON.boss;
export const BOSS_ARENA_RETURN_COLOR = 0x2fd9b0;
export const BOSS_ARENA_ENTRY_COLOR_CSS = '#ff8fa3';
export const BOSS_ARENA_RETURN_COLOR_CSS = '#4dffa6';

/** Hình cổng vẽ procedural. */
export const PORTAL_PEDESTAL_SIZE = 96;
export const PORTAL_VORTEX_SIZE = 64;
export const PORTAL_VORTEX_FRAMES = 8;
export const PORTAL_VORTEX_FPS = 10;
/** Số hạt bay quanh cổng (máy cảm ứng dùng số nhỏ hơn). */
export const PORTAL_PARTICLES = 10;
export const PORTAL_PARTICLES_TOUCH = 4;

// ── Kích thước và bố cục Arena (toạ độ cục bộ, gốc ở góc trên-trái) ──────────

export const BOSS_ARENA_TILES_X = 50;
export const BOSS_ARENA_TILES_Y = 34;
export const BOSS_ARENA_TILE = 32;
export const BOSS_ARENA_WIDTH = BOSS_ARENA_TILES_X * BOSS_ARENA_TILE; // 1600
export const BOSS_ARENA_HEIGHT = BOSS_ARENA_TILES_Y * BOSS_ARENA_TILE; // 1088
/** Độ dày tường biên (px) và độ vát mỗi góc (px, dạng bậc thang). */
export const BOSS_ARENA_WALL_THICKNESS = 64;
export const BOSS_ARENA_CORNER_CUT = 320;
export const BOSS_ARENA_STEP = 64;
/** Chiều cao thân tường vẽ nhô lên (px). */
export const BOSS_ARENA_WALL_RISE = 84;

export const BOSS_ARENA_CENTER = {
  x: BOSS_ARENA_WIDTH / 2,
  y: BOSS_ARENA_HEIGHT / 2,
} as const;
/** Boss xuất hiện ở tâm. */
export const BOSS_ARENA_BOSS_SPAWN = { ...BOSS_ARENA_CENTER } as const;
/** Cổng về ở rìa Nam; người chơi sinh ngay phía Bắc cổng (trong vùng sạch). */
export const BOSS_ARENA_RETURN_PORTAL = { x: BOSS_ARENA_WIDTH / 2, y: 970 } as const;
export const BOSS_ARENA_PLAYER_SPAWN = { x: BOSS_ARENA_WIDTH / 2, y: 900 } as const;

/** Cột đá: 4 cột đối xứng qua tâm, cách tâm theo đường chéo (px) và kích thước chân cột (px). */
export const BOSS_ARENA_PILLAR_DIAGONAL_DISTANCE = 380;
export const BOSS_ARENA_PILLAR_SIZE = 64;
export const BOSS_ARENA_PILLAR_RISE = 96;

/** Brazier (lửa trại) quanh Arena, mỗi cái kèm đèn điểm. */
export const BOSS_ARENA_BRAZIERS: readonly { x: number; y: number }[] = [
  { x: 200, y: 360 },
  { x: 1400, y: 360 },
  { x: 200, y: 740 },
  { x: 1400, y: 740 },
  { x: 800, y: 150 },
  { x: 560, y: 960 },
  { x: 1040, y: 960 },
  { x: 800, y: 330 },
];

/** Sàn gạch hai tông (đậm → nhạt) và vữa. */
export const BOSS_ARENA_FLOOR_DARK = 0x1c1a24;
export const BOSS_ARENA_FLOOR_LIGHT = 0x262330;
export const BOSS_ARENA_FLOOR_MORTAR = 0x0e0d14;
/** Tint nhân cho gạch tường (gạch gốc xám xanh → xám tím tối). */
export const BOSS_ARENA_WALL_TINT = 0x6a6482;
/** Vòng ma pháp mờ ở tâm sàn. */
export const BOSS_ARENA_RUNE_COLOR = 0x8a3a5a;
export const BOSS_ARENA_RUNE_ALPHA = 0.22;
export const BOSS_ARENA_RUNE_RADIUS = 210;

// ── Ánh sáng cố định (không theo ngày/đêm) ───────────────────────────────────

export const BOSS_ARENA_AMBIENT_COLOR = 0x241e34;
export const BOSS_ARENA_AMBIENT_ALPHA = 0.5;
export const BOSS_ARENA_VIGNETTE_STRENGTH = 0.55;
export const BOSS_ARENA_VIGNETTE_CLEAR_RADIUS = 0.5;
/** Đèn brazier: bán kính vầng sáng (px) và độ mạnh tâm. */
export const BOSS_ARENA_LIGHT_RADIUS = 200;
export const BOSS_ARENA_LIGHT_ALPHA = 0.5;
/** Sương mỏng: số mảng (cảm ứng dùng ít hơn), màu, độ đậm, bán kính, tốc độ trôi (px/s). */
export const BOSS_ARENA_FOG_PATCHES = 6;
export const BOSS_ARENA_FOG_PATCHES_TOUCH = 3;
export const BOSS_ARENA_FOG_COLOR = 0x6a5f86;
export const BOSS_ARENA_FOG_ALPHA = 0.1;
export const BOSS_ARENA_FOG_RADIUS = 340;
export const BOSS_ARENA_FOG_SPEED = 9;

// ── Quái con (chỉ sinh sau khi Boss bị hạ) ──────────────────────────────────

/** Trần số quái con sống cùng lúc ở Arena (trần theo tier vẫn dùng THREAT_ALIVE_BONUS/ENEMY_MAX_ALIVE). */
export const BOSS_ARENA_MINION_MAX_ALIVE = 10;
/** Điểm sinh quái con (cách vùng sạch cổng về > BOSS_ARENA_PORTAL_SAFE_RADIUS + jitter 48). */
export const BOSS_ARENA_MINION_SPAWNS: readonly { x: number; y: number }[] = [
  { x: 260, y: 300 },
  { x: 1340, y: 300 },
  { x: 260, y: 760 },
  { x: 1340, y: 760 },
  { x: 800, y: 220 },
  { x: 400, y: 540 },
  { x: 1200, y: 540 },
];
