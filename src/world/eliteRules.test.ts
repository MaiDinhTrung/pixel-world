import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ATMOSPHERE_DEPTH } from '../config/atmosphereConfig';
import {
  ENEMY_HEALTH_MULT_PER_TIER,
  ENEMY_MAX_HEALTH,
  ENEMY_MAX_SPEED_MULT,
  ENEMY_SPEED,
  ENEMY_SPEED_MULT_PER_TIER,
} from '../config/combatConfig';
import {
  ELITE_AFFIXES,
  ELITE_AFFIX_ORDER,
  ELITE_ESCORT_ARCHETYPE,
  ELITE_ESCORT_RADIUS,
  ELITE_GEM_COUNT,
  ELITE_HEALTH_MULT,
  ELITE_KILLS_INTERVAL,
  ELITE_MAX_ALIVE,
  ELITE_MIN_GAP_MS,
  ELITE_SPAWN_MIN_PLAYER_DISTANCE,
  ELITE_XP_MULT,
  ENEMY_ARCHETYPES,
  findArchetype,
} from '../config/enemyConfig';
import { ELEMENT_COLORS } from '../config/damageTypeConfig';
import { ELITE_AFFIX_ICON_ROWS, ELITE_VISUAL } from '../config/enemyVisualConfig';
import { NEON } from '../config/palette';
import {
  MAP_BOSS_ARENA_1,
  MAP_STARTING_LANDS,
  REGION_ARENA,
  REGION_VILLAGE,
  REGION_WILDS_FAR,
  REGION_WILDS_NEAR,
  WORLD,
} from '../config/worldConfig';
import { XP_PER_KILL, XP_TIER_BONUS } from '../progression/progressionConfig';
import { killXp, meleeStats } from '../systems/enemyStats';
import {
  eliteArchetype,
  escortOffsets,
  pickEliteAffix,
  pickEliteSpawnPoint,
  shouldSpawnElite,
  type EliteSpawnState,
} from './eliteRules';
import { findMap, type RegionDef } from './worldGraph';

function region(id: string): RegionDef {
  for (const map of WORLD.maps) {
    const found = map.regions.find((candidate) => candidate.id === id);

    if (found !== undefined) {
      return found;
    }
  }

  throw new Error(`không có vùng ${id}`);
}

const NEAR = region(REGION_WILDS_NEAR);
const FAR = region(REGION_WILDS_FAR);
const VILLAGE = region(REGION_VILLAGE);
const ARENA = region(REGION_ARENA);

const READY: EliteSpawnState = {
  killsInRegion: ELITE_KILLS_INTERVAL,
  aliveElites: 0,
  sinceLastEliteMs: ELITE_MIN_GAP_MS,
};

describe('giá trị khởi điểm Elite (E3-E5)', () => {
  it('đúng giá trị đã duyệt', () => {
    expect(ELITE_KILLS_INTERVAL).toBe(25);
    expect(ELITE_MAX_ALIVE).toBe(1);
    expect(ELITE_HEALTH_MULT).toBe(5);
    expect(ELITE_XP_MULT).toBe(8);
    expect(ELITE_GEM_COUNT).toBe(2);
    expect(ELITE_MIN_GAP_MS).toBe(30000);
    expect(ELITE_SPAWN_MIN_PLAYER_DISTANCE).toBe(600);
    expect(ELITE_ESCORT_ARCHETYPE).toBe('swarmer');
    expect(ELITE_ESCORT_RADIUS).toBe(64);
    expect(ELITE_AFFIX_ORDER).toEqual(['swift', 'armored', 'escorted']);
    expect(ELITE_AFFIXES.swift.speedMult).toBe(1.4);
    expect(ELITE_AFFIXES.armored.damageTakenMult).toBe(0.7);
    expect(ELITE_AFFIXES.escorted.escortCount).toBe(3);
  });

  it('nhãn toast đúng nguyên văn và mọi affix trong thứ tự đều có định nghĩa', () => {
    expect(ELITE_AFFIXES.swift.label).toBe('TINH ANH THẦN TỐC XUẤT HIỆN');
    expect(ELITE_AFFIXES.armored.label).toBe('TINH ANH GIÁP DÀY XUẤT HIỆN');
    expect(ELITE_AFFIXES.escorted.label).toBe('TINH ANH CÓ HỘ TỐNG XUẤT HIỆN');

    for (const id of ELITE_AFFIX_ORDER) {
      expect(ELITE_AFFIXES[id], id).toBeDefined();
    }

    expect(new Set(ELITE_AFFIX_ORDER).size).toBe(ELITE_AFFIX_ORDER.length);
  });

  it('archetype quái hộ tống là cận chiến có thật', () => {
    expect(findArchetype(ELITE_ESCORT_ARCHETYPE)?.kind).toBe('melee');
  });
});

describe('shouldSpawnElite', () => {
  it('đủ điều kiện ở vùng gần và vùng xa', () => {
    expect(shouldSpawnElite(READY, NEAR)).toBe(true);
    expect(shouldSpawnElite(READY, FAR)).toBe(true);
  });

  it('biên số kill: 24 chưa, 25 rồi, nhiều hơn vẫn được', () => {
    expect(shouldSpawnElite({ ...READY, killsInRegion: ELITE_KILLS_INTERVAL - 1 }, NEAR)).toBe(false);
    expect(shouldSpawnElite({ ...READY, killsInRegion: ELITE_KILLS_INTERVAL }, NEAR)).toBe(true);
    expect(shouldSpawnElite({ ...READY, killsInRegion: ELITE_KILLS_INTERVAL + 7 }, NEAR)).toBe(true);
    expect(shouldSpawnElite({ ...READY, killsInRegion: 0 }, NEAR)).toBe(false);
  });

  it('biên số Elite đang sống: 0 được, 1 (đủ trần) thì không', () => {
    expect(shouldSpawnElite({ ...READY, aliveElites: 0 }, NEAR)).toBe(true);
    expect(shouldSpawnElite({ ...READY, aliveElites: ELITE_MAX_ALIVE }, NEAR)).toBe(false);
    expect(shouldSpawnElite({ ...READY, aliveElites: ELITE_MAX_ALIVE + 1 }, NEAR)).toBe(false);
  });

  it('biên khoảng chờ: trước 30000 ms chưa, đúng 30000 và sau thì được; chưa có Elite (Infinity) thì được', () => {
    expect(shouldSpawnElite({ ...READY, sinceLastEliteMs: ELITE_MIN_GAP_MS - 1 }, NEAR)).toBe(false);
    expect(shouldSpawnElite({ ...READY, sinceLastEliteMs: ELITE_MIN_GAP_MS }, NEAR)).toBe(true);
    expect(shouldSpawnElite({ ...READY, sinceLastEliteMs: ELITE_MIN_GAP_MS + 1 }, NEAR)).toBe(true);
    expect(shouldSpawnElite({ ...READY, sinceLastEliteMs: Number.POSITIVE_INFINITY }, NEAR)).toBe(true);
    expect(shouldSpawnElite({ ...READY, sinceLastEliteMs: 0 }, NEAR)).toBe(false);
  });

  it('luôn false ở làng và Arena dù mọi ngưỡng đã đủ', () => {
    const huge: EliteSpawnState = { killsInRegion: 9999, aliveElites: 0, sinceLastEliteMs: Number.POSITIVE_INFINITY };

    expect(shouldSpawnElite(huge, VILLAGE)).toBe(false);
    expect(shouldSpawnElite(huge, ARENA)).toBe(false);
  });

  it('luôn false với vùng an toàn hoặc eliteSlots rỗng (dữ liệu tự dựng)', () => {
    expect(shouldSpawnElite(READY, { safe: true, eliteSlots: ['grunt'] })).toBe(false);
    expect(shouldSpawnElite(READY, { safe: false, eliteSlots: [] })).toBe(false);
    expect(shouldSpawnElite(READY, { safe: false, eliteSlots: ['grunt'] })).toBe(true);
  });
});

describe('pickEliteAffix', () => {
  it('xoay vòng swift, armored, escorted rồi lặp lại', () => {
    const picked = Array.from({ length: 7 }, (_, index) => pickEliteAffix(index));

    expect(picked).toEqual(['swift', 'armored', 'escorted', 'swift', 'armored', 'escorted', 'swift']);
  });

  it('xác định: cùng chỉ số luôn cùng kết quả; chỉ số âm/lẻ vẫn trả affix hợp lệ', () => {
    for (let index = -6; index < 30; index += 1) {
      expect(pickEliteAffix(index)).toBe(pickEliteAffix(index));
      expect(ELITE_AFFIX_ORDER).toContain(pickEliteAffix(index));
    }

    expect(pickEliteAffix(-1)).toBe('escorted');
    expect(pickEliteAffix(1.9)).toBe('armored');
  });
});

describe('eliteArchetype', () => {
  it('grunt + swift: máu x5, tốc x1.4, xp x8; trường khác giữ nguyên archetype nền', () => {
    const elite = eliteArchetype('grunt', 'swift');

    expect(elite.kind).toBe('melee');
    expect(elite.healthMult).toBe(5);
    expect(elite.speedMult).toBeCloseTo(1.4, 12);
    expect(elite.xpMult).toBe(8);
    expect(elite.contactDamageBonus).toBe(ENEMY_ARCHETYPES.grunt.contactDamageBonus);
    expect(elite.goldMult).toBe(ENEMY_ARCHETYPES.grunt.goldMult);
  });

  it('armored và escorted không đổi tốc độ (hệ số nhận sát thương nằm ở EnemyBase)', () => {
    expect(eliteArchetype('grunt', 'armored').speedMult).toBe(1);
    expect(eliteArchetype('grunt', 'escorted').speedMult).toBe(1);
    expect(eliteArchetype('brute', 'armored').speedMult).toBe(ENEMY_ARCHETYPES.brute.speedMult);
  });

  it('không đổi archetype nền (trả bản sao dẫn xuất)', () => {
    const before = JSON.stringify(ENEMY_ARCHETYPES);

    eliteArchetype('grunt', 'swift');
    eliteArchetype('brute', 'escorted');
    expect(JSON.stringify(ENEMY_ARCHETYPES)).toBe(before);
  });

  it('grunt bậc 3: máu 174 (= round(17 x (1 + 3 x 0.35) x 5))', () => {
    const stats = meleeStats(3, eliteArchetype('grunt', 'armored'));

    expect(stats.maxHealth).toBe(Math.round(ENEMY_MAX_HEALTH * (1 + 3 * ENEMY_HEALTH_MULT_PER_TIER) * 5));
    expect(stats.maxHealth).toBe(174);
  });

  it('brute bậc 6: máu theo meleeStats (x2.5 x5 = x12.5), chạm +1 như brute thường', () => {
    const stats = meleeStats(6, eliteArchetype('brute', 'armored'));

    expect(stats.maxHealth).toBe(Math.round(ENEMY_MAX_HEALTH * (1 + 6 * ENEMY_HEALTH_MULT_PER_TIER) * 12.5));
    expect(stats.maxHealth).toBe(659);
    expect(stats.contactDamage).toBe(meleeStats(6, 'brute').contactDamage);
  });

  it('swift nhanh x1.4 so với archetype nền ở mọi bậc; bậc 6 grunt ~246 px/s', () => {
    for (let tier = 0; tier <= 6; tier += 1) {
      expect(meleeStats(tier, eliteArchetype('grunt', 'swift')).moveSpeed).toBeCloseTo(
        meleeStats(tier, 'grunt').moveSpeed * 1.4,
        9,
      );
    }

    const expected = ENEMY_SPEED * Math.min(ENEMY_MAX_SPEED_MULT, 1 + 6 * ENEMY_SPEED_MULT_PER_TIER) * 1.4;

    expect(meleeStats(6, eliteArchetype('grunt', 'swift')).moveSpeed).toBeCloseTo(expected, 9);
    expect(Math.round(expected)).toBe(246);
  });

  it('EXP: grunt Elite bậc 0 = 120; công thức killXp với xpMult x8', () => {
    expect(killXp(eliteArchetype('grunt', 'swift'), 0)).toBe(120);
    expect(killXp(eliteArchetype('brute', 'swift'), 6)).toBe(
      Math.round(XP_PER_KILL * ENEMY_ARCHETYPES.brute.xpMult * 8 * (1 + XP_TIER_BONUS * 6)),
    );
  });
});

describe('pickEliteSpawnPoint', () => {
  const player = { x: 0, y: 0 };

  it('danh sách rỗng → null', () => {
    expect(pickEliteSpawnPoint([], player, 600)).toBeNull();
  });

  it('chọn điểm GẦN nhất trong các điểm cách >= minDist', () => {
    const points = [
      { x: 100, y: 0 }, // quá gần
      { x: 900, y: 0 },
      { x: 700, y: 0 }, // gần nhất đủ xa
      { x: 1500, y: 0 },
    ];

    expect(pickEliteSpawnPoint(points, player, 600)).toEqual({ x: 700, y: 0 });
  });

  it('biên: điểm cách đúng minDist vẫn hợp lệ', () => {
    expect(pickEliteSpawnPoint([{ x: 600, y: 0 }, { x: 1000, y: 0 }], player, 600)).toEqual({ x: 600, y: 0 });
    expect(pickEliteSpawnPoint([{ x: 599, y: 0 }, { x: 1000, y: 0 }], player, 600)).toEqual({ x: 1000, y: 0 });
  });

  it('không điểm nào đủ xa → lấy điểm XA nhất', () => {
    const points = [
      { x: 100, y: 0 },
      { x: 0, y: 450 },
      { x: 200, y: 0 },
    ];

    expect(pickEliteSpawnPoint(points, player, 600)).toEqual({ x: 0, y: 450 });
  });

  it('một điểm duy nhất luôn được chọn (dù gần hay xa)', () => {
    expect(pickEliteSpawnPoint([{ x: 5, y: 5 }], player, 600)).toEqual({ x: 5, y: 5 });
    expect(pickEliteSpawnPoint([{ x: 5000, y: 5 }], player, 600)).toEqual({ x: 5000, y: 5 });
  });

  it('hòa khoảng cách: giữ điểm đứng trước; kết quả là chính phần tử của danh sách', () => {
    const first = { x: 700, y: 0 };
    const second = { x: -700, y: 0 };

    expect(pickEliteSpawnPoint([first, second], player, 600)).toBe(first);
    expect(pickEliteSpawnPoint([second, first], player, 600)).toBe(second);
  });

  it('tính khoảng cách theo cả hai trục', () => {
    const points = [
      { x: 400, y: 400 }, // ~565.7 < 600
      { x: 450, y: 450 }, // ~636.4
    ];

    expect(pickEliteSpawnPoint(points, player, 600)).toEqual({ x: 450, y: 450 });
  });
});

describe('escortOffsets', () => {
  it('ba hộ tống: góc i·2π/3, cách tâm đúng bán kính, bắt đầu ở góc 0', () => {
    const offsets = escortOffsets(3, 64);

    expect(offsets).toHaveLength(3);
    expect(offsets[0].x).toBeCloseTo(64, 9);
    expect(offsets[0].y).toBeCloseTo(0, 9);
    expect(offsets[1].x).toBeCloseTo(64 * Math.cos((2 * Math.PI) / 3), 9);
    expect(offsets[1].y).toBeCloseTo(64 * Math.sin((2 * Math.PI) / 3), 9);
    expect(offsets[2].x).toBeCloseTo(64 * Math.cos((4 * Math.PI) / 3), 9);
    expect(offsets[2].y).toBeCloseTo(64 * Math.sin((4 * Math.PI) / 3), 9);

    for (const offset of offsets) {
      expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(64, 9);
    }
  });

  it('số lượng 0/âm → rỗng; xác định (hai lần gọi như nhau)', () => {
    expect(escortOffsets(0, 64)).toEqual([]);
    expect(escortOffsets(-2, 64)).toEqual([]);
    expect(escortOffsets(5, 30)).toEqual(escortOffsets(5, 30));
  });
});

describe('eliteSlots dữ liệu thật (M3)', () => {
  const lands = findMap(WORLD, MAP_STARTING_LANDS);
  const arena = findMap(WORLD, MAP_BOSS_ARENA_1);

  it('vùng gần ["grunt"], vùng xa ["brute"], làng và Arena rỗng', () => {
    expect(NEAR.eliteSlots).toEqual(['grunt']);
    expect(FAR.eliteSlots).toEqual(['brute']);
    expect(VILLAGE.eliteSlots).toEqual([]);
    expect(ARENA.eliteSlots).toEqual([]);
    expect(lands).not.toBeNull();
    expect(arena).not.toBeNull();
  });

  it('mọi slot là archetype cận chiến có thật, không nằm ở vùng an toàn/có điểm sinh riêng', () => {
    for (const map of WORLD.maps) {
      for (const candidate of map.regions) {
        for (const slot of candidate.eliteSlots) {
          expect(findArchetype(slot)?.kind, `${candidate.id}:${slot}`).toBe('melee');
          expect(candidate.safe, candidate.id).toBe(false);
          expect(candidate.spawnTable.points, candidate.id).toEqual([]);
        }
      }
    }
  });
});

describe('ELITE_VISUAL (V3-V4, E6)', () => {
  it('màu ngà #f2e8cc, không trùng đạn quái/màu hệ nguyên tố', () => {
    expect(ELITE_VISUAL.color).toBe(0xf2e8cc);
    expect(ELITE_VISUAL.colorCss).toBe('#f2e8cc');

    const forbidden = new Set<number>([NEON.enemyBullet, ...Object.values(ELEMENT_COLORS)]);

    expect(forbidden.has(ELITE_VISUAL.color)).toBe(false);
    expect(forbidden.has(ELITE_VISUAL.backColor)).toBe(false);
  });

  it('độ sâu: vòng chân dưới sprite quái (8); thanh máu + biểu tượng trên sương (2701), dưới đạn quái/ánh sáng (2702)', () => {
    expect(ELITE_VISUAL.ringDepth).toBeLessThan(8);
    expect(ELITE_VISUAL.overlayDepth).toBe(2701.5);
    expect(ELITE_VISUAL.overlayDepth).toBeGreaterThan(ATMOSPHERE_DEPTH.fog);
    expect(ELITE_VISUAL.overlayDepth).toBeLessThan(ATMOSPHERE_DEPTH.light);
  });

  it('vòng báo hiệu lúc sinh: ~110 px, 600 ms; biểu tượng 9x9', () => {
    expect(ELITE_VISUAL.spawnRing).toEqual({ radius: 110, durationMs: 600 });
    expect(ELITE_VISUAL.icon.size).toBe(9);
  });

  it('mỗi affix có biểu tượng 9x9 chỉ gồm # và ., có ít nhất một ô sáng, ba biểu tượng khác nhau', () => {
    const serialized = new Set<string>();

    for (const id of ELITE_AFFIX_ORDER) {
      const rows = ELITE_AFFIX_ICON_ROWS[id];

      expect(rows, id).toHaveLength(ELITE_VISUAL.icon.size);

      for (const row of rows) {
        expect(row, id).toMatch(new RegExp(`^[#.]{${ELITE_VISUAL.icon.size}}$`));
      }

      expect(rows.join('').includes('#'), id).toBe(true);
      serialized.add(rows.join('/'));
    }

    expect(serialized.size).toBe(ELITE_AFFIX_ORDER.length);
    expect(Object.keys(ELITE_AFFIX_ICON_ROWS).sort()).toEqual([...ELITE_AFFIX_ORDER].sort());
  });
});

describe('hợp đồng mã nguồn Elite (quét văn bản, vì lớp này cần Phaser nên không chạy được trong Node)', () => {
  const read = (relative: string): string =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

  it('EnemyBase: hệ số nhận sát thương nhân đúng hai điểm (takeDamage, takeStatusDamage), mặc định 1', () => {
    const text = read('../entities/EnemyBase.ts');

    expect(text.match(/this\.getVulnerableMult\([^)]*\)\s*\*\s*this\.damageTakenMultiplier/g)).toHaveLength(2);
    expect(text.match(/damageTakenMultiplier/g)).toHaveLength(5);
    expect(text).toMatch(/private damageTakenMultiplier = 1;/);
  });

  it('Boss và quái bắn xa không đụng tới hệ số/statProfile', () => {
    for (const file of ['../entities/BossEnemy.ts', '../entities/RangedEnemy.ts']) {
      const text = read(file);

      expect(text, file).not.toMatch(/damageTakenMult|statProfile|EliteMarker/);
    }
  });

  it('Enemy: statProfile tùy chọn đứng sau archetype và chỉ đổi chỉ số, không đổi hình/hitbox', () => {
    const text = read('../entities/Enemy.ts');

    expect(text).toMatch(/statProfile\?: EnemyArchetype/);
    expect(text).toMatch(/meleeStats\(tier, statProfile \?\? archetype\)/);
    expect(text).toMatch(/ENEMY_VISUALS\[archetype\]/);
  });

  it('EliteMarker: dọn bằng sự kiện died VÀ DESTROY của quái, và khi scene tắt; vẽ nhiều Graphics một lần', () => {
    const text = read('../entities/EliteMarker.ts');

    expect(text).toMatch(/enemy\.once\('died', this\.destroy, this\)/);
    expect(text).toMatch(/enemy\.once\(Phaser\.GameObjects\.Events\.DESTROY, this\.destroy, this\)/);
    expect(text).toMatch(/Phaser\.Scenes\.Events\.SHUTDOWN/);
    expect(text).not.toMatch(/setTint|clearTint|tween/);
  });
});

describe('độ thuần của eliteRules.ts', () => {
  const text = readFileSync(fileURLToPath(new URL('./eliteRules.ts', import.meta.url)), 'utf8');

  it('không nạp Phaser/scene/entity/combat/skills, không ngẫu nhiên/thời gian/trình duyệt', () => {
    expect(text).not.toMatch(/(?:from\s+|import\s+)['"]phaser(?:\/[^'"]*)?['"]/);
    expect(text).not.toMatch(/from\s+['"][^'"]*\/(?:entities|combat|skills|scenes)(?:\/[^'"]*)?['"]/);
    expect(text).not.toMatch(/Math\s*\.\s*random|\bDate\s*\.|\b(?:window|localStorage)\b/);
  });
});
