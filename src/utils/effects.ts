import type Phaser from 'phaser';

import { VFXManager } from '../vfx/VFXManager';

/**
 * Lớp tương thích: các hàm cũ giờ chỉ chuyển sang `VFXManager` (pool + particle
 * dùng chung). Code mới nên gọi `VFXManager.for(scene).play(...)` trực tiếp.
 */

/** Tia lửa nhỏ kèm glow — dùng cho trúng đòn và muzzle flash. */
export function spawnHitSpark(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tint = 0xffe66d,
): void {
  VFXManager.for(scene).play('impact.hit', { x, y, tint });
}

/** Quầng sáng additive lan nhẹ rồi tắt. */
export function spawnGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  scale = 1,
  duration = 250,
): void {
  VFXManager.for(scene).play('glow.flash', {
    x,
    y,
    tint: color,
    scale,
    durationMs: duration,
  });
}

/** Các mảnh sáng bắn ra đều hướng — dùng cho chết quái, dash, nova. */
export function spawnBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 8,
  speed = 120,
): void {
  VFXManager.for(scene).play('burst.sparks', {
    x,
    y,
    tint: color,
    count,
    speed,
  });
}

/** Vòng tròn lan rộng (nova, telegraph, spawn). */
export function spawnRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  duration = 300,
): void {
  VFXManager.for(scene).play('ring.shock', {
    x,
    y,
    radius,
    tint: color,
    durationMs: duration,
  });
}

/** Bụi nhỏ dưới chân khi nhân vật di chuyển. */
export function spawnDust(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tint = 0x9aa0ad,
): void {
  VFXManager.for(scene).play('dust.puff', { x, y, tint });
}

/** Bóng mờ của Player khi dash. */
export function spawnAfterimage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string,
  color: number,
  frame?: string,
): void {
  VFXManager.for(scene).play('ghost.afterimage', {
    x,
    y,
    texture,
    frame,
    tint: color,
  });
}
