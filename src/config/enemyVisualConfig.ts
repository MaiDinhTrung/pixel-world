/**
 * Hình ảnh quái theo archetype (Gói M2, docs/GAMEPLAY_LOOP_M.md §3b V1-V5). Thuần: không phụ thuộc Phaser/scene.
 * Quy tắc hitbox (V2): `bodySize * displayScale = ENEMY_HITBOX_WORLD_SIZE` (40 px thế giới) cho MỌI archetype;
 * chỉ hình vẽ khác cỡ, không đổi vùng va chạm.
 */
import { TEXTURE_KEYS } from './constants';
import type { ArchetypeId, EliteAffixId } from './enemyConfig';

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

/**
 * Báo hiệu thị giác của Elite (Gói M3, docs/GAMEPLAY_LOOP_M.md §3b V3-V4, §3c E6): lớp phủ vẽ bằng Graphics
 * (`entities/EliteMarker.ts`), KHÔNG dùng tint (tint bị `clearTint` sau mỗi lần chớp). Màu ngà, không đỏ/cam;
 * không nhấp nháy. GIÁ TRỊ KHỞI ĐIỂM, chỉnh sau khi chơi thử.
 *
 * Độ sâu: vòng chân ngay dưới sprite quái (depth 8); thanh máu + biểu tượng 2701,5 = trên lớp sương (2701), dưới đạn quái và
 * ánh sáng (2702, `ATMOSPHERE_DEPTH` ở `atmosphereConfig.ts`) nên thấy được từ xa ban đêm (ngoài tầm nhìn 238 px).
 */
export const ELITE_VISUAL = {
  color: 0xf2e8cc,
  colorCss: '#f2e8cc',
  /** Viền/nền tối cho thanh máu và biểu tượng (đọc được trên mọi nền). */
  backColor: 0x0b0c12,
  /** Vòng chân: dưới sprite quái (8). */
  ringDepth: 7.5,
  /** Thanh máu + biểu tượng: trên sương (2701), dưới đạn quái (2702). */
  overlayDepth: 2701.5,
  ring: {
    /** Bán kính ngang = displayWidth của quái x hệ số này. */
    radiusScale: 0.55,
    /** Bán kính dọc = bán kính ngang x hệ số này (nhìn nghiêng như đứng trên nền). */
    squash: 0.45,
    /** Tâm vòng lệch xuống dưới tâm sprite = displayHeight x hệ số này. */
    footOffsetScale: 0.3,
    lineWidth: 2,
    alpha: 0.9,
    /** Swift: số đoạn nét (đứt nét = nét/khoảng trống xen kẽ). */
    dashSegments: 12,
    /** Armored: khoảng cách (px) từ vòng ngoài vào vòng trong, số khía và độ dài khía. */
    innerGap: 4,
    notchCount: 8,
    notchLength: 4,
    /** Escorted: bán kính ba chấm trên vòng. */
    dotRadius: 2.5,
    /** Số đoạn thẳng xấp xỉ một đường elip. */
    ellipseSteps: 36,
  },
  bar: {
    width: 30,
    height: 4,
    border: 1,
    /** Khoảng hở (px) từ đỉnh sprite lên đáy thanh máu. */
    gapAboveSprite: 6,
    backAlpha: 0.8,
  },
  icon: {
    size: 9,
    /** Khoảng hở (px) giữa thanh máu và biểu tượng. */
    gapAboveBar: 3,
    backAlpha: 0.75,
  },
  /** Vòng báo hiệu lúc Elite xuất hiện (`spawnRing`). */
  spawnRing: { radius: 110, durationMs: 600 },
} as const;

/**
 * Biểu tượng affix 9x9: `#` = ngà, `.` = nền tối. swift `>>`, armored khiên, escorted ba chấm xếp tam giác.
 */
export const ELITE_AFFIX_ICON_ROWS: Readonly<Record<EliteAffixId, readonly string[]>> = {
  swift: [
    '.........',
    '.#..#....',
    '..#..#...',
    '...#..#..',
    '....#..#.',
    '...#..#..',
    '..#..#...',
    '.#..#....',
    '.........',
  ],
  armored: [
    '.........',
    '.#######.',
    '.#######.',
    '.#######.',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
    '.........',
  ],
  escorted: [
    '.........',
    '....#....',
    '...###...',
    '....#....',
    '.........',
    '.#.....#.',
    '###...###',
    '.#.....#.',
    '.........',
  ],
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
