import Phaser from 'phaser';

import { ENEMY_BULLET_LIFETIME_MS } from '../config/combatConfig';
import type { DamageType } from '../config/damageTypeConfig';
import { ENEMY_BULLET_VISUAL } from '../config/vfxConfig';
import { enemyBulletTextureKey } from '../vfx/vfxTextures';

let projectileSequence = 0;

/**
 * ID duy nhất toàn cục cho mọi projectile.
 * Projectile dùng chung pool nên ID phải không trùng giữa các vũ khí,
 * nếu không timer hết hạn của vũ khí này có thể tắt nhầm đạn của vũ khí khác.
 */
export function nextProjectileId(): number {
  projectileSequence += 1;
  return projectileSequence;
}

/** Bắn một viên đạn địch theo góc (radian). Trả về false nếu pool đã đầy. */
export function fireEnemyBullet(
  scene: Phaser.Scene,
  pool: Phaser.Physics.Arcade.Group,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  fromBoss = false,
  type?: DamageType,
): boolean {
  const textureKey = enemyBulletTextureKey(type);
  const bullet = pool.get(x, y, textureKey) as Phaser.Physics.Arcade.Sprite | null;

  if (!bullet) {
    return false;
  }

  // Group.get bỏ qua `key` với đạn lấy lại từ pool, nên phải đặt texture thủ công mỗi lần bắn.
  bullet.setTexture(textureKey);

  const shotId = nextProjectileId();

  bullet.setData('shotId', shotId);
  bullet.setData('damage', damage);
  bullet.setData('boss', fromBoss);
  bullet.setData('chillMs', 0);
  // Luôn gán (kể cả undefined) vì đạn dùng lại từ pool.
  bullet.setData('dmgType', type);

  // Màu đã nằm trong texture theo thuộc tính (lõi/thân/viền); xóa tint còn sót từ lần dùng trước.
  bullet.clearTint();

  bullet.enableBody(true, x, y, true, true);
  bullet.setDepth(ENEMY_BULLET_VISUAL.depth);
  bullet.setScale(1);
  // Texture đạn dài/rộng hơn đạn cũ và xoay theo hướng bay, nhưng vùng va chạm giữ
  // vuông cố định ở tâm như đạn cũ (10×10) nên gameplay không đổi.
  bullet.setRotation(angle);
  (bullet.body as Phaser.Physics.Arcade.Body | null)?.setSize(
    ENEMY_BULLET_VISUAL.hitbox,
    ENEMY_BULLET_VISUAL.hitbox,
    true,
  );
  bullet.setBlendMode(Phaser.BlendModes.ADD);
  bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

  scene.time.delayedCall(ENEMY_BULLET_LIFETIME_MS, () => {
    if (bullet.active && bullet.getData('shotId') === shotId) {
      bullet.disableBody(true, true);
    }
  });

  return true;
}
