import Phaser from 'phaser';

import type { SkillCastRequest } from '../input/SkillAimingController';
import type { TouchControls } from '../ui/TouchControls';

/**
 * Theo dõi phím di chuyển bằng event DOM thay vì `Key.isDown`.
 *
 * `Key.isDown` bị Phaser reset mỗi khi scene pause (mở menu) hoặc cửa sổ mất focus,
 * nên nếu vẫn giữ phím thì nhân vật đứng yên cho tới khi phím được nhấn lại.
 * Đọc trực tiếp `event.code` giúp trạng thái phím luôn khớp với bàn phím thật.
 */
const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function keyboardCast(slot: number): SkillCastRequest {
  return { slot, aim: null, reach: null };
}

/** Yêu cầu đổi vũ khí: chọn trực tiếp hoặc xoay vòng. */
export type WeaponSwitchRequest = 0 | 1 | 'cycle';

/**
 * Gom input bàn phím + chuột thành hướng di chuyển, hướng ngắm và hành động.
 * Hỗ trợ đồng thời WASD và phím mũi tên.
 */
export class InputController {
  private readonly scene: Phaser.Scene;
  private readonly touch: TouchControls | null;
  private readonly attackKey: Phaser.Input.Keyboard.Key;
  private readonly pressed = new Set<string>();
  private readonly handleKeyDown: (event: KeyboardEvent) => void;
  private readonly handleKeyUp: (event: KeyboardEvent) => void;
  private readonly handleBlur: () => void;
  private readonly handleVisibilityChange: () => void;
  private pendingWeaponSwitch: WeaponSwitchRequest | null = null;
  private pendingSkill: SkillCastRequest | null = null;
  private pendingDash = false;
  private pendingInteract = false;
  private pickupAvailable = false;
  private fireSuppressed = false;

  private readonly direction = new Phaser.Math.Vector2();
  private readonly aimWorld = new Phaser.Math.Vector2();
  private readonly aimDirection = new Phaser.Math.Vector2();
  private hasAimInput = false;

  constructor(scene: Phaser.Scene, touch: TouchControls | null = null) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is not available in this browser.');
    }

    this.scene = scene;
    this.touch = touch;
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Chặn trình duyệt cuộn trang khi dùng phím mũi tên / WASD.
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);

    this.handleKeyDown = (event: KeyboardEvent) => {
      if (MOVEMENT_CODES.has(event.code)) {
        this.pressed.add(event.code);
      }
    };

    this.handleKeyUp = (event: KeyboardEvent) => {
      this.pressed.delete(event.code);
    };

    // Mất focus (alt-tab, chuyển tab, bấm ra ngoài) thì keyup có thể không tới.
    // Xoá toàn bộ trạng thái để phím không bị "dính".
    this.handleBlur = () => {
      this.pressed.clear();
    };

    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.pressed.clear();
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Dùng sự kiện keydown thay vì JustDown để không mất thao tác bấm rất nhanh.
    keyboard.on('keydown-ONE', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingWeaponSwitch = 0;
      }
    });
    keyboard.on('keydown-TWO', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingWeaponSwitch = 1;
      }
    });
    keyboard.on('keydown-Q', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingWeaponSwitch = 'cycle';
      }
    });
    keyboard.on('keydown-SHIFT', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingDash = true;
      }
    });
    keyboard.on('keydown-THREE', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingSkill = keyboardCast(0);
      }
    });
    keyboard.on('keydown-FOUR', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingSkill = keyboardCast(1);
      }
    });
    keyboard.on('keydown-FIVE', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingSkill = keyboardCast(2);
      }
    });
    // Ô kỹ năng phụ 4–7 ↔ phím 6, 7, 8, 9.
    const extraKeys = ['SIX', 'SEVEN', 'EIGHT', 'NINE'] as const;

    extraKeys.forEach((key, offset) => {
      keyboard.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (!event.repeat) {
          this.pendingSkill = keyboardCast(3 + offset);
        }
      });
    });
    keyboard.on('keydown-F', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.pendingInteract = true;
      }
    });

    scene.input.on('pointermove', () => {
      this.hasAimInput = true;
    });
    scene.input.on('pointerdown', () => {
      this.hasAimInput = true;
    });
  }

  /**
   * Trả về vector hướng di chuyển có độ dài 0 hoặc 1.
   * Vector được tái sử dụng mỗi frame nên chỉ nên đọc ngay sau khi gọi.
   */
  getDirection(): Phaser.Math.Vector2 {
    const touchMove = this.touch?.getMoveVector();

    if (touchMove && touchMove.lengthSq() > 0) {
      return touchMove;
    }

    const left = this.pressed.has('KeyA') || this.pressed.has('ArrowLeft');
    const right = this.pressed.has('KeyD') || this.pressed.has('ArrowRight');
    const up = this.pressed.has('KeyW') || this.pressed.has('ArrowUp');
    const down = this.pressed.has('KeyS') || this.pressed.has('ArrowDown');

    this.direction.set(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0),
    );

    // Chuẩn hoá để đi chéo không nhanh hơn đi thẳng.
    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
    }

    return this.direction;
  }

  /** Vector đơn vị từ Player tới con trỏ chuột (toạ độ world). */
  getAimDirection(playerX: number, playerY: number): Phaser.Math.Vector2 {
    if (this.touch) {
      return this.touch.getAimVector();
    }

    if (!this.hasAimInput) {
      this.aimDirection.set(0, 1);
      return this.aimDirection;
    }

    const pointer = this.scene.input.activePointer;

    pointer.positionToCamera(this.scene.cameras.main, this.aimWorld);

    this.aimDirection.set(this.aimWorld.x - playerX, this.aimWorld.y - playerY);

    if (this.aimDirection.lengthSq() === 0) {
      this.aimDirection.set(1, 0);
    } else {
      this.aimDirection.normalize();
    }

    return this.aimDirection;
  }

  /** Giữ chuột trái hoặc Space để đánh liên tục theo cooldown. */
  isAttackDown(): boolean {
    if (this.touch) {
      const held = this.touch.isFireHeld();

      if (!held) {
        this.fireSuppressed = false;
      }

      // Đứng cạnh vật phẩm: chạm nút bắn một lần = nhặt, không đánh.
      if (this.touch.consumeFirePress() && this.pickupAvailable) {
        this.fireSuppressed = true;
        this.pendingInteract = true;
      }

      return (held && !this.fireSuppressed) || this.attackKey.isDown;
    }

    return this.scene.input.activePointer.leftButtonDown() || this.attackKey.isDown;
  }

  /** Trả về yêu cầu đổi vũ khí đã xếp hàng và xoá hàng đợi. */
  getWeaponSwitch(): WeaponSwitchRequest | null {
    if (this.touch?.consumeSwitch()) {
      this.pendingWeaponSwitch = 'cycle';
    }

    const request = this.pendingWeaponSwitch;

    this.pendingWeaponSwitch = null;
    return request;
  }

  /** WorldScene báo có vật phẩm đã mở để nhặt ngay cạnh người chơi. */
  setPickupAvailable(available: boolean): void {
    this.pickupAvailable = available;
  }

  consumeDashRequest(): boolean {
    const requested = this.pendingDash || (this.touch?.consumeDash() ?? false);

    this.pendingDash = false;
    return requested;
  }

  /** Yêu cầu tung kỹ năng đã xếp hàng (phím, nút cảm ứng hoặc thanh kỹ năng). */
  consumeSkillRequest(): SkillCastRequest | null {
    const touchSkill = this.touch?.consumeSkill() ?? null;

    if (touchSkill !== null) {
      this.pendingSkill = touchSkill;
    }

    const request = this.pendingSkill;

    this.pendingSkill = null;
    return request;
  }

  /** Yêu cầu tung kỹ năng ở ô `index` (từ thanh kỹ năng trên màn hình). */
  requestSkill(index: number): void {
    this.pendingSkill = keyboardCast(index);
  }

  /** Xoá input đang xếp hàng (dùng khi mở/đóng overlay level-up). */
  resetRequests(): void {
    this.pendingWeaponSwitch = null;
    this.pendingSkill = null;
    this.pendingDash = false;
    this.pendingInteract = false;
    this.touch?.releaseAll();
  }

  consumeInteractRequest(): boolean {
    const requested = this.pendingInteract;

    this.pendingInteract = false;
    return requested;
  }

  /** Gỡ listener DOM khi scene shutdown/restart để không bị nhân đôi. */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.pressed.clear();
  }
}
