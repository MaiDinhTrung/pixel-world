import Phaser from 'phaser';

import {
  WEAPON_DEPTH_FRONT,
  WEAPON_SPRITE_SPEC,
} from '../config/weaponSpriteConfig';
import { WEAPON_INFO } from '../config/weaponInfo';
import type { Player } from '../entities/Player';
import { getArtSize, WEAPON_ART } from '../utils/weaponArt';
import type { WeaponId } from './Weapon';

/** Tạo sprite vũ khí ở scale 1, origin đặt đúng điểm cầm trong art để xoay quanh bàn tay. */
export function createWeaponImage(
  scene: Phaser.Scene,
  id: WeaponId,
  x: number,
  y: number,
): Phaser.GameObjects.Image {
  const art = WEAPON_ART[id];
  const { grip } = WEAPON_SPRITE_SPEC[id];
  const { width, height } = getArtSize(art);

  return scene.add
    .image(x, y, WEAPON_INFO[id].textureKey)
    .setOrigin((grip.x + art.pad) / width, (grip.y + art.pad) / height);
}

/**
 * Lật sprite theo trục dọc (khi ngắm sang trái) bằng scale âm.
 * Không dùng `setFlipY`: Phaser lật quanh TÂM ảnh chứ không quanh origin, nên vũ khí có điểm cầm
 * lệch tâm (liềm) sẽ nhảy khỏi bàn tay khi ngắm trái. Scale âm lật quanh đúng điểm cầm.
 */
export function setWeaponMirror(
  sprite: Phaser.GameObjects.Image,
  mirrored: boolean,
): void {
  sprite.setScale(1, mirrored ? -1 : 1);
}

/**
 * Depth của vũ khí: luôn trước thân. Từng thử cho vũ khí lùi ra sau thân khi ngắm lên, nhưng tay cầm
 * nằm ở rìa thân nên liềm/trượng gần như biến mất — thử nghiệm trong game cho thấy để trước thân dễ nhìn hơn.
 */
export function getWeaponDepth(player: Player): number {
  return player.y + WEAPON_DEPTH_FRONT;
}

/**
 * Đặt sprite vũ khí vào tay theo hướng ngắm: vị trí tay, depth và (tuỳ chọn) xoay.
 * `rotate: false` để vũ khí tự điều khiển xoay (đang vung/xoay bằng tween).
 */
export function placeWeaponImage(
  sprite: Phaser.GameObjects.Image,
  player: Player,
  id: WeaponId,
  aim: Phaser.Math.Vector2,
  options: { hand?: 'main' | 'off'; rotate?: boolean } = {},
): void {
  const hand = player.getHandPoint(
    options.hand ?? 'main',
    aim,
    WEAPON_SPRITE_SPEC[id].forward,
  );

  sprite.setPosition(hand.x, hand.y);
  sprite.setDepth(getWeaponDepth(player));

  if (options.rotate !== false) {
    sprite.setRotation(aim.angle());
    setWeaponMirror(sprite, aim.x < 0);
  }
}

/** Điểm đạn/tên xuất hiện: từ tâm người chơi đi `muzzle` px theo hướng (dx, dy) đã chuẩn hoá. */
export function getMuzzlePoint(
  player: Player,
  id: WeaponId,
  directionX: number,
  directionY: number,
): { x: number; y: number } {
  const { muzzle } = WEAPON_SPRITE_SPEC[id];

  return { x: player.x + directionX * muzzle, y: player.y + directionY * muzzle };
}
