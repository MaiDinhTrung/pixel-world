import Phaser from 'phaser';

import { SWORD_DAMAGE } from '../config/combatConfig';
import { isInsideVillage } from '../config/economyConfig';
import {
  SWORD_CHAIN_CORRIDOR_HALF_WIDTH_PX,
  SWORD_CHAIN_DASH_MS,
  SWORD_CHAIN_RECOVERY_MS,
  SWORD_CHAIN_STOP_MARGIN_PX,
  SWORD_CHAIN_STRIKES,
  SWORD_CHAIN_TOTAL_MS,
  SWORD_COMBO_RESET_MS,
  SWORD_COMBO_SLASHES,
  type SwordChainStrikeSpec,
  type SwordSlashSpec,
} from '../config/swordComboConfig';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import {
  spawnAfterimage,
  spawnBurst,
  spawnDust,
  spawnGlow,
  spawnHitSpark,
  spawnRing,
} from '../utils/effects';
import { drawFireCrescent, drawFireStarburst, FIRE } from './swordFireVfx';
import {
  advanceCombo,
  clampLunge,
  isInSector,
  resolveComboStep,
  type ComboState,
  type Point,
} from './swordCombo';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  placeWeaponImage,
  setWeaponMirror,
} from './weaponSprite';

/** Số Graphics dùng lại cho vệt chém (đòn 3 có tối đa 3 vệt chồng nhau). */
const ARC_POOL_SIZE = 5;
/** Vệt sống bao lâu so với thời lượng vung (quét ở phần đầu, tàn ở phần sau). */
const TRAIL_LIFE_FACTOR = 2.6;
const DEPTH_FX_OFFSET = 22;

interface QueuedEvent {
  readonly at: number;
  readonly run: (time: number) => void;
}

/**
 * Kiếm cận chiến, combo 3 đòn nối tự động khi giữ nút đánh:
 *  1. Trảm Kích — chém ngang nhanh, gọn.
 *  2. Truy Kích — chém chéo ngược chiều, vệt dài, mạnh hơn.
 *  3. Liên Hoàn Trảm — lao về phía trước chém 3 nhát liên tiếp (nhát cuối mạnh nhất), rồi nghỉ lâu hơn.
 * Hitbox và đoạn lao chạy theo hàng đợi sự kiện xử lý trong `update` nên huỷ sạch được khi đổi vũ khí/chết.
 */
export class SwordWeapon implements Weapon {
  readonly id = 'sword';
  readonly name = 'KIẾM';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly getEnemies: () => EnemyBase[];
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly arcs: Phaser.GameObjects.Graphics[] = [];
  private readonly arcTweens: (Phaser.Tweens.Tween | null)[] = [];
  private arcCursor = 0;

  private cooldownUntil = 0;
  private swingingUntil = 0;
  private readonly combo: ComboState = { step: 0, expireAt: 0 };
  private queue: QueuedEvent[] = [];
  private chainActive = false;
  /** Hướng lao/chém của đòn 3, chốt lúc bắt đầu, không đổi theo hướng ngắm về sau. */
  private chainAngle = 0;
  private readonly blockers: Point[] = [];

  constructor(scene: Phaser.Scene, player: Player, getEnemies: () => EnemyBase[]) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.sprite = createWeaponImage(scene, 'sword', player.x, player.y);

    for (let i = 0; i < ARC_POOL_SIZE; i += 1) {
      const arc = scene.add.graphics();

      arc.setVisible(false);
      this.arcs.push(arc);
      this.arcTweens.push(null);
    }
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.cancelAll();
    }
  }

  destroy(): void {
    this.cancelAll();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();

    for (const arc of this.arcs) {
      this.scene.tweens.killTweensOf(arc);
      arc.destroy();
    }

    this.arcTweens.length = 0;
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    // Trong lúc vung, tween điều khiển rotation; trong đòn 3 kiếm giữ hướng đã chốt.
    placeWeaponImage(this.sprite, this.player, 'sword', aim, {
      rotate: time >= this.swingingUntil && !this.chainActive,
    });

    if (
      (this.queue.length > 0 || this.chainActive) &&
      (this.player.isDead() ||
        this.player.isLeaping() ||
        isInsideVillage(this.player.x, this.player.y))
    ) {
      this.cancelAll();
      return;
    }

    this.runQueue(time);
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (
      this.player.isDead() ||
      this.chainActive ||
      this.queue.length > 0 ||
      time < this.cooldownUntil
    ) {
      return false;
    }

    const step = resolveComboStep(this.combo, time);
    const angle = aim.lengthSq() > 0 ? aim.angle() : 0;
    const stats = this.player.getStats();
    const cooldownMult =
      stats.cooldownMultiplier * this.player.getMeleeAttackCooldownMultiplier(time);

    if (step === 2) {
      this.cooldownUntil =
        time + (SWORD_CHAIN_TOTAL_MS + SWORD_CHAIN_RECOVERY_MS) * cooldownMult;
      this.startChain(time, angle);
    } else {
      const spec = SWORD_COMBO_SLASHES[step];

      this.cooldownUntil = time + spec.cooldownMs * cooldownMult;
      this.startSlash(time, angle, spec);
    }

    advanceCombo(this.combo, step, this.cooldownUntil, SWORD_COMBO_RESET_MS);

    return true;
  }

  // ─── Đòn 1 & 2 ──────────────────────────────────────────────────────────

  private startSlash(time: number, angle: number, spec: SwordSlashSpec): void {
    const stats = this.player.getStats();
    const halfArc = Phaser.Math.DegToRad(spec.halfArcDeg + stats.swordArcBonusDegrees);
    const range = spec.range + stats.swordRangeBonus;
    const center = angle + Phaser.Math.DegToRad(spec.tiltDeg);
    const dir = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));

    if (spec.stepPx > 0) {
      this.lunge(time, dir, spec.stepPx, 70);
    }

    this.swing(time, center, halfArc, spec.sweep, spec.swingMs, Math.cos(angle) < 0);
    this.drawArc(center, halfArc, spec.sweep, range, spec.trailThick, spec.swingMs);

    this.queue.push({
      at: time + spec.hitDelayMs,
      run: () => this.hitSector(center, halfArc, range, this.baseDamage() * spec.damageMult),
    });
  }

  // ─── Đòn 3: Liên Hoàn Trảm ──────────────────────────────────────────────

  private startChain(time: number, angle: number): void {
    const dir = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));

    this.chainActive = true;
    this.chainAngle = angle;
    this.player.setFacingOverride(dir.x, dir.y);

    SWORD_CHAIN_STRIKES.forEach((strike, index) => {
      this.queue.push({
        at: time + strike.atMs,
        run: (t) => this.runChainStrike(t, strike, index),
      });
      this.queue.push({
        at: time + strike.atMs + strike.hitDelayMs,
        run: () => {
          const stats = this.player.getStats();

          this.hitSector(
            this.chainAngle,
            Phaser.Math.DegToRad(strike.halfArcDeg + stats.swordArcBonusDegrees),
            strike.range + stats.swordRangeBonus,
            this.baseDamage() * strike.damageMult,
          );
        },
      });
    });

    this.queue.push({ at: time + SWORD_CHAIN_TOTAL_MS, run: () => this.endChain() });
  }

  private runChainStrike(time: number, strike: SwordChainStrikeSpec, index: number): void {
    const stats = this.player.getStats();
    const angle = this.chainAngle;
    const dir = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    const halfArc = Phaser.Math.DegToRad(strike.halfArcDeg + stats.swordArcBonusDegrees);
    const range = strike.range + stats.swordRangeBonus;
    const sweep = index % 2 === 0 ? 1 : -1;

    // Bóng mờ + bụi ở điểm xuất phát đoạn lao tạo cảm giác tốc độ.
    spawnAfterimage(
      this.scene,
      this.player.x,
      this.player.y,
      this.player.texture.key,
      FIRE.red,
      String(this.player.frame.name),
    );
    spawnDust(this.scene, this.player.x, this.player.y + 10);

    this.lunge(time, dir, strike.lungePx, SWORD_CHAIN_DASH_MS);
    this.player.playAttack(time, dir);
    this.swing(time, angle, halfArc, sweep, strike.swingMs, Math.cos(angle) < 0);
    this.drawArc(angle, halfArc, sweep, range, strike.trailThick, strike.swingMs);

    if (strike.finisher) {
      this.finisherBlast(angle, range);
    }
  }

  /** Vụ nổ lửa ở đầu kiếm của nhát kết: sao nhọn nhiều lớp, quầng sáng, vòng sốc, tia lửa và hạt than. */
  private finisherBlast(angle: number, range: number): void {
    const fx = this.player.x + Math.cos(angle) * range * 0.75;
    const fy = this.player.y + Math.sin(angle) * range * 0.75;
    const star = this.nextArcSlot();
    const g = this.arcs[star];

    this.scene.tweens.killTweensOf(g);
    this.arcTweens[star]?.stop();
    this.arcTweens[star] = null;
    drawFireStarburst(g, 30, angle);
    g.setPosition(fx, fy);
    g.setDepth(this.player.y + DEPTH_FX_OFFSET + 1);
    g.setAlpha(1);
    g.setScale(0.4);
    g.setVisible(true);
    this.scene.tweens.add({
      targets: g,
      scale: 1.15,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => g.setVisible(false),
    });

    spawnGlow(this.scene, fx, fy, FIRE.orange, 1.6, 240);
    spawnRing(this.scene, fx, fy, 38, FIRE.gold, 220);
    spawnBurst(this.scene, fx, fy, FIRE.gold, 8, 200);
    spawnBurst(this.scene, fx, fy, FIRE.red, 6, 90);
    this.scene.cameras.main.shake(70, 0.0025);
  }

  private endChain(): void {
    this.chainActive = false;
    this.player.clearFacingOverride();
  }

  // ─── Di chuyển, hitbox, hiệu ứng ────────────────────────────────────────

  /**
   * Lao/nhích người theo `dir` tối đa `maxPx` trong `durationMs`: dừng trước quái đầu tiên chắn đường,
   * bỏ qua nếu đang đâm sát tường phía trước (collider với vật cản chặn phần còn lại).
   */
  private lunge(
    time: number,
    dir: Phaser.Math.Vector2,
    maxPx: number,
    durationMs: number,
  ): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;

    if (
      body &&
      ((dir.x > 0.3 && body.blocked.right) ||
        (dir.x < -0.3 && body.blocked.left) ||
        (dir.y > 0.3 && body.blocked.down) ||
        (dir.y < -0.3 && body.blocked.up))
    ) {
      return;
    }

    this.blockers.length = 0;

    for (const enemy of this.getEnemies()) {
      if (enemy.isAlive()) {
        this.blockers.push(enemy);
      }
    }

    const distance = clampLunge(
      this.player,
      dir.x,
      dir.y,
      maxPx,
      SWORD_CHAIN_STOP_MARGIN_PX,
      SWORD_CHAIN_CORRIDOR_HALF_WIDTH_PX,
      this.blockers,
    );

    if (distance > 4) {
      // Không bất tử khi lao (invulnerableMs = 0).
      this.player.startSkillDash(dir, time, durationMs, distance / (durationMs / 1000), 0);
    }
  }

  private swing(
    time: number,
    center: number,
    halfArc: number,
    sweep: 1 | -1,
    swingMs: number,
    mirror: boolean,
  ): void {
    this.swingingUntil = time + swingMs + 30;
    this.scene.tweens.killTweensOf(this.sprite);
    setWeaponMirror(this.sprite, mirror);
    this.sprite.setRotation(center - sweep * halfArc);
    this.scene.tweens.add({
      targets: this.sprite,
      rotation: center + sweep * halfArc,
      duration: swingMs,
      ease: 'Cubic.easeOut',
    });
  }

  private hitSector(angle: number, halfArc: number, range: number, damage: number): void {
    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      if (isInSector(enemy.x - this.player.x, enemy.y - this.player.y, angle, halfArc, range)) {
        enemy.takeDamage(damage, this.player.x, this.player.y);
        spawnHitSpark(this.scene, enemy.x, enemy.y, FIRE.orange);
      }
    }
  }

  private nextArcSlot(): number {
    const slot = this.arcCursor;

    this.arcCursor = (this.arcCursor + 1) % this.arcs.length;

    return slot;
  }

  /**
   * Vệt lửa trăng khuyết nhọn hai đầu, quét theo chiều vung kiếm (đầu vệt đuổi theo lưỡi) rồi mờ.
   * Chỉ là hiệu ứng hình ảnh; sát thương do hàng đợi hit quyết định.
   */
  private drawArc(
    center: number,
    halfArc: number,
    sweep: 1 | -1,
    range: number,
    thick: number,
    swingMs: number,
  ): void {
    const slot = this.nextArcSlot();
    const arc = this.arcs[slot];
    const start = center - sweep * halfArc;
    const end = center + sweep * halfArc;
    const radius = range - thick * 0.7;

    this.arcTweens[slot]?.stop();
    this.scene.tweens.killTweensOf(arc);
    arc.setPosition(this.player.x, this.player.y);
    arc.setDepth(this.player.y + DEPTH_FX_OFFSET);
    arc.setAlpha(1);
    arc.setScale(1);
    arc.setVisible(true);
    drawFireCrescent(arc, start, end, radius, thick, 0.05);

    // Một tween duy nhất: pha quét (đầu vệt đuổi theo lưỡi) rồi pha tàn (mờ dần).
    const total = swingMs * TRAIL_LIFE_FACTOR;
    const sweepShare = 1 / TRAIL_LIFE_FACTOR;

    this.arcTweens[slot] = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: total,
      onUpdate: (tween) => {
        const v = tween.getValue() ?? 1;
        const fade = v <= sweepShare ? 0 : (v - sweepShare) / (1 - sweepShare);

        arc.setAlpha(1 - fade * fade);
        drawFireCrescent(arc, start, end, radius, thick, Math.min(1, v / sweepShare));
      },
      onComplete: () => {
        this.arcTweens[slot] = null;
        arc.setVisible(false);
      },
    });

    // Tia lửa bắn ra ở đầu mũi vệt và vài hạt than đỏ trôi chậm.
    const tipX = this.player.x + Math.cos(end) * range;
    const tipY = this.player.y + Math.sin(end) * range;

    spawnBurst(this.scene, tipX, tipY, FIRE.orange, thick > 12 ? 6 : 3, 130);
    spawnBurst(this.scene, tipX, tipY, FIRE.red, 2, 40);
  }

  private runQueue(time: number): void {
    if (this.queue.length === 0) {
      return;
    }

    // Sự kiện có thể đẩy thêm sự kiện mới (không xảy ra hiện nay) nên lọc trên bản sao.
    const due = this.queue.filter((event) => event.at <= time);

    if (due.length === 0) {
      return;
    }

    this.queue = this.queue.filter((event) => event.at > time);

    for (const event of due) {
      event.run(time);
    }
  }

  private cancelAll(): void {
    this.queue.length = 0;
    this.swingingUntil = 0;
    this.scene.tweens.killTweensOf(this.sprite);

    this.arcs.forEach((arc, index) => {
      this.arcTweens[index]?.stop();
      this.arcTweens[index] = null;
      this.scene.tweens.killTweensOf(arc);
      arc.setVisible(false);
    });

    if (this.chainActive) {
      this.chainActive = false;
      this.player.clearFacingOverride();
    }
  }

  private baseDamage(): number {
    const stats = this.player.getStats();

    return (
      (SWORD_DAMAGE + stats.meleeDamageBonus) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier
    );
  }
}
