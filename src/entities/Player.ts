import Phaser from 'phaser';

import {
  BERSERK_ARMOR_MULT,
  BERSERK_DAMAGE_MULT,
  BERSERK_DURATION_MS,
  BERSERK_EXHAUST_MS,
  BERSERK_HEALTH_MULT,
  BERSERK_SCALE,
  EXHAUST_DAMAGE_MULT,
  EXHAUST_HEALTH,
  DASH_COOLDOWN_MS,
  DASH_DURATION_MS,
  DASH_INVULNERABLE_MS,
  DASH_SPEED,
  PLAYER_ARMOR_REGEN_DELAY_MS,
  PLAYER_ARMOR_REGEN_INTERVAL_MS,
  PLAYER_ENERGY_REGEN_PER_SECOND,
  PLAYER_INVULNERABLE_MS,
  SHIELD_GUARD_ARC_HALF_DEGREES,
  SHIELD_GUARD_BOSS_REDUCTION,
  SHIELD_GUARD_REDUCTION,
} from '../config/combatConfig';
import { isHitBlockedByDomain } from '../combat/domainBarrier';
import { tryAbsorbHit } from '../combat/fortressWall';
import { PLAYER_SPEED } from '../config/constants';
import { createBaseStats, type CombatStats } from '../progression/buffTypes';
import {
  effectiveResist,
  stochasticRound,
} from '../combat/damage/resolveDamage';
import {
  ARMOR_PEN_MAX,
  ELEMENT_COLORS,
  POOL_SHARE_ELEMENTAL,
  POOL_SHARE_PHYSICAL,
  type DamageType,
} from '../config/damageTypeConfig';
import { spawnDust, spawnGlow } from '../utils/effects';
import {
  directionFromVector,
  getHeroHandOffset,
  type HeroHand,
  type PlayerAction,
  type PlayerDirection,
} from '../utils/placeholderPlayer';

/** Trạng thái Cuồng Nộ của Đấu sĩ: NORMAL → BERSERK → EXHAUSTED → NORMAL. */
export type RageState = 'normal' | 'berserk' | 'exhausted';

const BERSERK_TINT = 0xff6a4a;
const EXHAUST_TINT = 0x8a8f9c;
const ATTACK_ANIM_MS = 260;
const PLAYER_BODY_OFFSET_Y = 16;
const HURT_ANIM_MS = 200;

export interface PlayerConfig {
  textureKey: string;
  animPrefix: string;
  baseHealth: number;
  baseArmor: number;
  baseEnergy: number;
  speedMultiplier: number;
  /** Hệ số sát thương riêng của class (đấu sĩ > pháp sư > sát thủ). */
  damageMultiplier: number;
}

/**
 * Nhân vật người chơi.
 *
 * Chỉ số gốc do class nhân vật quyết định; buff truyền vào qua `applyStats()`.
 * Animation theo 4 hướng, gồm idle/run/attack/hurt/death.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly config: PlayerConfig;
  private stats: CombatStats = createBaseStats();
  private health: number;
  private armor: number;
  private energy: number;
  private invulnerableUntil = 0;
  private nextArmorRegenAt = 0;
  /** Xác suất né hoàn toàn một đòn (từ kỹ năng bị động). */
  private dodgeChance = 0;
  /** Khiên đang giơ chắn (giữ nút đánh khi cầm Khiên) và hướng chắn (radian). */
  private guarding = false;
  private guardAngle = 0;
  /** Hệ số tốc chạy / sát thương nhận từ kỹ năng duy trì (Song Thủ Khiên). */
  private moveSpeedFactor = 1;
  /** Hệ số tốc chạy do vũ khí đặt (Búa nặng khi tích lực/giáng); tách riêng khỏi moveSpeedFactor của Song Thủ Khiên/Tàng hình. */
  private weaponMoveFactor = 1;
  private damageTakenFactor = 1;
  /** Tăng tốc hồi giáp (0.2 = hồi nhanh hơn 20%), từ passive Ý Chí Sắt. */
  private armorRegenSpeed = 0;
  private momentumPerStack = 0;
  private momentumMaxStacks = 0;
  private momentumDurationMs = 0;
  private momentumStacks = 0;
  private momentumUntil = 0;
  private energyAbsorb = 0;
  private energyPerDamage = 4;
  private energyRegenBonus = 0;
  private energyRegenFactor = 1;
  /** Gọi khi giáp vừa bị đánh về 0 (Giáp Vỡ Phản Chấn). */
  onArmorBroken: (() => void) | null = null;
  /** Gọi khi né thành công một đòn (Phản Xạ Ma). */
  onDodge: (() => void) | null = null;
  /** Gọi khi thật sự bị trúng đòn (sau né/giảm sát thương), kèm sát thương nhận. Ngọc Phản Đòn dùng. */
  onHurt: ((amount: number) => void) | null = null;
  /** Sau khi đòn trúng: loại + tổng sát thương thực tế (giáp + HP) để hiện số. */
  onDamageTaken: ((type: DamageType, amount: number) => void) | null = null;
  /** Trong làng: không nhận sát thương. */
  private safeZone = false;

  setSafeZone(safe: boolean): void {
    this.safeZone = safe;
  }
  private quickDrawBonus = 0;
  private quickDrawWindowMs = 0;
  private quickDrawUntil = 0;
  private quickDrawFreeShot = false;
  private nextFootstepAt = 0;
  private stealthUntil = 0;
  private speedBoostUntil = 0;
  private speedBoostMultiplier = 1;
  private damageReductionUntil = 0;
  private damageReductionPercent = 0;
  private giantUntil = 0;
  private giantDamageMultiplier = 1;
  /** Buff giáp duy trì: tăng giáp tối đa trong một khoảng thời gian. */
  private armorBuffUntil = 0;
  private armorBuffBonus = 0;
  /** Buff cận chiến duy trì: tăng sát thương và tốc đánh vũ khí cận chiến. */
  private meleeFuryUntil = 0;
  private meleeFuryDamageMultiplier = 1;
  private meleeFuryAttackSpeed = 1;
  private dead = false;
  /**
   * Cuồng Nộ/Kiệt Quệ: chỉ lưu trạng thái + mốc thời gian. Mọi hệ số (HP, giáp,
   * sát thương) được TÍNH từ trạng thái trong getter nên không thể cộng dồn.
   */
  private rageState: RageState = 'normal';
  private rageUntil = 0;
  private rootedUntil = 0;
  private immobilized = false;
  /** Gọi mỗi khi `rageState` đổi (để skill dọn VFX/HUD). */
  onRageStateChange: ((state: RageState) => void) | null = null;

  private dashReadyAt = 0;
  private dashChargeMax = 0;
  private dashChargeRechargeMs = 0;
  private dashChargeReadyAt: number[] = [];
  private dashUntil = 0;
  private dashSpeed = DASH_SPEED;
  private readonly dashDirection = new Phaser.Math.Vector2();

  private facing: PlayerDirection = 'down';
  /** Hướng cưỡng bức của thân khi đang xoay vòng (null = theo aim/di chuyển như thường). */
  private facingOverride: Phaser.Math.Vector2 | null = null;
  private actionLockUntil = 0;
  private deathAnimated = false;
  private visualLift = 0;
  private leaping = false;
  private weaponAimOverride: Phaser.Math.Vector2 | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: PlayerConfig,
  ) {
    super(scene, x, y, config.textureKey, 'down-idle-0');

    this.config = config;
    this.health = config.baseHealth;
    this.armor = config.baseArmor;
    this.energy = config.baseEnergy;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5);
    this.setCollideWorldBounds(true);
    this.setBodySize(24, 28);
    this.setOffset(12, PLAYER_BODY_OFFSET_Y);
    this.setDepth(10);

    this.anims.play(`${config.animPrefix}-down-idle`, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.setDepth(this.y + 20);

    // Scale có thể đổi giữa chừng (Cuồng Nộ): áp lại độ cao để body không lệch.
    if (this.visualLift !== 0) {
      this.applyVisualLift();
    }
  }

  /**
   * Độ cao CHỈ ĐỂ HIỂN THỊ (px, số nguyên): nâng hình lên mà không đổi `x/y`.
   * Hitbox, camera, depth và va chạm vẫn dùng toạ độ mặt đất. Đổi origin dời hình lên,
   * đồng thời bù `body.offset` cùng lượng để body đứng yên
   * (Body.position = y + scaleY * (offset.y - displayOriginY)).
   */
  setVisualLift(height: number): void {
    const rounded = Math.round(height);

    if (rounded === this.visualLift) {
      return;
    }

    this.visualLift = rounded;
    this.applyVisualLift();
  }

  getVisualLift(): number {
    return this.visualLift;
  }

  private applyVisualLift(): void {
    const body = this.body;
    const scaleY = Math.abs(this.scaleY) || 1;
    const localLift = this.visualLift / scaleY;

    this.setOrigin(0.5, 0.5 + localLift / this.height);

    if (body instanceof Phaser.Physics.Arcade.Body) {
      body.offset.y = PLAYER_BODY_OFFSET_Y + localLift;
    }
  }

  /** Đang trong cú nhảy Đập Đất: chặn đánh/kỹ năng khác. */
  isLeaping(): boolean {
    return this.leaping;
  }

  setLeaping(value: boolean): void {
    this.leaping = value;

    if (!value) {
      this.weaponAimOverride = null;
    }
  }

  /** Ép hướng vũ khí (null = theo hướng ngắm thường). Vector được sao chép. */
  setWeaponAimOverride(x: number, y: number): void {
    this.weaponAimOverride ??= new Phaser.Math.Vector2();
    this.weaponAimOverride.set(x, y);
  }

  clearWeaponAimOverride(): void {
    this.weaponAimOverride = null;
  }

  getWeaponAimOverride(): Phaser.Math.Vector2 | null {
    return this.weaponAimOverride;
  }

  /** Giữ nguyên animation hiện tại đến `until` (ms theo đồng hồ scene). */
  lockAnimation(until: number): void {
    this.actionLockUntil = Math.max(this.actionLockUntil, until);
  }

  releaseAnimationLock(): void {
    this.actionLockUntil = 0;
  }

  /** Vector đơn vị theo hướng nhân vật đang quay mặt (4 hướng). */
  getFacingVector(out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    switch (this.facing) {
      case 'left':
        return out.set(-1, 0);
      case 'right':
        return out.set(1, 0);
      case 'up':
        return out.set(0, -1);
      default:
        return out.set(0, 1);
    }
  }

  /** Giữ chân tại chỗ (Tự Bạo đang nạp): không đi, không dash. Đòn đánh/kỹ năng vẫn dùng được. */
  root(time: number, durationMs: number): void {
    if (this.dead || durationMs <= 0) {
      return;
    }

    this.rootedUntil = Math.max(this.rootedUntil, time + durationMs);
    this.cancelDash();
  }

  isRooted(): boolean {
    return (
      !this.dead &&
      (this.immobilized || this.scene.time.now < this.rootedUntil)
    );
  }

  /** Cố định vô thời hạn (Bất Động Thành Lũy) tới khi gọi lại với false; chặn đi và dash như `root`. */
  setImmobilized(immobilized: boolean): void {
    this.immobilized = immobilized;

    if (immobilized) {
      this.cancelDash();
    }
  }

  move(direction: Phaser.Math.Vector2): void {
    if (this.dead || this.isRooted()) {
      this.stopMoving();
      return;
    }

    const boost =
      this.scene.time.now < this.speedBoostUntil
        ? this.speedBoostMultiplier
        : 1;
    const speed =
      PLAYER_SPEED *
      this.config.speedMultiplier *
      this.stats.moveSpeedMultiplier *
      this.moveSpeedFactor *
      this.weaponMoveFactor *
      boost;

    this.setVelocity(direction.x * speed, direction.y * speed);
  }

  stopMoving(): void {
    this.setVelocity(0, 0);
  }

  /** Huỷ dash đang chạy, dùng khi kỹ năng dịch chuyển tức thời thay đổi vị trí. */
  cancelDash(): void {
    this.dashUntil = 0;
    this.stopMoving();
  }

  /** Cập nhật animation: chạy theo hướng di chuyển, đứng/đánh theo hướng ngắm. */
  updateAnimation(
    time: number,
    aim: Phaser.Math.Vector2,
    moveDirection: Phaser.Math.Vector2,
  ): void {
    if (this.dead) {
      if (!this.deathAnimated) {
        this.deathAnimated = true;
        this.playAction('death');
      }

      return;
    }

    // Đang xoay người (liềm xoay/lốc xoáy): thân quay theo hướng cưỡng bức, bỏ qua khóa animation đánh.
    if (this.facingOverride) {
      this.facing = directionFromVector(this.facingOverride.x, this.facingOverride.y);
      this.playAction('attack');

      return;
    }

    const moving = moveDirection.lengthSq() > 0;
    const facingSource = this.isDashing(time)
      ? this.dashDirection
      : moving
        ? moveDirection
        : aim;

    this.facing = directionFromVector(facingSource.x, facingSource.y);

    if (time < this.actionLockUntil) {
      return;
    }

    this.playAction(moving || this.isDashing(time) ? 'run' : 'idle');
  }

  /**
   * Ép thân người quay về hướng (x, y) mỗi frame — dùng khi vũ khí xoay vòng (liềm), để cả người
   * xoay theo thay vì chỉ vũ khí. Gọi `clearFacingOverride` khi kết thúc.
   */
  setFacingOverride(x: number, y: number): void {
    this.facingOverride ??= new Phaser.Math.Vector2();
    this.facingOverride.set(x, y);
  }

  clearFacingOverride(): void {
    this.facingOverride = null;
  }

  /**
   * Vị trí bàn tay trong thế giới theo frame đang chiếu, để gắn vũ khí vào tay.
   * `forward` đẩy điểm ra phía trước theo hướng ngắm (để vũ khí nằm trong tay, không lơ lửng).
   */
  getHandPoint(
    hand: HeroHand,
    aim: Phaser.Math.Vector2,
    forward = 0,
    out: Phaser.Math.Vector2 = new Phaser.Math.Vector2(),
  ): Phaser.Math.Vector2 {
    const offset = getHeroHandOffset(String(this.frame.name), hand);

    return out.set(
      this.x + (offset?.x ?? 0) * this.scaleX + aim.x * forward,
      this.y + (offset?.y ?? 0) * this.scaleY + aim.y * forward - this.visualLift,
    );
  }

  playAttack(time: number, aim: Phaser.Math.Vector2): void {
    if (this.dead) {
      return;
    }

    this.facing = directionFromVector(aim.x, aim.y);
    this.actionLockUntil = time + ATTACK_ANIM_MS;
    this.anims.play(
      `${this.config.animPrefix}-${this.facing}-attack`,
      true,
    );
  }

  private playAction(action: PlayerAction): void {
    const key = `${this.config.animPrefix}-${this.facing}-${action}`;

    if (this.anims.currentAnim?.key === key) {
      return;
    }

    this.anims.play(key, true);
  }

  tryDash(direction: Phaser.Math.Vector2, time: number): boolean {
    if (
      this.dead ||
      this.isRooted() ||
      time < this.dashReadyAt ||
      direction.lengthSq() === 0
    ) {
      return false;
    }

    this.beginDash(direction, time, DASH_DURATION_MS, DASH_SPEED);
    this.dashReadyAt = time + DASH_COOLDOWN_MS;
    return true;
  }

  /**
   * Dash của kỹ năng: không dùng chung cooldown với Dash thường.
   * `invulnerableMs` bỏ trống = giữ hành vi cũ; 0 = không bất tử.
   */
  startSkillDash(
    direction: Phaser.Math.Vector2,
    time: number,
    durationMs: number,
    speed: number,
    invulnerableMs?: number,
  ): void {
    if (this.dead || this.isRooted() || direction.lengthSq() === 0) {
      return;
    }

    this.beginDash(direction, time, durationMs, speed, invulnerableMs);
  }

  /** Cấu hình số lượt lướt tích trữ (0 = không dùng). Đầy lượt khi gọi. */
  configureDashCharges(max: number, rechargeMs: number): void {
    this.dashChargeMax = max;
    this.dashChargeRechargeMs = rechargeMs;
    this.dashChargeReadyAt = new Array<number>(max).fill(0);
  }

  /** Nâng/hạ trần lượt lướt (ví dụ mở thêm lượt ở Lv5), giữ lượt đang hồi. */
  setDashChargeMax(max: number): void {
    while (this.dashChargeReadyAt.length < max) {
      this.dashChargeReadyAt.push(0);
    }

    this.dashChargeMax = max;
    this.dashChargeReadyAt.length = max;
  }

  getDashCharges(time: number): number {
    return this.dashChargeReadyAt.filter((readyAt) => readyAt <= time)
      .length;
  }

  getDashChargeMax(): number {
    return this.dashChargeMax;
  }

  /** Bản chụp mốc hồi từng lượt lướt tích trữ (thời gian tuyệt đối), để mang sang scene khác. */
  getDashChargeReadyAt(): number[] {
    return [...this.dashChargeReadyAt];
  }

  /** Áp lại mốc hồi lượt lướt đã chụp; chiều dài theo trần hiện tại (thiếu = đã sẵn sàng). */
  setDashChargeReadyAt(readyAt: readonly number[]): void {
    this.dashChargeReadyAt = this.dashChargeReadyAt.map(
      (_, index) => readyAt[index] ?? 0,
    );
  }

  /** Mốc hết hồi Dash thường (thời gian tuyệt đối). */
  getDashReadyAt(): number {
    return this.dashReadyAt;
  }

  setDashReadyAt(readyAt: number): void {
    this.dashReadyAt = readyAt;
  }

  /** HP, giáp, năng lượng hiện tại (để lưu vào RunSession khi đổi scene). */
  getVitals(): { health: number; armor: number; energy: number } {
    return { health: this.health, armor: this.armor, energy: this.energy };
  }

  /** Áp lại HP/giáp/EN đã chụp, kẹp theo tối đa hiện tại (HP tối thiểu 1 để không "chết" khi áp). */
  setVitals(vitals: { health: number; armor: number; energy: number }): void {
    if (this.dead) {
      return;
    }

    this.health = Phaser.Math.Clamp(vitals.health, 1, this.getMaxHealth());
    this.armor = Phaser.Math.Clamp(vitals.armor, 0, this.getMaxArmor());
    this.energy = Phaser.Math.Clamp(vitals.energy, 0, this.getMaxEnergy());
  }

  /** Thời gian tới khi có thêm một lượt (0 nếu còn lượt hoặc không dùng lượt). */
  getNextDashChargeIn(time: number): number {
    if (this.dashChargeMax <= 0 || this.getDashCharges(time) > 0) {
      return 0;
    }

    return Math.max(0, Math.min(...this.dashChargeReadyAt) - time);
  }

  /** Tiêu một lượt; các lượt hồi lần lượt (không hồi song song). */
  tryConsumeDashCharge(time: number): boolean {
    if (this.dead || this.dashChargeMax <= 0) {
      return false;
    }

    let slot = -1;

    for (let i = 0; i < this.dashChargeReadyAt.length; i += 1) {
      if (
        this.dashChargeReadyAt[i] <= time &&
        (slot === -1 ||
          this.dashChargeReadyAt[i] < this.dashChargeReadyAt[slot])
      ) {
        slot = i;
      }
    }

    if (slot === -1) {
      return false;
    }

    this.dashChargeReadyAt[slot] =
      Math.max(time, ...this.dashChargeReadyAt) +
      this.dashChargeRechargeMs;
    return true;
  }

  private beginDash(
    direction: Phaser.Math.Vector2,
    time: number,
    durationMs: number,
    speed: number,
    invulnerableMs?: number,
  ): void {
    this.dashDirection.copy(direction).normalize();
    this.dashUntil = time + durationMs;
    this.dashSpeed = speed;

    const invulnerable =
      invulnerableMs ?? Math.max(DASH_INVULNERABLE_MS, durationMs + 60);

    if (invulnerable > 0) {
      this.invulnerableUntil = Math.max(
        this.invulnerableUntil,
        time + invulnerable,
      );
    }

    this.setVelocity(
      this.dashDirection.x * this.dashSpeed,
      this.dashDirection.y * this.dashSpeed,
    );
  }

  isDashing(time: number): boolean {
    return !this.dead && time < this.dashUntil;
  }

  updateDash(time: number): void {
    if (this.dead) {
      this.stopMoving();
      return;
    }

    if (time < this.dashUntil) {
      this.setVelocity(
        this.dashDirection.x * this.dashSpeed,
        this.dashDirection.y * this.dashSpeed,
      );
    }
  }

  getDashCooldownRemaining(time: number): number {
    return Math.max(0, this.dashReadyAt - time);
  }

  grantInvulnerability(time: number, durationMs: number): void {
    this.invulnerableUntil = Math.max(
      this.invulnerableUntil,
      time + durationMs,
    );
  }

  applyStats(stats: Readonly<CombatStats>): void {
    const previousMaxHealth = this.getMaxHealth();
    const previousMaxArmor = this.getMaxArmor();
    const previousMaxEnergy = this.getMaxEnergy();

    this.stats = {
      ...stats,
      damageMultiplier: stats.damageMultiplier * this.config.damageMultiplier,
    };

    const healthDelta = this.getMaxHealth() - previousMaxHealth;
    const armorDelta = this.getMaxArmor() - previousMaxArmor;
    const energyDelta = this.getMaxEnergy() - previousMaxEnergy;

    if (healthDelta > 0) {
      this.health += healthDelta;
    }

    if (armorDelta > 0) {
      this.armor += armorDelta;
    }

    if (energyDelta > 0) {
      this.energy += energyDelta;
    }

    this.health = Math.min(this.health, this.getMaxHealth());
    this.armor = Math.min(this.armor, this.getMaxArmor());
    this.energy = Math.min(this.energy, this.getMaxEnergy());
  }

  getStats(): Readonly<CombatStats> {
    const now = this.scene.time.now;
    const giantDamage =
      now < this.giantUntil ? this.giantDamageMultiplier : 1;
    const meleeDamage =
      now < this.meleeFuryUntil ? this.meleeFuryDamageMultiplier : 1;
    const rageDamage = this.getRageDamageMultiplier();

    if (giantDamage === 1 && meleeDamage === 1 && rageDamage === 1) {
      return this.stats;
    }

    return {
      ...this.stats,
      meleeDamageMultiplier:
        this.stats.meleeDamageMultiplier * meleeDamage,
      damageMultiplier:
        this.stats.damageMultiplier * giantDamage * rageDamage,
    };
  }

  getRageState(): RageState {
    return this.rageState;
  }

  /** Mili-giây còn lại của trạng thái Cuồng Nộ/Kiệt Quệ hiện tại (0 nếu NORMAL). */
  getRageRemaining(time: number): number {
    return this.rageState === 'normal' || this.dead
      ? 0
      : Math.max(0, this.rageUntil - time);
  }

  private getRageDamageMultiplier(): number {
    if (this.rageState === 'berserk') {
      return BERSERK_DAMAGE_MULT;
    }

    return this.rageState === 'exhausted' ? EXHAUST_DAMAGE_MULT : 1;
  }

  /** Kháng nguyên tố hiện hành; Cuồng Nộ nhân hệ số giáp (giới hạn kháng vẫn do pipeline áp). */
  private getResist(): CombatStats['resist'] {
    if (this.rageState !== 'berserk') {
      return this.stats.resist;
    }

    const scaled: CombatStats['resist'] = {};

    for (const [type, value] of Object.entries(this.stats.resist) as Array<
      [keyof CombatStats['resist'], number]
    >) {
      scaled[type] = value * BERSERK_ARMOR_MULT;
    }

    return scaled;
  }

  /** Có thể bắt đầu Cuồng Nộ không (còn sống, đang NORMAL). */
  canStartBerserk(): boolean {
    return !this.dead && this.rageState === 'normal';
  }

  /**
   * Bắt đầu Cuồng Nộ. HP tối đa ×3 và HP hiện tại ×3 (giữ nguyên % máu);
   * giáp tối đa ×1.5 và giáp hiện tại tăng đúng phần chênh. Trả false nếu không hợp lệ.
   */
  startBerserk(time: number): boolean {
    if (!this.canStartBerserk()) {
      return false;
    }

    const healthBefore = this.getMaxHealth();
    const armorBefore = this.getMaxArmor();

    this.rageState = 'berserk';
    this.rageUntil = time + BERSERK_DURATION_MS;
    this.health = Math.min(
      this.getMaxHealth(),
      this.health * (this.getMaxHealth() / healthBefore),
    );
    this.armor += Math.max(0, this.getMaxArmor() - armorBefore);
    this.setScale(BERSERK_SCALE);
    this.setTint(BERSERK_TINT);
    this.onRageStateChange?.('berserk');

    return true;
  }

  /** Hết Cuồng Nộ: gỡ modifier, HP = 1 chính xác, sang Kiệt Quệ (không tự hồi máu). */
  private endBerserk(time: number): void {
    this.rageState = 'exhausted';
    this.rageUntil = time + BERSERK_EXHAUST_MS;
    this.health = Math.min(EXHAUST_HEALTH, this.getMaxHealth());
    this.armor = Math.min(this.armor, this.getMaxArmor());
    this.setScale(this.giantUntil > 0 ? this.scaleX : 1);
    this.setTint(EXHAUST_TINT);
    this.onRageStateChange?.('exhausted');
  }

  private endExhaustion(): void {
    this.rageState = 'normal';
    this.rageUntil = 0;
    this.clearTint();
    this.onRageStateChange?.('normal');
  }

  /** Hủy Cuồng Nộ/Kiệt Quệ không phản phệ (khi chết). */
  private resetRage(): void {
    if (this.rageState === 'normal') {
      return;
    }

    this.rageState = 'normal';
    this.rageUntil = 0;
    this.clearTint();
    this.onRageStateChange?.('normal');
  }

  /** Hy sinh (Tự Bạo): chết ngay, bỏ qua bất tử/giáp. Gọi SAU khi đã áp sát thương vụ nổ. */
  sacrifice(): void {
    if (this.dead) {
      return;
    }

    this.health = 0;
    this.die();
  }

  isInSafeZone(): boolean {
    return this.safeZone;
  }

  private die(): void {
    this.dead = true;
    this.deathAnimated = false;
    this.giantUntil = 0;
    this.giantDamageMultiplier = 1;
    this.armorBuffUntil = 0;
    this.armorBuffBonus = 0;
    this.meleeFuryUntil = 0;
    this.meleeFuryDamageMultiplier = 1;
    this.meleeFuryAttackSpeed = 1;
    this.resetRage();
    this.setScale(1);
    this.stopMoving();
    this.setAlpha(1);
  }

  heal(amount: number): void {
    if (this.dead || amount <= 0) {
      return;
    }

    this.health = Math.min(this.getMaxHealth(), this.health + amount);
  }

  addArmor(amount: number): void {
    if (this.dead || amount <= 0) {
      return;
    }

    this.armor = Math.min(this.getMaxArmor(), this.armor + amount);
  }

  /**
   * Tăng giáp tối đa trong một khoảng thời gian.
   * Nhiều kỹ năng dùng chung buff này: giữ mức cộng cao nhất và làm mới thời gian.
   */
  grantArmorBuff(time: number, durationMs: number, bonus: number): void {
    if (this.dead || durationMs <= 0 || bonus <= 0) {
      return;
    }

    const activeBonus =
      time < this.armorBuffUntil ? this.armorBuffBonus : 0;
    const nextBonus = Math.max(activeBonus, Math.floor(bonus));

    if (nextBonus > activeBonus) {
      this.armor += nextBonus - activeBonus;
    }

    this.armorBuffBonus = nextBonus;
    this.armorBuffUntil = Math.max(
      this.armorBuffUntil,
      time + durationMs,
    );
    this.armor = Math.min(
      this.armor,
      this.config.baseArmor + this.stats.maxArmorBonus + nextBonus,
    );
  }

  /**
   * Buff cận chiến duy trì: nhân sát thương vũ khí cận chiến và giảm hồi chiêu
   * đánh thường. Các nguồn buff lấy hệ số cao nhất và cộng dồn thời gian.
   */
  grantMeleeFury(
    time: number,
    durationMs: number,
    damageMultiplier: number,
    attackSpeedMultiplier: number,
  ): void {
    if (this.dead || durationMs <= 0) {
      return;
    }

    const active = time < this.meleeFuryUntil;

    this.meleeFuryDamageMultiplier = active
      ? Math.max(this.meleeFuryDamageMultiplier, damageMultiplier)
      : damageMultiplier;
    this.meleeFuryAttackSpeed = active
      ? Math.max(this.meleeFuryAttackSpeed, attackSpeedMultiplier)
      : attackSpeedMultiplier;
    this.meleeFuryUntil = Math.max(
      this.meleeFuryUntil,
      time + durationMs,
    );
  }

  /** Hệ số hồi chiêu đánh thường của vũ khí cận chiến (0.8 = nhanh hơn 20%). */
  getMeleeAttackCooldownMultiplier(time: number): number {
    if (this.dead) {
      return 1;
    }

    const fury =
      time >= this.meleeFuryUntil ? 1 : Math.max(1, this.meleeFuryAttackSpeed);
    const momentum =
      this.momentumStacks > 0 && time < this.momentumUntil
        ? 1 + this.momentumStacks * this.momentumPerStack
        : 1;

    return 1 / (fury * momentum);
  }

  /** Rút Nhanh: cấu hình từ passive (bonus = 0 nghĩa là tắt). */
  configureQuickDraw(bonus: number, windowMs: number): void {
    this.quickDrawBonus = bonus;
    this.quickDrawWindowMs = windowMs;

    if (bonus <= 0) {
      this.quickDrawUntil = 0;
      this.quickDrawFreeShot = false;
    }
  }

  /** Sau khi lăn/dịch chuyển: mở cửa sổ bắn nhanh và cho 1 phát bắn miễn EN. */
  triggerQuickDraw(time: number): void {
    if (this.dead || this.quickDrawBonus <= 0) {
      return;
    }

    this.quickDrawUntil = time + this.quickDrawWindowMs;
    this.quickDrawFreeShot = true;
  }

  isQuickDrawActive(time: number): boolean {
    return this.quickDrawBonus > 0 && time < this.quickDrawUntil;
  }

  /** Hệ số hồi chiêu đánh thường của vũ khí tầm xa (0.88 = nhanh hơn 12%). */
  getRangedAttackCooldownMultiplier(time: number): number {
    return this.isQuickDrawActive(time) ? 1 / (1 + this.quickDrawBonus) : 1;
  }

  /** Tiêu EN cho một phát bắn; phát đầu sau Rút Nhanh được miễn phí. */
  consumeShotEnergy(amount: number, time: number): boolean {
    if (this.quickDrawFreeShot) {
      if (this.isQuickDrawActive(time)) {
        this.quickDrawFreeShot = false;
        return true;
      }

      this.quickDrawFreeShot = false;
    }

    return this.consumeEnergy(amount);
  }

  /** Đà Chém: cấu hình từ passive (perStack = 0 nghĩa là tắt). */
  configureMomentum(
    perStack: number,
    maxStacks: number,
    durationMs: number,
  ): void {
    this.momentumPerStack = perStack;
    this.momentumMaxStacks = maxStacks;
    this.momentumDurationMs = durationMs;

    if (perStack <= 0) {
      this.momentumStacks = 0;
    }
  }

  /** Mỗi đòn trúng: +1 cộng dồn tốc đánh và làm mới thời hạn. */
  addMomentumStack(time: number): void {
    if (this.dead || this.momentumPerStack <= 0) {
      return;
    }

    if (time >= this.momentumUntil) {
      this.momentumStacks = 0;
    }

    this.momentumStacks = Math.min(this.momentumMaxStacks, this.momentumStacks + 1);
    this.momentumUntil = time + this.momentumDurationMs;
  }

  getMomentumStacks(time: number): number {
    return time < this.momentumUntil ? this.momentumStacks : 0;
  }

  getArmorBuffRemaining(time: number): number {
    return this.dead || time >= this.armorBuffUntil
      ? 0
      : this.armorBuffUntil - time;
  }

  getArmorBuffBonus(): number {
    return this.armorBuffBonus;
  }

  getMeleeFuryRemaining(time: number): number {
    return this.dead || time >= this.meleeFuryUntil
      ? 0
      : this.meleeFuryUntil - time;
  }

  getMeleeFuryDamagePercent(): number {
    return Math.round((this.meleeFuryDamageMultiplier - 1) * 100);
  }

  getMeleeFuryAttackSpeedPercent(): number {
    return Math.round((this.meleeFuryAttackSpeed - 1) * 100);
  }

  grantDamageReduction(
    time: number,
    durationMs: number,
    percent: number,
  ): void {
    if (this.dead || durationMs <= 0) {
      return;
    }

    const reduction = Phaser.Math.Clamp(percent, 0, 0.85);

    this.damageReductionPercent =
      time < this.damageReductionUntil
        ? Math.max(this.damageReductionPercent, reduction)
        : reduction;
    this.damageReductionUntil = Math.max(
      this.damageReductionUntil,
      time + durationMs,
    );
  }

  enterGiantForm(
    time: number,
    durationMs: number,
    scale: number,
    damageMultiplier: number,
  ): void {
    if (this.dead || durationMs <= 0) {
      return;
    }

    this.giantUntil = Math.max(this.giantUntil, time + durationMs);
    this.giantDamageMultiplier = Math.max(
      this.giantDamageMultiplier,
      damageMultiplier,
    );
    this.setScale(scale);
  }

  grantStealth(time: number, durationMs: number): void {
    if (this.dead || durationMs <= 0) {
      return;
    }

    this.stealthUntil = Math.max(this.stealthUntil, time + durationMs);
  }

  breakStealth(): void {
    this.stealthUntil = 0;
  }

  isStealthed(time: number): boolean {
    return !this.dead && time < this.stealthUntil;
  }

  grantSpeedBoost(
    time: number,
    durationMs: number,
    multiplier: number,
  ): void {
    if (this.dead || durationMs <= 0) {
      return;
    }

    this.speedBoostMultiplier = Math.max(
      1,
      multiplier,
      time < this.speedBoostUntil ? this.speedBoostMultiplier : 1,
    );
    this.speedBoostUntil = Math.max(
      this.speedBoostUntil,
      time + durationMs,
    );
  }

  setArmorRegenSpeed(speed: number): void {
    this.armorRegenSpeed = Math.max(0, Math.min(2, speed));
  }

  setDodgeChance(chance: number): void {
    this.dodgeChance = Math.max(0, Math.min(0.5, chance));
  }

  setGuard(active: boolean, aimAngle = 0): void {
    this.guarding = active;
    this.guardAngle = aimAngle;
  }

  setMoveSpeedFactor(factor: number): void {
    this.moveSpeedFactor = Math.max(0.1, factor);
  }

  /** Vũ khí đặt hệ số tốc chạy (kẹp 0.1–1); đặt 1 khi hủy/đổi vũ khí/chết. */
  setWeaponMoveFactor(factor: number): void {
    this.weaponMoveFactor = Math.min(1, Math.max(0.1, factor));
  }

  setDamageTakenFactor(factor: number): void {
    this.damageTakenFactor = Math.max(0, factor);
  }

  isGuarding(): boolean {
    return this.guarding;
  }

  /**
   * `damageScale` < 1 là giảm sát thương từ nguồn (Uy Nghiêm, Độc Suy Nhược):
   * phần lẻ được tung xác suất để đòn nhỏ vẫn giảm đúng kỳ vọng.
   * `source` là vị trí nguồn đòn; khi đang chắn bằng Khiên, đòn đến từ phía trước
   * bị giảm sát thương (boss giảm ít hơn).
   */
  takeDamage(
    amount: number,
    time: number,
    damageScale = 1,
    source?: {
      x: number;
      y: number;
      boss?: boolean;
      /** Đòn từ trên xuống (slam/thiên thạch rơi ngay chỗ người chơi): tường chắn phía trước không che được. */
      overhead?: boolean;
      /** Loại sát thương của đòn; bỏ trống = vật lý. */
      type?: DamageType;
      /** Tỉ lệ bể giáp bị bỏ qua / điểm kháng bị bỏ qua. */
      armorPen?: number;
      resPen?: number;
    },
  ): boolean {
    if (this.dead || this.safeZone || time < this.invulnerableUntil) {
      return false;
    }

    // Lĩnh Vực Thần Minh: đòn từ bên kia kết giới không chạm được người chơi.
    if (isHitBlockedByDomain(source?.x, source?.y, this.x, this.y)) {
      return false;
    }

    // Bất Động Thành Lũy: đòn từ phía trước trừ HP tường thay vì HP người; đòn xuyên qua đi tiếp.
    // Đặt trước mọi bước giảm/né để một đòn chỉ bị tính ở đúng một nơi.
    if (
      !source?.overhead &&
      tryAbsorbHit(source?.x, source?.y, amount * Math.max(0, damageScale))
    ) {
      this.invulnerableUntil = time + PLAYER_INVULNERABLE_MS;
      return false;
    }

    if (this.guarding && source) {
      const toSource = Math.atan2(source.y - this.y, source.x - this.x);
      const inFront =
        Math.abs(Phaser.Math.Angle.Wrap(toSource - this.guardAngle)) <=
        Phaser.Math.DegToRad(SHIELD_GUARD_ARC_HALF_DEGREES);

      if (inFront) {
        const shieldX = this.x + Math.cos(this.guardAngle) * 22;
        const shieldY = this.y + Math.sin(this.guardAngle) * 22;

        spawnGlow(this.scene, shieldX, shieldY, 0x9ad7ff, 1.1, 160);

        const reduction = source.boss
          ? SHIELD_GUARD_BOSS_REDUCTION
          : SHIELD_GUARD_REDUCTION;

        amount = Math.max(1, Math.ceil(amount * (1 - reduction)));
      }
    }

    if (this.damageTakenFactor < 1) {
      // Làm tròn ngẫu nhiên để đòn nhỏ vẫn giảm đúng kỳ vọng.
      const scaled = amount * this.damageTakenFactor;
      const whole = Math.floor(scaled);

      amount = whole + (Math.random() < scaled - whole ? 1 : 0);

      if (amount <= 0) {
        this.invulnerableUntil = time + PLAYER_INVULNERABLE_MS;
        return false;
      }
    }

    if (damageScale < 1) {
      const scaled = amount * Math.max(0, damageScale);
      const whole = Math.floor(scaled);

      amount = whole + (Math.random() < scaled - whole ? 1 : 0);

      if (amount <= 0) {
        this.invulnerableUntil = time + PLAYER_INVULNERABLE_MS;
        return false;
      }
    }

    // Nguyên tố: kháng của người chơi giảm sát thương (vật lý không đi qua đây).
    const damageType: DamageType = source?.type ?? 'physical';

    if (damageType !== 'physical') {
      const res = effectiveResist(
        damageType,
        { resPen: source?.resPen },
        { resist: this.getResist() },
      );

      amount = Math.max(1, stochasticRound(amount * (1 - res)));
    }

    // Né hoàn toàn: coi như đã trúng để không bị tính lại mỗi frame khi đạn chồng lên.
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      this.invulnerableUntil = time + PLAYER_INVULNERABLE_MS;
      spawnGlow(this.scene, this.x, this.y, 0xc9b6ff, 1.2, 220);
      this.onDodge?.();
      return false;
    }

    // Nhận sát thương sẽ hoãn hồi giáp; hồi lại sau khi đứng yên một lúc.
    this.nextArmorRegenAt = time + PLAYER_ARMOR_REGEN_DELAY_MS;
    // Đà Chém: bị trúng đòn thì mất hết cộng dồn.
    this.momentumStacks = 0;

    const reduced =
      time < this.damageReductionUntil
        ? Math.max(
            1,
            Math.ceil(amount * (1 - this.damageReductionPercent)),
          )
        : amount;
    let remaining = reduced;

    // Khiên Phép: một phần sát thương đổi thành hao EN (chỉ khi còn EN).
    if (this.energyAbsorb > 0 && this.energy > 0) {
      const toEnergy = Math.min(
        remaining * this.energyAbsorb,
        this.energy / this.energyPerDamage,
      );

      this.energy -= toEnergy * this.energyPerDamage;
      remaining -= toEnergy;
      spawnGlow(this.scene, this.x, this.y, ELEMENT_COLORS.dark, 1.1, 180);
    }

    const hadArmor = this.armor > 0;
    const armorBefore = this.armor;

    if (this.armor > 0) {
      // Bể giáp đỡ trọn đòn vật lý, chỉ đỡ một phần đòn nguyên tố; xuyên giáp giảm thêm.
      const poolShare =
        (damageType === 'physical' ? POOL_SHARE_PHYSICAL : POOL_SHARE_ELEMENTAL) *
        (1 - Math.min(ARMOR_PEN_MAX, Math.max(0, source?.armorPen ?? 0)));
      const absorbed = Math.min(
        this.armor,
        poolShare >= 1 ? remaining : Math.round(remaining * poolShare),
      );
      this.armor -= absorbed;
      remaining -= absorbed;
    }

    if (hadArmor && this.armor <= 0) {
      this.onArmorBroken?.();
    }

    if (remaining > 0) {
      this.health = Math.max(0, this.health - remaining);
    }

    this.invulnerableUntil = time + PLAYER_INVULNERABLE_MS;
    this.onHurt?.(reduced);

    // Phần EN hấp thụ không phải sát thương nhận; số hiển thị = giáp + HP thực sự mất.
    const lost = armorBefore - this.armor + remaining;

    if (lost > 0) {
      this.onDamageTaken?.(damageType, lost);
    }

    if (this.health <= 0) {
      this.die();
    } else {
      this.actionLockUntil = time + HURT_ANIM_MS;
      this.playAction('hurt');
    }

    return true;
  }

  /** Khiên Phép: `fraction` sát thương đổi sang EN, mỗi 1 sát thương = `perDamage` EN. */
  setEnergyAbsorb(fraction: number, perDamage: number): void {
    this.energyAbsorb = Phaser.Math.Clamp(fraction, 0, 0.9);
    this.energyPerDamage = Math.max(0.5, perDamage);
  }

  /** Tâm Băng (cộng EN/s) và Quá Nhiệt (nhân hệ số hồi EN). */
  setEnergyRegenModifiers(bonusPerSecond: number, factor: number): void {
    this.energyRegenBonus = Math.max(0, bonusPerSecond);
    this.energyRegenFactor = Math.max(0, factor);
  }

  /** Hồi giáp trực tiếp (không vượt giáp tối đa). */
  restoreArmor(amount: number): void {
    this.armor = Math.min(this.getMaxArmor(), this.armor + amount);
  }

  restoreEnergy(amount: number): void {
    this.energy = Math.min(this.getMaxEnergy(), this.energy + amount);
  }

  consumeEnergy(amount: number): boolean {
    if (this.energy < amount) {
      return false;
    }

    this.energy -= amount;
    return true;
  }

  updateCombat(time: number, delta: number): void {
    if (this.dead) {
      this.stopMoving();
      return;
    }

    this.energy = Math.min(
      this.getMaxEnergy(),
      this.energy +
        (PLAYER_ENERGY_REGEN_PER_SECOND *
          this.stats.energyRegenMultiplier *
          this.energyRegenFactor +
          this.energyRegenBonus) *
          (delta / 1000),
    );

    if (this.armorBuffUntil > 0 && time >= this.armorBuffUntil) {
      this.armorBuffUntil = 0;
      this.armorBuffBonus = 0;
      this.armor = Math.min(this.armor, this.getMaxArmor());
    }

    if (this.meleeFuryUntil > 0 && time >= this.meleeFuryUntil) {
      this.meleeFuryUntil = 0;
      this.meleeFuryDamageMultiplier = 1;
      this.meleeFuryAttackSpeed = 1;
    }

    if (
      this.armor < this.getMaxArmor() &&
      time >= this.nextArmorRegenAt
    ) {
      this.armor = Math.min(this.getMaxArmor(), this.armor + 1);
      this.nextArmorRegenAt =
        time + PLAYER_ARMOR_REGEN_INTERVAL_MS / (1 + this.armorRegenSpeed);
      spawnGlow(this.scene, this.x, this.y, 0x9aa0ad, 0.65, 220);
    }

    if (this.giantUntil > 0 && time >= this.giantUntil) {
      this.giantUntil = 0;
      this.giantDamageMultiplier = 1;
      this.setScale(this.rageState === 'berserk' ? BERSERK_SCALE : 1);
    }

    if (this.rageState !== 'normal' && time >= this.rageUntil) {
      if (this.rageState === 'berserk') {
        this.endBerserk(time);
      } else {
        this.endExhaustion();
      }
    }

    const body = this.body;

    if (
      body instanceof Phaser.Physics.Arcade.Body &&
      body.velocity.lengthSq() > 100 &&
      !this.isDashing(time) &&
      !this.isStealthed(time) &&
      time >= this.nextFootstepAt
    ) {
      this.nextFootstepAt = time + 170;
      spawnDust(
        this.scene,
        this.x + Phaser.Math.Between(-5, 5),
        this.y + 19,
      );
    }

    if (time < this.invulnerableUntil) {
      this.setAlpha(Math.floor(time / 80) % 2 === 0 ? 0.4 : 1);
    } else if (time < this.stealthUntil) {
      this.setAlpha(0.35);
    } else if (this.alpha !== 1) {
      this.setAlpha(1);
    }
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    const base = this.config.baseHealth + this.stats.maxHealthBonus;

    return this.rageState === 'berserk' ? base * BERSERK_HEALTH_MULT : base;
  }

  getArmor(): number {
    return this.armor;
  }

  getMaxArmor(): number {
    const buff =
      this.scene.time.now < this.armorBuffUntil ? this.armorBuffBonus : 0;

    const base = this.config.baseArmor + this.stats.maxArmorBonus + buff;

    return this.rageState === 'berserk'
      ? Math.round(base * BERSERK_ARMOR_MULT)
      : base;
  }

  getEnergy(): number {
    return this.energy;
  }

  getMaxEnergy(): number {
    return this.config.baseEnergy + this.stats.maxEnergyBonus;
  }

  isDead(): boolean {
    return this.dead;
  }
}
