export type VFXId =
  | 'slash.arc'
  | 'ring.shock'
  | 'burst.sparks'
  | 'impact.hit'
  | 'glow.flash'
  | 'ground.crack'
  | 'dust.puff'
  | 'ghost.afterimage'
  | 'aura.shield'
  | 'aura.fury';

export interface VFXPlayOptions {
  x: number;
  y: number;
  /** Hướng (radian). Sprite được vẽ hướng sang phải rồi xoay theo góc này. */
  angle?: number;
  /** Hệ số phóng to. */
  scale?: number;
  /** Bán kính mong muốn (px) — dùng cho ring/crack. */
  radius?: number;
  tint?: number;
  /** Độ trong suốt ban đầu của quầng sáng (glow.flash); mặc định 0.9. */
  alpha?: number;
  durationMs?: number;
  /** Số particle (burst). */
  count?: number;
  speed?: number;
  /** Texture/frame riêng (afterimage). */
  texture?: string;
  frame?: string;
}

/** Tay cầm cho hiệu ứng kéo dài (aura/buff). */
export interface VFXHandle {
  stop(): void;
}

export interface VFXTarget {
  x: number;
  y: number;
  active: boolean;
}
