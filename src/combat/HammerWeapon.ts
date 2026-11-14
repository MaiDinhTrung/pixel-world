import Phaser from 'phaser';

import {
  HAMMER_COOLDOWN_MS,
  HAMMER_DAMAGE,
  HAMMER_IMPACT_RADIUS,
  HAMMER_PUSH_SPEED,
  HAMMER_RAISE_DEGREES,
  HAMMER_RECOVER_MS,
  HAMMER_REACH,
  HAMMER_REST_DEGREES,
  HAMMER_STRIKE_DEGREES,
  HAMMER_SWING_MS,
  HAMMER_WINDUP_MS,
} from '../config/combatConfig';
import { NEON } from '../config/palette';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import { VFXManager } from '../vfx/VFXManager';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  placeWeaponImage,
  setWeaponMirror,
} from './weaponSprite';

type Phase = 'idle' | 'windup' | 'swing' | 'recover';

/** Bán kính (px) của vệt chuyển động ngắn quanh tay cầm. */
const TRAIL_RADIUS = 34;
/** Độ dài vệt (rad) phía sau đầu búa khi giáng xuống. */
const TRAIL_SPAN = 0.9;

/**
 * Búa (Đấu sĩ): nâng búa ra sau → giáng xuống → kéo về vai.
 * Máy trạng thái theo thời gian (không tween, không timer) nên huỷ/đổi vũ khí giữa chừng luôn sạch.
 * Sát thương gây đúng MỘT lần, ở khoảnh khắc đầu búa chạm đất (hết pha `swing`).
 */
export class HammerWeapon implements Weapon {
  readonly id = 'hammer';
  readonly name = 'BÚA';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly getEnemies: () => EnemyBase[];
  private readonly sprite: Phaser.GameObjects.Image;
  /** Một Graphics dùng lại cho vệt chuyển động (không tạo mới mỗi đòn). */
  private readonly trail: Phaser.GameObjects.Graphics;

  private phase: Phase = 'idle';
  private phaseStart = 0;
  private cooldownUntil = 0;
  /** Hướng/phía chốt lúc bắt đầu giáng xuống. */
  private strikeAngle = 0;
  private side = 1;

  constructor(scene: Phaser.Scene, player: Player, getEnemies: () => EnemyBase[]) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.sprite = createWeaponImage(scene, 'hammer', player.x, player.y);
    this.trail = scene.add.graphics().setVisible(false);
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.resetState();
    }
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'hammer', aim, { rotate: false });
    this.trail.setDepth(this.sprite.depth - 1);

    if (this.phase === 'idle') {
      this.side = aim.x < 0 ? -1 : 1;
      this.applyPose(aim.angle(), -this.rad(HAMMER_REST_DEGREES), this.side);
      return;
    }

    const elapsed = time - this.phaseStart;

    if (this.phase === 'windup') {
      // Đà theo hướng ngắm hiện tại để đòn bám người chơi tới khi chốt.
      this.side = aim.x < 0 ? -1 : 1;
      const t = Phaser.Math.Clamp(elapsed / HAMMER_WINDUP_MS, 0, 1);
      const offset = Phaser.Math.Linear(
        -this.rad(HAMMER_REST_DEGREES),
        -this.rad(HAMMER_RAISE_DEGREES),
        Phaser.Math.Easing.Quadratic.Out(t),
      );

      this.applyPose(aim.angle(), offset, this.side);

      if (t >= 1) {
        // Chốt hướng và bắt đầu giáng xuống.
        this.strikeAngle = aim.angle();
        this.phase = 'swing';
        this.phaseStart = time;
      }

      return;
    }

    if (this.phase === 'swing') {
      const t = Phaser.Math.Clamp(elapsed / HAMMER_SWING_MS, 0, 1);
      // Ease-in: chậm lúc đầu rồi dồn lực — cảm giác nặng.
      const offset = Phaser.Math.Linear(
        -this.rad(HAMMER_RAISE_DEGREES),
        this.rad(HAMMER_STRIKE_DEGREES),
        Phaser.Math.Easing.Cubic.In(t),
      );

      this.applyPose(this.strikeAngle, offset, this.side);
      this.drawTrail(offset);

      if (t >= 1) {
        this.impact();
        this.phase = 'recover';
        this.phaseStart = time;
      }

      return;
    }

    // recover
    const t = Phaser.Math.Clamp(elapsed / HAMMER_RECOVER_MS, 0, 1);
    const offset = Phaser.Math.Linear(
      this.rad(HAMMER_STRIKE_DEGREES),
      -this.rad(HAMMER_REST_DEGREES),
      Phaser.Math.Easing.Quadratic.InOut(t),
    );

    this.applyPose(this.strikeAngle, offset, this.side);
    // Vệt mờ nhanh sau va chạm.
    this.trail.setAlpha(1 - t);

    if (t >= 1) {
      this.phase = 'idle';
      this.trail.clear().setVisible(false);
    }
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (
      this.player.isDead() ||
      this.phase !== 'idle' ||
      time < this.cooldownUntil
    ) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      HAMMER_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getMeleeAttackCooldownMultiplier(time);
    this.phase = 'windup';
    this.phaseStart = time;
    this.side = aim.x < 0 ? -1 : 1;
    this.strikeAngle = aim.angle();

    return true;
  }

  destroy(): void {
    this.trail.destroy();
    this.sprite.destroy();
  }

  private rad(degrees: number): number {
    return Phaser.Math.DegToRad(degrees);
  }

  /** Đặt xoay + lật sprite; `side` đổi dấu để búa luôn nâng lên PHÍA TRÊN dù ngắm trái hay phải. */
  private applyPose(baseAngle: number, offset: number, side: number): void {
    this.sprite.setRotation(baseAngle + offset * side);
    setWeaponMirror(this.sprite, side < 0);
  }

  /** Vệt ngắn: một cung mảnh phía sau đầu búa, vẽ lại bằng cùng một Graphics. */
  private drawTrail(offset: number): void {
    const hand = this.sprite;
    const head = this.strikeAngle + offset * this.side;
    const tail = head - TRAIL_SPAN * this.side;
    const from = Math.min(head, tail);
    const to = Math.max(head, tail);

    this.trail
      .clear()
      .setVisible(true)
      .setAlpha(1)
      .setPosition(hand.x, hand.y)
      .lineStyle(3, NEON.hammer, 0.55)
      .beginPath()
      .arc(0, 0, TRAIL_RADIUS, from, to)
      .strokePath();
  }

  /** Đầu búa chạm đất: gây sát thương vùng đúng một lần + dựng hiệu ứng va chạm. */
  private impact(): void {
    const stats = this.player.getStats();
    const x = this.player.x + Math.cos(this.strikeAngle) * HAMMER_REACH;
    const y = this.player.y + Math.sin(this.strikeAngle) * HAMMER_REACH;
    const radius = HAMMER_IMPACT_RADIUS;
    const radiusSq = radius * radius;
    const damage =
      (HAMMER_DAMAGE + stats.meleeDamageBonus) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier;
    const vfx = VFXManager.for(this.scene);
    let hits = 0;

    // Mỗi quái chỉ được duyệt một lần trong lần va chạm này nên không thể ăn đòn hai lần.
    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - x;
      const dy = enemy.y - y;

      if (dx * dx + dy * dy > radiusSq) {
        continue;
      }

      enemy.takeDamage(damage, this.player.x, this.player.y);
      enemy.applyPush(x, y, HAMMER_PUSH_SPEED);
      vfx.play('impact.hit', { x: enemy.x, y: enemy.y, tint: NEON.hammer });
      hits += 1;
    }

    // Hiệu ứng mặt đất luôn có (đập xuống đất dù không trúng ai); trúng thì mạnh hơn.
    vfx.play('ground.crack', { x, y, radius: radius * 0.9, tint: NEON.hammer });
    vfx.play('dust.puff', { x, y, tint: NEON.hammer });
    vfx.play('burst.sparks', {
      x,
      y,
      tint: NEON.hammer,
      count: hits > 0 ? 8 : 4,
      speed: 90,
    });

    if (hits > 0) {
      vfx.play('ring.shock', { x, y, radius, tint: NEON.hammer, durationMs: 200 });
      this.scene.cameras.main.shake(90, 0.0035);
    } else {
      this.scene.cameras.main.shake(50, 0.0015);
    }
  }

  private resetState(): void {
    this.phase = 'idle';
    this.trail.clear().setVisible(false);
  }
}
