import { AIMING_CONFIG } from '../config/controlsConfig';
import type { SkillControl } from '../skills/skillControl';

/** Yêu cầu tung kỹ năng gửi từ lớp điều khiển sang WorldScene. */
export interface SkillCastRequest {
  /** Ô kỹ năng (0..2). */
  slot: number;
  /** Hướng ngắm do người chơi kéo; null = dùng hướng tự động (quick-cast). */
  aim: { x: number; y: number } | null;
  /** Mức kéo 0..1 (dùng cho kỹ năng chọn điểm); null khi quick-cast. */
  reach: number | null;
}

/** Dữ liệu để vẽ đường ngắm / vùng ảnh hưởng. */
export interface AimPreview {
  control: SkillControl;
  dirX: number;
  dirY: number;
  reach: number;
  cancelled: boolean;
  color: number;
}

interface ActiveAim {
  slot: number;
  control: SkillControl;
  color: number;
  originX: number;
  originY: number;
  dirX: number;
  dirY: number;
  reach: number;
  dragged: boolean;
  cancelled: boolean;
}

/**
 * Máy trạng thái ngắm kỹ năng: `idle → aiming → (cast | cancel)`.
 * Không phụ thuộc Phaser, nên có thể kiểm thử riêng.
 * - Nhấc ngón khi chưa kéo quá ngưỡng → quick-cast (hướng tự động).
 * - Kéo rồi nhấc → tung theo hướng kéo.
 * - Nhấc khi đang ở vùng huỷ (hoặc `abort`) → không tung.
 */
export class SkillAimingController {
  private active: ActiveAim | null = null;
  private readonly preview: AimPreview = {
    control: { kind: 'instant' },
    dirX: 0,
    dirY: 0,
    reach: 0,
    cancelled: false,
    color: 0xffffff,
  };

  begin(
    slot: number,
    control: SkillControl,
    color: number,
    originX: number,
    originY: number,
  ): void {
    this.active = {
      slot,
      control,
      color,
      originX,
      originY,
      dirX: 0,
      dirY: 0,
      reach: 0,
      dragged: false,
      cancelled: false,
    };
  }

  isAiming(): boolean {
    return this.active !== null;
  }

  update(x: number, y: number, inCancelZone: boolean): void {
    const aim = this.active;

    if (!aim) {
      return;
    }

    aim.cancelled = inCancelZone;

    const dx = x - aim.originX;
    const dy = y - aim.originY;
    const distance = Math.hypot(dx, dy);

    if (distance >= AIMING_CONFIG.dragThresholdPx) {
      aim.dragged = true;
      aim.dirX = dx / distance;
      aim.dirY = dy / distance;
      aim.reach = Math.min(1, distance / AIMING_CONFIG.dragMaxPx);
    }
  }

  /** Nhấc ngón: trả yêu cầu tung hoặc null nếu huỷ. */
  end(x: number, y: number, inCancelZone: boolean): SkillCastRequest | null {
    const aim = this.active;

    if (!aim) {
      return null;
    }

    this.update(x, y, inCancelZone);
    this.active = null;

    if (aim.cancelled) {
      return null;
    }

    if (!aim.dragged) {
      return { slot: aim.slot, aim: null, reach: null };
    }

    return {
      slot: aim.slot,
      aim: { x: aim.dirX, y: aim.dirY },
      reach: aim.reach,
    };
  }

  /** Huỷ mà không tung (mở panel, mất focus...). */
  abort(): void {
    this.active = null;
  }

  /** Dữ liệu vẽ đường ngắm; null khi không ngắm hoặc chưa kéo. Object được tái sử dụng. */
  getPreview(): AimPreview | null {
    const aim = this.active;

    if (!aim || !aim.dragged) {
      return null;
    }

    this.preview.control = aim.control;
    this.preview.dirX = aim.dirX;
    this.preview.dirY = aim.dirY;
    this.preview.reach = aim.reach;
    this.preview.cancelled = aim.cancelled;
    this.preview.color = aim.color;
    return this.preview;
  }
}
