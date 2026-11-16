import Phaser from 'phaser';

import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_FLASH_MS,
  ENEMY_KNOCKBACK_SPEED,
  ENEMY_STUN_MS,
  STATUS_DOT_TICK_MS,
  STATUS_VULNERABLE_MAX_MULT,
} from '../config/combatConfig';

import {
  PHYSICAL_ONLY,
  resolveDamage,
  type Attacker,
  type DamagePart,
  type Defender,
} from '../combat/damage/resolveDamage';

import { isHitBlockedByDomain } from '../combat/domainBarrier';
import { IceStackTracker } from '../combat/damage/elementEffects';
import {
  DARK_CURSE_MS,
  DARK_CURSE_MULT,
  FIRE_BURN_DPS_RATIO,
  FIRE_BURN_MS,
  ICE_CHILL_MS,
  ICE_CHILL_MULT,
  ICE_FREEZE_IMMUNE_MS,
  ICE_FREEZE_MS,
  WIND_PUSH_SPEED,
  WIND_PUSH_STUN_MS,
  type DamageType,
} from '../config/damageTypeConfig';

export type EnemyTarget = { x: number; y: number };

/** Mô tả loại sát thương của một đòn lên quái. */
export interface HitInfo {
  readonly parts?: readonly DamagePart[];
  readonly attacker?: Attacker;
  /** Đòn thứ cấp (lan sét…): không kích hoạt hiệu ứng nguyên tố nữa. */
  readonly noProc?: boolean;
}

/** Kết quả của `hitModifier`: sát thương sau điều chỉnh + đòn này có chí mạng không. */
export interface HitModifierResult {
  readonly amount: number;
  readonly crit: boolean;
}

/** Sự kiện 'damage-dealt': sát thương thực tế đã trừ vào máu (sau giáp/kháng/dễ thương). */
export interface DamageDealtEvent {
  /** Vị trí gợi ý để hiện số (gần đỉnh sprite). */
  readonly x: number;
  readonly y: number;
  readonly crit: boolean;
  readonly parts: readonly { readonly type: DamageType; readonly amount: number }[];
}

/** Sự kiện 'dot-damage': một tick đốt/độc đã trừ vào máu. */
export interface DotDamageEvent {
  readonly x: number;
  readonly y: number;
  readonly kind: EnemyDotKind;
  readonly amount: number;
}

export type EnemyDotKind = 'burn' | 'poison';
export type EnemyVulnerableKind = 'mark' | 'curse';

interface DotState {
  dps: number;
  until: number;
  nextTick: number;
}

/** Hệ số trạng thái do passive quyết định (Mồi Lửa, Độc Tố, Băng Vĩnh Cửu); dùng chung một tham chiếu. */
export interface StatusTuning {
  burnMult: number;
  poisonMult: number;
  chillExtraMs: number;
}

interface VulnerableState {
  mult: number;
  until: number;
}

/**
 * Phần chung của mọi loại quái: HP, hit flash, knockback, stun, chết.
 * Lớp con chỉ cần cài đặt hành vi di chuyển/tấn công trong `updateAI()`.
 */
export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  protected health: number;
  protected readonly maxHealth: number;
  private readonly animPrefix: string;
  private attackUntil = 0;
  private stunUntil = 0;
  private slowUntil = 0;
  private slowMultiplier = 1;
  private dead = false;
  private readonly deathColor: number;
  /**
   * Bộ điều chỉnh sát thương theo ngữ cảnh đòn (hướng, khoảng cách, chí mạng).
   * WorldScene gán cho mọi quái; trả về sát thương sau điều chỉnh.
   */
  hitModifier:
    | ((
        enemy: EnemyBase,
        amount: number,
        sourceX: number,
        sourceY: number,
      ) => HitModifierResult)
    | null = null;
  /** Hồ sơ phòng thủ (giảm vật lý, kháng nguyên tố). Mặc định rỗng = không giảm gì. */
  protected defense: Defender = {};
  /** Hệ số nhân sát thương nhận vào, áp sau `getVulnerableMult` (M3 affix `armored`). 1 = như cũ. */
  private damageTakenMultiplier = 1;
  private freezeUntil = 0;
  private freezeImmuneUntil = 0;
  private readonly iceStacks = new IceStackTracker();
  /** WorldScene gán; null = không điều chỉnh. */
  statusTuning: StatusTuning | null = null;
  private chillUntil = 0;
  private poisonStacks = 0;
  private readonly dots = new Map<EnemyDotKind, DotState>();
  private readonly vulnerables = new Map<EnemyVulnerableKind, VulnerableState>();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    animPrefix: string,
    maxHealth: number,
    bodyWidth: number,
    bodyHeight: number,
    deathColor: number,
    displayScale = 2,
  ) {
    super(scene, x, y, texture, `${animPrefix}-idle-0`);

    this.health = maxHealth;
    this.maxHealth = maxHealth;
    this.animPrefix = animPrefix;
    this.deathColor = deathColor;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5);
    this.setScale(displayScale);
    this.setBodySize(bodyWidth, bodyHeight);
    this.setCollideWorldBounds(true);
    this.setDepth(8);

    if (scene.anims.exists(`${animPrefix}-idle`)) {
      this.play(`${animPrefix}-idle`, true);
    }

    // Xuất hiện mềm để quái không "bật" ra đột ngột.
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.setDepth(this.y + 20);

    if (!this.dead) {
      this.updateAnimation(time);
      this.updateStatuses(time);
    }
  }

  /** Hệ số thời gian trạng thái; boss ghi đè để kháng. */
  protected getStatusDurationMult(): number {
    return 1;
  }

  /** Sát thương theo thời gian (đốt/độc): `dps` mỗi giây, không đẩy lùi/choáng. */
  applyDot(kind: EnemyDotKind, dps: number, durationMs: number): void {
    if (this.dead || !this.active || dps <= 0 || durationMs <= 0) {
      return;
    }

    const now = this.scene.time.now;
    const until = now + durationMs * this.getStatusDurationMult();
    const current = this.dots.get(kind);
    const tuned =
      dps *
      (kind === 'burn'
        ? (this.statusTuning?.burnMult ?? 1)
        : (this.statusTuning?.poisonMult ?? 1));

    if (kind === 'poison' && !(current && now < current.until)) {
      this.poisonStacks = 1;
    }

    this.dots.set(kind, {
      dps: Math.max(tuned, current && now < current.until ? current.dps : 0),
      until: Math.max(until, current?.until ?? 0),
      nextTick: current && now < current.until
        ? current.nextTick
        : now + STATUS_DOT_TICK_MS,
    });
  }

  /** Nhận thêm sát thương (đánh dấu/nguyền): `mult` 1.25 = +25%. */
  applyVulnerable(
    kind: EnemyVulnerableKind,
    mult: number,
    durationMs: number,
  ): void {
    if (this.dead || !this.active || mult <= 1 || durationMs <= 0) {
      return;
    }

    const now = this.scene.time.now;

    this.vulnerables.set(kind, {
      mult,
      until: now + durationMs * this.getStatusDurationMult(),
    });
  }

  /** Xoá hiệu ứng đốt/độc (dùng khi kỹ năng kích nổ và tiêu hết). */
  clearDot(kind: EnemyDotKind): void {
    this.dots.delete(kind);

    if (kind === 'poison') {
      this.poisonStacks = 0;
    }
  }

  /** Thêm 1 tầng Độc (tối đa `maxStacks`): mỗi tầng gây `dpsPerStack`, làm mới thời hạn. */
  addPoisonStack(dpsPerStack: number, durationMs: number, maxStacks: number): void {
    if (this.dead || !this.active) {
      return;
    }

    const stacks = Math.min(maxStacks, this.getPoisonStacks() + 1);

    this.applyDot('poison', dpsPerStack * stacks, durationMs);
    this.poisonStacks = stacks;
  }

  getPoisonStacks(): number {
    return this.hasDot('poison') ? Math.max(1, this.poisonStacks) : 0;
  }

  /** DPS còn lại và thời gian còn lại của một DoT (để lan Thiêu). */
  getDotInfo(kind: EnemyDotKind): { dps: number; remainingMs: number } | null {
    const state = this.dots.get(kind);
    const now = this.scene.time.now;

    return state && now < state.until
      ? { dps: state.dps, remainingMs: state.until - now }
      : null;
  }

  /** Lạnh = làm chậm do skill Băng; Băng Vĩnh Cửu kéo dài thêm và khai thác trạng thái này. */
  applyChill(multiplier: number, durationMs: number): void {
    if (this.dead || !this.active || durationMs <= 0) {
      return;
    }

    const total = durationMs + (this.statusTuning?.chillExtraMs ?? 0);

    this.applySlow(multiplier, total);
    this.chillUntil = Math.max(
      this.chillUntil,
      this.scene.time.now + total * this.getStatusDurationMult(),
    );
  }

  isChilled(): boolean {
    return !this.dead && this.scene.time.now < this.chillUntil;
  }

  hasDot(kind: EnemyDotKind): boolean {
    const state = this.dots.get(kind);

    return !!state && this.scene.time.now < state.until;
  }

  hasVulnerable(kind: EnemyVulnerableKind): boolean {
    const state = this.vulnerables.get(kind);

    return !!state && this.scene.time.now < state.until;
  }

  get damageTakenMult(): number {
    return this.damageTakenMultiplier;
  }

  /** Giá trị không hữu hạn hoặc <= 0 bị bỏ qua (giữ giá trị cũ). */
  set damageTakenMult(value: number) {
    if (Number.isFinite(value) && value > 0) {
      this.damageTakenMultiplier = value;
    }
  }

  private getVulnerableMult(time: number): number {
    let total = 1;

    for (const state of this.vulnerables.values()) {
      if (time < state.until) {
        total *= state.mult;
      }
    }

    return Math.min(total, STATUS_VULNERABLE_MAX_MULT);
  }

  private updateStatuses(time: number): void {
    for (const [kind, state] of this.dots) {
      if (time >= state.until) {
        this.dots.delete(kind);

        if (kind === 'poison') {
          this.poisonStacks = 0;
        }

        continue;
      }

      if (time >= state.nextTick) {
        state.nextTick = time + STATUS_DOT_TICK_MS;
        this.takeStatusDamage((state.dps * STATUS_DOT_TICK_MS) / 1000, kind);

        if (this.dead) {
          return;
        }
      }
    }

    for (const [kind, state] of this.vulnerables) {
      if (time >= state.until) {
        this.vulnerables.delete(kind);
      }
    }
  }

  private takeStatusDamage(amount: number, kind: EnemyDotKind): void {
    const dealt =
      amount * this.getVulnerableMult(this.scene.time.now) * this.damageTakenMultiplier;

    this.health -= dealt;
    this.flash();

    if (dealt > 0) {
      const event: DotDamageEvent = {
        x: this.x,
        y: this.getDamageNumberY(),
        kind,
        amount: dealt,
      };

      this.emit('dot-damage', event);
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  /** Chạy animation tấn công trong một khoảng thời gian ngắn. */
  playAttackAnimation(durationMs: number): void {
    if (this.dead || !this.active || durationMs <= 0) {
      return;
    }

    const key = `${this.animPrefix}-attack`;

    this.attackUntil = Math.max(
      this.attackUntil,
      this.scene.time.now + durationMs,
    );

    if (this.scene.anims.exists(key)) {
      this.anims.timeScale = 1;
      this.play(key, false);
    }
  }

  private updateAnimation(time: number): void {
    const body = this.body;
    const moving =
      body instanceof Phaser.Physics.Arcade.Body &&
      body.velocity.lengthSq() > 64;
    const action =
      time < this.attackUntil ? 'attack' : moving ? 'walk' : 'idle';
    const key = `${this.animPrefix}-${action}`;

    if (!this.scene.anims.exists(key)) {
      return;
    }

    if (this.anims.currentAnim?.key !== key) {
      this.play(key, true);
    }

    this.anims.timeScale =
      action === 'walk' ? this.getSpeedMultiplier(time) : 1;
  }

  abstract updateAI(target: EnemyTarget, time: number): void;

  /** Toạ độ y gần đỉnh sprite để hiện số sát thương (boss lớn hơn nên số cao hơn). */
  protected getDamageNumberY(): number {
    return this.y - this.displayHeight * 0.4;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  isAlive(): boolean {
    return !this.dead;
  }

  getDeathColor(): number {
    return this.deathColor;
  }

  /** Sát thương khi chạm Player; boss ghi đè để đau hơn quái thường. */
  getContactDamage(): number {
    return ENEMY_CONTACT_DAMAGE;
  }

  /** Choáng từ kỹ năng khống chế, không phụ thuộc hướng đánh. */
  applyStun(durationMs: number): void {
    if (this.dead || !this.active || durationMs <= 0) {
      return;
    }

    this.stunUntil = Math.max(
      this.stunUntil,
      this.scene.time.now + durationMs,
    );
    this.setVelocity(0, 0);
  }

  /** Làm chậm theo hệ số (0.5 = còn 50% tốc chạy). */
  applySlow(multiplier: number, durationMs: number): void {
    if (this.dead || !this.active || durationMs <= 0) {
      return;
    }

    const clamped = Phaser.Math.Clamp(multiplier, this.getMinSpeedMult(), 1);
    const now = this.scene.time.now;

    this.slowMultiplier =
      now < this.slowUntil
        ? Math.min(this.slowMultiplier, clamped)
        : clamped;
    this.slowUntil = Math.max(this.slowUntil, now + durationMs);
  }

  protected getSpeedMultiplier(time: number): number {
    return time < this.slowUntil ? this.slowMultiplier : 1;
  }

  /** Xoá quái không qua animation/XP/loot (dùng khi boss xuất hiện). */
  despawn(): void {
    if (this.dead) {
      return;
    }

    this.dead = true;
    this.disableBody(true, true);
    this.destroy();
  }

  protected canAct(time: number): boolean {
    return !this.dead && this.active && time >= this.stunUntil;
  }

  /**
   * `info` tùy chọn mô tả loại sát thương; bỏ trống = 100% vật lý của người chơi,
   * và với hồ sơ phòng thủ mặc định (rỗng) kết quả bằng đúng `amount`.
   */
  takeDamage(
    amount: number,
    sourceX: number,
    sourceY: number,
    info?: HitInfo,
  ): void {
    if (this.dead) {
      return;
    }

    // Lĩnh Vực Thần Minh: đòn xuyên qua ranh giới kết giới bị chặn.
    if (isHitBlockedByDomain(sourceX, sourceY, this.x, this.y)) {
      return;
    }

    const modified = this.hitModifier
      ? this.hitModifier(this, amount, sourceX, sourceY)
      : { amount, crit: false };
    const resolved = resolveDamage(
      modified.amount,
      info?.parts ?? PHYSICAL_ONLY,
      info?.attacker ?? {},
      this.defense,
    );
    const dealt =
      resolved.total * this.getVulnerableMult(this.scene.time.now) * this.damageTakenMultiplier;

    this.health -= dealt;
    this.flash();

    // Số sát thương: chỉ khi đòn thật sự gây sát thương; phát trước `die()` để đòn kết liễu vẫn có số.
    if (dealt > 0 && resolved.total > 0) {
      const event: DamageDealtEvent = {
        x: this.x,
        y: this.getDamageNumberY(),
        crit: modified.crit || resolved.crit,
        parts: resolved.parts.map((part) => ({
          type: part.type,
          amount: (part.final / resolved.total) * dealt,
        })),
      };

      this.emit('damage-dealt', event);
    }
    // Hook chung "bị đánh trúng" (không gồm sát thương DoT): passive nghe sự kiện này.
    this.emit('damaged', dealt, sourceX, sourceY);

    // Phần sát thương theo loại thực sự gây ra (đã tính kháng và dễ thương).
    const dealtOf = (type: DamageType): number => {
      let sum = 0;

      for (const part of resolved.parts) {
        if (part.type === type && resolved.total > 0) {
          sum += (part.final / resolved.total) * dealt;
        }
      }

      return sum;
    };
    const procs = info?.parts !== undefined && !info.noProc;
    const lightning = procs ? dealtOf('lightning') : 0;
    const dark = procs ? dealtOf('dark') : 0;

    // Lan sét và hút sinh lực xảy ra cả khi đòn này hạ gục.
    if (lightning > 0) {
      this.emit('chain', lightning, sourceX, sourceY);
    }

    if (dark > 0) {
      this.emit('dark-damage', dark * this.getLeechMult());
    }

    if (this.health <= 0) {
      this.die();
      return;
    }

    if (procs) {
      this.applyElementStatuses(dealtOf('fire'), dealtOf('ice'), dark, dealtOf('wind'), sourceX, sourceY);
    }

    this.applyKnockback(sourceX, sourceY);
    this.stunUntil = this.scene.time.now + ENEMY_STUN_MS;

    if (procs && dealtOf('wind') > 0) {
      this.applyPush(sourceX, sourceY, WIND_PUSH_SPEED);
    }
  }

  /** Hiệu ứng trạng thái của lửa / băng / bóng tối (sét và gió xử lý riêng). */
  private applyElementStatuses(
    fire: number,
    ice: number,
    dark: number,
    _wind: number,
    _sourceX: number,
    _sourceY: number,
  ): void {
    if (fire > 0) {
      this.applyDot('burn', fire * FIRE_BURN_DPS_RATIO, FIRE_BURN_MS);
    }

    if (ice > 0) {
      this.applyChill(ICE_CHILL_MULT, ICE_CHILL_MS);

      if (this.iceStacks.add(this.scene.time.now)) {
        this.applyFreeze(ICE_FREEZE_MS);
      }
    }

    if (dark > 0) {
      this.applyVulnerable('curse', DARK_CURSE_MULT, DARK_CURSE_MS);
    }
  }

  /** Đóng băng: đứng yên hoàn toàn; boss miễn, và sau khi đóng băng có thời gian miễn. */
  applyFreeze(durationMs: number): boolean {
    const now = this.scene.time.now;

    if (
      this.dead ||
      !this.active ||
      !this.canBeFrozen() ||
      now < this.freezeImmuneUntil
    ) {
      return false;
    }

    this.freezeUntil = now + durationMs;
    this.freezeImmuneUntil = now + ICE_FREEZE_IMMUNE_MS;
    this.stunUntil = Math.max(this.stunUntil, this.freezeUntil);
    this.setVelocity(0, 0);
    this.setTint(0x9fe8ff);

    this.scene.time.delayedCall(durationMs, () => {
      if (this.active && !this.dead) {
        this.clearTint();
      }
    });

    return true;
  }

  isFrozen(): boolean {
    return !this.dead && this.scene.time.now < this.freezeUntil;
  }

  /** Đẩy ra xa `fromX/fromY` với tốc độ `speed` (boss chịu một phần); khựng ngắn để AI không ghi đè. */
  applyPush(fromX: number, fromY: number, speed: number): void {
    if (this.dead || !this.active) {
      return;
    }

    const dir = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY);

    if (dir.lengthSq() <= 0) {
      return;
    }

    dir.normalize().scale(speed * this.getPushMult());
    this.stunUntil = Math.max(
      this.stunUntil,
      this.scene.time.now + WIND_PUSH_STUN_MS,
    );
    this.setVelocity(dir.x, dir.y);
  }

  protected canBeFrozen(): boolean {
    return true;
  }

  protected getPushMult(): number {
    return 1;
  }

  protected getLeechMult(): number {
    return 1;
  }

  /** Tốc độ tối thiểu khi bị làm chậm (boss cao hơn: khó bị khóa chậm). */
  protected getMinSpeedMult(): number {
    return 0.1;
  }

  protected applyKnockback(sourceX: number, sourceY: number): void {
    const knockback = new Phaser.Math.Vector2(this.x - sourceX, this.y - sourceY);

    if (knockback.lengthSq() > 0) {
      knockback.normalize().scale(ENEMY_KNOCKBACK_SPEED);
      this.setVelocity(knockback.x, knockback.y);
    }
  }

  private flash(): void {
    // Phaser 4: setTintFill() không còn tác dụng, phải dùng TintModes.FILL.
    this.setTint(0xffffff);
    this.setTintMode(Phaser.TintModes.FILL);

    this.scene.time.delayedCall(ENEMY_FLASH_MS, () => {
      if (!this.active) {
        return;
      }

      this.clearTint();
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  private die(): void {
    this.dead = true;
    this.attackUntil = 0;
    this.emit('died');
    // Tắt va chạm nhưng giữ object active để animation chết tiếp tục chạy.
    this.disableBody(false, false);

    const deathKey = `${this.animPrefix}-death`;

    if (this.scene.anims.exists(deathKey)) {
      this.anims.timeScale = 1;
      this.play(deathKey, false);
    }

    // Giữ nguyên tỉ lệ của boss: nở ra 35% so với scale hiện tại thay vì
    // luôn thu về scale 1.5 như quái thường.
    const endScale = this.scaleX * 1.35;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: endScale,
      scaleY: endScale,
      duration: 340,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
