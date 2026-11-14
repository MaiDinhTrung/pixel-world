import type { WeaponId } from '../combat/Weapon';

/**
 * Thông số gắn sprite vũ khí vào tay nhân vật. Art ở `utils/weaponArt.ts` (vẽ 1 texel = 1 px, scale 1).
 * Mọi vũ khí vẽ chỉ về +x; sprite xoay quanh điểm cầm (`grip`) theo hướng ngắm.
 */
export interface WeaponSpriteSpec {
  /** Điểm cầm trong art (texel, tính theo phần fill, chưa gồm viền). Đây là tâm xoay và là chỗ khớp bàn tay. */
  readonly grip: { readonly x: number; readonly y: number };
  /** Đẩy điểm bàn tay ra phía trước theo hướng ngắm (px) — đối số `forward` của `Player.getHandPoint`. */
  readonly forward: number;
  /** Khoảng cách (px) từ tâm người chơi tới nơi đạn/tên/quả cầu xuất hiện theo hướng ngắm (0 = không bắn). */
  readonly muzzle: number;
}

export const WEAPON_SPRITE_SPEC: Record<WeaponId, WeaponSpriteSpec> = {
  // Kiếm, khiên to gấp ~1.7 bản đầu (vẽ lại ở 1:1, không phóng scale để pixel không méo).
  sword: { grip: { x: 6, y: 6 }, forward: 2, muzzle: 0 },
  shield: { grip: { x: 12.5, y: 14.5 }, forward: 6, muzzle: 0 },
  blaster: { grip: { x: 5.5, y: 4 }, forward: 4, muzzle: 30 },
  // Cung/Cung Rồng: x = 6 (chỗ trống để kéo dây) + 8 (tay cầm tính từ dây).
  bow: { grip: { x: 14, y: 13 }, forward: 4, muzzle: 26 },
  // Liềm (ngoại hình giáo, cán dài): cầm ở đầu đoạn giữa cán, tâm cán y = 6.
  scythe: { grip: { x: 22, y: 6 }, forward: 4, muzzle: 0 },
  staff: { grip: { x: 10, y: 4 }, forward: 4, muzzle: 34 },
  wand: { grip: { x: 4, y: 2.5 }, forward: 4, muzzle: 28 },
  // Excalibur (thương vàng): cùng dáng giáo dài với liềm, cầm giữa cán.
  excalibur: { grip: { x: 22, y: 6 }, forward: 4, muzzle: 0 },
  dragon_bow: { grip: { x: 14, y: 15 }, forward: 4, muzzle: 26 },
  void_staff: { grip: { x: 10, y: 5 }, forward: 4, muzzle: 0 },
  // Song đao (lưỡi hỗn mang, 31×11): cầm giữa cán đỏ, chỗ khớp bàn tay.
  dual_blades: { grip: { x: 5, y: 5 }, forward: 2, muzzle: 0 },
  // Búa: cầm ở đoạn cán gần núm (tâm cán y = 6,5), đầu búa nằm xa tay nên xoay có cảm giác nặng.
  hammer: { grip: { x: 7, y: 6.5 }, forward: 2, muzzle: 0 },
};

/** Độ lệch depth so với `player.y`: người chơi ở `y + 20`, vũ khí ở `y + 21` (luôn trước thân). */
export const WEAPON_DEPTH_FRONT = 21;
