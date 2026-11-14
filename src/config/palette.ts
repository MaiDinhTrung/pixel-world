import { ELEMENT_PALETTE } from './damageTypeConfig';

/** Màu neon dùng cho hiệu ứng hình ảnh (dạng số 0xRRGGBB cho Phaser). */
export const NEON = {
  playerBullet: 0x5fe0ff, // đạn người chơi (xanh lơ)
  sword: 0xffe066, // vệt kiếm (vàng)
  enemyBullet: 0xd8402a, // đạn quái (đỏ cam sẫm, khác đạn người chơi bằng hue ấm)
  heal: 0x8fe8b0, // hồi máu (xanh ngọc dịu)
  nova: ELEMENT_PALETTE.dark.body, // sóng nổ phép (hệ Dark)
  dash: 0x5fe0ff, // lướt/dash (xanh lơ)
  meleeEnemy: 0xb45cff, // quái cận chiến (tím)
  rangedEnemy: 0xff4fd8, // quái bắn xa (hồng)
  boss: 0xff5577, // boss (đỏ hồng)
  synergyAura: 0xffd75e, // quầng sáng synergy (vàng)
  bow: 0x7dff9a, // cung (xanh lá nhạt)
  scythe: 0xff8fa3, // lưỡi hái (hồng nhạt)
  dualBlades: 0xff7a2e, // vệt song đao (cam lửa)
  hammer: 0xd9c9a3, // búa (bụi/đá vàng nhạt)
  staff: 0xc36bff, // trượng (tím)
  chest: 0xffd75e, // hòm thường (vàng)
  legendary: 0xffb347, // đồ huyền thoại (cam)
  void: ELEMENT_PALETTE.dark.body, // hư không (hệ Dark)
} as const;

/** Đổi màu số 0xRRGGBB sang chuỗi CSS '#rrggbb' (dùng cho Text/UI), tránh khai báo hex hai lần. */
export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Bản CSS (dùng cho Text/UI). */
export const NEON_CSS = {
  cyan: '#5fe0ff', // xanh lơ
  gold: '#ffe066', // vàng
  magenta: '#ff4fd8', // hồng tím
  emerald: '#4dffa6', // xanh ngọc
  purple: '#9d5cff', // tím
  rose: '#ff8fa3', // hồng nhạt
  lime: '#7dff9a', // xanh chanh
} as const;

/** Buff synergy nào thì aura màu đó. */
export const SYNERGY_COLORS: Record<string, number> = {
  storm_barrage: NEON.playerBullet,
  executioner: NEON.sword,
  juggernaut: NEON.heal,
  arcane_battery: NEON.nova,
  vampire_lord: NEON.enemyBullet,
};
