/**
 * Hình ảnh quái theo archetype (Gói M2, docs/GAMEPLAY_LOOP_M.md §3b V1-V5). Thuần: không phụ thuộc Phaser/scene.
 * Quy tắc hitbox (V2): `bodySize * displayScale = ENEMY_HITBOX_WORLD_SIZE` (40 px thế giới) cho MỌI archetype;
 * chỉ hình vẽ khác cỡ, không đổi vùng va chạm.
 */
import { TEXTURE_KEYS } from './constants';
import type { ArchetypeId } from './enemyConfig';

/** Cạnh hitbox quái (px thế giới) = bodySize (px nguồn) x displayScale. Giữ 40 như trước M2 (20 x 2). */
export const ENEMY_HITBOX_WORLD_SIZE = 40;

export interface EnemyVisual {
  /** Key texture (spritesheet) của quái. */
  readonly textureKey: string;
  /** Tiền tố tên frame/anim: `<animPrefix>-<action>-<i>` và `<animPrefix>-<action>`. */
  readonly animPrefix: string;
  /** Hệ số phóng sprite khi hiển thị. */
  readonly displayScale: number;
  /** Cạnh body vật lý vuông (px nguồn, Phaser nhân với displayScale). */
  readonly bodySize: number;
  /** Tùy chọn: fps clip đi bộ; bỏ trống = fps mặc định của bộ clip quái (9). */
  readonly walkFps?: number;
}

/** Grunt/caster giữ đúng hiện trạng (texture `enemy`/`rangedEnemy`, scale 2, body 20). */
export const ENEMY_VISUALS: Readonly<Record<ArchetypeId, EnemyVisual>> = {
  grunt: {
    textureKey: TEXTURE_KEYS.enemy,
    animPrefix: TEXTURE_KEYS.enemy,
    displayScale: 2,
    bodySize: 20,
  },
  caster: {
    textureKey: TEXTURE_KEYS.rangedEnemy,
    animPrefix: TEXTURE_KEYS.rangedEnemy,
    displayScale: 2,
    bodySize: 20,
  },
  swarmer: {
    textureKey: TEXTURE_KEYS.enemySwarmer,
    animPrefix: TEXTURE_KEYS.enemySwarmer,
    displayScale: 1.6,
    bodySize: 25,
  },
  brute: {
    textureKey: TEXTURE_KEYS.enemyBruiser,
    animPrefix: TEXTURE_KEYS.enemyBruiser,
    displayScale: 2.5,
    bodySize: 16,
  },
};

/** Bảng màu sheet quái mới (V1). Duyệt: không đỏ/cam; `accent` = mắt/gai (swarmer), mắt (brute). */
export interface EnemyVariantPalette {
  readonly outline: string;
  readonly dark: string;
  readonly body: string;
  readonly light: string;
  readonly accent: string;
}

export const ENEMY_VARIANT_PALETTES = {
  swarmer: {
    outline: '#08161a',
    dark: '#1c4a46',
    body: '#2f7a6e',
    light: '#6fc4ae',
    accent: '#f2e8cc',
  },
  brute: {
    outline: '#0c1016',
    dark: '#272e3a',
    body: '#4a5568',
    light: '#8d9bb0',
    accent: '#fff6c2',
  },
} as const satisfies Record<string, EnemyVariantPalette>;
