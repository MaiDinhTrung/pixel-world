import Phaser from 'phaser';

/** Một control cảm ứng (joystick, nút...) nhận con trỏ từ MobileInputManager. */
export interface PointerControl {
  /** Có nhận con trỏ vừa chạm xuống tại (x, y) không (toạ độ thiết kế). */
  hitTest(x: number, y: number): boolean;
  onDown(pointer: Phaser.Input.Pointer): void;
  onMove(pointer: Phaser.Input.Pointer): void;
  onUp(pointer: Phaser.Input.Pointer): void;
  /** Huỷ thao tác đang giữ (mở panel, mất focus...). */
  cancel(): void;
}

/**
 * Bộ định tuyến đa điểm chạm: mỗi pointerId chỉ thuộc về MỘT control từ lúc
 * chạm xuống tới lúc nhấc, nên joystick và nút không tranh ngón của nhau.
 * Control đăng ký trước có ưu tiên cao hơn.
 */
export class MobileInputManager {
  private readonly controls: PointerControl[] = [];
  private readonly owners = new Map<number, PointerControl>();

  constructor(scene: Phaser.Scene) {
    // Cần nhiều ngón cùng lúc: joystick + nút đánh + hai nút kỹ năng.
    scene.input.addPointer(3);

    scene.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        over: Phaser.GameObjects.GameObject[],
      ) => {
        // Chạm trúng đối tượng Phaser tương tác (nút cũ, HUD) thì không nhận.
        if (over.length > 0 || this.owners.has(pointer.id)) {
          return;
        }

        for (const control of this.controls) {
          if (control.hitTest(pointer.x, pointer.y)) {
            this.owners.set(pointer.id, control);
            control.onDown(pointer);
            return;
          }
        }
      },
    );

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.owners.get(pointer.id)?.onMove(pointer);
    });

    const release = (pointer: Phaser.Input.Pointer) => {
      const owner = this.owners.get(pointer.id);

      if (owner) {
        this.owners.delete(pointer.id);
        owner.onUp(pointer);
      }
    };

    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  register(control: PointerControl): void {
    this.controls.push(control);
  }

  cancelAll(): void {
    this.owners.clear();

    for (const control of this.controls) {
      control.cancel();
    }
  }
}
