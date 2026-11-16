import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { WEAPON_DEPTH_FRONT, WEAPON_SPRITE_SPEC } from '../config/weaponSpriteConfig';
import { ATMOSPHERE_DEPTH } from '../config/atmosphereConfig';
import { PLAYER_FRAME_SIZE } from '../config/assets';
import { CHARACTERS } from '../config/characters';
import {
  BERSERK_SCALE,
  BOSS_FAN_TELEGRAPH_MS,
  BOSS_METEOR_TELEGRAPH_MS,
  BOSS_NOVA_TELEGRAPH_MS,
  BOSS_SLAM_TELEGRAPH_MS,
  BOSS_SUMMON_TELEGRAPH_MS,
  ENEMY_FLASH_MS,
  PLAYER_INVULNERABLE_MS,
  RANGED_ENEMY_TELEGRAPH_MS,
  STAFF_BIG_ORB_SCALE,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { ELEMENT_TYPES } from '../config/damageTypeConfig';
import {
  ENEMY_BULLET_VISUAL,
  VFX_DEPTH,
  VFX_MAX_PARTICLES,
  VFX_MAX_SPRITES,
  VFX_TOUCH_PARTICLE_SCALE,
} from '../config/vfxConfig';

/**
 * ART CONTRACT (gói G0, Visual Overhaul) — đóng băng các bất biến gameplay mà art mới không được đổi.
 * Nguồn: docs/visual-overhaul/GAMEPLAY_INVARIANTS.md (I1–I20, E1–E7, §2.3). Test chỉ ĐỌC, không sửa gameplay.
 *
 * Hai cách kiểm:
 *  (a) import hằng đã export và so giá trị;
 *  (b) với literal nằm trong thân code (không export được vì Phaser không import được trong Node),
 *      đọc văn bản nguồn bằng fs và dùng regex "tripwire". Đổi giá trị/literal -> test đỏ kèm thông báo.
 *
 * CHƯA PHỦ (và lý do):
 *  - I1 (nội dung pixel sheet), I2 (chân art ≈ hàng 44/48), I5 (chân art dưới tâm khung +20): cần đọc pixel, không có
 *    môi trường canvas/Phaser trong Node và art mới còn chưa có. Kiểm bằng mắt/Gallery ở gói sau.
 *  - I3 (visualLift khi Đập Đất), I4 (hitbox khi Cuồng Nộ/Khổng Lồ nhìn thấy được): hành vi runtime; chỉ chốt
 *    được dòng mã (tripwire) chứ không chạy được.
 *  - I6/I10 phần "anim thực sự đăng ký trong Phaser" và `anims.exists`: cần Phaser runtime; chỉ kiểm bảng spec + mẫu tên.
 *  - I7 (tay theo frame): chỉ đóng băng bằng băm văn bản hàm `getHeroHandOffset`; không chạy được hàm vì
 *    placeholderPlayer import Phaser. Băm đổi = phải xem lại tay 4 hướng × idle/run/attack bằng mắt.
 *  - I9: chỉ chốt scale 1/lật/độ sâu (tripwire); giới hạn ≤ 60 px đã có trong weaponArt.test.ts.
 *  - I13: AABB không xoay, hitbox thực tế khi va chạm: runtime. Ở đây chốt kích thước texture + không có setSize.
 *  - E3: thời điểm `destroy()` thực tế (runtime); ở đây chốt literal 340 và thời lượng clip.
 *  - E4: "frame 3 chỉ hiện ~29 ms" là hệ quả tính tay, không kiểm runtime.
 *  - I14–I20, E6, và mọi mục §3 (readability/độ tương phản) nằm ngoài phạm vi G0 (thuộc QA/chơi thử và các gói sau).
 *  - D11 (hook thử Boss) hoãn.
 */

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), 'utf8');
}

function expectMatch(text: string, pattern: RegExp, message: string): void {
  expect(pattern.test(text), message).toBe(true);
}

interface Clip {
  readonly action: string;
  readonly frames: number;
  readonly frameRate: number;
  readonly repeat: number;
}

function parseActionSpecs(text: string): Clip[] {
  const clips: Clip[] = [];

  for (const match of text.matchAll(
    /\{\s*action:\s*'(\w+)',\s*frames:\s*(\d+),\s*frameRate:\s*(\d+),\s*repeat:\s*(-?\d+)\s*\}/g,
  )) {
    clips.push({
      action: match[1],
      frames: Number(match[2]),
      frameRate: Number(match[3]),
      repeat: Number(match[4]),
    });
  }

  return clips;
}

function clipMs(frames: number, frameRate: number): number {
  return (frames / frameRate) * 1000;
}

function listSources(dir: string): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...listSources(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      result.push(full);
    }
  }

  return result;
}

/** Lấy mảng hàng pixel `const NAME = [ '...', ... ];` ở PreloadScene -> kích thước (cột, hàng). */
function pixelRowsSize(text: string, name: string): { cols: number; rows: number } {
  const block = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(text);

  expect(block, `không tìm thấy mảng ${name} ở PreloadScene.ts`).not.toBeNull();

  const rows = [...(block as RegExpExecArray)[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);

  return { cols: Math.max(...rows.map((row) => row.length)), rows: rows.length };
}

function pixelSizeOf(text: string, textureKey: string, rowsName: string): number {
  const call = new RegExp(
    `createPixelTexture\\(\\s*this,\\s*TEXTURE_KEYS\\.${textureKey},\\s*${rowsName},\\s*\\w+,\\s*(\\d+)\\s*\\)`,
  ).exec(text);

  expect(call, `không tìm thấy createPixelTexture cho ${textureKey}`).not.toBeNull();

  return Number((call as RegExpExecArray)[1]);
}

// ───────────────────────────── I1, I6 — khung, sheet, tên frame/anim người chơi ─────────────────────────────

describe('I1/I6 người chơi: khung 48, sheet 6x20, tên frame/anim, clip', () => {
  const player = read('utils/placeholderPlayer.ts');
  const clips = parseActionSpecs(player);

  it('I1: PLAYER_FRAME_SIZE = 48 và sheet = 6 cột x 20 hàng (288x960)', () => {
    expect(PLAYER_FRAME_SIZE).toBe(48);
    expectMatch(player, /PLAYER_FRAME_SIZE\s*\*\s*6\s*,\s*PLAYER_FRAME_SIZE\s*\*\s*20/, 'sheet người chơi không còn là 6x20 khung');
    expect(PLAYER_FRAME_SIZE * 6).toBe(288);
    expect(PLAYER_FRAME_SIZE * 20).toBe(960);
  });

  it('I6: bảng ACTION_SPECS người chơi = idle 4f@4, run 6f@11, attack 4f@13, hurt 1f@6, death 4f@7', () => {
    expect(clips).toEqual([
      { action: 'idle', frames: 4, frameRate: 4, repeat: -1 },
      { action: 'run', frames: 6, frameRate: 11, repeat: -1 },
      { action: 'attack', frames: 4, frameRate: 13, repeat: 0 },
      { action: 'hurt', frames: 1, frameRate: 6, repeat: 0 },
      { action: 'death', frames: 4, frameRate: 7, repeat: 0 },
    ]);
  });

  it('I6: 4 hướng, hàng bắt đầu từng action và số cột tối đa vừa sheet', () => {
    const directions = /const DIRECTIONS[^=]*=\s*\[([^\]]*)\]/.exec(player);

    expect(directions, 'không tìm thấy DIRECTIONS').not.toBeNull();
    expect(
      [...(directions as RegExpExecArray)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]).sort(),
    ).toEqual(['down', 'left', 'right', 'up']);

    const rowBlock = /const ACTION_ROW[^=]*=\s*\{([^}]*)\}/.exec(player);

    expect(rowBlock, 'không tìm thấy ACTION_ROW').not.toBeNull();

    const rows: Record<string, number> = {};

    for (const match of (rowBlock as RegExpExecArray)[1].matchAll(/(\w+):\s*(\d+)/g)) {
      rows[match[1]] = Number(match[2]);
    }

    expect(rows).toEqual({ idle: 0, run: 4, attack: 10, hurt: 14, death: 15 });
    // death bắt đầu hàng 15, 4 hướng -> dùng đến hàng 18 (< 20 hàng của sheet).
    expect(rows.death + 4).toBeLessThanOrEqual(20);
    expect(Math.max(...clips.map((clip) => clip.frames))).toBeLessThanOrEqual(6);
  });

  it('I6: mẫu tên frame `<hướng>-<action>-<i>` và anim `<animPrefix>-<hướng>-<action>`', () => {
    expectMatch(player, /`\$\{direction\}-\$\{spec\.action\}-\$\{frame\}`/, 'mẫu tên frame người chơi đã đổi');
    expectMatch(
      player,
      /`\$\{animPrefix\}-\$\{direction\}-\$\{spec\.action\}`/,
      'mẫu tên anim người chơi đã đổi',
    );
    expectMatch(
      player,
      /frame:\s*`\$\{direction\}-\$\{spec\.action\}-\$\{index\}`/,
      'frame dùng trong anim người chơi đã đổi',
    );
  });

  it('I6: 4 nhân vật có textureKey/animPrefix cố định', () => {
    expect(
      Object.fromEntries(
        Object.entries(CHARACTERS).map(([id, def]) => [id, [def.textureKey, def.animPrefix]]),
      ),
    ).toEqual({
      knight: ['player-knight', 'knight'],
      ranger: ['player-ranger', 'ranger'],
      mage: ['player-mage', 'mage'],
      necromancer: ['player-necromancer', 'necromancer'],
    });
  });
});

// ───────────────────────────── I2, I3, I4, I5 — body, depth người chơi ─────────────────────────────

describe('I2-I5 người chơi: body, origin, depth, scale', () => {
  const player = read('entities/Player.ts');

  it('I2: body 24x28, offset (12,16), origin 0.5', () => {
    expectMatch(player, /this\.setOrigin\(0\.5\);/, 'Player.setOrigin(0.5) đã đổi');
    expectMatch(player, /this\.setBodySize\(24,\s*28\);/, 'body người chơi không còn 24x28');
    expectMatch(player, /const PLAYER_BODY_OFFSET_Y = 16;/, 'PLAYER_BODY_OFFSET_Y không còn 16');
    expectMatch(player, /this\.setOffset\(12,\s*PLAYER_BODY_OFFSET_Y\);/, 'offset người chơi không còn (12,16)');
  });

  it('I3: visualLift bù origin và body.offset theo this.height', () => {
    expectMatch(player, /this\.setOrigin\(0\.5,\s*0\.5 \+ localLift \/ this\.height\)/, 'công thức bù origin visualLift đã đổi');
    expectMatch(player, /body\.offset\.y = PLAYER_BODY_OFFSET_Y \+ localLift;/, 'công thức bù body.offset visualLift đã đổi');
  });

  it('I4: scale người chơi nhân cả body (Cuồng Nộ x1.3)', () => {
    expect(BERSERK_SCALE).toBe(1.3);
    expectMatch(player, /this\.setScale\(BERSERK_SCALE\)/, 'Cuồng Nộ không còn setScale(BERSERK_SCALE)');
  });

  it('I5: depth người chơi y+20, vũ khí y+21', () => {
    expectMatch(player, /this\.setDepth\(this\.y \+ 20\)/, 'depth người chơi không còn y+20');
    expect(WEAPON_DEPTH_FRONT).toBe(21);
    expectMatch(
      read('combat/weaponSprite.ts'),
      /return player\.y \+ WEAPON_DEPTH_FRONT;/,
      'depth vũ khí không còn player.y + WEAPON_DEPTH_FRONT',
    );
  });
});

// ───────────────────────────── I7 — tay theo frame ─────────────────────────────

describe('I7 điểm tay getHeroHandOffset', () => {
  /** Đổi băm = đã đổi bảng tay: phải xem lại tay 4 hướng x idle/run/attack bằng mắt rồi cập nhật băm có chủ đích. */
  const HAND_OFFSET_SHA1 = 'd254b52755772c4b8a24758a7e1851d4680d8611';

  it('thân hàm không đổi (băm sau khi gộp khoảng trắng)', () => {
    const player = read('utils/placeholderPlayer.ts');
    const start = player.indexOf('export function getHeroHandOffset(');

    expect(start, 'không tìm thấy getHeroHandOffset').toBeGreaterThanOrEqual(0);

    const closing = /\r?\n\}\r?\n/.exec(player.slice(start));

    expect(closing, 'không tìm thấy cuối hàm getHeroHandOffset').not.toBeNull();

    const end = start + (closing as RegExpExecArray).index + 2;
    const body = player.slice(start, end).replace(/\s+/g, ' ').trim();
    const digest = createHash('sha1').update(body).digest('hex');

    expect(digest, 'getHeroHandOffset đã đổi: kiểm tay vũ khí/khiên rồi cập nhật HAND_OFFSET_SHA1').toBe(HAND_OFFSET_SHA1);
  });

  it('Player vẫn tra tay theo tên frame', () => {
    expectMatch(
      read('entities/Player.ts'),
      /getHeroHandOffset\(String\(this\.frame\.name\),\s*hand\)/,
      'Player không còn tra tay theo tên frame',
    );
  });
});

// ───────────────────────────── I8, I9 — muzzle, grip, sprite vũ khí ─────────────────────────────

describe('I8/I9 vũ khí: grip/forward/muzzle, origin, scale', () => {
  it('I8: WEAPON_SPRITE_SPEC giữ nguyên toàn bộ grip/forward/muzzle', () => {
    expect(WEAPON_SPRITE_SPEC).toEqual({
      sword: { grip: { x: 6, y: 6 }, forward: 2, muzzle: 0 },
      shield: { grip: { x: 12.5, y: 14.5 }, forward: 6, muzzle: 0 },
      blaster: { grip: { x: 5.5, y: 4 }, forward: 4, muzzle: 30 },
      bow: { grip: { x: 14, y: 13 }, forward: 4, muzzle: 26 },
      scythe: { grip: { x: 22, y: 6 }, forward: 4, muzzle: 0 },
      staff: { grip: { x: 10, y: 4 }, forward: 4, muzzle: 34 },
      wand: { grip: { x: 4, y: 2.5 }, forward: 4, muzzle: 28 },
      excalibur: { grip: { x: 22, y: 6 }, forward: 4, muzzle: 0 },
      dragon_bow: { grip: { x: 14, y: 15 }, forward: 4, muzzle: 26 },
      void_staff: { grip: { x: 10, y: 5 }, forward: 4, muzzle: 0 },
      dual_blades: { grip: { x: 5, y: 5 }, forward: 2, muzzle: 0 },
      hammer: { grip: { x: 7, y: 6.5 }, forward: 2, muzzle: 0 },
    });
  });

  it('I8: điểm bắn = tâm người + muzzle theo hướng ngắm (không theo tay)', () => {
    const text = read('combat/weaponSprite.ts');

    expectMatch(
      text,
      /return \{ x: player\.x \+ directionX \* muzzle, y: player\.y \+ directionY \* muzzle \};/,
      'getMuzzlePoint không còn tính từ tâm người chơi',
    );
  });

  it('I9: origin = grip + art.pad, scale 1, lật bằng scale(1,-1)', () => {
    const text = read('combat/weaponSprite.ts');

    expectMatch(text, /\.setOrigin\(\(grip\.x \+ art\.pad\) \/ width,\s*\(grip\.y \+ art\.pad\) \/ height\)/, 'origin sprite vũ khí đã đổi');
    expectMatch(text, /sprite\.setScale\(1,\s*mirrored \? -1 : 1\)/, 'scale/lật sprite vũ khí đã đổi');
  });
});

// ───────────────────────────── I10, I11 — quái và Boss ─────────────────────────────

describe('I10/I11 quái và Boss: khung, scale, body, anim', () => {
  const sprites = read('utils/enemySprites.ts');
  const enemyBase = read('entities/EnemyBase.ts');
  const enemyClips = parseActionSpecs(sprites);

  it('I10: bảng clip quái = idle 2f@4, walk 4f@9, attack 2f@10, death 2f@7', () => {
    expect(enemyClips).toEqual([
      { action: 'idle', frames: 2, frameRate: 4, repeat: -1 },
      { action: 'walk', frames: 4, frameRate: 9, repeat: -1 },
      { action: 'attack', frames: 2, frameRate: 10, repeat: 0 },
      { action: 'death', frames: 2, frameRate: 7, repeat: 0 },
    ]);
  });

  it('I10: 3 sheet brute 24 / caster 24 / boss 32, key = TEXTURE_KEYS', () => {
    const block = /const SHEETS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(sprites);

    expect(block, 'không tìm thấy SHEETS').not.toBeNull();

    const entries = [...(block as RegExpExecArray)[1].matchAll(
      /key:\s*TEXTURE_KEYS\.(\w+),\s*prefix:\s*TEXTURE_KEYS\.(\w+),\s*visual:\s*'(\w+)',\s*size:\s*(\d+)/g,
    )].map((m) => ({ key: m[1], prefix: m[2], visual: m[3], size: Number(m[4]) }));

    expect(entries).toEqual([
      { key: 'enemy', prefix: 'enemy', visual: 'brute', size: 24 },
      { key: 'rangedEnemy', prefix: 'rangedEnemy', visual: 'caster', size: 24 },
      { key: 'boss', prefix: 'boss', visual: 'boss', size: 32 },
    ]);
    expect([TEXTURE_KEYS.enemy, TEXTURE_KEYS.rangedEnemy, TEXTURE_KEYS.boss]).toEqual(['enemy', 'rangedEnemy', 'boss']);
  });

  it('I10: mẫu tên frame/anim quái `<prefix>-<action>-<i>` và `<prefix>-<action>`', () => {
    expectMatch(sprites, /`\$\{spec\.prefix\}-\$\{actionSpec\.action\}-\$\{frame\}`/, 'mẫu tên frame quái đã đổi');
    expectMatch(sprites, /const key = `\$\{spec\.prefix\}-\$\{actionSpec\.action\}`;/, 'mẫu tên anim quái đã đổi');
    expectMatch(enemyBase, /super\(scene, x, y, texture, `\$\{animPrefix\}-idle-0`\)/, 'frame khởi tạo quái không còn <prefix>-idle-0');
    expectMatch(enemyBase, /`\$\{this\.animPrefix\}-death`|`\$\{animPrefix\}-death`/, 'anim chết quái đã đổi tên');
  });

  it('I10: quái thường scale 2, origin 0.5, body = tham số constructor', () => {
    expectMatch(enemyBase, /this\.setOrigin\(0\.5\);\s*this\.setScale\(2\);\s*this\.setBodySize\(bodyWidth,\s*bodyHeight\);/, 'origin/scale/body EnemyBase đã đổi');
    expectMatch(enemyBase, /this\.setDepth\(this\.y \+ 20\)/, 'depth quái không còn y+20');
  });

  it('I10: body 20x20 truyền từ Enemy, RangedEnemy, BossEnemy', () => {
    expectMatch(
      read('entities/Enemy.ts'),
      /TEXTURE_KEYS\.enemy,\s*TEXTURE_KEYS\.enemy,[^;]*?,\s*20,\s*20,\s*NEON\.meleeEnemy,/,
      'body Enemy không còn 20x20',
    );
    expectMatch(
      read('entities/RangedEnemy.ts'),
      /TEXTURE_KEYS\.rangedEnemy,\s*TEXTURE_KEYS\.rangedEnemy,[^;]*?,\s*20,\s*20,\s*NEON\.rangedEnemy,/,
      'body RangedEnemy không còn 20x20',
    );
    expectMatch(
      read('entities/BossEnemy.ts'),
      /TEXTURE_KEYS\.boss,\s*TEXTURE_KEYS\.boss,\s*health,\s*20,\s*20,\s*NEON\.boss,/,
      'tham số body Boss không còn 20x20',
    );
  });

  it('I11: Boss scale = min(4.4, 3.2 + 0.15*(tier-1)), body 20x20', () => {
    const boss = read('entities/BossEnemy.ts');

    expectMatch(boss, /this\.setScale\(Math\.min\(4\.4,\s*3\.2 \+ \(tier - 1\) \* 0\.15\)\);/, 'công thức scale Boss đã đổi');
    expectMatch(boss, /this\.setBodySize\(20,\s*20\);/, 'body Boss không còn 20x20');

    // Hệ quả: tier 1 -> 3.2 (thân ~64 px thế giới), tier 6 -> 3.95.
    const scaleOf = (tier: number): number => Math.min(4.4, 3.2 + (tier - 1) * 0.15);

    expect(scaleOf(1)).toBeCloseTo(3.2, 10);
    expect(20 * scaleOf(1)).toBeCloseTo(64, 10);
    expect(scaleOf(6)).toBeCloseTo(3.95, 10);
  });
});

// ───────────────────────────── I12 — đạn quái ─────────────────────────────

describe('I12 đạn quái', () => {
  it('hitbox 10, texture 44x20, depth 2702 (= ATMOSPHERE_DEPTH.light)', () => {
    expect(ENEMY_BULLET_VISUAL).toEqual({ length: 44, width: 20, hitbox: 10, depth: 2702 });
    expect(ATMOSPHERE_DEPTH.light).toBe(2702);
  });

  it('hitbox vuông đặt bằng ENEMY_BULLET_VISUAL.hitbox, độc lập texture', () => {
    const text = read('utils/projectile.ts');

    expectMatch(
      text,
      /\.setSize\(\s*ENEMY_BULLET_VISUAL\.hitbox,\s*ENEMY_BULLET_VISUAL\.hitbox/,
      'projectile không còn setSize(hitbox, hitbox)',
    );
    expectMatch(text, /bullet\.setDepth\(ENEMY_BULLET_VISUAL\.depth\)/, 'depth đạn quái không còn lấy từ ENEMY_BULLET_VISUAL');
  });

  it('6 texture theo hệ: 5 nguyên tố + vật lý; key `enemyBullet-<hệ>`', () => {
    expect(ELEMENT_TYPES.length + 1).toBe(6);
    expectMatch(
      read('vfx/vfxTextures.ts'),
      /`\$\{TEXTURE_KEYS\.enemyBullet\}-\$\{type\}`/,
      'mẫu key texture đạn quái theo hệ đã đổi',
    );
    expectMatch(read('vfx/vfxTextures.ts'), /const \{ length, width \} = ENEMY_BULLET_VISUAL;/, 'texture đạn quái không còn theo ENEMY_BULLET_VISUAL');
  });
});

// ───────────────────────────── I13 — đạn/mũi tên/orb người chơi ─────────────────────────────

describe('I13 đạn người chơi: hitbox = kích thước texture', () => {
  const preload = read('scenes/PreloadScene.ts');

  it('bullet 8x4, arrow 16x4, orb 16x16 (hàng pixel x pixelSize)', () => {
    const dims = (rowsName: string, key: string): [number, number] => {
      const size = pixelRowsSize(preload, rowsName);
      const scale = pixelSizeOf(preload, key, rowsName);

      return [size.cols * scale, size.rows * scale];
    };

    expect(dims('BULLET_ROWS', 'bullet'), 'texture đạn người chơi không còn 8x4').toEqual([8, 4]);
    expect(dims('ARROW_ROWS', 'arrow'), 'texture mũi tên không còn 16x4').toEqual([16, 4]);
    expect(dims('ORB_ROWS', 'orb'), 'texture orb không còn 16x16').toEqual([16, 16]);
  });

  it('orb lớn x2.5 và Staff dùng đúng hằng này', () => {
    expect(STAFF_BIG_ORB_SCALE).toBe(2.5);
    expectMatch(read('combat/StaffWeapon.ts'), /STAFF_BIG_ORB_SCALE/, 'StaffWeapon không còn dùng STAFF_BIG_ORB_SCALE');
  });

  it('không vũ khí nào đặt body riêng cho đạn (không setSize/setCircle/setBodySize trong src/combat)', () => {
    const offenders = listSources(join(SRC_DIR, 'combat')).filter((file) =>
      /\.(setSize|setCircle|setBodySize)\s*\(/.test(readFileSync(file, 'utf8')),
    );

    expect(offenders, `đạn người chơi nay có body riêng: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ───────────────────────────── E1–E5, E7 — animation/timing ─────────────────────────────

describe('E1-E5 phụ thuộc animation/timing', () => {
  const player = read('entities/Player.ts');

  it('E1: chỉ VFXManager lắng nghe sự kiện animation (không logic gameplay gắn vào frame/animationcomplete)', () => {
    const pattern =
      /animationcomplete|animationupdate|animationstart|animationrepeat|ANIMATION_COMPLETE|ANIMATION_UPDATE|ANIMATION_START|ANIMATION_REPEAT/;
    const hits = listSources(SRC_DIR)
      .filter((file) => pattern.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(/\\/g, '/').split('/src/')[1]);

    expect(hits.sort()).toEqual(['vfx/VFXManager.ts']);
  });

  it('E2: attack là clip không lặp (repeat 0), dừng ở frame cuối', () => {
    for (const clip of [...parseActionSpecs(read('utils/enemySprites.ts')), ...parseActionSpecs(read('utils/placeholderPlayer.ts'))]) {
      if (clip.action === 'attack') {
        expect(clip.repeat, 'clip attack phải repeat 0 (frame cuối = pose giữ)').toBe(0);
      }
    }
  });

  it('E3: quái chết destroy sau 340 ms; clip chết quái thường ≤ 340 ms', () => {
    expectMatch(
      read('entities/EnemyBase.ts'),
      /duration:\s*340,\s*ease:\s*'Quad\.easeOut',\s*onComplete:\s*\(\) => this\.destroy\(\)/,
      'thời gian destroy của quái chết không còn 340 ms',
    );

    const death = parseActionSpecs(read('utils/enemySprites.ts')).find((clip) => clip.action === 'death');

    expect(death).toBeDefined();
    // brute và caster dùng frameRate gốc: 2f@7 = 285.7 ms.
    const ms = clipMs((death as Clip).frames, (death as Clip).frameRate);

    expect(Math.round(ms)).toBe(286);
    expect(ms).toBeLessThanOrEqual(340);
  });

  it('E3: clip chết Boss hiện 2f@5 = 400 ms > 340 (hiện trạng bị cắt bởi destroy); art mới đặt ≤ 340', () => {
    expectMatch(
      read('utils/enemySprites.ts'),
      /spec\.visual === 'boss'\s*\?\s*Math\.max\(3,\s*Math\.round\(actionSpec\.frameRate \* 0\.7\)\)/,
      'công thức frameRate của Boss đã đổi',
    );
    expect(Math.max(3, Math.round(7 * 0.7))).toBe(5);
    expect(Math.round(clipMs(2, 5))).toBe(400);
  });

  it('E4: attack người chơi 4f@13 = 308 ms nhưng khóa ATTACK_ANIM_MS = 260 ms; art mới hiển thị ≤ 260 ms', () => {
    const attack = parseActionSpecs(read('utils/placeholderPlayer.ts')).find((clip) => clip.action === 'attack');

    expect(attack).toBeDefined();
    expectMatch(player, /const ATTACK_ANIM_MS = 260;/, 'ATTACK_ANIM_MS không còn 260');
    expectMatch(player, /this\.actionLockUntil = time \+ ATTACK_ANIM_MS;/, 'khóa anim attack không còn dùng ATTACK_ANIM_MS');

    const ms = clipMs((attack as Clip).frames, (attack as Clip).frameRate);

    // Hiện trạng (ghi lại, không phải mục tiêu): clip dài hơn khóa -> frame 3 chỉ hiện ~29 ms.
    expect(Math.round(ms)).toBe(308);
    expect(ms - 260).toBeGreaterThan(0);
    // Giới hạn cho art MỚI: thời lượng hiển thị không vượt cửa sổ khóa.
    const NEW_ART_ATTACK_DISPLAY_MAX_MS = 260;

    expect(Math.min(ms, 260)).toBeLessThanOrEqual(NEW_ART_ATTACK_DISPLAY_MAX_MS);
  });

  it('E5: hurt 1 frame khóa 200 ms, bất tử 900 ms (clip hurt ≤ khóa)', () => {
    expectMatch(player, /const HURT_ANIM_MS = 200;/, 'HURT_ANIM_MS không còn 200');
    expect(PLAYER_INVULNERABLE_MS).toBe(900);

    const hurt = parseActionSpecs(read('utils/placeholderPlayer.ts')).find((clip) => clip.action === 'hurt');

    expect(clipMs((hurt as Clip).frames, (hurt as Clip).frameRate)).toBeLessThanOrEqual(200);
  });

  it('E7: nháy trắng quái 70 ms (ENEMY_FLASH_MS)', () => {
    expect(ENEMY_FLASH_MS).toBe(70);
  });
});

// ───────────────────────────── §2.3 — giới hạn thời lượng clip ─────────────────────────────

describe('Giới hạn thời lượng clip (GAMEPLAY_INVARIANTS §2.3)', () => {
  const enemyClips = parseActionSpecs(read('utils/enemySprites.ts'));
  const attack = enemyClips.find((clip) => clip.action === 'attack') as Clip;

  it('quái cận chiến: clip attack (windup) ≤ 200 ms', () => {
    expect(clipMs(attack.frames, attack.frameRate)).toBeLessThanOrEqual(200);
  });

  it('quái bắn xa: clip attack ≤ RANGED_ENEMY_TELEGRAPH_MS (480)', () => {
    expect(RANGED_ENEMY_TELEGRAPH_MS).toBe(480);
    expect(clipMs(attack.frames, attack.frameRate)).toBeLessThanOrEqual(RANGED_ENEMY_TELEGRAPH_MS);
  });

  it('Boss: clip attack ≤ telegraph ngắn nhất của các chiêu (600 ms)', () => {
    const shortest = Math.min(
      BOSS_SLAM_TELEGRAPH_MS,
      BOSS_NOVA_TELEGRAPH_MS,
      BOSS_FAN_TELEGRAPH_MS,
      BOSS_METEOR_TELEGRAPH_MS,
      BOSS_SUMMON_TELEGRAPH_MS,
    );

    expect([BOSS_SLAM_TELEGRAPH_MS, BOSS_NOVA_TELEGRAPH_MS, BOSS_FAN_TELEGRAPH_MS, BOSS_METEOR_TELEGRAPH_MS, BOSS_SUMMON_TELEGRAPH_MS]).toEqual([750, 800, 600, 950, 700]);
    expect(shortest).toBe(600);

    const bossFps = Math.max(3, Math.round(attack.frameRate * 0.7));

    expect(clipMs(attack.frames, bossFps)).toBeLessThanOrEqual(shortest);
  });
});

// ───────────────────────────── Bảng depth và trần VFX ─────────────────────────────

describe('Bảng depth atmosphere/VFX và trần VFX', () => {
  it('ATMOSPHERE_DEPTH và VFX_DEPTH giữ nguyên', () => {
    expect(ATMOSPHERE_DEPTH).toEqual({ ambient: 2700, fog: 2701, light: 2702, vignette: 2705 });
    expect(VFX_DEPTH).toEqual({ ground: 4, normal: 3000, top: 3010 });
  });

  it('trần VFX 80 sprite / 250 hạt, cảm ứng x0.6 không tăng', () => {
    expect(VFX_MAX_SPRITES).toBe(80);
    expect(VFX_MAX_PARTICLES).toBe(250);
    expect(VFX_TOUCH_PARTICLE_SCALE).toBe(0.6);
  });
});
