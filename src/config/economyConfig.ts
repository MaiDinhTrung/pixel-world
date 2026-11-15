import type { WeaponRarity } from './weaponInfo';

/**
 * Kinh tế: vàng, tỉ lệ rơi, giá mua/bán, nâng cấp, đục lỗ, vùng làng và NPC.
 * Tỉ lệ rơi đang để CAO để demo; khi cân bằng thật chỉ cần giảm 2 hằng `*_DROP_CHANCE`.
 */

// ---- Rơi đồ từ quái ----
export const GOLD_DROP_CHANCE = 0.9; // xác suất quái thường rơi vàng (demo: cao)
export const GOLD_DROP_MIN = 2; // vàng tối thiểu mỗi lần rơi
export const GOLD_DROP_MAX = 6; // vàng tối đa mỗi lần rơi
export const GOLD_PER_THREAT_TIER = 1; // vàng cộng thêm mỗi bậc mối đe dọa
export const GEM_DROP_CHANCE = 0.4; // xác suất quái thường rơi ngọc (demo: cao)
export const BOSS_GOLD_BASE = 120; // vàng boss rơi (cộng thêm theo số thứ tự boss)
export const BOSS_GOLD_PER_NUMBER = 60;
export const BOSS_GEM_COUNT = 3; // số ngọc boss rơi
export const STARTING_GOLD = 500; // vàng khởi đầu cho save mới/save cũ (demo)

// ---- Nhặt đồ rơi ----
export const DROP_MAGNET_RADIUS = 110; // px: đồ rơi bị hút về người chơi
export const DROP_PICKUP_RADIUS = 22; // px: chạm là nhặt
export const DROP_MAGNET_SPEED = 360; // px/giây
export const DROP_LIFETIME_MS = 30000; // đồ rơi biến mất sau 30 giây
export const MAX_DROPS_ALIVE = 60; // trần số đồ rơi cùng lúc

// ---- Giá ----
export const WEAPON_BUY_PRICE: Record<WeaponRarity, number> = {
  common: 80,
  special: 260,
  legendary: 900,
};
export const GEAR_BUY_PRICE: Record<WeaponRarity, number> = {
  common: 60,
  special: 220,
  legendary: 800,
};
export const SELL_RATIO = 0.4; // bán lại = giá mua × 0.4
export const SELL_BONUS_PER_LEVEL = 0.5; // đồ đã nâng cấp bán thêm 50% giá gốc mỗi cấp
export const GEM_BUY_PRICE = 120;
export const GEM_SELL_PRICE = 40;
export const GEM_EXCHANGE_COUNT = 3; // đổi N ngọc cùng loại lấy 1 ngọc loại khác tuỳ chọn
export const GEM_EXCHANGE_FEE = 20; // phí vàng mỗi lần đổi

// ---- Thợ rèn ----
/** Giá nâng 1 cấp = gốc theo độ hiếm × (1 + cấp hiện tại × hệ số). */
export const UPGRADE_BASE_COST: Record<WeaponRarity, number> = {
  common: 30,
  special: 60,
  legendary: 120,
};
export const UPGRADE_COST_PER_LEVEL = 0.6;
/** Giá đục lỗ thứ 1, 2, 3 (độ dài = MAX_SOCKETS). */
export const DRILL_COSTS: readonly number[] = [150, 400, 900];
export const DRILL_FAIL_CHANCE = 0; // 0 = luôn thành công (có thể tăng để thêm rủi ro)
export const UNSOCKET_FEE = 50; // phí tháo ngọc (ngọc được trả lại túi)

// ---- Làng ----
/** Vùng an toàn (quảng trường trung tâm): quái không vào được. */
export const VILLAGE_ZONE = { x: 1300, y: 900, width: 1240, height: 720 } as const;
export const VILLAGE_REPEL_SPEED = 170; // px/giây: tốc độ quái bị đẩy ra khỏi làng
export const NPC_INTERACT_RADIUS = 96; // px: đứng gần NPC để nhấn F / nút đánh

export type NpcRole = 'merchant' | 'blacksmith' | 'elder';

export interface NpcSpec {
  readonly role: NpcRole;
  readonly marker: string; // biểu tượng nổi phía trên đầu NPC
  readonly name: string;
  readonly title: string; // dòng mô tả phía dưới tên
  readonly x: number;
  readonly y: number; // chân NPC
  readonly color: number;
  readonly colorCss: string;
}

export const VILLAGE_NPCS: readonly NpcSpec[] = [
  {
    role: 'merchant',
    name: 'THƯƠNG NHÂN',
    title: 'MUA · BÁN · ĐỔI',
    x: 2280,
    y: 1400,
    color: 0xffd75e,
    colorCss: '#ffd75e',
    marker: '$',
  },
  {
    role: 'blacksmith',
    name: 'THỢ RÈN',
    title: 'NÂNG CẤP · ĐỤC LỖ · KHẢM NGỌC',
    x: 1380,
    y: 1540,
    color: 0xff9f43,
    colorCss: '#ff9f43',
    marker: '+',
  },
  {
    role: 'elder',
    name: 'TRƯỞNG LÀNG',
    title: 'LỜI KHUYÊN CHO NGƯỜI MỚI',
    x: 2024,
    y: 1432,
    color: 0xb8d0ea,
    colorCss: '#b8d0ea',
    marker: '!',
  },
];

export function isInsideVillage(x: number, y: number): boolean {
  return (
    x >= VILLAGE_ZONE.x &&
    x <= VILLAGE_ZONE.x + VILLAGE_ZONE.width &&
    y >= VILLAGE_ZONE.y &&
    y <= VILLAGE_ZONE.y + VILLAGE_ZONE.height
  );
}
