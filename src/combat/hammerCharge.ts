/**
 * Máy trạng thái THUẦN của Búa (không import Phaser, test được bằng vitest).
 * Pha: idle → raise → hold → ready → swing → recover → idle. Mọi mốc tính theo thời gian (ms) do bên gọi truyền vào.
 * Đòn thường (`normal`) ra khi thả trước khi đủ lực; đòn tích lực (`charged`) ra khi thả sau khi `ready`.
 */

export type HammerPhase = 'idle' | 'raise' | 'hold' | 'ready' | 'swing' | 'recover';
export type HammerStrike = 'normal' | 'charged';

/** Cấu hình thời gian + hệ số tốc chạy (lấy từ combatConfig khi dùng thật). */
export interface HammerChargeConfig {
  /** Thời gian nâng búa (ms). */
  raiseMs: number;
  /** Thời gian giữ (tính từ lúc nhấn) để sẵn sàng tích lực (ms). */
  readyMs: number;
  swingMs: number;
  chargedSwingMs: number;
  recoverMs: number;
  chargedRecoverMs: number;
  cooldownMs: number;
  chargedCooldownMs: number;
  chargeMoveFactor: number;
  swingMoveFactor: number;
  chargedSwingMoveFactor: number;
}

/** Sự kiện phát ra trong một lần `tick`. */
export interface HammerTickEvents {
  /** Vừa đủ lực (đúng một lần mỗi lần giữ). */
  ready: boolean;
  /** Đầu búa vừa chạm đất (đúng một lần mỗi swing), kèm loại đòn. */
  impact: HammerStrike | null;
}

export class HammerChargeMachine {
  private phase: HammerPhase = 'idle';
  private strike: HammerStrike | null = null;
  private pressTime = 0;
  private phaseStart = 0;
  private releasePending = false;
  private strikeAngle = 0;
  private cooldownUntil = 0;
  private queuedReady = false;
  private queuedImpact: HammerStrike | null = null;

  private readonly config: HammerChargeConfig;
  /** Hệ số nhân cooldown tại thời điểm bắt đầu swing (stats.cooldownMultiplier × buff tốc đánh). */
  private readonly getCooldownMultiplier: (time: number) => number;

  constructor(
    config: HammerChargeConfig,
    getCooldownMultiplier: (time: number) => number = () => 1,
  ) {
    this.config = config;
    this.getCooldownMultiplier = getCooldownMultiplier;
  }

  getPhase(): HammerPhase {
    return this.phase;
  }

  /** Loại đòn của swing/recover hiện tại (null khi chưa vào swing). */
  getStrike(): HammerStrike | null {
    return this.strike;
  }

  getPressTime(): number {
    return this.pressTime;
  }

  getPhaseStart(): number {
    return this.phaseStart;
  }

  getStrikeAngle(): number {
    return this.strikeAngle;
  }

  getCooldownUntil(): number {
    return this.cooldownUntil;
  }

  isReleasePending(): boolean {
    return this.releasePending;
  }

  /** Hệ số tốc chạy theo pha hiện tại. */
  getMoveFactor(): number {
    switch (this.phase) {
      case 'raise':
      case 'hold':
      case 'ready':
        return this.config.chargeMoveFactor;
      case 'swing':
      case 'recover':
        return this.strike === 'charged'
          ? this.config.chargedSwingMoveFactor
          : this.config.swingMoveFactor;
      default:
        return 1;
    }
  }

  /**
   * Nhấn (gọi mỗi frame khi giữ cũng được). Chỉ khởi động raise khi đang idle và hết cooldown.
   * Trả về true CHỈ ở lần khởi động thật sự.
   */
  press(time: number, aimAngle: number): boolean {
    this.advance(time, aimAngle);

    if (this.phase !== 'idle' || time < this.cooldownUntil) {
      return false;
    }

    this.phase = 'raise';
    this.phaseStart = time;
    this.pressTime = time;
    this.strike = null;
    this.releasePending = false;

    return true;
  }

  /** Thả nút. Trả về true nếu đòn sắp ra là đòn tích lực. */
  release(time: number, aimAngle: number): boolean {
    this.advance(time, aimAngle);

    if (this.phase === 'raise') {
      this.releasePending = true;
      return false;
    }

    if (this.phase === 'hold') {
      this.startSwing('normal', time, aimAngle);
      return false;
    }

    if (this.phase === 'ready') {
      this.startSwing('charged', time, aimAngle);
      return true;
    }

    return false;
  }

  /** Hủy ở mọi pha: về idle, không impact, không đặt cooldown. */
  cancel(): void {
    this.phase = 'idle';
    this.strike = null;
    this.releasePending = false;
    this.queuedReady = false;
    this.queuedImpact = null;
  }

  /** Tiến thời gian tới `time` và trả về các sự kiện tích lại (mỗi sự kiện chỉ trả một lần). */
  tick(time: number, aimAngle: number): HammerTickEvents {
    this.advance(time, aimAngle);

    const events: HammerTickEvents = {
      ready: this.queuedReady,
      impact: this.queuedImpact,
    };

    this.queuedReady = false;
    this.queuedImpact = null;

    return events;
  }

  private startSwing(strike: HammerStrike, at: number, aimAngle: number): void {
    const cooldown =
      strike === 'charged' ? this.config.chargedCooldownMs : this.config.cooldownMs;

    this.phase = 'swing';
    this.phaseStart = at;
    this.strike = strike;
    this.releasePending = false;
    this.strikeAngle = aimAngle;
    this.cooldownUntil = at + cooldown * this.getCooldownMultiplier(at);
  }

  /** Chạy các chuyển pha có mốc ≤ time, dùng đúng mốc biên (không dùng time của frame) để không trễ thêm. */
  private advance(time: number, aimAngle: number): void {
    for (;;) {
      if (this.phase === 'raise') {
        const end = this.phaseStart + this.config.raiseMs;

        if (time < end) {
          return;
        }

        if (this.releasePending) {
          this.startSwing('normal', end, aimAngle);
        } else {
          this.phase = 'hold';
          this.phaseStart = end;
        }
      } else if (this.phase === 'hold') {
        const end = this.pressTime + this.config.readyMs;

        if (time < end) {
          return;
        }

        this.phase = 'ready';
        this.phaseStart = end;
        this.queuedReady = true;
      } else if (this.phase === 'swing') {
        const swingMs =
          this.strike === 'charged' ? this.config.chargedSwingMs : this.config.swingMs;
        const end = this.phaseStart + swingMs;

        if (time < end) {
          return;
        }

        this.queuedImpact = this.strike;
        this.phase = 'recover';
        this.phaseStart = end;
      } else if (this.phase === 'recover') {
        const recoverMs =
          this.strike === 'charged'
            ? this.config.chargedRecoverMs
            : this.config.recoverMs;
        const end = this.phaseStart + recoverMs;

        if (time < end) {
          return;
        }

        this.phase = 'idle';
        this.strike = null;

        return;
      } else {
        // idle hoặc ready: ready giữ vô hạn, không tự hết hạn.
        return;
      }
    }
  }
}
