/**
 * Cách người chơi điều khiển một kỹ năng (độc lập với giao diện).
 * Kỹ năng không khai báo thì coi như `instant` (hành vi hiện tại).
 */
export type AimShape = 'line' | 'cone' | 'circle';

export type SkillControl =
  /** Chạm một lần là tung, hướng theo auto-aim. */
  | { readonly kind: 'instant' }
  /** Giữ + kéo để chọn hướng, thả để tung; vuốt vào vùng hủy để hủy. */
  | {
      readonly kind: 'directional';
      readonly shape: AimShape;
      /** Tầm tối đa (px thế giới). */
      readonly range: number;
      /** Độ rộng đường (px), góc mở TỔNG của hình quạt (độ), hoặc bán kính vòng tròn (px). */
      readonly size: number;
    }
  /** Giữ + kéo để chọn một điểm trên đất (trong `range`), thả để tung. */
  | {
      readonly kind: 'point';
      readonly range: number;
      readonly radius: number;
    }
  /** Chạm để chọn mục tiêu; mặc định tự chọn. */
  | {
      readonly kind: 'target';
      readonly range: number;
      readonly select: 'nearest' | 'lowestHealth';
    };

export type SkillControlKind = SkillControl['kind'];

export const DEFAULT_SKILL_CONTROL: SkillControl = { kind: 'instant' };
