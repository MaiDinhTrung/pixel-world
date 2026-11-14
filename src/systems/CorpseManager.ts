import Phaser from 'phaser';

import {
  CORPSE_LIFETIME_MS,
  CORPSE_MARKER_COLOR,
  CORPSE_MAX_COUNT,
} from '../config/combatConfig';

export interface Corpse {
  x: number;
  y: number;
  /** Máu tối đa của quái đã chết (để Nổ Xác tính sát thương). */
  maxHealth: number;
  expiresAt: number;
}

interface Slot {
  corpse: Corpse | null;
  marker: Phaser.GameObjects.Arc;
}

/**
 * Quản lý xác chết: tối đa `CORPSE_MAX_COUNT`, tự hết hạn.
 * Dùng pool cố định (không tạo/hủy khi chơi); xác cũ nhất bị thay khi đầy.
 * Hiện chưa có skill nào dùng; Necromancer sẽ gọi `consumeNearest`.
 */
export class CorpseManager {
  private readonly slots: Slot[] = [];

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    for (let i = 0; i < CORPSE_MAX_COUNT; i += 1) {
      const marker = scene.add
        .circle(0, 0, 6, CORPSE_MARKER_COLOR, 0.55)
        .setDepth(2)
        .setVisible(false);

      this.slots.push({ corpse: null, marker });
    }
  }

  add(x: number, y: number, maxHealth: number): void {
    const now = this.scene.time.now;
    let target = this.slots.find((slot) => slot.corpse === null);

    if (!target) {
      // Đầy: thay xác sắp hết hạn nhất.
      target = this.slots.reduce((oldest, slot) =>
        (slot.corpse as Corpse).expiresAt < (oldest.corpse as Corpse).expiresAt
          ? slot
          : oldest,
      );
    }

    target.corpse = { x, y, maxHealth, expiresAt: now + CORPSE_LIFETIME_MS };
    target.marker.setPosition(x, y).setAlpha(0.55).setVisible(true);
  }

  update(time: number): void {
    for (const slot of this.slots) {
      const corpse = slot.corpse;

      if (!corpse) {
        continue;
      }

      const remaining = corpse.expiresAt - time;

      if (remaining <= 0) {
        this.release(slot);
      } else if (remaining < 1500) {
        // Nhấp nháy báo sắp biến mất.
        slot.marker.setAlpha(Math.floor(time / 120) % 2 === 0 ? 0.55 : 0.15);
      }
    }
  }

  getCount(): number {
    return this.slots.filter((slot) => slot.corpse !== null).length;
  }

  /** Xác trong bán kính, gần nhất trước (không tiêu thụ). */
  findNear(x: number, y: number, radius: number): Corpse[] {
    return this.slots
      .map((slot) => slot.corpse)
      .filter(
        (corpse): corpse is Corpse =>
          corpse !== null &&
          Phaser.Math.Distance.Between(x, y, corpse.x, corpse.y) <= radius,
      )
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(x, y, a.x, a.y) -
          Phaser.Math.Distance.Between(x, y, b.x, b.y),
      );
  }

  /** Lấy và xóa tối đa `count` xác gần nhất trong bán kính. */
  consumeNearest(
    x: number,
    y: number,
    radius: number,
    count: number,
  ): Corpse[] {
    const picked = this.findNear(x, y, radius).slice(0, Math.max(0, count));

    for (const corpse of picked) {
      const slot = this.slots.find((entry) => entry.corpse === corpse);

      if (slot) {
        this.release(slot);
      }
    }

    return picked;
  }

  clear(): void {
    for (const slot of this.slots) {
      this.release(slot);
    }
  }

  destroy(): void {
    for (const slot of this.slots) {
      slot.marker.destroy();
    }

    this.slots.length = 0;
  }

  private release(slot: Slot): void {
    slot.corpse = null;
    slot.marker.setVisible(false);
  }
}
