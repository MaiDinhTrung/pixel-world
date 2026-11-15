import Phaser from 'phaser';

import {
  HAMMER_CHARGE_MOVE_FACTOR,
  HAMMER_CHARGE_READY_MS,
  HAMMER_CHARGED_COOLDOWN_MS,
  HAMMER_CHARGED_DAMAGE,
  HAMMER_CHARGED_IMPACT_HOLD_MS,
  HAMMER_CHARGED_IMPACT_RADIUS,
  HAMMER_CHARGED_LAUNCH_HEIGHT,
  HAMMER_CHARGED_LAUNCH_MS,
  HAMMER_CHARGED_MAX_LAUNCHED,
  HAMMER_CHARGED_PUSH_SPEED,
  HAMMER_CHARGED_REACH,
  HAMMER_CHARGED_RECOVER_MS,
  HAMMER_CHARGED_STRIKE_DEGREES,
  HAMMER_CHARGED_STUN_MS,
  HAMMER_CHARGED_SWING_MOVE_FACTOR,
  HAMMER_CHARGED_SWING_MS,
  HAMMER_COOLDOWN_MS,
  HAMMER_DAMAGE,
  HAMMER_IMPACT_HOLD_MS,
  HAMMER_IMPACT_RADIUS,
  HAMMER_PUSH_SPEED,
  HAMMER_RAISE_DEGREES,
  HAMMER_RECOVER_MS,
  HAMMER_REACH,
  HAMMER_REST_DEGREES,
  HAMMER_STRIKE_DEGREES,
  HAMMER_STUN_MS,
  HAMMER_SWING_MOVE_FACTOR,
  HAMMER_SWING_MS,
  HAMMER_WINDUP_MS,
} from '../config/combatConfig';
import { NEON } from '../config/palette';
import {
  HAMMER_VFX_BLINK_MS,
  HAMMER_VFX_CHARGED_CRACK_MAX,
  HAMMER_VFX_CHARGED_CRACK_MIN,
  HAMMER_VFX_CHARGED_CRACK_RADIUS,
  HAMMER_VFX_CHARGED_DUST_JITTER_PX,
  HAMMER_VFX_CHARGED_DUST_MAX,
  HAMMER_VFX_CHARGED_DUST_MIN,
  HAMMER_VFX_CHARGED_GLOW,
  HAMMER_VFX_CHARGED_RING_INNER,
  HAMMER_VFX_CHARGED_RING_OUTER,
  HAMMER_VFX_CHARGED_ROCKS,
  HAMMER_VFX_CHARGED_ROCKS_SPEED,
  HAMMER_VFX_CHARGED_SPARKS,
  HAMMER_VFX_CHARGED_SPARKS_SPEED,
  HAMMER_VFX_COLOR_BODY,
  HAMMER_VFX_COLOR_CORE,
  HAMMER_VFX_COLOR_ROCK,
  HAMMER_VFX_CRACK_RADIUS,
  HAMMER_VFX_DUST_COUNT,
  HAMMER_VFX_DUST_JITTER_PX,
  HAMMER_VFX_HIT_RING_MS,
  HAMMER_VFX_PREVIEW_ALPHA_MIN,
  HAMMER_VFX_PREVIEW_ALPHA_READY,
  HAMMER_VFX_RAISE_SHAKE_PX,
  HAMMER_VFX_READY_GLOW_SCALE,
  HAMMER_VFX_READY_RING_MS,
  HAMMER_VFX_READY_RING_RADIUS,
  HAMMER_VFX_READY_SHAKE_PX,
  HAMMER_VFX_RING_BREATH_MS,
  HAMMER_VFX_RING_BREATH_PX,
  HAMMER_VFX_RING_RADIUS,
  HAMMER_VFX_RING_WIDTH_CHARGING,
  HAMMER_VFX_RING_WIDTH_READY,
  HAMMER_VFX_ROCKS,
  HAMMER_VFX_ROCKS_SPEED,
  HAMMER_VFX_SHAKE_CHARGED,
  HAMMER_VFX_SHAKE_HIT,
  HAMMER_VFX_SHAKE_MISS,
  HAMMER_VFX_SPARKS,
  HAMMER_VFX_SPARKS_SPEED,
  HAMMER_VFX_TRAIL_EXTRA_ALPHAS,
  HAMMER_VFX_TRAIL_EXTRA_RADII,
  HAMMER_VFX_TRAIL_EXTRA_SPAN_FACTORS,
  HAMMER_VFX_TRAIL_RADIUS,
  HAMMER_VFX_TRAIL_SPAN,
  VFX_DEPTH,
} from '../config/vfxConfig';
import { BossEnemy } from '../entities/BossEnemy';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import { launchSprite } from '../skills/leap/visualLift';
import { VFXManager } from '../vfx/VFXManager';
import { HammerChargeMachine, type HammerStrike } from './hammerCharge';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  placeWeaponImage,
  setWeaponMirror,
} from './weaponSprite';

/**
 * Búa (Đấu sĩ), hai kiểu đánh:
 * - GIÁNG BÚA (nhấn/thả nhanh): nâng búa → giáng → khựng → kéo về.
 * - CHẤN ĐỊA KÍCH (giữ đủ HAMMER_CHARGE_READY_MS rồi thả): vùng lớn, choáng dài, hất tung.
 * Logic pha nằm ở `hammerCharge.ts` (thuần); lớp này lo tư thế, hiệu ứng và sát thương.
 * Máy trạng thái theo thời gian (không tween, không timer) nên huỷ/đổi vũ khí giữa chừng luôn sạch.
 * Sát thương gây đúng MỘT lần mỗi swing, ở khoảnh khắc đầu búa chạm đất.
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
  /** Vòng tiến độ tích lực quanh người (cố định, clear mỗi frame). */
  private readonly chargeRing: Phaser.GameObjects.Graphics;
  /** Vùng dự báo điểm đập của đòn tích lực (cố định, clear mỗi frame). */
  private readonly impactPreview: Phaser.GameObjects.Graphics;
  private readonly machine: HammerChargeMachine;

  /** Phía chốt (-1 trái / 1 phải) để búa luôn nâng lên phía trên. */
  private side = 1;
  /** Hệ số tốc chạy đã báo cho Player (tránh gọi thừa). */
  private appliedMoveFactor = 1;
  private tinted = false;

  constructor(scene: Phaser.Scene, player: Player, getEnemies: () => EnemyBase[]) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.sprite = createWeaponImage(scene, 'hammer', player.x, player.y);
    this.trail = scene.add.graphics().setVisible(false);
    // Nằm trên lớp tối ban đêm (khác Excalibur dùng y+22), nên đặt depth VFX thường.
    this.chargeRing = scene.add
      .graphics()
      .setDepth(VFX_DEPTH.normal)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.impactPreview = scene.add.graphics().setDepth(VFX_DEPTH.normal);

    this.machine = new HammerChargeMachine(
      {
        raiseMs: HAMMER_WINDUP_MS,
        readyMs: HAMMER_CHARGE_READY_MS,
        swingMs: HAMMER_SWING_MS,
        chargedSwingMs: HAMMER_CHARGED_SWING_MS,
        recoverMs: HAMMER_RECOVER_MS,
        chargedRecoverMs: HAMMER_CHARGED_RECOVER_MS,
        cooldownMs: HAMMER_COOLDOWN_MS,
        chargedCooldownMs: HAMMER_CHARGED_COOLDOWN_MS,
        chargeMoveFactor: HAMMER_CHARGE_MOVE_FACTOR,
        swingMoveFactor: HAMMER_SWING_MOVE_FACTOR,
        chargedSwingMoveFactor: HAMMER_CHARGED_SWING_MOVE_FACTOR,
      },
      (time) =>
        this.player.getStats().cooldownMultiplier *
        this.player.getMeleeAttackCooldownMultiplier(time),
    );
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);

    if (!active) {
      this.cancelAttack();
    }
  }

  /** Hủy sạch mọi đòn/tích lực đang dở: không giáng, không cooldown, trả tốc chạy về 1, ẩn chỉ báo. */
  cancelAttack(): void {
    this.machine.cancel();
    this.applyMoveFactor();
    this.trail.clear().setVisible(false);
    this.chargeRing.clear();
    this.impactPreview.clear();
    this.clearBlink();
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'hammer', aim, { rotate: false });
    this.trail.setDepth(this.sprite.depth - 1);
    this.chargeRing.clear();
    this.impactPreview.clear();

    if (this.player.isDead() && this.machine.getPhase() !== 'idle') {
      this.cancelAttack();
    }

    const events = this.machine.tick(time, aim.angle());

    if (events.ready) {
      this.onReady();
    }

    if (events.impact) {
      this.impact(events.impact);
    }

    this.applyMoveFactor();

    const phase = this.machine.getPhase();
    const elapsed = time - this.machine.getPhaseStart();

    if (phase === 'idle') {
      this.side = aim.x < 0 ? -1 : 1;
      this.applyPose(aim.angle(), -this.rad(HAMMER_REST_DEGREES), this.side);
      this.clearBlink();

      if (this.trail.visible) {
        this.trail.clear().setVisible(false);
      }

      return;
    }

    if (phase === 'raise') {
      // Đà theo hướng ngắm hiện tại để đòn bám người chơi tới khi chốt.
      this.side = aim.x < 0 ? -1 : 1;
      const t = Phaser.Math.Clamp(elapsed / HAMMER_WINDUP_MS, 0, 1);
      const offset = Phaser.Math.Linear(
        -this.rad(HAMMER_REST_DEGREES),
        -this.rad(HAMMER_RAISE_DEGREES),
        Phaser.Math.Easing.Quadratic.Out(t),
      );

      this.applyPose(aim.angle(), offset, this.side);
      this.drawChargeIndicators(time, aim, false);

      return;
    }

    if (phase === 'hold' || phase === 'ready') {
      this.side = aim.x < 0 ? -1 : 1;
      this.applyPose(aim.angle(), -this.rad(HAMMER_RAISE_DEGREES), this.side);

      const progress = this.chargeProgress(time);
      const shake =
        phase === 'ready'
          ? HAMMER_VFX_READY_SHAKE_PX
          : HAMMER_VFX_RAISE_SHAKE_PX * progress;

      if (shake > 0) {
        this.sprite.x += Phaser.Math.FloatBetween(-shake, shake);
        this.sprite.y += Phaser.Math.FloatBetween(-shake, shake);
      }

      if (phase === 'ready') {
        this.sprite.setTint(
          Math.floor(time / HAMMER_VFX_BLINK_MS) % 2 === 0
            ? HAMMER_VFX_COLOR_CORE
            : HAMMER_VFX_COLOR_BODY,
        );
        this.tinted = true;
      }

      this.drawChargeIndicators(time, aim, true);

      return;
    }

    this.clearBlink();

    const charged = this.machine.getStrike() === 'charged';
    const strikeRad = this.rad(
      charged ? HAMMER_CHARGED_STRIKE_DEGREES : HAMMER_STRIKE_DEGREES,
    );
    const strikeAngle = this.machine.getStrikeAngle();

    if (phase === 'swing') {
      const t = Phaser.Math.Clamp(
        elapsed / (charged ? HAMMER_CHARGED_SWING_MS : HAMMER_SWING_MS),
        0,
        1,
      );
      // Ease-in: chậm lúc đầu rồi dồn lực — cảm giác nặng.
      const offset = Phaser.Math.Linear(
        -this.rad(HAMMER_RAISE_DEGREES),
        strikeRad,
        Phaser.Math.Easing.Cubic.In(t),
      );

      this.applyPose(strikeAngle, offset, this.side);
      this.drawTrail(offset, strikeAngle, charged);

      return;
    }

    // recover: khựng ở góc va chạm (nằm trong recoverMs) rồi kéo về tư thế nghỉ.
    const recoverMs = charged ? HAMMER_CHARGED_RECOVER_MS : HAMMER_RECOVER_MS;
    const holdMs = charged ? HAMMER_CHARGED_IMPACT_HOLD_MS : HAMMER_IMPACT_HOLD_MS;
    const pullT = Phaser.Math.Clamp(
      (elapsed - holdMs) / Math.max(1, recoverMs - holdMs),
      0,
      1,
    );
    const offset = Phaser.Math.Linear(
      strikeRad,
      -this.rad(HAMMER_REST_DEGREES),
      Phaser.Math.Easing.Quadratic.InOut(pullT),
    );

    this.applyPose(strikeAngle, offset, this.side);
    // Vệt mờ nhanh sau va chạm.
    this.trail.setAlpha(1 - Phaser.Math.Clamp(elapsed / recoverMs, 0, 1));
  }

  /** Nhấn/giữ: true CHỈ ở lần đầu thực sự khởi động raise (WorldScene khi đó bẻ tàng hình + phát anim thân). */
  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead()) {
      return false;
    }

    const started = this.machine.press(time, aim.angle());

    if (started) {
      this.side = aim.x < 0 ? -1 : 1;
      this.applyMoveFactor();
    }

    return started;
  }

  /** Thả nút: true CHỈ khi là đòn tích lực (thân phát anim đập thêm một lần); đòn thường trả false để không phát anim hai lần. */
  releaseAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead()) {
      return false;
    }

    const charged = this.machine.release(time, aim.angle());

    this.applyMoveFactor();

    return charged;
  }

  destroy(): void {
    this.cancelAttack();
    this.trail.destroy();
    this.chargeRing.destroy();
    this.impactPreview.destroy();
    this.sprite.destroy();
  }

  private rad(degrees: number): number {
    return Phaser.Math.DegToRad(degrees);
  }

  /** Báo hệ số tốc chạy theo pha cho Player, chỉ khi giá trị đổi. */
  private applyMoveFactor(): void {
    const factor = this.machine.getMoveFactor();

    if (factor !== this.appliedMoveFactor) {
      this.appliedMoveFactor = factor;
      this.player.setWeaponMoveFactor(factor);
    }
  }

  private clearBlink(): void {
    if (this.tinted) {
      this.tinted = false;
      this.sprite.clearTint();
    }
  }

  /** Tiến độ tích lực 0..1 tính từ mốc nhấn. */
  private chargeProgress(time: number): number {
    return Phaser.Math.Clamp(
      (time - this.machine.getPressTime()) / HAMMER_CHARGE_READY_MS,
      0,
      1,
    );
  }

  /** Đặt xoay + lật sprite; `side` đổi dấu để búa luôn nâng lên PHÍA TRÊN dù ngắm trái hay phải. */
  private applyPose(baseAngle: number, offset: number, side: number): void {
    this.sprite.setRotation(baseAngle + offset * side);
    setWeaponMirror(this.sprite, side < 0);
  }

  /** Vòng tiến độ quanh người + vùng dự báo điểm đập (chỉ khi `showPreview`). */
  private drawChargeIndicators(
    time: number,
    aim: Phaser.Math.Vector2,
    showPreview: boolean,
  ): void {
    const { x, y } = this.player;
    const progress = this.chargeProgress(time);
    const ready = this.machine.getPhase() === 'ready';
    const start = -Math.PI / 2;

    if (ready) {
      // Vòng KHÉP KÍN, nét dày "thở" theo chu kỳ.
      const breath = Math.sin((time / HAMMER_VFX_RING_BREATH_MS) * Math.PI * 2);

      this.chargeRing.lineStyle(
        HAMMER_VFX_RING_WIDTH_READY + HAMMER_VFX_RING_BREATH_PX * breath,
        HAMMER_VFX_COLOR_CORE,
        0.95,
      );
      this.chargeRing.strokeCircle(x, y, HAMMER_VFX_RING_RADIUS);
    } else if (progress > 0) {
      // Chưa đủ lực: cung hở, mảnh, tối, sáng dần.
      this.chargeRing.lineStyle(
        HAMMER_VFX_RING_WIDTH_CHARGING,
        HAMMER_VFX_COLOR_BODY,
        0.25 + 0.4 * progress,
      );
      this.chargeRing.beginPath();
      this.chargeRing.arc(
        x,
        y,
        HAMMER_VFX_RING_RADIUS,
        start,
        start + Math.PI * 2 * progress,
      );
      this.chargeRing.strokePath();
    }

    if (!showPreview) {
      return;
    }

    const angle = aim.angle();
    const px = x + Math.cos(angle) * HAMMER_CHARGED_REACH;
    const py = y + Math.sin(angle) * HAMMER_CHARGED_REACH;
    const alpha = Phaser.Math.Linear(
      HAMMER_VFX_PREVIEW_ALPHA_MIN,
      HAMMER_VFX_PREVIEW_ALPHA_READY,
      progress,
    );

    this.impactPreview.fillStyle(HAMMER_VFX_COLOR_BODY, alpha * 0.3);
    this.impactPreview.fillCircle(px, py, HAMMER_CHARGED_IMPACT_RADIUS);
    this.impactPreview.lineStyle(2, HAMMER_VFX_COLOR_BODY, alpha);
    this.impactPreview.strokeCircle(px, py, HAMMER_CHARGED_IMPACT_RADIUS);
  }

  /** Vừa đủ lực (đúng một lần): vòng sóng + chớp sáng tại người. */
  private onReady(): void {
    const vfx = VFXManager.for(this.scene);
    const { x, y } = this.player;

    vfx.play('ring.shock', {
      x,
      y,
      radius: HAMMER_VFX_READY_RING_RADIUS,
      tint: HAMMER_VFX_COLOR_CORE,
      durationMs: HAMMER_VFX_READY_RING_MS,
    });
    vfx.play('glow.flash', {
      x,
      y,
      tint: HAMMER_VFX_COLOR_CORE,
      scale: HAMMER_VFX_READY_GLOW_SCALE,
    });
  }

  /** Vệt ngắn: một cung mảnh phía sau đầu búa, vẽ lại bằng cùng một Graphics; đòn tích lực thêm vệt phụ mờ hơn. */
  private drawTrail(offset: number, strikeAngle: number, charged: boolean): void {
    const hand = this.sprite;
    const head = strikeAngle + offset * this.side;

    this.trail
      .clear()
      .setVisible(true)
      .setAlpha(1)
      .setPosition(hand.x, hand.y);

    this.strokeTrailArc(
      head,
      HAMMER_VFX_TRAIL_SPAN,
      HAMMER_VFX_TRAIL_RADIUS,
      3,
      NEON.hammer,
      0.55,
    );

    if (charged) {
      for (let i = 0; i < HAMMER_VFX_TRAIL_EXTRA_RADII.length; i += 1) {
        this.strokeTrailArc(
          head,
          HAMMER_VFX_TRAIL_SPAN * HAMMER_VFX_TRAIL_EXTRA_SPAN_FACTORS[i],
          HAMMER_VFX_TRAIL_EXTRA_RADII[i],
          2,
          HAMMER_VFX_COLOR_BODY,
          HAMMER_VFX_TRAIL_EXTRA_ALPHAS[i],
        );
      }
    }
  }

  private strokeTrailArc(
    head: number,
    span: number,
    radius: number,
    width: number,
    color: number,
    alpha: number,
  ): void {
    const tail = head - span * this.side;

    this.trail
      .lineStyle(width, color, alpha)
      .beginPath()
      .arc(0, 0, radius, Math.min(head, tail), Math.max(head, tail))
      .strokePath();
  }

  /** Đầu búa chạm đất: gây sát thương vùng đúng một lần + dựng hiệu ứng va chạm. */
  private impact(strike: HammerStrike): void {
    const charged = strike === 'charged';
    const stats = this.player.getStats();
    const angle = this.machine.getStrikeAngle();
    const reach = charged ? HAMMER_CHARGED_REACH : HAMMER_REACH;
    const x = this.player.x + Math.cos(angle) * reach;
    const y = this.player.y + Math.sin(angle) * reach;
    const radius = charged ? HAMMER_CHARGED_IMPACT_RADIUS : HAMMER_IMPACT_RADIUS;
    const radiusSq = radius * radius;
    const damage =
      ((charged ? HAMMER_CHARGED_DAMAGE : HAMMER_DAMAGE) + stats.meleeDamageBonus) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier;
    const stunMs = charged ? HAMMER_CHARGED_STUN_MS : HAMMER_STUN_MS;
    const pushSpeed = charged ? HAMMER_CHARGED_PUSH_SPEED : HAMMER_PUSH_SPEED;
    const vfx = VFXManager.for(this.scene);
    const hit: EnemyBase[] = [];

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

      // Thứ tự bắt buộc: takeDamage tự gán choáng ngắn nên phải choáng/đẩy SAU nó.
      enemy.takeDamage(damage, this.player.x, this.player.y);
      enemy.applyStun(stunMs);
      enemy.applyPush(x, y, pushSpeed);
      vfx.play('impact.hit', { x: enemy.x, y: enemy.y, tint: NEON.hammer });
      hit.push(enemy);
    }

    if (charged) {
      // Hất tung (chỉ hiển thị) các quái gần nhất, trừ boss (chỉ choáng/đẩy đã tự giảm).
      const launchable = hit
        .filter((enemy) => enemy.isAlive() && !(enemy instanceof BossEnemy))
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(x, y, a.x, a.y) -
            Phaser.Math.Distance.Between(x, y, b.x, b.y),
        )
        .slice(0, HAMMER_CHARGED_MAX_LAUNCHED);

      for (const enemy of launchable) {
        launchSprite(
          this.scene,
          enemy,
          HAMMER_CHARGED_LAUNCH_HEIGHT,
          HAMMER_CHARGED_LAUNCH_MS,
        );
      }

      this.playChargedImpactVfx(vfx, x, y);

      return;
    }

    this.playNormalImpactVfx(vfx, x, y, hit.length > 0);
  }

  /** Hiệu ứng mặt đất luôn có (đập xuống đất dù không trúng ai); trúng thì thêm ring + rung mạnh hơn. */
  private playNormalImpactVfx(
    vfx: VFXManager,
    x: number,
    y: number,
    hitAny: boolean,
  ): void {
    vfx.play('ground.crack', {
      x,
      y,
      radius: HAMMER_VFX_CRACK_RADIUS,
      tint: NEON.hammer,
    });

    if (hitAny) {
      vfx.play('ring.shock', {
        x,
        y,
        radius: HAMMER_IMPACT_RADIUS,
        tint: NEON.hammer,
        durationMs: HAMMER_VFX_HIT_RING_MS,
      });
    }

    for (let i = 0; i < HAMMER_VFX_DUST_COUNT; i += 1) {
      vfx.play('dust.puff', {
        x: x + Phaser.Math.Between(-HAMMER_VFX_DUST_JITTER_PX, HAMMER_VFX_DUST_JITTER_PX),
        y: y + Phaser.Math.Between(-HAMMER_VFX_DUST_JITTER_PX, HAMMER_VFX_DUST_JITTER_PX),
        tint: NEON.hammer,
      });
    }

    vfx.play('burst.sparks', {
      x,
      y,
      tint: NEON.hammer,
      count: HAMMER_VFX_SPARKS,
      speed: HAMMER_VFX_SPARKS_SPEED,
    });
    vfx.play('burst.sparks', {
      x,
      y,
      tint: HAMMER_VFX_COLOR_ROCK,
      count: HAMMER_VFX_ROCKS,
      speed: HAMMER_VFX_ROCKS_SPEED,
    });

    const shake = hitAny ? HAMMER_VFX_SHAKE_HIT : HAMMER_VFX_SHAKE_MISS;

    this.scene.cameras.main.shake(shake.ms, shake.intensity);
  }

  /** Chấn Địa Kích: ưu tiên ground.crack + ring.shock trước, dust.puff sau (pool VFX có trần). */
  private playChargedImpactVfx(vfx: VFXManager, x: number, y: number): void {
    const cracks = Phaser.Math.Between(
      HAMMER_VFX_CHARGED_CRACK_MIN,
      HAMMER_VFX_CHARGED_CRACK_MAX,
    );

    for (let i = 0; i < cracks; i += 1) {
      vfx.play('ground.crack', {
        x,
        y,
        radius: HAMMER_VFX_CHARGED_CRACK_RADIUS,
        angle: Math.random() * Math.PI * 2,
        tint: NEON.hammer,
      });
    }

    vfx.play('ring.shock', {
      x,
      y,
      radius: HAMMER_VFX_CHARGED_RING_OUTER.radius,
      tint: HAMMER_VFX_COLOR_BODY,
      durationMs: HAMMER_VFX_CHARGED_RING_OUTER.ms,
    });
    vfx.play('ring.shock', {
      x,
      y,
      radius: HAMMER_VFX_CHARGED_RING_INNER.radius,
      tint: HAMMER_VFX_COLOR_CORE,
      durationMs: HAMMER_VFX_CHARGED_RING_INNER.ms,
    });

    vfx.play('glow.flash', {
      x,
      y,
      tint: HAMMER_VFX_COLOR_CORE,
      scale: HAMMER_VFX_CHARGED_GLOW.scale,
      alpha: HAMMER_VFX_CHARGED_GLOW.alpha,
      durationMs: HAMMER_VFX_CHARGED_GLOW.ms,
    });
    vfx.play('burst.sparks', {
      x,
      y,
      tint: HAMMER_VFX_COLOR_BODY,
      count: HAMMER_VFX_CHARGED_SPARKS,
      speed: HAMMER_VFX_CHARGED_SPARKS_SPEED,
    });
    vfx.play('burst.sparks', {
      x,
      y,
      tint: HAMMER_VFX_COLOR_ROCK,
      count: HAMMER_VFX_CHARGED_ROCKS,
      speed: HAMMER_VFX_CHARGED_ROCKS_SPEED,
    });

    const dust = Phaser.Math.Between(
      HAMMER_VFX_CHARGED_DUST_MIN,
      HAMMER_VFX_CHARGED_DUST_MAX,
    );

    for (let i = 0; i < dust; i += 1) {
      vfx.play('dust.puff', {
        x:
          x +
          Phaser.Math.Between(
            -HAMMER_VFX_CHARGED_DUST_JITTER_PX,
            HAMMER_VFX_CHARGED_DUST_JITTER_PX,
          ),
        y:
          y +
          Phaser.Math.Between(
            -HAMMER_VFX_CHARGED_DUST_JITTER_PX,
            HAMMER_VFX_CHARGED_DUST_JITTER_PX,
          ),
        tint: NEON.hammer,
      });
    }

    this.scene.cameras.main.shake(
      HAMMER_VFX_SHAKE_CHARGED.ms,
      HAMMER_VFX_SHAKE_CHARGED.intensity,
    );
  }
}
