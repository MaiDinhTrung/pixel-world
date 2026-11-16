/**
 * Registry màu của module art mới (Visual Overhaul, gói G0).
 * Nguồn: docs/visual-overhaul/ART_BIBLE.md §2A (nền) và §2B (nhấn) — chỉ phần ĐÃ giữ nguyên.
 * Chỉ có hiệu lực cho module `src/art/**`; màu cũ ở nơi khác giữ nguyên.
 * CHƯA đưa vào: họ lục-lam (DP-9), màu độ hiếm (DP-7), màu UI (DP-8) — chờ duyệt.
 * Mọi hex trong `src/art/**` (trừ file test) phải nằm trong registry này (xem palette.test.ts).
 */

/** Bảng nền, bão hòa thấp (ART_BIBLE §2A). */
export const ART_BASE_COLORS = {
  voidBlack: '#0c0e12',
  stoneDark: '#1c2026',
  stoneCold: '#3a4048',
  stoneLight: '#5c646c',
  mossDark: '#1f2a1c',
  moss: '#3a4a2c',
  mossDry: '#5a5e34',
  earthDark: '#2a1e16',
  earth: '#4a3624',
  earthLight: '#6e5a3e',
  bone: '#b8ac90',
} as const;

/** Bảng nhấn, dùng hạn chế (ART_BIBLE §2B; core = lõi, body = thân, edge = viền). */
export const ART_ACCENT_COLORS = {
  fireCore: '#ffd070',
  fireBody: '#e0702a',
  fireEdge: '#8e2a10',
  bloodCore: '#d8303a',
  bloodBody: '#a01c2c',
  bloodEdge: '#4a0f1e',
  playerBolt: '#5fe0ff',
  voidCore: '#d8c4ff',
  voidBody: '#8a62c8',
  voidEdge: '#2e1850',
  lightningCore: '#fff4b0',
  lightningBody: '#e8c030',
  lightningEdge: '#8a5c14',
  iceCore: '#e8f6fc',
  iceBody: '#7cc0d8',
  iceEdge: '#24506e',
} as const;

/** Toàn bộ registry (khóa hai nhóm không được trùng nhau — palette.test.ts kiểm). */
export const ART_PALETTE = {
  ...ART_BASE_COLORS,
  ...ART_ACCENT_COLORS,
} as const;

export type ArtColorName = keyof typeof ART_PALETTE;

/** Danh sách phẳng các hex (chữ thường) để test và để tra nhanh. */
export const ART_PALETTE_HEXES: readonly string[] = Object.values(ART_PALETTE);

/** Đổi hex registry sang số 0xRRGGBB (dùng cho API Phaser). */
export function artColorNumber(name: ArtColorName): number {
  return Number.parseInt(ART_PALETTE[name].slice(1), 16);
}
