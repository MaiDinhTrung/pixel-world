import Phaser from 'phaser';

import { VILLAGE_ASSETS } from '../config/assets';
import { CHARACTER_LIST } from '../config/characters';
import { SCENE_KEYS, TEXTURE_KEYS, TILE_SIZE } from '../config/constants';
import { progressStore } from '../progression/ProgressStore';
import { createEnemySpriteSheets } from '../utils/enemySprites';
import { createChestTextures } from '../utils/chestArt';
import { createPixelTexture } from '../utils/pixelTexture';
import { createWeaponTextures } from '../utils/weaponTextures';
import { createDamageNumberFonts } from '../vfx/damageNumberFont';
import { createVfxTextures } from '../vfx/vfxTextures';
import {
  createPlaceholderPlayerSheet,
  createPlayerAnimations,
} from '../utils/placeholderPlayer';

/** Đã đăng ký sự kiện flush khi ẩn/đóng tab chưa. */
let flushHooksRegistered = false;

const PLAYER_PALETTE = {
  O: '#14141c',
  H: '#3d4657',
  S: '#f2c7a0',
  E: '#14141c',
  B: '#3b6fd4',
  G: '#e8c04a',
  P: '#2b2b3d',
} as const;

const PLAYER_ROWS = [
  '........OOOOOOOO........',
  '......OOHHHHHHHHOO......',
  '.....OHHHHHHHHHHHHO.....',
  '....OHHHHHHHHHHHHHHO....',
  '....OHHSSSSSSSSSSHHO....',
  '....OHSSSSSSSSSSSSHO....',
  '....OHSSSSSSSSSSSSHO....',
  '....OHSSEESSSSEESSHO....',
  '....OHSSSSSSSSSSSSHO....',
  '.....OHSSSSSSSSSSHO.....',
  '......OSSSSSSSSSSO......',
  '.......OSSSSSSSSO.......',
  '........OSSSSSSO........',
  '.....OOOBBBBBBBBOOO.....',
  '...OOBBBBBBBBBBBBBBOO...',
  '..OBBBBBBBBBBBBBBBBBBO..',
  '..OBBBBBBBBBBBBBBBBBBO..',
  '..OBBBGGGGGGGGGGGGBBBO..',
  '..OBBBBBBBBBBBBBBBBBBO..',
  '..OBBBBBBBBBBBBBBBBBBO..',
  '..OBBBBBBBBBBBBBBBBBBO..',
  '...OBBBBBBBBBBBBBBBBO...',
  '....OBBBBBBBBBBBBBBO....',
  '.....OPPPPPPPPPPPPO.....',
  '.....OPPPPPPPPPPPPO.....',
  '.....OPPPPO..OPPPPO.....',
  '.....OPPPPO..OPPPPO.....',
  '.....OPPPPO..OPPPPO.....',
  '.....OPPPPO..OPPPPO.....',
  '.....OPPPPO..OPPPPO.....',
  '.....OOOOOO..OOOOOO.....',
  '........................',
];

const ROCK_PALETTE = {
  O: '#22252e',
  A: '#5a6070',
  B: '#454b5a',
} as const;

const ROCK_ROWS = [
  '...OOOOOO...',
  '..OAAAAAAO..',
  '.OAAAAAAAAO.',
  'OAAAAABAAAAO',
  'OAAAAAAAAAAO',
  '.OAAABAAAAO.',
  '..OAAAAAAO..',
  '...OOOOOO...',
];

const BULLET_PALETTE = {
  W: '#ffffff',
  B: '#5fe0ff',
} as const;

const BULLET_ROWS = ['WWBB', 'BBBB'];

// Texture đạn quái được sinh ở vfx/vfxTextures.ts (createVfxTextures): màu trắng trung tính,
// màu thật do tint quyết định theo nguồn/nguyên tố trong fireEnemyBullet (utils/projectile.ts).

const SPARK_PALETTE = {
  Y: '#ffe66d',
  W: '#ffffff',
} as const;

const SPARK_ROWS = ['.YY.', 'YWWY', 'YWWY', '.YY.'];

const HAT_ROWS = [
  '...OOOO...',
  '..OBBBBO..',
  '.OBBBBBBO.',
  'OBBBBBBBBO',
  'OBBBBBBBBO',
  '.OOOOOOOO.',
  '..........',
  '..........',
];

const ARMOR_ROWS = [
  '..OOOOOO..',
  '.OBBBBBBO.',
  'OBBBBBBBBO',
  'OBBOBBOBBO',
  'OBBBBBBBBO',
  'OBBBBBBBBO',
  'OBBBBBBBBO',
  '.OBBBBBBO.',
  '..OBBBBO..',
  '...OOOO...',
];

const BOOTS_ROWS = [
  '..OO..OO..',
  '..OB..OB..',
  '..OB..OB..',
  '..OB..OB..',
  '..OB..OB..',
  '.OBB..OBB.',
  'OBBBOBBBBO',
  '.OOOOOOOO.',
];

const CLOTH_HOOD_PALETTE = {
  O: '#2a2a33',
  B: '#8b8fa3',
} as const;

const IRON_HELM_PALETTE = {
  O: '#232833',
  B: '#9fb7d9',
} as const;

const DRAGON_CROWN_PALETTE = {
  O: '#3a2a10',
  B: '#e8c04a',
} as const;

const CLOTH_ROBE_PALETTE = {
  O: '#2a2a33',
  B: '#7b6f8f',
} as const;

const IRON_CUIRASS_PALETTE = {
  O: '#232833',
  B: '#8fa8c9',
} as const;

const DRAGON_PLATE_PALETTE = {
  O: '#3a2a10',
  B: '#d9a441',
} as const;

const WORN_BOOTS_PALETTE = {
  O: '#2a2a33',
  B: '#7a5a3a',
} as const;

const SWIFT_GREAVES_PALETTE = {
  O: '#1a2a2e',
  B: '#5fe0ff',
} as const;

const VOID_TREADS_PALETTE = {
  O: '#2a0f3a',
  B: '#c36bff',
} as const;

const ARROW_PALETTE = {
  W: '#ffffff',
  B: '#7dff9a',
} as const;

const ARROW_ROWS = ['WWBBBBBB', 'BBBBBBBB'];

const ORB_PALETTE = {
  O: '#4a1a6a',
  P: '#c36bff',
  W: '#ffffff',
} as const;

const ORB_ROWS = [
  '..OOOO..',
  '.OPPPPO.',
  'OPPWWPPO',
  'OPWWWWPO',
  'OPWWWWPO',
  'OPPWWPPO',
  '.OPPPPO.',
  '..OOOO..',
];

/**
 * Nạp tài nguyên trước khi vào menu.
 * Texture placeholder sinh tại runtime ở độ phân giải 2× (960×540).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload);
  }

  preload(): void {
    for (const asset of VILLAGE_ASSETS) {
      this.load.image(asset.key, asset.path);
    }
  }

  create(): void {
    // Nạp tiến trình sớm; chỉ vào menu khi đã nạp xong (hydrate không bao giờ reject).
    const ready = progressStore.hydrate();

    // Ghi nốt hàng đợi khi ẩn/đóng tab. Đăng ký một lần cho cả phiên.
    if (!flushHooksRegistered) {
      flushHooksRegistered = true;
      window.addEventListener('pagehide', () => {
        void progressStore.flush();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          void progressStore.flush();
        }
      });
    }

    createPixelTexture(this, TEXTURE_KEYS.player, PLAYER_ROWS, PLAYER_PALETTE);
    createEnemySpriteSheets(this);

    // Vật thể nhỏ dùng art cũ nhân đôi để giữ chi tiết pixel.
    createPixelTexture(this, TEXTURE_KEYS.rock, ROCK_ROWS, ROCK_PALETTE, 2);
    createWeaponTextures(this);
    createPixelTexture(this, TEXTURE_KEYS.bullet, BULLET_ROWS, BULLET_PALETTE, 2);
    createPixelTexture(this, TEXTURE_KEYS.spark, SPARK_ROWS, SPARK_PALETTE, 2);
    createChestTextures(this);
    createPixelTexture(this, TEXTURE_KEYS.arrow, ARROW_ROWS, ARROW_PALETTE, 2);
    createPixelTexture(this, TEXTURE_KEYS.orb, ORB_ROWS, ORB_PALETTE, 2);
    createPixelTexture(this, TEXTURE_KEYS.clothHood, HAT_ROWS, CLOTH_HOOD_PALETTE, 2);
    createPixelTexture(this, TEXTURE_KEYS.ironHelm, HAT_ROWS, IRON_HELM_PALETTE, 2);
    createPixelTexture(
      this,
      TEXTURE_KEYS.dragonCrown,
      HAT_ROWS,
      DRAGON_CROWN_PALETTE,
      2,
    );
    createPixelTexture(
      this,
      TEXTURE_KEYS.clothRobe,
      ARMOR_ROWS,
      CLOTH_ROBE_PALETTE,
      2,
    );
    createPixelTexture(
      this,
      TEXTURE_KEYS.ironCuirass,
      ARMOR_ROWS,
      IRON_CUIRASS_PALETTE,
      2,
    );
    createPixelTexture(
      this,
      TEXTURE_KEYS.dragonPlate,
      ARMOR_ROWS,
      DRAGON_PLATE_PALETTE,
      2,
    );
    createPixelTexture(
      this,
      TEXTURE_KEYS.wornBoots,
      BOOTS_ROWS,
      WORN_BOOTS_PALETTE,
      2,
    );
    createPixelTexture(
      this,
      TEXTURE_KEYS.swiftGreaves,
      BOOTS_ROWS,
      SWIFT_GREAVES_PALETTE,
      2,
    );
    createPixelTexture(
      this,
      TEXTURE_KEYS.voidTreads,
      BOOTS_ROWS,
      VOID_TREADS_PALETTE,
      2,
    );

    createPixelTexture(
      this,
      TEXTURE_KEYS.skeleton,
      [
        '..bbbb..',
        '.bwbbwb.',
        '.bbbbbb.',
        '..bwwb..',
        '.bbbbbb.',
        'b.bwwb.b',
        '..bbbb..',
        '..b..b..',
        '.bb..bb.',
      ],
      { b: '#e8e0c8', w: '#3a3144' },
      3,
    );

    this.createGlowTexture();
    this.createShadowTexture();
    this.createRingTexture();
    createVfxTextures(this);
    createDamageNumberFonts(this);
    this.createGroundTexture();
    this.createWallTexture();

    for (const character of CHARACTER_LIST) {
      createPlaceholderPlayerSheet(
        this,
        character.textureKey,
        character.palette,
        character.style,
      );
      createPlayerAnimations(
        this,
        character.animPrefix,
        character.textureKey,
      );
    }

    ready.then(() => {
      this.scene.start(SCENE_KEYS.menu);
    });
  }

  private createGlowTexture(): void {
    if (this.textures.exists(TEXTURE_KEYS.glow)) {
      return;
    }

    const graphics = this.make.graphics({}, false);

    graphics.fillStyle(0xffffff, 0.06);
    graphics.fillCircle(32, 32, 32);
    graphics.fillStyle(0xffffff, 0.12);
    graphics.fillCircle(32, 32, 24);
    graphics.fillStyle(0xffffff, 0.22);
    graphics.fillCircle(32, 32, 16);
    graphics.fillStyle(0xffffff, 0.45);
    graphics.fillCircle(32, 32, 8);

    graphics.generateTexture(TEXTURE_KEYS.glow, 64, 64);
    graphics.destroy();
  }

  /** Hình elip đen đặc 64×32 để scale thành bóng đổ. */
  private createShadowTexture(): void {
    if (this.textures.exists(TEXTURE_KEYS.shadow)) {
      return;
    }

    const graphics = this.make.graphics({}, false);

    graphics.fillStyle(0x000000, 1);
    graphics.fillEllipse(32, 16, 64, 32);
    graphics.generateTexture(TEXTURE_KEYS.shadow, 64, 32);
    graphics.destroy();
  }

  private createRingTexture(): void {
    if (this.textures.exists(TEXTURE_KEYS.ring)) {
      return;
    }

    const graphics = this.make.graphics({}, false);

    graphics.lineStyle(4, 0xffffff, 1);
    graphics.strokeCircle(64, 64, 56);

    graphics.generateTexture(TEXTURE_KEYS.ring, 128, 128);
    graphics.destroy();
  }

  /** Sàn dungeon 32×32 nhiều chi tiết hơn. */
  private createGroundTexture(): void {
    if (this.textures.exists(TEXTURE_KEYS.ground)) {
      return;
    }

    const graphics = this.make.graphics({}, false);

    graphics.fillStyle(0x2c2f3a, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    graphics.fillStyle(0x23252e, 1);
    graphics.fillRect(0, 0, TILE_SIZE, 2);
    graphics.fillRect(0, 16, TILE_SIZE, 2);
    graphics.fillRect(0, 0, 2, 16);
    graphics.fillRect(16, 16, 2, 16);

    graphics.fillStyle(0x363a47, 1);
    graphics.fillRect(2, 2, 12, 2);
    graphics.fillRect(18, 18, 12, 2);

    graphics.fillStyle(0x333642, 1);
    graphics.fillRect(6, 8, 4, 2);
    graphics.fillRect(22, 10, 4, 2);
    graphics.fillRect(10, 24, 4, 2);
    graphics.fillRect(24, 26, 3, 2);

    graphics.fillStyle(0x1f2129, 1);
    graphics.fillRect(14, 4, 1, 6);
    graphics.fillRect(20, 20, 1, 5);

    graphics.generateTexture(TEXTURE_KEYS.ground, TILE_SIZE, TILE_SIZE);
    graphics.destroy();
  }

  /** Tường đá 32×32. */
  private createWallTexture(): void {
    if (this.textures.exists(TEXTURE_KEYS.wall)) {
      return;
    }

    const graphics = this.make.graphics({}, false);

    graphics.fillStyle(0x4a4f5e, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    graphics.fillStyle(0x2f333e, 1);
    graphics.fillRect(0, 0, TILE_SIZE, 2);
    graphics.fillRect(0, 14, TILE_SIZE, 2);
    graphics.fillRect(0, 16, 2, 16);
    graphics.fillRect(16, 0, 2, 14);
    graphics.fillRect(0, 30, TILE_SIZE, 2);

    graphics.fillStyle(0x5b6173, 1);
    graphics.fillRect(2, 2, 12, 2);
    graphics.fillRect(18, 18, 12, 2);

    graphics.fillStyle(0x3d4250, 1);
    graphics.fillRect(4, 7, 6, 2);
    graphics.fillRect(20, 5, 6, 2);
    graphics.fillRect(20, 24, 6, 2);

    graphics.generateTexture(TEXTURE_KEYS.wall, TILE_SIZE, TILE_SIZE);
    graphics.destroy();
  }
}
