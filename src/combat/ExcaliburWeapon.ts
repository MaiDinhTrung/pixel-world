import Phaser from 'phaser';

import {
  EXCALIBUR_COOLDOWN_MS,
  EXCALIBUR_DAMAGE_MAX,
  EXCALIBUR_DAMAGE_MIN,
  EXCALIBUR_HALF_WIDTH_MAX,
  EXCALIBUR_HALF_WIDTH_MIN,
  EXCALIBUR_KNOCKBACK_MS_MAX,
  EXCALIBUR_KNOCKBACK_MS_MIN,
  EXCALIBUR_KNOCKBACK_SPEED_MAX,
  EXCALIBUR_KNOCKBACK_SPEED_MIN,
  EXCALIBUR_MAX_CHARGE_MS,
  EXCALIBUR_MIN_CHARGE_MS,
  EXCALIBUR_RANGE_MAX,
  EXCALIBUR_RANGE_MIN,
} from '../config/combatConfig';
import { NEON } from '../config/palette';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import {
  spawnBurst,
  spawnGlow,
  spawnHitSpark,
  spawnRing,
} from '../utils/effects';
import type { Weapon } from './Weapon';
import { createWeaponImage, placeWeaponImage } from './weaponSprite';

/** Bán kính (px) vòng tiến độ tích lực quanh người. */
const CHARGE_RING_RADIUS = 30;
/** Độ kéo lùi tối đa (px) của thương khi tích đầy. */
const MAX_DRAW_BACK_PX = 12;
/** Bảng màu vàng nhiều lớp của đường thương (ngoài nhạt dày → lõi trắng), cùng kiểu vệt chém của liềm. */
const BEAM_LAYERS: readonly { widthFactor: number; alpha: number; color: number }[] = [
  { widthFactor: 1, alpha: 0.2, color: NEON.legendary },
  { widthFactor: 0.7, alpha: 0.38, color: 0xffd75e },
  { widthFactor: 0.4, alpha: 0.65, color: 0xfff2b3 },
  { widthFactor: 0.13, alpha: 1, color: 0xffffff },
];

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  let t = 0;

  if (lengthSq > 0) {
    t = Phaser.Math.Clamp(
      ((px - ax) * abx + (py - ay) * aby) / lengthSq,
      0,
      1,
    );
  }

  const closestX = ax + abx * t;
  const closestY = ay + aby * t;

  return Math.hypot(px - closestX, py - closestY);
}

/**
 * EXCALIBUR (thương vàng): giữ nút tích lực rồi thả để phóng một đường thương xuyên thấu.
 * Phải tích ít nhất `EXCALIBUR_MIN_CHARGE_MS`, tối đa `EXCALIBUR_MAX_CHARGE_MS`; càng lâu càng to và mạnh,
 * kẻ địch trúng đòn bị đẩy lui xa dọc theo đường thương.
 */
export class ExcaliburWeapon implements Weapon {
  readonly id = 'excalibur';
  readonly name = 'EXCALIBUR';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly getEnemies: () => EnemyBase[];
  private readonly sprite: Phaser.GameObjects.Image;
  /** Vòng tiến độ tích lực. */
  private readonly chargeRing: Phaser.GameObjects.Graphics;

  private cooldownUntil = 0;
  private charging = false;
  private chargeStart = 0;
  private minReachedShown = false;
  private fullShown = false;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    getEnemies: () => EnemyBase[],
  ) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.sprite = createWeaponImage(scene, 'excalibur', player.x, player.y);
    this.chargeRing = scene.add.graphics();
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.cancelCharge();
    }
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'excalibur', aim);

    if (!this.charging) {
      return;
    }

    if (this.player.isDead()) {
      this.cancelCharge();
      return;
    }

    this.updateCharge(time);
  }

  /** Bắt đầu tích lực khi giữ nút (bắn thật ở `releaseAttack`). */
  tryAttack(time: number, _aim: Phaser.Math.Vector2): boolean {
    if (this.charging || this.player.isDead() || time < this.cooldownUntil) {
      return false;
    }

    this.charging = true;
    this.chargeStart = time;
    this.minReachedShown = false;
    this.fullShown = false;

    return true;
  }

  releaseAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (!this.charging) {
      return false;
    }

    const held = time - this.chargeStart;

    this.cancelCharge();

    // Chưa tích đủ mức tối thiểu: hủy, không bắn.
    if (held < EXCALIBUR_MIN_CHARGE_MS || this.player.isDead()) {
      return false;
    }

    const power = Phaser.Math.Clamp(
      (held - EXCALIBUR_MIN_CHARGE_MS) /
        (EXCALIBUR_MAX_CHARGE_MS - EXCALIBUR_MIN_CHARGE_MS),
      0,
      1,
    );

    this.fire(time, aim, power);

    return true;
  }

  destroy(): void {
    this.cancelCharge();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
    this.chargeRing.destroy();
  }

  // ─── Tích lực ───────────────────────────────────────────────────────────

  private updateCharge(time: number): void {
    const held = time - this.chargeStart;
    const progress = Phaser.Math.Clamp(held / EXCALIBUR_MAX_CHARGE_MS, 0, 1);
    const minProgress = EXCALIBUR_MIN_CHARGE_MS / EXCALIBUR_MAX_CHARGE_MS;
    const reachedMin = held >= EXCALIBUR_MIN_CHARGE_MS;
    const { x, y } = this.player;
    const start = -Math.PI / 2;

    // Thương kéo lùi dần về phía sau tay, rung nhẹ khi tích đầy.
    const drawBack = -MAX_DRAW_BACK_PX * progress;
    const shake = progress >= 1 ? Phaser.Math.FloatBetween(-0.8, 0.8) : 0;

    this.sprite.x += Math.cos(this.sprite.rotation) * drawBack + shake;
    this.sprite.y += Math.sin(this.sprite.rotation) * drawBack + shake;

    this.chargeRing.clear();
    this.chargeRing.setDepth(y + 22);
    this.chargeRing.setBlendMode(Phaser.BlendModes.ADD);
    // Vòng nền mờ + vạch đánh dấu mốc tối thiểu.
    this.chargeRing.lineStyle(2, 0xffd75e, 0.2);
    this.chargeRing.strokeCircle(x, y, CHARGE_RING_RADIUS);

    const markAngle = start + Math.PI * 2 * minProgress;

    this.chargeRing.lineStyle(3, 0xffffff, reachedMin ? 0.9 : 0.5);
    this.chargeRing.beginPath();
    this.chargeRing.moveTo(
      x + Math.cos(markAngle) * (CHARGE_RING_RADIUS - 5),
      y + Math.sin(markAngle) * (CHARGE_RING_RADIUS - 5),
    );
    this.chargeRing.lineTo(
      x + Math.cos(markAngle) * (CHARGE_RING_RADIUS + 5),
      y + Math.sin(markAngle) * (CHARGE_RING_RADIUS + 5),
    );
    this.chargeRing.strokePath();

    // Cung tiến độ: mờ trước mốc tối thiểu, sáng rực sau mốc.
    this.chargeRing.lineStyle(reachedMin ? 5 : 3, reachedMin ? 0xffd75e : 0xb89a4a, reachedMin ? 0.95 : 0.55);
    this.chargeRing.beginPath();
    this.chargeRing.arc(x, y, CHARGE_RING_RADIUS, start, start + Math.PI * 2 * progress);
    this.chargeRing.strokePath();

    if (reachedMin && !this.minReachedShown) {
      this.minReachedShown = true;
      spawnRing(this.scene, x, y, 26, 0xffd75e, 200);
      spawnGlow(this.scene, x, y, 0xffd75e, 0.9, 220);
    }

    if (progress >= 1 && !this.fullShown) {
      this.fullShown = true;
      spawnRing(this.scene, x, y, 44, 0xffffff, 260);
      spawnGlow(this.scene, x, y, NEON.legendary, 1.5, 300);
    }

    if (progress >= 1) {
      // Đầy lực: nhấp nháy vàng-trắng.
      this.sprite.setTint(Math.floor(time / 80) % 2 === 0 ? 0xfff2b3 : 0xffffff);
    } else if (reachedMin) {
      this.sprite.setTint(0xffe9a0);
    }
  }

  private cancelCharge(): void {
    this.charging = false;
    this.minReachedShown = false;
    this.fullShown = false;
    this.chargeRing.clear();
    this.sprite.clearTint();
  }

  // ─── Phóng thương ───────────────────────────────────────────────────────

  /** `power` 0 = tích tối thiểu, 1 = tích đầy. */
  private fire(time: number, aim: Phaser.Math.Vector2, power: number): void {
    const stats = this.player.getStats();
    const direction =
      aim.lengthSq() > 0 ? aim.clone().normalize() : new Phaser.Math.Vector2(1, 0);
    const angle = direction.angle();
    const range = Phaser.Math.Linear(EXCALIBUR_RANGE_MIN, EXCALIBUR_RANGE_MAX, power);
    const halfWidth = Phaser.Math.Linear(EXCALIBUR_HALF_WIDTH_MIN, EXCALIBUR_HALF_WIDTH_MAX, power);
    const damage =
      Phaser.Math.Linear(EXCALIBUR_DAMAGE_MIN, EXCALIBUR_DAMAGE_MAX, power) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier;
    const knockbackSpeed = Phaser.Math.Linear(
      EXCALIBUR_KNOCKBACK_SPEED_MIN,
      EXCALIBUR_KNOCKBACK_SPEED_MAX,
      power,
    );
    const knockbackMs = Phaser.Math.Linear(
      EXCALIBUR_KNOCKBACK_MS_MIN,
      EXCALIBUR_KNOCKBACK_MS_MAX,
      power,
    );
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = startX + direction.x * range;
    const endY = startY + direction.y * range;

    this.cooldownUntil =
      time +
      EXCALIBUR_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getMeleeAttackCooldownMultiplier(time);

    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      if (
        distanceToSegment(enemy.x, enemy.y, startX, startY, endX, endY) > halfWidth
      ) {
        continue;
      }

      enemy.takeDamage(damage, startX, startY);
      // Đẩy lui dọc theo đường thương (không đẩy lệch hướng), kèm choáng suốt thời gian bị đẩy.
      enemy.applyPush(enemy.x - direction.x, enemy.y - direction.y, knockbackSpeed);
      enemy.applyStun(knockbackMs);
      spawnHitSpark(this.scene, enemy.x, enemy.y, NEON.legendary);
    }

    this.spawnSpearBeam(angle, startX, startY, range, halfWidth, power);
  }

  /**
   * Hiệu ứng đường thương: dải sáng vàng thon dần tới mũi, một ngọn thương vàng bay vọt theo đường bắn,
   * vòng sóng, tia lửa và rung màn hình (mạnh theo mức tích lực).
   */
  private spawnSpearBeam(
    angle: number,
    startX: number,
    startY: number,
    range: number,
    halfWidth: number,
    power: number,
  ): void {
    const beam = this.scene.add.graphics();

    beam.setPosition(startX, startY);
    beam.setRotation(angle);
    beam.setDepth(this.player.y + 22);
    beam.setBlendMode(Phaser.BlendModes.ADD);

    for (const layer of BEAM_LAYERS) {
      beam.fillStyle(layer.color, layer.alpha);
      beam.fillTriangle(0, -halfWidth * layer.widthFactor, 0, halfWidth * layer.widthFactor, range, 0);
    }

    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      scaleY: 0.4,
      duration: 360 + power * 160,
      ease: 'Quad.easeOut',
      onComplete: () => beam.destroy(),
    });

    // Ngọn thương vàng thật bay vọt theo đường bắn (scale nguyên cho pixel đều).
    const spear = this.scene.add
      .image(startX, startY, this.sprite.texture.key)
      .setOrigin(this.sprite.originX, this.sprite.originY)
      .setRotation(angle)
      .setScale(power > 0.5 ? 3 : 2)
      .setDepth(this.player.y + 23);

    this.scene.tweens.add({
      targets: spear,
      x: startX + Math.cos(angle) * range * 0.9,
      y: startY + Math.sin(angle) * range * 0.9,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeIn',
      onComplete: () => spear.destroy(),
    });

    const tipX = startX + Math.cos(angle) * range;
    const tipY = startY + Math.sin(angle) * range;

    spawnGlow(
      this.scene,
      startX + Math.cos(angle) * 40,
      startY + Math.sin(angle) * 40,
      NEON.legendary,
      1.4 + power,
      240,
    );
    spawnRing(this.scene, startX, startY, 40 + power * 30, 0xffd75e, 300);
    spawnBurst(this.scene, tipX, tipY, NEON.legendary, 8 + Math.round(power * 8), 160);
    this.scene.cameras.main.shake(100 + power * 140, 0.004 + power * 0.006);
  }
}
