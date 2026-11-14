import Phaser from 'phaser';

import type { PointerControl } from '../../input/MobileInputManager';

/** Cử chỉ kéo (dùng cho nút kỹ năng ngắm); toạ độ thiết kế của con trỏ. */
export interface ButtonGesture {
  down(x: number, y: number): void;
  move(x: number, y: number): void;
  up(x: number, y: number): void;
  /** Bị huỷ giữa chừng (mở panel...), không tính là nhả tay. */
  abort(): void;
}

export interface ActionButtonOptions {
  title: string;
  color: number;
  depth: number;
  onPress: () => void;
  onRelease?: () => void;
  gesture?: ButtonGesture;
  /** Hình dạng nút; mặc định tròn. */
  shape?: ButtonShape;
}

export type ButtonShape = 'circle' | 'square';

type ShapeObject = Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;

/** Nửa cạnh của nút vuông so với bán kính (để diện tích gần bằng nút tròn). */
const SQUARE_HALF_RATIO = 0.88;

const IDLE_FILL_ALPHA = 0.28;
const PRESSED_FILL_ALPHA = 0.7;
/** Vùng chạm rộng hơn hình vẽ một chút để ngón cái dễ trúng. */
const HIT_FORGIVENESS = 1.1;

/**
 * Nút tròn dùng chung cho Attack, Dash, Swap và S1–S3.
 * Không dùng `setInteractive` của Phaser: con trỏ do MobileInputManager gán.
 */
export class ActionButton implements PointerControl {
  private readonly circle: ShapeObject;
  private readonly shape: ButtonShape;
  private readonly label: Phaser.GameObjects.Text;
  private readonly overlay: ShapeObject;
  private readonly cooldownText: Phaser.GameObjects.Text;
  private readonly color: number;
  private readonly onPress: () => void;
  private readonly onRelease: (() => void) | undefined;
  private readonly gesture: ButtonGesture | undefined;

  private x = 0;
  private y = 0;
  private radius = 30;
  private enabled = true;
  private pressed = false;
  private title: string;
  private lastCooldownLabel = '';

  constructor(scene: Phaser.Scene, options: ActionButtonOptions) {
    this.color = options.color;
    this.title = options.title;
    this.onPress = options.onPress;
    this.onRelease = options.onRelease;
    this.gesture = options.gesture;
    this.shape = options.shape ?? 'circle';

    this.circle = (
      this.shape === 'square'
        ? scene.add.rectangle(0, 0, 60, 60, options.color, IDLE_FILL_ALPHA)
        : scene.add.circle(0, 0, 30, options.color, IDLE_FILL_ALPHA)
    )
      .setStrokeStyle(3, options.color, 0.9)
      .setScrollFactor(0)
      .setDepth(options.depth);
    this.label = scene.add
      .text(0, 0, options.title, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(options.depth + 1);
    this.overlay = (
      this.shape === 'square'
        ? scene.add.rectangle(0, 0, 60, 60, 0x05060a, 0.6)
        : scene.add.circle(0, 0, 30, 0x05060a, 0.6)
    )
      .setScrollFactor(0)
      .setDepth(options.depth + 2)
      .setVisible(false);
    this.cooldownText = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(options.depth + 3)
      .setVisible(false);
  }

  /** Đặt vị trí, bán kính (đơn vị thiết kế) và độ trong suốt chung. */
  layout(x: number, y: number, radius: number, opacity: number): void {
    this.x = x;
    this.y = y;
    this.radius = radius;

    this.resizeShape(this.circle, radius);
    this.resizeShape(this.overlay, radius);
    this.circle.setPosition(x, y).setAlpha(opacity);
    this.overlay.setPosition(x, y).setAlpha(opacity);
    this.label
      .setPosition(x, y)
      .setFontSize(Math.max(9, Math.round(radius * 0.36)))
      .setAlpha(opacity);
    this.cooldownText
      .setPosition(x, y)
      .setFontSize(Math.max(11, Math.round(radius * 0.5)))
      .setAlpha(opacity);
  }

  private resizeShape(target: ShapeObject, radius: number): void {
    if (target instanceof Phaser.GameObjects.Arc) {
      target.setRadius(radius);
    } else {
      const side = radius * 2 * SQUARE_HALF_RATIO;

      target.setSize(side, side);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.circle.setVisible(enabled);
    this.label.setVisible(enabled);

    if (!enabled) {
      this.overlay.setVisible(false);
      this.cooldownText.setVisible(false);
    }
  }

  setTitle(title: string): void {
    if (title !== this.title) {
      this.title = title;
      this.label.setText(title);
    }
  }

  /** `lockedText` có giá trị thì nút bị khoá và hiện chữ đó. */
  setCooldown(remainingMs: number, lockedText: string | null = null): void {
    if (!this.enabled) {
      return;
    }

    const text =
      lockedText ?? (remainingMs > 0 ? (remainingMs / 1000).toFixed(1) : '');
    const covered = text !== '';

    if (text === this.lastCooldownLabel) {
      return;
    }

    this.lastCooldownLabel = text;
    this.overlay.setVisible(covered);
    this.cooldownText.setVisible(covered);

    if (covered) {
      this.cooldownText.setText(text);
    }
  }

  hitTest(x: number, y: number): boolean {
    if (!this.enabled) {
      return false;
    }

    if (this.shape === 'square') {
      const half = this.radius * SQUARE_HALF_RATIO * HIT_FORGIVENESS;

      return Math.abs(x - this.x) <= half && Math.abs(y - this.y) <= half;
    }

    return (
      Math.hypot(x - this.x, y - this.y) <= this.radius * HIT_FORGIVENESS
    );
  }

  /** Tâm nút (toạ độ thiết kế). */
  getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  onDown(pointer: Phaser.Input.Pointer): void {
    this.pressed = true;
    this.circle.setFillStyle(this.color, PRESSED_FILL_ALPHA);
    this.onPress();
    this.gesture?.down(pointer.x, pointer.y);
  }

  onMove(pointer: Phaser.Input.Pointer): void {
    this.gesture?.move(pointer.x, pointer.y);
  }

  onUp(pointer: Phaser.Input.Pointer): void {
    if (this.pressed) {
      this.gesture?.up(pointer.x, pointer.y);
    }

    this.reset();
  }

  cancel(): void {
    if (this.pressed) {
      this.gesture?.abort();
    }

    this.reset();
  }

  private reset(): void {
    this.circle.setFillStyle(this.color, IDLE_FILL_ALPHA);

    if (this.pressed) {
      this.pressed = false;
      this.onRelease?.();
    }
  }
}
