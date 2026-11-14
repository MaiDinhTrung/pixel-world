import Phaser from 'phaser';

import type { CharacterId } from '../config/characters';
import { MobileInputManager } from '../input/MobileInputManager';
import type {
  AimPreview,
  SkillCastRequest,
} from '../input/SkillAimingController';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { CombatHUD } from './combat/CombatHUD';
import type { SkillHudEntry } from './Hud';

const DEPTH = 6000;

/**
 * Cầu nối cảm ứng cho InputController: joystick trái (nổi) = di chuyển;
 * cụm nút phải (`CombatHUD`) = đánh, kỹ năng S1–S3, dash, đổi vũ khí.
 * Hướng ngắm do WorldScene tự động đặt theo quái gần nhất.
 */
export class TouchControls {
  private readonly input: MobileInputManager;
  private readonly joystick: VirtualJoystick;
  private readonly hud: CombatHUD;
  private readonly lastAim = new Phaser.Math.Vector2(0, 1);

  constructor(scene: Phaser.Scene, characterId: CharacterId) {
    this.input = new MobileInputManager(scene);
    // Nút đăng ký trước joystick nên được ưu tiên khi chạm.
    this.hud = new CombatHUD(scene, this.input, characterId, DEPTH);
    this.joystick = new VirtualJoystick(scene, 140, 410, DEPTH);
    this.input.register(this.joystick);
  }

  /** Hướng di chuyển (độ dài 0 hoặc 1). */
  getMoveVector(): Phaser.Math.Vector2 {
    return this.joystick.getVector();
  }

  /** Hướng ngắm gần nhất (giữ nguyên khi thả joystick). */
  getAimVector(): Phaser.Math.Vector2 {
    return this.lastAim;
  }

  /** Đặt hướng ngắm tự động. */
  setAutoAim(x: number, y: number): void {
    this.lastAim.set(x, y);
  }

  /** Đang giữ nút đánh → đánh liên tục. */
  isFireHeld(): boolean {
    return this.hud.isAttackHeld();
  }

  /** True đúng một lần mỗi lần vừa chạm nút đánh. */
  consumeFirePress(): boolean {
    return this.hud.consumeAttackPress();
  }

  consumeDash(): boolean {
    return this.hud.consumeDash();
  }

  consumeSwitch(): boolean {
    return this.hud.consumeSwap();
  }

  /** Yêu cầu tung kỹ năng vừa phát sinh (chạm hoặc thả sau khi ngắm), hoặc null. */
  consumeSkill(): SkillCastRequest | null {
    return this.hud.consumeSkill();
  }

  /** Dữ liệu vẽ đường ngắm kỹ năng; null khi không ngắm. */
  getAimPreview(): AimPreview | null {
    return this.hud.getAimPreview();
  }

  /** Thả mọi thao tác và xoá hàng đợi (khi mở/đóng panel). */
  releaseAll(): void {
    this.input.cancelAll();
    this.hud.clearPending();
  }

  /** Áp cấu hình bố cục người chơi vừa lưu. */
  reloadLayout(): void {
    this.hud.reloadLayout();
  }

  /** Cập nhật hồi chiêu hiển thị trên nút dash. */
  updateDash(dashRemainingMs: number): void {
    this.hud.updateDash(dashRemainingMs);
  }

  /** Cập nhật icon/hồi chiêu/khoá của S1–S3. */
  updateSkills(entries: SkillHudEntry[]): void {
    this.hud.updateSkills(entries);
  }
}
