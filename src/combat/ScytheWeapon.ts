import Phaser from 'phaser';

import {
  SCYTHE_CHARGE_MS,
  SCYTHE_COMBO_WINDOW_MS,
  SCYTHE_COOLDOWN_MS,
  SCYTHE_DAMAGE,
  SCYTHE_RADIUS,
  SCYTHE_SLASH_COOLDOWN_MS,
  SCYTHE_SLASH_HALF_ARC_DEGREES,
  SCYTHE_SLASH_MS,
  SCYTHE_SLASH_OFFSET_DEGREES,
  SCYTHE_SLASH_RANGE,
  SCYTHE_SPIN_DAMAGE_MULT,
  SCYTHE_SPIN_MS,
  SCYTHE_THRUST_COOLDOWN_MS,
  SCYTHE_THRUST_DAMAGE_MULT,
  SCYTHE_THRUST_HALF_WIDTH_PX,
  SCYTHE_THRUST_HIT_DELAY_MS,
  SCYTHE_THRUST_LUNGE_MS,
  SCYTHE_THRUST_LUNGE_PX,
  SCYTHE_THRUST_REACH_PX,
  SCYTHE_THRUST_STOP_MARGIN_PX,
  SCYTHE_WHIRL_COOLDOWN_MS,
  SCYTHE_WHIRL_DAMAGE_MULT,
  SCYTHE_WHIRL_MS,
  SCYTHE_WHIRL_RADIUS,
  SCYTHE_WHIRL_TICK_MS,
  SCYTHE_WHIRL_TURNS,
} from '../config/combatConfig';
import { NEON } from '../config/palette';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import { spawnBurst, spawnGlow, spawnHitSpark, spawnRing } from '../utils/effects';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  placeWeaponImage,
  setWeaponMirror,
} from './weaponSprite';

/** Các lớp sáng chồng nhau của vệt trảm kích (dùng cho nhát chém thường lẫn vòng xoay): ngoài nhạt dày → lõi trắng mảnh. */
const SLASH_LAYERS: readonly {
  inset: number;
  width: number;
  alpha: number;
  color: number;
}[] = [
  { inset: 22, width: 30, alpha: 0.14, color: NEON.scythe },
  { inset: 18, width: 20, alpha: 0.28, color: NEON.scythe },
  { inset: 13, width: 11, alpha: 0.5, color: 0xffc2cf },
  { inset: 9, width: 3, alpha: 1, color: 0xffffff },
];
/** Bề rộng (rad) tối đa của vệt trảm kích đuổi theo lưỡi khi xoay vòng (~200°). */
const TRAIL_SPAN = 3.5;
/** Bắt đầu hiện vòng sạc sau khi giữ nút bao lâu (ms), để chạm nhanh không nháy vòng. */
const CHARGE_RING_SHOW_AFTER_MS = 180;

interface SpinState {
  readonly durationMs: number;
  readonly startAt: number;
  readonly endAt: number;
  readonly startRotation: number;
  readonly turns: number;
  readonly radius: number;
  readonly damage: number;
  /** 0 = chỉ gây sát thương một lần lúc bắt đầu; > 0 = gây sát thương theo nhịp. */
  readonly tickMs: number;
  readonly whirlwind: boolean;
  nextTickAt: number;
}

/**
 * Lưỡi hái:
 *  - Chạm nút đánh: nhát 1 chém bên trái, nhát 2 chém bên phải, nhát 3 cầm giáo đâm thẳng và phi người
 *    theo một đoạn, nhát 4 xoay một vòng quanh người.
 *  - Giữ nút `SCYTHE_CHARGE_MS` rồi thả: xoay lốc xoáy `SCYTHE_WHIRL_MS`.
 * Nhát đánh thường tung khi THẢ nút (giống cung) để phân biệt chạm với giữ.
 */
export class ScytheWeapon implements Weapon {
  readonly id = 'scythe';
  readonly name = 'LIỀM';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly getEnemies: () => EnemyBase[];
  private readonly sprite: Phaser.GameObjects.Image;
  /** Vệt gió + vòng phạm vi khi xoay. */
  private readonly trail: Phaser.GameObjects.Graphics;
  /** Vòng tiến độ sạc quanh người. */
  private readonly chargeRing: Phaser.GameObjects.Graphics;

  private cooldownUntil = 0;
  /** Đến thời điểm này tween đang điều khiển rotation của nhát chém. */
  private swingUntil = 0;
  private comboStep = 0;
  private comboExpireAt = 0;
  private holding = false;
  private holdStart = 0;
  private readyShown = false;
  private spin: SpinState | null = null;
  /** Độ giật/đâm của giáo dọc hướng đâm (px, âm = kéo lùi); tween điều khiển trong nhát đâm. */
  private readonly thrust = { offset: 0 };

  constructor(
    scene: Phaser.Scene,
    player: Player,
    getEnemies: () => EnemyBase[],
  ) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.sprite = createWeaponImage(scene, 'scythe', player.x, player.y);
    this.trail = scene.add.graphics();
    this.chargeRing = scene.add.graphics();
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.cancelAll();
    }
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'scythe', aim, {
      rotate: this.spin === null && time >= this.swingUntil,
    });

    if (this.thrust.offset !== 0) {
      this.sprite.x += Math.cos(this.sprite.rotation) * this.thrust.offset;
      this.sprite.y += Math.sin(this.sprite.rotation) * this.thrust.offset;
    }

    if (this.spin) {
      this.updateSpin(time);
    }

    this.updateCharge(time);
  }

  /** Gọi mỗi frame khi đang giữ nút: chỉ ghi nhận bắt đầu giữ, đòn thật tung lúc thả. */
  tryAttack(time: number, _aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead() || this.spin) {
      return false;
    }

    if (!this.holding) {
      this.holding = true;
      this.holdStart = time;
      this.readyShown = false;
    }

    return false;
  }

  releaseAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (!this.holding) {
      return false;
    }

    const held = time - this.holdStart;

    this.cancelCharge();

    if (this.player.isDead() || this.spin) {
      return false;
    }

    if (held >= SCYTHE_CHARGE_MS) {
      this.startWhirlwind(time, aim);
      return true;
    }

    return this.comboAttack(time, aim);
  }

  destroy(): void {
    this.cancelAll();
    this.sprite.destroy();
    this.trail.destroy();
    this.chargeRing.destroy();
  }

  // ─── Combo đánh thường ──────────────────────────────────────────────────

  private comboAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (time < this.cooldownUntil) {
      return false;
    }

    if (time > this.comboExpireAt) {
      this.comboStep = 0;
    }

    const step = this.comboStep;
    const stats = this.player.getStats();
    const meleeCooldown = this.player.getMeleeAttackCooldownMultiplier(time);

    this.comboExpireAt = time + SCYTHE_COMBO_WINDOW_MS;

    if (step === 2) {
      // Nhát 3: cầm giáo đâm thẳng và phi người theo một đoạn.
      this.comboStep = 3;
      this.cooldownUntil =
        time + SCYTHE_THRUST_COOLDOWN_MS * stats.cooldownMultiplier * meleeCooldown;
      this.thrustAttack(time, aim);

      return true;
    }

    if (step >= 3) {
      // Nhát 4: xoay một vòng.
      this.comboStep = 0;
      this.cooldownUntil = time + SCYTHE_COOLDOWN_MS * stats.cooldownMultiplier * meleeCooldown;
      this.startSpin(time, aim, {
        durationMs: SCYTHE_SPIN_MS,
        turns: 1,
        radius: SCYTHE_RADIUS + stats.swordRangeBonus,
        damage: this.baseDamage() * SCYTHE_SPIN_DAMAGE_MULT,
        tickMs: 0,
        whirlwind: false,
      });

      return true;
    }

    this.comboStep = step + 1;
    this.cooldownUntil =
      time + SCYTHE_SLASH_COOLDOWN_MS * stats.cooldownMultiplier * meleeCooldown;
    // Nhát 1 quét sang trái (kết thúc ở bên trái người cầm), nhát 2 quét ngược lại.
    this.slash(time, aim, step === 0 ? -1 : 1);

    return true;
  }

  /**
   * `direction`: -1 = chém bên TRÁI (lưỡi quay ngược chiều kim đồng hồ), +1 = chém bên PHẢI (quay cùng chiều).
   * Cung chém lệch hẳn về phía chém so với hướng ngắm, và lưỡi liềm lật theo chiều quay để mép sắc luôn dẫn đầu.
   */
  private slash(time: number, aim: Phaser.Math.Vector2, direction: -1 | 1): void {
    const stats = this.player.getStats();
    const halfArc = Phaser.Math.DegToRad(
      SCYTHE_SLASH_HALF_ARC_DEGREES + stats.swordArcBonusDegrees,
    );
    const range = SCYTHE_SLASH_RANGE + stats.swordRangeBonus;
    const centerAngle =
      aim.angle() + direction * Phaser.Math.DegToRad(SCYTHE_SLASH_OFFSET_DEGREES);
    const startAngle = centerAngle - direction * halfArc;
    const endAngle = centerAngle + direction * halfArc;

    this.swingUntil = time + SCYTHE_SLASH_MS;
    this.scene.tweens.killTweensOf(this.sprite);
    setWeaponMirror(this.sprite, direction > 0);
    this.sprite.setRotation(startAngle);
    this.scene.tweens.add({
      targets: this.sprite,
      rotation: endAngle,
      duration: SCYTHE_SLASH_MS,
      ease: 'Cubic.easeOut',
    });

    this.hitArc(centerAngle, halfArc, range, this.baseDamage());
    this.spawnSlashArc(startAngle, endAngle, range);
  }

  // ─── Nhát đâm (nhát 3) ──────────────────────────────────────────────────

  private thrustAttack(time: number, aim: Phaser.Math.Vector2): void {
    const direction =
      aim.lengthSq() > 0 ? aim.clone().normalize() : new Phaser.Math.Vector2(1, 0);
    const angle = direction.angle();
    const startX = this.player.x;
    const startY = this.player.y;
    const lunge = this.thrustLungeDistance(direction);
    const reach = lunge + SCYTHE_THRUST_REACH_PX + this.player.getStats().swordRangeBonus;
    const damage = this.baseDamage() * SCYTHE_THRUST_DAMAGE_MULT;

    // Phi người về phía trước (không bất tử, dừng trước kẻ địch đầu tiên).
    if (lunge > 8) {
      this.player.startSkillDash(
        direction,
        time,
        SCYTHE_THRUST_LUNGE_MS,
        lunge / (SCYTHE_THRUST_LUNGE_MS / 1000),
        0,
      );
    }

    // Giáo giật lùi một chút rồi đâm mạnh ra trước, rồi thu về tay.
    this.scene.tweens.killTweensOf(this.thrust);
    setWeaponMirror(this.sprite, false);
    this.scene.tweens.chain({
      targets: this.thrust,
      tweens: [
        { offset: -8, duration: 60, ease: 'Quad.easeOut' },
        { offset: 26, duration: 70, ease: 'Cubic.easeOut' },
        { offset: 0, duration: 190, ease: 'Quad.easeInOut' },
      ],
    });

    this.spawnThrustSpike(angle, startX, startY, reach);
    this.flashSprite();

    this.scene.time.delayedCall(SCYTHE_THRUST_HIT_DELAY_MS, () => {
      this.hitThrustLine(startX, startY, direction, reach, damage);
    });
  }

  /** Quãng phi: tối đa `SCYTHE_THRUST_LUNGE_PX`, dừng trước kẻ địch đầu tiên nằm trên đường đâm. */
  private thrustLungeDistance(direction: Phaser.Math.Vector2): number {
    let distance = SCYTHE_THRUST_LUNGE_PX;

    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const along = dx * direction.x + dy * direction.y;
      const lateral = Math.abs(dx * direction.y - dy * direction.x);

      if (along > 0 && lateral <= SCYTHE_THRUST_HALF_WIDTH_PX + 8) {
        distance = Math.min(
          distance,
          Math.max(0, along - SCYTHE_THRUST_STOP_MARGIN_PX),
        );
      }
    }

    return distance;
  }

  /** Sát thương mọi kẻ địch trong dải hẹp từ điểm xuất phát tới `reach` px phía trước. */
  private hitThrustLine(
    startX: number,
    startY: number,
    direction: Phaser.Math.Vector2,
    reach: number,
    damage: number,
  ): void {
    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - startX;
      const dy = enemy.y - startY;
      const along = dx * direction.x + dy * direction.y;
      const lateral = Math.abs(dx * direction.y - dy * direction.x);

      if (along < -10 || along > reach || lateral > SCYTHE_THRUST_HALF_WIDTH_PX) {
        continue;
      }

      enemy.takeDamage(damage, this.player.x, this.player.y);
      spawnHitSpark(this.scene, enemy.x, enemy.y, NEON.scythe);
    }
  }

  /**
   * Hiệu ứng đâm: mũi nhọn sáng kéo dài theo hướng đâm, cùng bảng màu nhiều lớp với vệt chém
   * (ngoài nhạt dày → lõi trắng), cộng sáng, bung ra rồi mờ; thêm tia sáng ở đầu mũi.
   */
  private spawnThrustSpike(
    angle: number,
    startX: number,
    startY: number,
    length: number,
  ): void {
    const spike = this.scene.add.graphics();
    const layers: readonly { half: number; alpha: number; color: number }[] = [
      { half: 30, alpha: 0.2, color: NEON.scythe },
      { half: 21, alpha: 0.38, color: NEON.scythe },
      { half: 12, alpha: 0.65, color: 0xffc2cf },
      { half: 4, alpha: 1, color: 0xffffff },
    ];

    spike.setPosition(startX, startY);
    spike.setRotation(angle);
    spike.setDepth(this.player.y + 22);
    spike.setBlendMode(Phaser.BlendModes.ADD);

    for (const layer of layers) {
      spike.fillStyle(layer.color, layer.alpha);
      spike.fillTriangle(0, -layer.half, 0, layer.half, length, 0);
    }

    spike.setScale(0.7, 1);
    this.scene.tweens.add({
      targets: spike,
      alpha: 0,
      scaleX: 1.05,
      scaleY: 0.45,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => spike.destroy(),
    });

    const tipX = startX + Math.cos(angle) * length;
    const tipY = startY + Math.sin(angle) * length;

    spawnGlow(this.scene, tipX, tipY, NEON.scythe, 1.4, 220);
    spawnBurst(this.scene, tipX, tipY, NEON.scythe, 6, 150);
  }

  private hitArc(
    baseAngle: number,
    halfArc: number,
    range: number,
    damage: number,
  ): void {
    const rangeSq = range * range;

    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;

      if (dx * dx + dy * dy > rangeSq) {
        continue;
      }

      if (
        Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - baseAngle)) > halfArc
      ) {
        continue;
      }

      enemy.takeDamage(damage, this.player.x, this.player.y);
      spawnHitSpark(this.scene, enemy.x, enemy.y, NEON.scythe);
    }
  }

  /**
   * Vệt chém cung rộng và sáng: nhiều lớp nét chồng (ngoài nhạt dày → lõi trắng mảnh) cộng sáng (ADD),
   * nở ra và mờ dần; kèm chớp sáng ở đầu lưỡi và lưỡi liềm chớp trắng.
   */
  private spawnSlashArc(startAngle: number, endAngle: number, range: number): void {
    const arc = this.scene.add.graphics();
    const anticlockwise = endAngle < startAngle;
    const middle = (startAngle + endAngle) / 2;

    arc.setPosition(this.player.x, this.player.y);
    arc.setDepth(this.player.y + 22);
    arc.setBlendMode(Phaser.BlendModes.ADD);

    for (const layer of SLASH_LAYERS) {
      arc.lineStyle(layer.width, layer.color, layer.alpha);
      arc.beginPath();
      arc.arc(0, 0, range - layer.inset, startAngle, endAngle, anticlockwise);
      arc.strokePath();
    }

    arc.setScale(0.9);
    this.scene.tweens.add({
      targets: arc,
      alpha: 0,
      scale: 1.08,
      duration: SCYTHE_SLASH_MS * 2.6,
      ease: 'Quad.easeOut',
      onComplete: () => arc.destroy(),
    });

    spawnGlow(
      this.scene,
      this.player.x + Math.cos(middle) * range * 0.6,
      this.player.y + Math.sin(middle) * range * 0.6,
      NEON.scythe,
      1.6,
      200,
    );
    this.flashSprite();
  }

  /** Lưỡi liềm chớp trắng một thoáng khi chém. */
  private flashSprite(): void {
    // Phaser 4: màu tint và chế độ tint tách riêng; FILL tô trắng cả sprite.
    this.sprite.setTint(0xfff0f3);
    this.sprite.tintMode = Phaser.TintModes.FILL;
    this.scene.time.delayedCall(70, () => {
      if (this.sprite.active && !this.holding) {
        this.sprite.clearTint();
        this.sprite.tintMode = Phaser.TintModes.MULTIPLY;
      }
    });
  }

  // ─── Xoay (nhát 3 và lốc xoáy) ──────────────────────────────────────────

  private startWhirlwind(time: number, aim: Phaser.Math.Vector2): void {
    const stats = this.player.getStats();

    this.comboStep = 0;
    this.startSpin(time, aim, {
      durationMs: SCYTHE_WHIRL_MS,
      turns: SCYTHE_WHIRL_TURNS,
      radius: SCYTHE_WHIRL_RADIUS + stats.swordRangeBonus,
      damage: this.baseDamage() * SCYTHE_WHIRL_DAMAGE_MULT,
      tickMs: SCYTHE_WHIRL_TICK_MS,
      whirlwind: true,
    });
    spawnRing(this.scene, this.player.x, this.player.y, 40, NEON.scythe, 260);
  }

  private startSpin(
    time: number,
    aim: Phaser.Math.Vector2,
    options: Omit<SpinState, 'startAt' | 'endAt' | 'startRotation' | 'nextTickAt'>,
  ): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.swingUntil = 0;
    this.spin = {
      ...options,
      startAt: time,
      endAt: time + options.durationMs,
      startRotation: aim.angle(),
      nextTickAt: time,
    };

    if (options.tickMs <= 0) {
      this.hitAround(options.radius, options.damage);
    }
  }

  private updateSpin(time: number): void {
    const spin = this.spin;

    if (!spin) {
      return;
    }

    const progress = Phaser.Math.Clamp(
      (time - spin.startAt) / (spin.endAt - spin.startAt),
      0,
      1,
    );
    // Lốc xoáy quay đều; nhát xoay một vòng giảm tốc về cuối cho có lực.
    const eased = spin.whirlwind ? progress : 1 - (1 - progress) ** 2;
    const rotation = spin.startRotation + Math.PI * 2 * spin.turns * eased;

    setWeaponMirror(this.sprite, false);
    this.sprite.setRotation(rotation);
    // Cả người xoay theo lưỡi (thân đổi hướng nhìn theo góc của lưỡi), không chỉ vũ khí.
    this.player.setFacingOverride(Math.cos(rotation), Math.sin(rotation));

    while (spin.tickMs > 0 && time >= spin.nextTickAt && spin.nextTickAt < spin.endAt) {
      this.hitAround(spin.radius, spin.damage);
      spin.nextTickAt += spin.tickMs;
    }

    this.drawTrail(rotation, spin);

    if (time >= spin.endAt) {
      this.endSpin(time, spin);
    }
  }

  private endSpin(time: number, spin: SpinState): void {
    const stats = this.player.getStats();

    this.spin = null;
    this.trail.clear();
    this.player.clearFacingOverride();

    if (spin.whirlwind) {
      this.cooldownUntil =
        time +
        SCYTHE_WHIRL_COOLDOWN_MS *
          stats.cooldownMultiplier *
          this.player.getMeleeAttackCooldownMultiplier(time);
    }
  }

  private hitAround(radius: number, damage: number): void {
    const radiusSq = radius * radius;

    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;

      if (dx * dx + dy * dy > radiusSq) {
        continue;
      }

      enemy.takeDamage(damage, this.player.x, this.player.y);
      spawnHitSpark(this.scene, enemy.x, enemy.y, NEON.scythe);
    }
  }

  /**
   * Vòng trảm kích quanh người: cùng kiểu nhiều lớp sáng như nhát chém thường, kéo thành cung dài
   * đuổi theo lưỡi (đậm nhất ở sát lưỡi, mờ dần về phía sau). Lốc xoáy còn có vòng phạm vi mờ.
   */
  private drawTrail(rotation: number, spin: SpinState): void {
    const { x, y } = this.player;

    this.trail.clear();
    this.trail.setDepth(y + 22);
    this.trail.setBlendMode(Phaser.BlendModes.ADD);

    if (spin.whirlwind) {
      this.trail.lineStyle(1, NEON.scythe, 0.22);
      this.trail.strokeCircle(x, y, spin.radius);
    }

    for (const layer of SLASH_LAYERS) {
      // Lớp lõi (mảnh, sáng) ngắn hơn lớp ngoài để đuôi vệt mờ dần.
      const span = TRAIL_SPAN * (0.45 + 0.55 * (1 - layer.alpha * 0.6));

      this.trail.lineStyle(layer.width, layer.color, layer.alpha);
      this.trail.beginPath();
      this.trail.arc(x, y, spin.radius - layer.inset, rotation - span, rotation);
      this.trail.strokePath();
    }
  }

  // ─── Sạc ────────────────────────────────────────────────────────────────

  private updateCharge(time: number): void {
    this.chargeRing.clear();

    // Không đụng tint khi không sạc: tint chớp sáng lúc chém do flashSprite tự tắt.
    if (!this.holding || this.spin) {
      return;
    }

    const heldMs = time - this.holdStart;
    const progress = Phaser.Math.Clamp(heldMs / SCYTHE_CHARGE_MS, 0, 1);

    if (heldMs >= CHARGE_RING_SHOW_AFTER_MS) {
      this.chargeRing.setDepth(this.player.y + 22);
      this.chargeRing.lineStyle(3, NEON.scythe, 0.4 + 0.5 * progress);
      this.chargeRing.beginPath();
      this.chargeRing.arc(
        this.player.x,
        this.player.y,
        26,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
      );
      this.chargeRing.strokePath();
    }

    if (progress >= 1) {
      if (!this.readyShown) {
        this.readyShown = true;
        spawnRing(this.scene, this.player.x, this.player.y, 34, NEON.scythe, 220);
        spawnGlow(this.scene, this.player.x, this.player.y, NEON.scythe, 1, 260);
      }

      // Nhấp nháy báo đã sạc đầy: thả nút để tung lốc xoáy.
      this.sprite.setTint(Math.floor(time / 90) % 2 === 0 ? 0xffd0d8 : 0xffffff);
    } else {
      this.sprite.clearTint();
    }
  }

  private cancelCharge(): void {
    this.holding = false;
    this.readyShown = false;
    this.chargeRing.clear();
    this.sprite.clearTint();
  }

  private cancelAll(): void {
    this.cancelCharge();
    this.scene.tweens.killTweensOf(this.sprite);
    this.spin = null;
    this.swingUntil = 0;
    this.trail.clear();
    this.player.clearFacingOverride();
    this.scene.tweens.killTweensOf(this.thrust);
    this.thrust.offset = 0;
  }

  private baseDamage(): number {
    const stats = this.player.getStats();

    return (
      (SCYTHE_DAMAGE + stats.meleeDamageBonus) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier
    );
  }
}
