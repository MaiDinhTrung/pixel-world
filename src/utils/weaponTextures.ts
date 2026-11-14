import type Phaser from 'phaser';

import type { WeaponId } from '../combat/Weapon';
import { WEAPON_IDS, WEAPON_INFO } from '../config/weaponInfo';
import { createPixelTexture } from './pixelTexture';
import { WEAPON_ART, WEAPON_DRAW_ART } from './weaponArt';

/** Texture key của frame kéo cung thứ `index` (0 = nhẹ nhất). */
export function getDrawTextureKey(id: WeaponId, index: number): string {
  return `${WEAPON_INFO[id].textureKey}-draw-${index}`;
}

/** Số frame kéo cung của vũ khí (0 nếu không có). */
export function getDrawFrameCount(id: WeaponId): number {
  return WEAPON_DRAW_ART[id]?.length ?? 0;
}

/** Sinh texture của mọi vũ khí từ `WEAPON_ART` (1 texel = 1 px, không phóng đại). Gọi từ PreloadScene. */
export function createWeaponTextures(scene: Phaser.Scene): void {
  for (const id of WEAPON_IDS) {
    const art = WEAPON_ART[id];

    createPixelTexture(scene, WEAPON_INFO[id].textureKey, art.rows, art.palette, 1);

    WEAPON_DRAW_ART[id]?.forEach((frame, index) => {
      createPixelTexture(scene, getDrawTextureKey(id, index), frame.rows, frame.palette, 1);
    });
  }
}
