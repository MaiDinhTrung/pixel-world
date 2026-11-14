import Phaser from 'phaser';

import {
  BOW_ARROW_LIFETIME_MS,
  BOW_BASE_PIERCE,
  BOW_CHARGE_MS,
  BOW_COOLDOWN_MS,
  BOW_MAX_DAMAGE,
  BOW_MAX_SPEED,
  BOW_MIN_DAMAGE,
  BOW_MIN_SPEED,
  BOW_RELEASE_KICK_MS,
  BOW_RELEASE_KICK_PX,
  BOW_SPREAD_DEGREES,
  BOW_TRAIL_LENGTH_MAX,
  BOW_TRAIL_LENGTH_MIN,
  BOW_TRAIL_MAX_TRACKED,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import type { Player } from '../entities/Player';
import {
  spawnBurst,
  spawnHitSpark,
  spawnRing,
} from '../utils/effects';
import { nextProjectileId } from '../utils/projectile';
import { VFXManager } from '../vfx/VFXManager';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  getMuzzlePoint,
  placeWeaponImage,
} from './weaponSprite';
import { getDrawFrameCount, getDrawTextureKey } from '../utils/weaponTextures';

/** Mũi tên đang được theo dõi để vẽ vệt đuôi và phát hiệu ứng khi trúng/biến mất. */
interface TrackedArrow {
  arrow: Phaser.Physics.Arcade.Sprite;
  shotId: number;
  born: number;
  /** Mức sạc 0..1 lúc bắn (quyết định độ dài vệt). */
  ratio: number;
  lastPierce: number;
  lastX: number;
  lastY: number;
}

/**
 * Cung: giữ nút để sạc, thả để bắn.
 * Sạc càng lâu → sát thương, tốc độ và số quái bị xuyên càng cao.
 */
export class BowWeapon implements Weapon {
  readonly id = 'bow';
  readonly name = 'CUNG';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly bullets: Phaser.Physics.Arcade.Group;
  private readonly sprite: Phaser.GameObjects.Image;

  private chargeGlow: Phaser.GameObjects.Image | null = null;
  private charging = false;
  private chargeStart = 0;
  /** Frame kéo dây đang hiển thị (-1 = thả lỏng). */
  private drawIndex = -1;
  /** Đã phát hiệu ứng "căng hết cỡ" của lần sạc này chưa. */
  private fullChargeShown = false;
  private cooldownUntil = 0;
  /** Một Graphics dùng chung cho vệt đuôi mọi mũi tên (vẽ lại mỗi frame, không tạo object mới). */
  private readonly trail: Phaser.GameObjects.Graphics;
  private tracked: TrackedArrow[] = [];
  /** Thời điểm buông dây gần nhất, để cung giật lùi ngắn. */
  private releasedAt = -Infinity;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    bullets: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;

    this.sprite = createWeaponImage(scene, 'bow', player.x, player.y);
    this.trail = scene.add.graphics().setDepth(8);
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.cancelCharge();
      this.tracked = [];
      this.trail.clear();
    }
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'bow', aim);
    this.applyReleaseKick(time, aim);
    this.updateArrows(time);

    if (!this.charging) {
      return;
    }

    if (this.player.isDead()) {
      this.cancelCharge();
      return;
    }

    const ratio = Phaser.Math.Clamp(
      (time - this.chargeStart) / BOW_CHARGE_MS,
      0,
      1,
    );

    if (this.chargeGlow) {
      this.chargeGlow
        .setPosition(this.player.x, this.player.y)
        .setScale(0.35 + ratio * 0.55)
        .setAlpha(0.3 + ratio * 0.45);
    }

    // Kéo dây dần theo mức sạc: frame cuối là căng hết cỡ.
    const frames = getDrawFrameCount('bow');

    this.setDrawFrame(Math.min(frames - 1, Math.floor(ratio * frames)));

    if (ratio >= 1 && !this.fullChargeShown) {
      this.fullChargeShown = true;

      const tip = getMuzzlePoint(this.player, 'bow', aim.x, aim.y);

      spawnRing(this.scene, tip.x, tip.y, 16, NEON.bow, 200);
    }
  }

  /** Đổi sprite cung sang frame kéo dây `index` (-1 = cung thả lỏng, không có tên). */
  private setDrawFrame(index: number): void {
    if (index === this.drawIndex) {
      return;
    }

    this.drawIndex = index;
    this.sprite.setTexture(
      index < 0 ? TEXTURE_KEYS.bow : getDrawTextureKey('bow', index),
    );
  }

  tryAttack(time: number, _aim: Phaser.Math.Vector2): boolean {
    if (
      this.charging ||
      this.player.isDead() ||
      time < this.cooldownUntil
    ) {
      return false;
    }

    this.charging = true;
    this.chargeStart = time;
    this.fullChargeShown = false;
    this.setDrawFrame(0);
    this.chargeGlow = this.scene.add
      .image(this.player.x, this.player.y, TEXTURE_KEYS.glow)
      .setDepth(12)
      .setTint(NEON.bow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.35)
      .setAlpha(0.3);

    return true;
  }

  releaseAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (!this.charging) {
      return false;
    }

    const ratio = Phaser.Math.Clamp(
      (time - this.chargeStart) / BOW_CHARGE_MS,
      0,
      1,
    );
    const stats = this.player.getStats();
    const damage =
      (BOW_MIN_DAMAGE + (BOW_MAX_DAMAGE - BOW_MIN_DAMAGE) * ratio) *
      stats.rangedDamageMultiplier *
      stats.damageMultiplier;
    const speed =
      (BOW_MIN_SPEED + (BOW_MAX_SPEED - BOW_MIN_SPEED) * ratio) *
      stats.bulletSpeedMultiplier;
    const pierce =
      BOW_BASE_PIERCE + Math.floor(ratio * 2) + stats.bulletPierce;
    const arrowCount = 1 + stats.bulletCountBonus;
    const baseAngle = aim.angle();

    this.charging = false;
    this.cooldownUntil =
      time +
      BOW_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getRangedAttackCooldownMultiplier(time);

    this.chargeGlow?.destroy();
    this.chargeGlow = null;
    this.setDrawFrame(-1); // thả dây: cung về thả lỏng, tên đã bay đi
    this.releasedAt = time;

    // Mũi tên và hoạt ảnh buông dây xảy ra cùng một lần gọi: không có độ trễ giữa hai việc.
    for (let i = 0; i < arrowCount; i += 1) {
      const offsetDegrees =
        (i - (arrowCount - 1) / 2) * BOW_SPREAD_DEGREES;
      const angle = baseAngle + Phaser.Math.DegToRad(offsetDegrees);

      this.spawnArrow(angle, damage, pierce, speed, ratio, time);
    }

    const flash = getMuzzlePoint(this.player, 'bow', aim.x, aim.y);

    spawnHitSpark(this.scene, flash.x, flash.y, NEON.bow);
    spawnBurst(this.scene, this.player.x, this.player.y, NEON.bow, 5, 60);
    spawnRing(
      this.scene,
      this.player.x,
      this.player.y,
      30 + ratio * 30,
      NEON.bow,
      220,
    );

    return true;
  }

  destroy(): void {
    this.cancelCharge();
    this.scene.tweens.killTweensOf(this.sprite);
    this.tracked = [];
    this.trail.destroy();
    this.sprite.destroy();
  }

  /** Cung giật lùi ngắn dọc hướng ngắm khi buông dây rồi trở về tay (giảm dần tuyến tính). */
  private applyReleaseKick(time: number, aim: Phaser.Math.Vector2): void {
    const t = (time - this.releasedAt) / BOW_RELEASE_KICK_MS;

    if (t < 0 || t >= 1) {
      return;
    }

    const kick = BOW_RELEASE_KICK_PX * (1 - t);

    this.sprite.x -= aim.x * kick;
    this.sprite.y -= aim.y * kick;
  }

  /**
   * Vẽ vệt đuôi ngắn cho mọi mũi tên đang bay và phát hiệu ứng nhỏ khi tên trúng/biến mất.
   * Chỉ đọc trạng thái của đạn (không đổi sát thương hay va chạm).
   */
  private updateArrows(time: number): void {
    this.trail.clear();

    if (this.tracked.length === 0) {
      return;
    }

    const vfx = VFXManager.for(this.scene);
    const alive: TrackedArrow[] = [];

    for (const item of this.tracked) {
      const { arrow } = item;
      const stillOurs =
        arrow.active && arrow.getData('shotId') === item.shotId;

      if (!stillOurs) {
        // Biến mất trước hạn = trúng quái hoặc chạm biên: va chạm nhỏ tại vị trí cuối.
        if (time - item.born < BOW_ARROW_LIFETIME_MS - 60) {
          vfx.play('burst.sparks', {
            x: item.lastX,
            y: item.lastY,
            tint: NEON.bow,
            count: 4,
            speed: 70,
          });
        }

        continue;
      }

      item.lastX = arrow.x;
      item.lastY = arrow.y;

      const pierce = (arrow.getData('pierce') as number | undefined) ?? 0;

      if (pierce < item.lastPierce) {
        // Xuyên qua một quái: tia lửa nhỏ nhưng tên vẫn bay tiếp.
        item.lastPierce = pierce;
        vfx.play('burst.sparks', {
          x: arrow.x,
          y: arrow.y,
          tint: NEON.bow,
          count: 3,
          speed: 60,
        });
      }

      const body = arrow.body as Phaser.Physics.Arcade.Body | null;
      const vx = body?.velocity.x ?? 0;
      const vy = body?.velocity.y ?? 0;
      const speed = Math.hypot(vx, vy);

      if (speed > 0) {
        const length =
          BOW_TRAIL_LENGTH_MIN +
          (BOW_TRAIL_LENGTH_MAX - BOW_TRAIL_LENGTH_MIN) * item.ratio;
        const dx = vx / speed;
        const dy = vy / speed;

        // Ba đoạn mờ dần về phía đuôi: đậm gần mũi tên, tan ở cuối (không blur, không đuôi dài).
        for (let i = 0; i < 3; i += 1) {
          const from = (length * i) / 3;
          const to = (length * (i + 1)) / 3;

          this.trail.lineStyle(2, NEON.bow, 0.55 - i * 0.18);
          this.trail.lineBetween(
            arrow.x - dx * from,
            arrow.y - dy * from,
            arrow.x - dx * to,
            arrow.y - dy * to,
          );
        }
      }

      alive.push(item);
    }

    this.tracked = alive;
  }

  private cancelCharge(): void {
    this.charging = false;
    this.setDrawFrame(-1);
    this.chargeGlow?.destroy();
    this.chargeGlow = null;
  }

  private spawnArrow(
    angle: number,
    damage: number,
    pierce: number,
    speed: number,
    ratio: number,
    time: number,
  ): void {
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const { x: muzzleX, y: muzzleY } = getMuzzlePoint(
      this.player,
      'bow',
      directionX,
      directionY,
    );

    const arrow = this.bullets.get(
      muzzleX,
      muzzleY,
      TEXTURE_KEYS.arrow,
    ) as Phaser.Physics.Arcade.Sprite | null;

    if (!arrow) {
      return;
    }

    const shotId = nextProjectileId();

    arrow.setData('shotId', shotId);
    arrow.setData('damage', damage);
    arrow.setData('chillMs', 0);
    arrow.setData('pierce', pierce);
    arrow.enableBody(true, muzzleX, muzzleY, true, true);
    arrow.setDepth(9);
    arrow.setScale(1);
    arrow.setBlendMode(Phaser.BlendModes.ADD);
    arrow.setRotation(angle);
    arrow.setVelocity(directionX * speed, directionY * speed);

    // Theo dõi có trần: quá trần thì bỏ vệt/hiệu ứng của tên này, sát thương không bị ảnh hưởng.
    if (this.tracked.length < BOW_TRAIL_MAX_TRACKED) {
      this.tracked.push({
        arrow,
        shotId,
        born: time,
        ratio,
        lastPierce: pierce,
        lastX: muzzleX,
        lastY: muzzleY,
      });
    }

    this.scene.time.delayedCall(BOW_ARROW_LIFETIME_MS, () => {
      if (arrow.active && arrow.getData('shotId') === shotId) {
        arrow.disableBody(true, true);
      }
    });
  }
}
