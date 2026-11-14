import Phaser from 'phaser';

import { JOYSTICK_CONFIG } from '../config/controlsConfig';
import { DESIGN_WIDTH } from '../config/constants';
import type { PointerControl } from './MobileInputManager';

const IDLE_ALPHA = 0.35;
const ACTIVE_BASE_ALPHA = 0.35;
const ACTIVE_THUMB_ALPHA = 0.6;

/** Joystick nổi: nhận chạm ở vùng trái màn hình, gốc nằm tại điểm chạm. */
export class VirtualJoystick implements PointerControl {
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private readonly vector = new Phaser.Math.Vector2();
  private originX: number;
  private originY: number;
  private active = false;

  private readonly homeX: number;
  private readonly homeY: number;

  constructor(
    scene: Phaser.Scene,
    homeX: number,
    homeY: number,
    depth: number,
  ) {
    this.homeX = homeX;
    this.homeY = homeY;
    this.originX = homeX;
    this.originY = homeY;

    this.base = scene.add
      .circle(homeX, homeY, JOYSTICK_CONFIG.baseRadius, 0xffffff, 0.1)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(depth)
      .setAlpha(IDLE_ALPHA);
    this.thumb = scene.add
      .circle(homeX, homeY, JOYSTICK_CONFIG.thumbRadius, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setAlpha(IDLE_ALPHA);
  }

  /** Hướng di chuyển (độ dài 0 hoặc 1). */
  getVector(): Phaser.Math.Vector2 {
    return this.vector;
  }

  hitTest(x: number): boolean {
    return !this.active && x < DESIGN_WIDTH * JOYSTICK_CONFIG.zoneWidthRatio;
  }

  onDown(pointer: Phaser.Input.Pointer): void {
    this.active = true;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.base.setPosition(pointer.x, pointer.y).setAlpha(ACTIVE_BASE_ALPHA);
    this.thumb.setPosition(pointer.x, pointer.y).setAlpha(ACTIVE_THUMB_ALPHA);
    this.onMove(pointer);
  }

  onMove(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.originX;
    const dy = pointer.y - this.originY;
    const length = Math.hypot(dx, dy);
    const nx = length > 0 ? dx / length : 0;
    const ny = length > 0 ? dy / length : 0;
    const reach = Math.min(length, JOYSTICK_CONFIG.baseRadius);

    this.thumb.setPosition(this.originX + nx * reach, this.originY + ny * reach);

    if (length / JOYSTICK_CONFIG.baseRadius < JOYSTICK_CONFIG.deadzone) {
      this.vector.set(0, 0);
      return;
    }

    this.vector.set(nx, ny);
  }

  onUp(): void {
    this.cancel();
  }

  cancel(): void {
    this.active = false;
    this.vector.set(0, 0);
    this.originX = this.homeX;
    this.originY = this.homeY;
    this.base.setPosition(this.homeX, this.homeY).setAlpha(IDLE_ALPHA);
    this.thumb.setPosition(this.homeX, this.homeY).setAlpha(IDLE_ALPHA);
  }
}
