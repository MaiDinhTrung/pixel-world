import type Phaser from 'phaser';

import type { EnemyBase } from '../entities/EnemyBase';

export type WeaponId =
  | 'sword'
  | 'shield'
  | 'blaster'
  | 'bow'
  | 'scythe'
  | 'staff'
  | 'wand'
  | 'excalibur'
  | 'dragon_bow'
  | 'void_staff'
  | 'dual_blades'
  | 'hammer';

/** Hợp đồng chung cho mọi vũ khí của Player. */
export interface Weapon {
  readonly id: WeaponId;
  readonly name: string;
  readonly energyCost: number;

  /** Ẩn/hiện sprite cầm tay khi chuyển vũ khí. */
  setActive(active: boolean): void;

  /** Cập nhật vị trí/hướng của vũ khí theo Player và hướng ngắm. */
  update(time: number, aim: Phaser.Math.Vector2): void;

  /** Thử đánh; trả về true nếu thực sự ra đòn (cooldown/energy cho phép). */
  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean;

  /** Vũ khí cần thả chuột để bắn (Cung) cài đặt hàm này. */
  releaseAttack?(time: number, aim: Phaser.Math.Vector2): boolean;

  /** Hủy sạch đòn/tích lực đang dở (khóa nút do vào làng/đang nhảy), không ra đòn. Búa cài đặt hàm này. */
  cancelAttack?(): void;

  /** Vùng ảnh hưởng tồn tại (Void Staff), chạy sau AI quái mỗi frame. */
  applyField?(enemies: EnemyBase[], time: number): void;

  /** Dọn sprite/hiệu ứng khi vũ khí bị hòm thay thế. */
  destroy(): void;
}
