import { describe, expect, it } from 'vitest';

import { ENEMY_ARCHETYPES, type ArchetypeId } from '../config/enemyConfig';
import {
  MAP_BOSS_ARENA_1,
  MAP_STARTING_LANDS,
  ZONE_ARENA,
  ZONE_VILLAGE,
  ZONE_WILDS_FAR,
  ZONE_WILDS_NEAR,
  WILDS_FAR_SPAWN_PATTERN,
  WILDS_NEAR_SPAWN_PATTERN,
  WORLD,
} from '../config/worldConfig';
import { pickArchetype, pickStaggeredArchetype } from './spawnPattern';
import { zoneAt, type MapDef, type ZoneDef } from './worldGraph';

const MAIN_MAP = WORLD.maps.find((m) => m.id === MAP_STARTING_LANDS) as MapDef;
const ALL_ZONES = WORLD.maps.flatMap((map) => map.zones);

function zoneById(id: string): ZoneDef {
  const zone = ALL_ZONES.find((r) => r.id === id);

  expect(zone, id).toBeDefined();

  return zone as ZoneDef;
}

describe('pickArchetype', () => {
  it('quay vòng pattern[i % length]', () => {
    const pattern = ['a', 'b', 'c'] as const;

    expect(pickArchetype(pattern, 0)).toBe('a');
    expect(pickArchetype(pattern, 1)).toBe('b');
    expect(pickArchetype(pattern, 2)).toBe('c');
    expect(pickArchetype(pattern, 3)).toBe('a');
    expect(pickArchetype(pattern, 100)).toBe('b');
  });

  it('pattern rỗng → null', () => {
    expect(pickArchetype([], 0)).toBeNull();
    expect(pickArchetype([], 7)).toBeNull();
  });

  it('Arena giữ chuỗi M1: 300 chỉ số đầu khớp i % 3 === 2 ? caster : grunt', () => {
    const arena = zoneById(ZONE_ARENA);

    expect(arena.spawnTable.pattern).toEqual(['grunt', 'grunt', 'caster']);
    expect(arena.spawnTable.points.length).toBeGreaterThan(0);

    for (let i = 0; i < 300; i += 1) {
      expect(pickArchetype(arena.spawnTable.pattern, i), `arena #${i}`).toBe(i % 3 === 2 ? 'caster' : 'grunt');
    }
  });
});

describe('mẫu sinh theo vùng (M2)', () => {
  it('khớp bảng thiết kế; làng không sinh quái', () => {
    expect(zoneById(ZONE_WILDS_NEAR).spawnTable.pattern).toEqual(['grunt', 'grunt', 'caster', 'swarmer']);
    expect(zoneById(ZONE_WILDS_FAR).spawnTable.pattern).toEqual([
      'grunt',
      'brute',
      'caster',
      'swarmer',
      'caster',
      'brute',
    ]);
    expect([...WILDS_NEAR_SPAWN_PATTERN]).toEqual(zoneById(ZONE_WILDS_NEAR).spawnTable.pattern);
    expect([...WILDS_FAR_SPAWN_PATTERN]).toEqual(zoneById(ZONE_WILDS_FAR).spawnTable.pattern);
    expect(zoneById(ZONE_VILLAGE).spawnTable.pattern).toEqual([]);
  });

  it('pattern của mọi vùng chỉ chứa id có thật', () => {
    for (const zone of ALL_ZONES) {
      for (const id of zone.spawnTable.pattern) {
        expect(Object.prototype.hasOwnProperty.call(ENEMY_ARCHETYPES, id), `${zone.id}: ${id}`).toBe(true);
      }
    }
  });
});

/** Số điểm sinh của một vùng, tính từ ENEMY_SPAWNS thật qua zoneAt (nguồn tọa độ: world/town.ts, giá trị khóa ở worldGraph.test). */
const MAIN_SPAWN_POINTS = [
  { x: 1050, y: 1150 },
  { x: 2750, y: 1150 },
  { x: 1050, y: 1750 },
  { x: 2750, y: 1750 },
  { x: 1000, y: 400 },
  { x: 3300, y: 600 },
  { x: 1100, y: 2350 },
  { x: 2900, y: 2350 },
] as const;

/** Mô phỏng WorldScene: spawnIndex chạy 0..n-1, điểm = spawnIndex % 8, vùng = zoneAt(điểm), bộ đếm riêng theo vùng. */
function simulate(spawns: number): { zoneId: string; pointIndex: number; id: ArchetypeId }[] {
  const counts = new Map<string, number>();
  const pointTotals = new Map<string, number>();

  for (const point of MAIN_SPAWN_POINTS) {
    const zone = zoneAt(MAIN_MAP, point.x, point.y) as ZoneDef;

    pointTotals.set(zone.id, (pointTotals.get(zone.id) ?? 0) + 1);
  }

  const result: { zoneId: string; pointIndex: number; id: ArchetypeId }[] = [];

  for (let spawnIndex = 0; spawnIndex < spawns; spawnIndex += 1) {
    const pointIndex = spawnIndex % MAIN_SPAWN_POINTS.length;
    const point = MAIN_SPAWN_POINTS[pointIndex];
    const zone = zoneAt(MAIN_MAP, point.x, point.y) as ZoneDef;
    const count = counts.get(zone.id) ?? 0;

    counts.set(zone.id, count + 1);

    const id = pickStaggeredArchetype(zone.spawnTable.pattern, count, pointTotals.get(zone.id) ?? 1);

    expect(id, `${zone.id} #${count}`).not.toBeNull();
    result.push({ zoneId: zone.id, pointIndex, id: id as ArchetypeId });
  }

  return result;
}

describe('pickStaggeredArchetype', () => {
  it('mẫu rỗng → null; xác định (cùng đầu vào cùng kết quả)', () => {
    expect(pickStaggeredArchetype([], 5, 4)).toBeNull();
    expect(pickStaggeredArchetype(['a', 'b', 'c'], 7, 4)).toBe(pickStaggeredArchetype(['a', 'b', 'c'], 7, 4));
  });

  it('dịch pha: vòng điểm sinh đầu = mẫu, vòng sau lệch thêm 1', () => {
    const pattern = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

    // P = 4: c = 0..3 → a b c d ; c = 4..7 → (c+1) % 6 = f a b c
    expect([0, 1, 2, 3].map((c) => pickStaggeredArchetype(pattern, c, 4))).toEqual(['a', 'b', 'c', 'd']);
    expect([4, 5, 6, 7].map((c) => pickStaggeredArchetype(pattern, c, 4))).toEqual(['f', 'a', 'b', 'c']);
  });

  it('có 4 điểm gần + 4 điểm xa trong ENEMY_SPAWNS', () => {
    const counts = new Map<string, number>();

    for (const point of MAIN_SPAWN_POINTS) {
      const zone = zoneAt(MAIN_MAP, point.x, point.y) as ZoneDef;

      counts.set(zone.id, (counts.get(zone.id) ?? 0) + 1);
    }

    expect(counts.get(ZONE_WILDS_NEAR)).toBe(4);
    expect(counts.get(ZONE_WILDS_FAR)).toBe(4);
    expect(counts.get(ZONE_VILLAGE)).toBeUndefined();
  });

  it('tần suất archetype trên 2400 lần sinh khớp mẫu từng vùng (sai lệch <= 1%)', () => {
    const sim = simulate(2400);

    for (const zoneId of [ZONE_WILDS_NEAR, ZONE_WILDS_FAR]) {
      const pattern = zoneById(zoneId).spawnTable.pattern;
      const own = sim.filter((s) => s.zoneId === zoneId);
      const expected = new Map<string, number>();

      for (const id of pattern) {
        expected.set(id, (expected.get(id) ?? 0) + 1 / pattern.length);
      }

      expect(own.length, zoneId).toBeGreaterThanOrEqual(1200);

      for (const [id, share] of expected) {
        const actual = own.filter((s) => s.id === id).length / own.length;

        expect(Math.abs(actual - share), `${zoneId} ${id}`).toBeLessThanOrEqual(0.01);
      }

      // Chỉ chứa id thuộc mẫu.
      for (const s of own) {
        expect(pattern.includes(s.id), `${zoneId} ${s.id}`).toBe(true);
      }
    }
  });

  it('chính xác theo chu kỳ: vùng gần mỗi 16 lần, vùng xa mỗi 24 lần đủ đúng bảng', () => {
    const sim = simulate(8 * 48);

    for (const [zoneId, period] of [
      [ZONE_WILDS_NEAR, 16],
      [ZONE_WILDS_FAR, 24],
    ] as const) {
      const pattern = zoneById(zoneId).spawnTable.pattern;
      const own = sim.filter((s) => s.zoneId === zoneId).slice(0, period * 3);

      for (let start = 0; start + period <= own.length; start += period) {
        const chunk = own.slice(start, start + period);

        for (const id of new Set(pattern)) {
          const want = (pattern.filter((p) => p === id).length / pattern.length) * period;

          expect(chunk.filter((s) => s.id === id).length, `${zoneId} ${id} @${start}`).toBe(want);
        }
      }
    }
  });

  it('mỗi điểm sinh gặp >= 2 archetype khác nhau qua 2 chu kỳ điểm sinh (kể cả điểm chỉ gặp quái cận chiến/bắn xa)', () => {
    const sim = simulate(8 * 12);

    for (let pointIndex = 0; pointIndex < MAIN_SPAWN_POINTS.length; pointIndex += 1) {
      const seen = sim.filter((s) => s.pointIndex === pointIndex).slice(0, 2 * 4).map((s) => s.id);

      expect(new Set(seen).size, `điểm ${pointIndex}: ${seen.join(',')}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('không sinh quái trong làng và chuỗi Arena không bị ảnh hưởng', () => {
    const sim = simulate(200);

    expect(sim.some((s) => s.zoneId === ZONE_VILLAGE)).toBe(false);

    const arenaMap = WORLD.maps.find((m) => m.id === MAP_BOSS_ARENA_1);

    expect(arenaMap?.zones.map((r) => r.id)).toEqual([ZONE_ARENA]);
  });
});

describe('dữ liệu ENEMY_ARCHETYPES', () => {
  it('có grunt/swarmer/brute (melee) và caster (ranged); hệ số > 0; bonus nguyên >= 0', () => {
    expect(Object.keys(ENEMY_ARCHETYPES).sort()).toEqual(['brute', 'caster', 'grunt', 'swarmer']);
    expect(ENEMY_ARCHETYPES.grunt.kind).toBe('melee');
    expect(ENEMY_ARCHETYPES.swarmer.kind).toBe('melee');
    expect(ENEMY_ARCHETYPES.brute.kind).toBe('melee');
    expect(ENEMY_ARCHETYPES.caster.kind).toBe('ranged');

    for (const [id, def] of Object.entries(ENEMY_ARCHETYPES)) {
      for (const key of ['healthMult', 'speedMult', 'xpMult', 'goldMult'] as const) {
        expect(def[key], `${id}.${key}`).toBeGreaterThan(0);
      }

      expect(Number.isInteger(def.contactDamageBonus), id).toBe(true);
      expect(def.contactDamageBonus, id).toBeGreaterThanOrEqual(0);
    }
  });

  it('grunt/caster giữ mọi hệ số 1 và bonus 0 (M1)', () => {
    for (const def of [ENEMY_ARCHETYPES.grunt, ENEMY_ARCHETYPES.caster]) {
      expect(def.healthMult).toBe(1);
      expect(def.speedMult).toBe(1);
      expect(def.xpMult).toBe(1);
      expect(def.goldMult).toBe(1);
      expect(def.contactDamageBonus).toBe(0);
    }
  });

  it('swarmer/brute đúng giá trị khởi điểm đã duyệt; goldMult 1 (chưa dùng)', () => {
    expect(ENEMY_ARCHETYPES.swarmer).toEqual({
      kind: 'melee',
      healthMult: 0.5,
      speedMult: 1.35,
      contactDamageBonus: 0,
      xpMult: 0.8,
      goldMult: 1,
    });
    expect(ENEMY_ARCHETYPES.brute).toEqual({
      kind: 'melee',
      healthMult: 2.5,
      speedMult: 0.75,
      contactDamageBonus: 1,
      xpMult: 2,
      goldMult: 1,
    });
  });
});
