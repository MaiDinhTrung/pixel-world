import Phaser from 'phaser';

import { ENEMY_BULLET_LIFETIME_MS } from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { ELEMENT_COLORS, type DamageType } from '../config/damageTypeConfig';
import { NEON } from '../config/palette';

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
  const bullet = pool.get(
    x,
    y,
    TEXTURE_KEYS.enemyBullet,
  ) as Phaser.Physics.Arcade.Sprite | null;

  if (!bullet) {
    return false;
  }

  const shotId = nextProjectileId();

  bullet.setData('shotId', shotId);
  bullet.setData('damage', damage);
  bullet.setData('boss', fromBoss);
  bullet.setData('chillMs', 0);
  // Luôn gán (kể cả undefined) vì đạn dùng lại từ pool.
  bullet.setData('dmgType', type);

  // Texture đạn trung tính nên luôn phải tint: có hệ → màu hệ, vật lý → màu đạn quái.
  bullet.setTint(
    type && type !== 'physical' ? ELEMENT_COLORS[type] : NEON.enemyBullet,
  );

  bullet.enableBody(true, x, y, true, true);
  bullet.setDepth(9);
  bullet.setScale(1);
  bullet.setBlendMode(Phaser.BlendModes.ADD);
  bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

  scene.time.delayedCall(ENEMY_BULLET_LIFETIME_MS, () => {
    if (bullet.active && bullet.getData('shotId') === shotId) {
      bullet.disableBody(true, true);
    }
  });

  return true;
}
