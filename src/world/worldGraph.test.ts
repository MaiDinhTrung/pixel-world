import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as worldConfig from '../config/worldConfig';

import {
  BOSS_ARENA_ENTRANCE,
  BOSS_ARENA_MINION_MAX_ALIVE,
  BOSS_ARENA_RETURN_PORTAL,
} from '../config/bossArenaConfig';
import { MAX_THREAT_TIER, THREAT_INTERVAL_MS } from '../config/combatConfig';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import { VILLAGE_ZONE, isInsideVillage } from '../config/economyConfig';
import {
  CONN_ARENA_TO_VILLAGE,
  CONN_VILLAGE_TO_ARENA,
  MAIN_DEFAULT_SPAWN,
  MAP_BOSS_ARENA_1,
  MAP_STARTING_LANDS,
  REGION_ARENA,
  REGION_VILLAGE,
  REGION_WILDS_FAR,
  REGION_WILDS_NEAR,
  WILDS_FAR_TIER_OFFSET,
  WILDS_NEAR_BOUNDS,
  WORLD,
} from '../config/worldConfig';
import {
  getPortalDenyReason,
  type PortalAccessInput,
  type PortalDenyReason,
} from './bossArenaRules';
import {
  effectiveThreatTier,
  evaluateConnection,
  findConnection,
  regionAt,
  requestTravel,
  validateWorld,
  type ConnectionAccessInput,
  type ConnectionDef,
  type MapDef,
  type WorldDef,
  type WorldErrorCode,
  type WorldFacts,
} from './worldGraph';

const STARTING_LANDS = WORLD.maps.find((map) => map.id === MAP_STARTING_LANDS) as MapDef;
const BOSS_ARENA = WORLD.maps.find((map) => map.id === MAP_BOSS_ARENA_1) as MapDef;
const VILLAGE_TO_ARENA = findConnection(WORLD, CONN_VILLAGE_TO_ARENA) as ConnectionDef;
const ARENA_TO_VILLAGE = findConnection(WORLD, CONN_ARENA_TO_VILLAGE) as ConnectionDef;

// ── Độ thuần của nguồn ──────────────────────────────────────────────────────

const FORBIDDEN: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: 'import phaser', pattern: /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]phaser(?:\/[^'"]*)?['"]/ },
  {
    name: 'import từ entities|combat|skills|scenes',
    pattern: /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"][^'"]*\/(?:entities|combat|skills|scenes)(?:\/[^'"]*)?['"]/,
  },
  { name: 'Math.random', pattern: /Math\s*\.\s*random/ },
  { name: 'Date.', pattern: /\bDate\s*\./ },
  { name: 'window|localStorage', pattern: /\b(?:window|localStorage)\b/ },
];

const PURE_SOURCES: Record<string, string> = {
  'src/world/worldGraph.ts': fileURLToPath(new URL('./worldGraph.ts', import.meta.url)),
  'src/config/worldConfig.ts': fileURLToPath(new URL('../config/worldConfig.ts', import.meta.url)),
  'src/world/regionTracker.ts': fileURLToPath(new URL('./regionTracker.ts', import.meta.url)),
  'src/config/enemyConfig.ts': fileURLToPath(new URL('../config/enemyConfig.ts', import.meta.url)),
  'src/config/enemyVisualConfig.ts': fileURLToPath(new URL('../config/enemyVisualConfig.ts', import.meta.url)),
  'src/world/spawnPattern.ts': fileURLToPath(new URL('./spawnPattern.ts', import.meta.url)),
  'src/systems/enemyStats.ts': fileURLToPath(new URL('../systems/enemyStats.ts', import.meta.url)),
  'src/world/eliteRules.ts': fileURLToPath(new URL('./eliteRules.ts', import.meta.url)),
};

describe('độ thuần của worldGraph/worldConfig', () => {
  it('bộ quét bắt được từng kiểu vi phạm (tự kiểm)', () => {
    const samples: Record<string, string> = {
      'import phaser': "import Phaser from 'phaser';",
      'import từ entities|combat|skills|scenes': "import { Player } from '../entities/Player';",
      'Math.random': 'const r = Math.random();',
      'Date.': 'const t = Date.now();',
      'window|localStorage': 'localStorage.getItem("a");',
    };

    for (const rule of FORBIDDEN) {
      expect(rule.pattern.test(samples[rule.name]), `luật "${rule.name}" không bắt được mẫu vi phạm`).toBe(true);
    }
  });

  for (const [label, path] of Object.entries(PURE_SOURCES)) {
    it(`${label} không vi phạm luật thuần`, () => {
      const text = readFileSync(path, 'utf8');

      for (const rule of FORBIDDEN) {
        expect(rule.pattern.test(text), `${label} dính "${rule.name}"`).toBe(false);
      }
    });
  }
});

// ── regionAt ────────────────────────────────────────────────────────────────

describe('regionAt', () => {
  it('safe === isInsideVillage trên lưới phủ biên VILLAGE_ZONE (±1 px) và nhiều điểm trong/ngoài', () => {
    const right = VILLAGE_ZONE.x + VILLAGE_ZONE.width;
    const bottom = VILLAGE_ZONE.y + VILLAGE_ZONE.height;
    const xs = new Set<number>();
    const ys = new Set<number>();

    for (const edge of [VILLAGE_ZONE.x, right]) {
      for (const delta of [-1, 0, 1]) {
        xs.add(edge + delta);
      }
    }

    for (const edge of [VILLAGE_ZONE.y, bottom]) {
      for (const delta of [-1, 0, 1]) {
        ys.add(edge + delta);
      }
    }

    for (let x = -10; x <= WORLD_WIDTH + 10; x += 97) {
      xs.add(x);
    }

    for (let y = -10; y <= WORLD_HEIGHT + 10; y += 89) {
      ys.add(y);
    }

    let checked = 0;

    for (const x of xs) {
      for (const y of ys) {
        const region = regionAt(STARTING_LANDS, x, y);

        expect(region, `(${x},${y})`).not.toBeNull();
        expect(region?.safe, `(${x},${y})`).toBe(isInsideVillage(x, y));
        const insideNear =
          x >= WILDS_NEAR_BOUNDS.x &&
          x <= WILDS_NEAR_BOUNDS.x + WILDS_NEAR_BOUNDS.width &&
          y >= WILDS_NEAR_BOUNDS.y &&
          y <= WILDS_NEAR_BOUNDS.y + WILDS_NEAR_BOUNDS.height;

        expect(region?.id, `(${x},${y})`).toBe(
          isInsideVillage(x, y) ? REGION_VILLAGE : insideNear ? REGION_WILDS_NEAR : REGION_WILDS_FAR,
        );
        checked += 1;
      }
    }

    expect(checked).toBeGreaterThan(1000);
  });

  it('bounds của làng là VILLAGE_ZONE', () => {
    const village = STARTING_LANDS.regions.find((region) => region.id === REGION_VILLAGE);

    expect(village?.bounds).toEqual(VILLAGE_ZONE);
  });

  it('Arena: mọi điểm thuộc region.arena', () => {
    expect(regionAt(BOSS_ARENA, 800, 544)?.id).toBe(REGION_ARENA);
    expect(regionAt(BOSS_ARENA, 0, 0)?.id).toBe(REGION_ARENA);
  });

  it('chọn vùng hẹp nhất khi vùng lồng nhau; không có vùng nào chứa → vùng "phần còn lại"; không có → null', () => {
    const base = STARTING_LANDS.regions[0];
    const map: MapDef = {
      ...STARTING_LANDS,
      regions: [
        { ...base, id: 'region.big', bounds: { x: 0, y: 0, width: 1000, height: 1000 } },
        { ...base, id: 'region.small', bounds: { x: 100, y: 100, width: 50, height: 50 } },
        { ...base, id: 'region.rest', bounds: null },
      ],
    };

    expect(regionAt(map, 120, 120)?.id).toBe('region.small');
    expect(regionAt(map, 500, 500)?.id).toBe('region.big');
    expect(regionAt(map, 2000, 2000)?.id).toBe('region.rest');
    expect(regionAt({ ...map, regions: map.regions.slice(0, 2) }, 2000, 2000)).toBeNull();
  });
});

// ── Dữ liệu hai map ─────────────────────────────────────────────────────────

describe('dữ liệu worldConfig', () => {
  it('tọa độ cổng bằng hằng số hiện có', () => {
    expect(VILLAGE_TO_ARENA.from.x).toBe(BOSS_ARENA_ENTRANCE.x);
    expect(VILLAGE_TO_ARENA.from.y).toBe(BOSS_ARENA_ENTRANCE.y);
    expect(VILLAGE_TO_ARENA.from.mapId).toBe(MAP_STARTING_LANDS);
    expect(ARENA_TO_VILLAGE.from.x).toBe(BOSS_ARENA_RETURN_PORTAL.x);
    expect(ARENA_TO_VILLAGE.from.y).toBe(BOSS_ARENA_RETURN_PORTAL.y);
    expect(ARENA_TO_VILLAGE.from.mapId).toBe(MAP_BOSS_ARENA_1);
  });

  it('region.arena dùng trần quái con của Arena; làng an toàn, không sinh quái; mẫu sinh theo vùng (M2)', () => {
    const arena = BOSS_ARENA.regions[0];
    const village = STARTING_LANDS.regions.find((region) => region.id === REGION_VILLAGE);
    const near = STARTING_LANDS.regions.find((region) => region.id === REGION_WILDS_NEAR);
    const far = STARTING_LANDS.regions.find((region) => region.id === REGION_WILDS_FAR);

    expect(arena.maxAliveCap).toBe(BOSS_ARENA_MINION_MAX_ALIVE);
    expect(village?.safe).toBe(true);
    expect(village?.spawnTable.pattern).toEqual([]);

    // M2: mẫu riêng từng vùng ngoài làng; Arena giữ mẫu M1 (2 grunt : 1 caster).
    // M3: Elite chỉ ở hai vùng ngoài làng (nền grunt gần, brute xa); làng và Arena không có Elite.
    expect(near?.eliteSlots).toEqual(['grunt']);
    expect(far?.eliteSlots).toEqual(['brute']);
    expect(village?.eliteSlots).toEqual([]);
    expect(arena.eliteSlots).toEqual([]);
    expect(arena.spawnTable.pattern).toEqual(['grunt', 'grunt', 'caster']);
    expect(near?.spawnTable.pattern).toEqual(['grunt', 'grunt', 'caster', 'swarmer']);
    expect(far?.spawnTable.pattern).toEqual(['grunt', 'brute', 'caster', 'swarmer', 'caster', 'brute']);

    for (const wilds of [near, far]) {
      expect(wilds?.safe).toBe(false);
      expect(wilds?.tierFloor).toBe(0);
      expect(wilds?.tierCap).toBe(MAX_THREAT_TIER);
    }

    expect(near?.tierOffset).toBe(0);
    expect(far?.tierOffset).toBe(1);
    expect(WILDS_FAR_TIER_OFFSET).toBe(1);
    expect(near?.bounds).toEqual({ x: 700, y: 700, width: 2400, height: 1300 });
    expect(far?.bounds).toBeNull();
    expect(STARTING_LANDS.lighting).toBe('day_night');
    expect(BOSS_ARENA.lighting).toBe('fixed');
  });

  it('spawn mặc định của map chính là {1920, 1440} và world/town.ts đọc đúng nguồn này (chống lệch)', () => {
    const text = readFileSync(fileURLToPath(new URL('./town.ts', import.meta.url)), 'utf8');

    expect(MAIN_DEFAULT_SPAWN).toEqual({ x: 1920, y: 1440 });
    expect(STARTING_LANDS.playerSpawns.default).toEqual({ x: 1920, y: 1440 });
    expect(/playerSpawn:\s*\{\s*\.\.\.MAIN_DEFAULT_SPAWN\s*\}/.test(text)).toBe(true);
  });
});

// ── evaluateConnection / requestTravel ──────────────────────────────────────

const BOOLS = [false, true] as const;

describe('evaluateConnection', () => {
  const ALL_REASONS: PortalDenyReason[] = [
    'panel_open',
    'player_dead',
    'cooldown',
    'leaping',
    'traveling',
    'boss_alive',
  ];

  it('bảng chân trị đầy đủ khớp getPortalDenyReason (cả hai cổng) và phủ mọi lý do từ chối', () => {
    const seen = new Set<PortalDenyReason | null>();
    let rows = 0;

    for (const panelOpen of BOOLS) {
      for (const playerDead of BOOLS) {
        for (const traveling of BOOLS) {
          for (const coolingDown of BOOLS) {
            for (const leaping of BOOLS) {
              for (const bossAlive of BOOLS) {
                const access: ConnectionAccessInput = {
                  panelOpen,
                  playerDead,
                  traveling,
                  leaping,
                  now: 1000,
                  portalCooldownUntil: coolingDown ? 1500 : 1000,
                };
                const facts: WorldFacts = { bossAlive, bossReady: false, playerLevel: 1 };
                const base: Omit<PortalAccessInput, 'kind'> = { ...access, bossAlive };

                const enter = evaluateConnection(VILLAGE_TO_ARENA, facts, access);
                const back = evaluateConnection(ARENA_TO_VILLAGE, facts, access);

                expect(enter).toBe(getPortalDenyReason({ ...base, kind: 'enter' }));
                expect(back).toBe(getPortalDenyReason({ ...base, kind: 'return' }));
                seen.add(enter);
                seen.add(back);
                rows += 1;
              }
            }
          }
        }
      }
    }

    expect(rows).toBe(64);
    expect(seen.has(null)).toBe(true);

    for (const reason of ALL_REASONS) {
      expect(seen.has(reason), `thiếu ca cho lý do ${reason}`).toBe(true);
    }
  });

  it('cổng về khóa vì Boss khi và chỉ khi Boss sống (các điều kiện khác trung tính)', () => {
    const alive: WorldFacts = { bossAlive: true, bossReady: false, playerLevel: 1 };
    const dead: WorldFacts = { bossAlive: false, bossReady: true, playerLevel: 99 };

    expect(evaluateConnection(ARENA_TO_VILLAGE, alive)).toBe('boss_alive');
    expect(evaluateConnection(ARENA_TO_VILLAGE, dead)).toBeNull();
  });

  it('cổng vào luôn mở theo luật hiện có (Boss sống không khóa)', () => {
    expect(
      evaluateConnection(VILLAGE_TO_ARENA, { bossAlive: true, bossReady: false, playerLevel: 1 }),
    ).toBeNull();
    expect(
      evaluateConnection(VILLAGE_TO_ARENA, { bossAlive: false, bossReady: true, playerLevel: 1 }),
    ).toBeNull();
  });

  it('mỗi lý do từ chối riêng lẻ được trả đúng', () => {
    const facts: WorldFacts = { bossAlive: false, bossReady: false, playerLevel: 1 };
    const neutral: ConnectionAccessInput = {
      panelOpen: false,
      playerDead: false,
      now: 100,
      portalCooldownUntil: 0,
      leaping: false,
      traveling: false,
    };

    expect(evaluateConnection(VILLAGE_TO_ARENA, facts, { ...neutral, panelOpen: true })).toBe('panel_open');
    expect(evaluateConnection(VILLAGE_TO_ARENA, facts, { ...neutral, playerDead: true })).toBe('player_dead');
    expect(evaluateConnection(VILLAGE_TO_ARENA, facts, { ...neutral, traveling: true })).toBe('traveling');
    expect(evaluateConnection(VILLAGE_TO_ARENA, facts, { ...neutral, portalCooldownUntil: 101 })).toBe('cooldown');
    expect(evaluateConnection(VILLAGE_TO_ARENA, facts, { ...neutral, leaping: true })).toBe('leaping');
    expect(evaluateConnection(VILLAGE_TO_ARENA, facts, neutral)).toBeNull();
  });
});

describe('requestTravel', () => {
  it('thành công trả đích; bị khóa trả lý do; id lạ trả unknown_connection', () => {
    const open: WorldFacts = { bossAlive: false, bossReady: false, playerLevel: 1 };
    const locked: WorldFacts = { bossAlive: true, bossReady: false, playerLevel: 1 };

    expect(requestTravel(WORLD, CONN_VILLAGE_TO_ARENA, open)).toEqual({
      ok: true,
      to: { mapId: MAP_BOSS_ARENA_1, spawnId: 'default' },
    });
    expect(requestTravel(WORLD, CONN_ARENA_TO_VILLAGE, open)).toEqual({
      ok: true,
      to: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
    });
    expect(requestTravel(WORLD, CONN_ARENA_TO_VILLAGE, locked)).toEqual({ ok: false, reason: 'boss_alive' });
    expect(requestTravel(WORLD, 'conn.khong_co', open)).toEqual({ ok: false, reason: 'unknown_connection' });
  });
});

// ── validateWorld ───────────────────────────────────────────────────────────

type Loose = { maps: any[] }; // eslint-disable-line @typescript-eslint/no-explicit-any

function broken(mutate: (world: Loose) => void): WorldDef {
  const copy = structuredClone(WORLD) as unknown as Loose;

  mutate(copy);

  return copy as unknown as WorldDef;
}

function codes(world: WorldDef): WorldErrorCode[] {
  return validateWorld(world).map((error) => error.code);
}

describe('validateWorld', () => {
  it('WORLD hợp lệ: không lỗi', () => {
    expect(validateWorld(WORLD)).toEqual([]);
  });

  it('id duy nhất; mọi đích tồn tại; mỗi map có ≥1 connection đi và ≥1 đi tới', () => {
    const mapIds = WORLD.maps.map((map) => map.id);
    const regionIds = WORLD.maps.flatMap((map) => map.regions.map((region) => region.id));
    const connIds = WORLD.maps.flatMap((map) => map.connections.map((conn) => conn.id));

    expect(new Set(mapIds).size).toBe(mapIds.length);
    expect(new Set(regionIds).size).toBe(regionIds.length);
    expect(new Set(connIds).size).toBe(connIds.length);

    for (const map of WORLD.maps) {
      expect(map.connections.length).toBeGreaterThanOrEqual(1);
      expect(WORLD.maps.some((other) => other.connections.some((conn) => conn.to.mapId === map.id))).toBe(true);

      for (const conn of map.connections) {
        const target = WORLD.maps.find((other) => other.id === conn.to.mapId);

        expect(target, conn.id).toBeDefined();
        expect(target?.playerSpawns[conn.to.spawnId], conn.id).toBeDefined();
      }
    }
  });

  it('bắt được dữ liệu cố ý hỏng', () => {
    const cases: Array<[WorldErrorCode, (world: Loose) => void]> = [
      ['duplicate_map_id', (w) => { w.maps[1].id = w.maps[0].id; }],
      ['duplicate_region_id', (w) => { w.maps[1].regions[0].id = w.maps[0].regions[0].id; }],
      ['duplicate_connection_id', (w) => { w.maps[1].connections[0].id = w.maps[0].connections[0].id; }],
      ['region_map_mismatch', (w) => { w.maps[0].regions[0].mapId = 'map.khac'; }],
      ['region_out_of_bounds', (w) => { w.maps[0].regions[0].bounds = { x: WORLD_WIDTH - 10, y: 0, width: 100, height: 100 }; }],
      ['region_out_of_bounds', (w) => { w.maps[0].regions[0].bounds = { x: 0, y: 0, width: 0, height: 10 }; }],
      ['region_invalid_tier', (w) => { w.maps[0].regions[0].tierFloor = MAX_THREAT_TIER + 1; }],
      ['region_invalid_display', (w) => { w.maps[0].regions[1].display.description = 'x'.repeat(41); }],
      ['region_invalid_display', (w) => { w.maps[0].regions[1].display.danger = 4; }],
      ['region_invalid_display', (w) => { w.maps[0].regions[1].display.danger = 1.5; }],
      ['region_invalid_display', (w) => { w.maps[0].regions[2].display.name = '  '; }],
      ['region_unknown_archetype', (w) => { w.maps[0].regions[1].spawnTable.pattern = ['grunt', 'khong_co']; }],
      // M3: eliteSlots sai (id không tồn tại / không cận chiến / vùng an toàn / vùng có điểm sinh riêng).
      ['region_invalid_elite', (w) => { w.maps[0].regions[1].eliteSlots = ['khong_co']; }],
      ['region_invalid_elite', (w) => { w.maps[0].regions[1].eliteSlots = ['caster']; }],
      ['region_invalid_elite', (w) => { w.maps[0].regions[0].eliteSlots = ['grunt']; }],
      ['region_invalid_elite', (w) => { w.maps[1].regions[0].eliteSlots = ['grunt']; }],
      ['multiple_fallback_regions', (w) => { w.maps[0].regions[0].bounds = null; }],
      ['no_regions', (w) => { w.maps[1].regions = []; }],
      ['connection_from_out_of_bounds', (w) => { w.maps[0].connections[0].from.x = -5; }],
      ['missing_target_map', (w) => { w.maps[0].connections[0].to.mapId = 'map.khong_co'; }],
      ['missing_target_spawn', (w) => { w.maps[0].connections[0].to.spawnId = 'fromPortal:conn.khong_co'; }],
      ['missing_death_respawn', (w) => { w.maps[1].deathRespawn.mapId = 'map.khong_co'; }],
      ['missing_default_spawn', (w) => { w.maps[1].playerSpawns = {}; }],
      ['spawn_out_of_bounds', (w) => { w.maps[1].playerSpawns.default = { x: 99999, y: 0 }; }],
      ['orphan_connection', (w) => { w.maps[0].connections[0].from.mapId = 'map.boss_arena_1'; }],
      ['map_without_exit', (w) => { w.maps[1].connections = []; }],
      ['map_without_entrance', (w) => { w.maps[1].connections[0].to.mapId = 'map.boss_arena_1'; }],
    ];

    for (const [expected, mutate] of cases) {
      expect(codes(broken(mutate)), `kỳ vọng bắt ${expected}`).toContain(expected);
    }
  });

  it('eliteSlots sai chỉ gây đúng mã region_invalid_elite (mỗi slot sai một lỗi); slot hợp lệ không lỗi', () => {
    const only: Array<[string, (world: Loose) => void]> = [
      ['id không tồn tại', (w) => { w.maps[0].regions[1].eliteSlots = ['khong_co']; }],
      ['không phải cận chiến', (w) => { w.maps[0].regions[2].eliteSlots = ['caster']; }],
      ['vùng an toàn (làng)', (w) => { w.maps[0].regions[0].eliteSlots = ['grunt']; }],
      ['vùng có điểm sinh riêng (Arena)', (w) => { w.maps[1].regions[0].eliteSlots = ['brute']; }],
    ];

    for (const [label, mutate] of only) {
      expect(codes(broken(mutate)), label).toEqual(['region_invalid_elite']);
    }

    expect(
      codes(broken((w) => { w.maps[0].regions[1].eliteSlots = ['grunt', 'brute', 'swarmer']; })),
      'nhiều slot cận chiến hợp lệ',
    ).toEqual([]);
    expect(
      codes(broken((w) => { w.maps[0].regions[1].eliteSlots = ['khong_co', 'caster']; })),
      'hai slot sai = hai lỗi',
    ).toEqual(['region_invalid_elite', 'region_invalid_elite']);
  });
});

// ── effectiveThreatTier ─────────────────────────────────────────────────────

/** Công thức hiện tại của WorldScene.getThreatTier (elapsed = time - runStartedAt). */
function legacyThreatTier(elapsedMs: number): number {
  return Math.min(MAX_THREAT_TIER, Math.max(0, Math.floor(elapsedMs / THREAT_INTERVAL_MS)));
}

describe('effectiveThreatTier', () => {
  const plain = { tierOffset: 0, tierFloor: 0, tierCap: MAX_THREAT_TIER };

  it('offset 0, floor 0 = công thức getThreatTier hiện tại tại các mốc và mọi biên bậc', () => {
    const samples = new Set<number>([0, 1, 59999, 60000, 60001, -5000]);

    for (let tier = 0; tier <= MAX_THREAT_TIER + 3; tier += 1) {
      samples.add(tier * THREAT_INTERVAL_MS - 1);
      samples.add(tier * THREAT_INTERVAL_MS);
      samples.add(tier * THREAT_INTERVAL_MS + 1);
    }

    samples.add(1e9);

    for (const elapsed of samples) {
      expect(effectiveThreatTier(elapsed, plain), `elapsed=${elapsed}`).toBe(legacyThreatTier(elapsed));
    }

    expect(effectiveThreatTier(59999, plain)).toBe(0);
    expect(effectiveThreatTier(60000, plain)).toBe(1);
    expect(effectiveThreatTier(1e9, plain)).toBe(MAX_THREAT_TIER);
  });

  it('dữ liệu thật: mọi vùng offset 0 (làng, gần, Arena) cho đúng bậc cũ ở mọi biên', () => {
    let zeroOffset = 0;

    for (const map of WORLD.maps) {
      for (const region of map.regions) {
        if (region.tierOffset !== 0) {
          continue;
        }

        zeroOffset += 1;

        for (let tier = 0; tier <= MAX_THREAT_TIER + 2; tier += 1) {
          for (const elapsed of [tier * THREAT_INTERVAL_MS - 1, tier * THREAT_INTERVAL_MS, tier * THREAT_INTERVAL_MS + 1]) {
            expect(effectiveThreatTier(elapsed, region), `${region.id} @${elapsed}`).toBe(legacyThreatTier(elapsed));
          }
        }

        expect(effectiveThreatTier(1e9, region)).toBe(legacyThreatTier(1e9));
      }
    }

    expect(zeroOffset).toBe(3);
  });

  it('dữ liệu thật: vùng xa = bậc cũ + 1, kẹp theo tierCap = MAX_THREAT_TIER', () => {
    const far = STARTING_LANDS.regions.find((region) => region.id === REGION_WILDS_FAR) as MapDef['regions'][number];

    for (let tier = 0; tier <= MAX_THREAT_TIER + 2; tier += 1) {
      for (const elapsed of [tier * THREAT_INTERVAL_MS - 1, tier * THREAT_INTERVAL_MS, tier * THREAT_INTERVAL_MS + 1]) {
        expect(effectiveThreatTier(elapsed, far), `@${elapsed}`).toBe(
          Math.min(MAX_THREAT_TIER, legacyThreatTier(elapsed) + 1),
        );
      }
    }

    expect(effectiveThreatTier(0, far)).toBe(1);
    expect(effectiveThreatTier(59999, far)).toBe(1);
    expect(effectiveThreatTier(60000, far)).toBe(2);
    expect(effectiveThreatTier(1e9, far)).toBe(MAX_THREAT_TIER);
    expect(far.tierCap).toBe(MAX_THREAT_TIER);
  });

  it('offset > 0 cộng thêm, bị kẹp bởi tierCap', () => {
    expect(effectiveThreatTier(0, { ...plain, tierOffset: 1 })).toBe(1);
    expect(effectiveThreatTier(60000, { ...plain, tierOffset: 2 })).toBe(3);
    expect(effectiveThreatTier(1e9, { ...plain, tierOffset: 1 })).toBe(MAX_THREAT_TIER);
    expect(effectiveThreatTier(1e9, { ...plain, tierOffset: 1, tierCap: MAX_THREAT_TIER + 1 })).toBe(
      MAX_THREAT_TIER + 1,
    );
    expect(effectiveThreatTier(0, { tierOffset: 3, tierFloor: 0, tierCap: 2 })).toBe(2);
  });

  it('kẹp theo tierFloor (kể cả offset âm)', () => {
    expect(effectiveThreatTier(0, { tierOffset: 0, tierFloor: 2, tierCap: MAX_THREAT_TIER })).toBe(2);
    expect(effectiveThreatTier(60000, { tierOffset: -3, tierFloor: 1, tierCap: MAX_THREAT_TIER })).toBe(1);
    expect(effectiveThreatTier(5 * THREAT_INTERVAL_MS, { tierOffset: -1, tierFloor: 1, tierCap: MAX_THREAT_TIER })).toBe(4);
  });
});

// ── W3: điểm sinh quái theo vùng ────────────────────────────────────────────

/** Đọc ENEMY_SPAWNS từ văn bản town.ts (không export, và import town.ts kéo theo Phaser). */
function readEnemySpawns(): Array<{ x: number; y: number }> {
  const text = readFileSync(fileURLToPath(new URL('./town.ts', import.meta.url)), 'utf8');
  const block = /const ENEMY_SPAWNS = \[([\s\S]*?)\] as const;/.exec(text);

  expect(block, 'không tìm thấy ENEMY_SPAWNS trong town.ts').not.toBeNull();

  return [...(block as RegExpExecArray)[1].matchAll(/\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+)\s*\}/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

describe('vùng của điểm sinh quái (W3)', () => {
  const spawns = readEnemySpawns();

  it('ENEMY_SPAWNS có đúng 8 điểm (4 gần + 4 xa) như đã khóa', () => {
    expect(spawns).toEqual([
      { x: 1050, y: 1150 },
      { x: 2750, y: 1150 },
      { x: 1050, y: 1750 },
      { x: 2750, y: 1750 },
      { x: 1000, y: 400 },
      { x: 3300, y: 600 },
      { x: 1100, y: 2350 },
      { x: 2900, y: 2350 },
    ]);
  });

  it('4 điểm đầu → wilds_near, 4 điểm sau → wilds_far', () => {
    spawns.forEach((point, index) => {
      expect(regionAt(STARTING_LANDS, point.x, point.y)?.id, `(${point.x},${point.y})`).toBe(
        index < 4 ? REGION_WILDS_NEAR : REGION_WILDS_FAR,
      );
    });
  });

  it('jitter ±48 (và kẹp lề 48) không làm điểm sinh đổi vùng, không rơi vào vùng an toàn', () => {
    for (const point of spawns) {
      const home = regionAt(STARTING_LANDS, point.x, point.y);

      for (const dx of [-48, 0, 48]) {
        for (const dy of [-48, 0, 48]) {
          const x = Math.min(WORLD_WIDTH - 48, Math.max(48, point.x + dx));
          const y = Math.min(WORLD_HEIGHT - 48, Math.max(48, point.y + dy));

          expect(regionAt(STARTING_LANDS, x, y)?.id, `(${x},${y})`).toBe(home?.id);
          expect(regionAt(STARTING_LANDS, x, y)?.safe, `(${x},${y})`).toBe(false);
          expect(isInsideVillage(x, y), `(${x},${y})`).toBe(false);
        }
      }
    }
  });

  it('region.village vẫn an toàn và nằm trọn trong wilds_near (regionAt chọn vùng hẹp nhất)', () => {
    const near = WILDS_NEAR_BOUNDS;

    expect(VILLAGE_ZONE.x).toBeGreaterThanOrEqual(near.x);
    expect(VILLAGE_ZONE.y).toBeGreaterThanOrEqual(near.y);
    expect(VILLAGE_ZONE.x + VILLAGE_ZONE.width).toBeLessThanOrEqual(near.x + near.width);
    expect(VILLAGE_ZONE.y + VILLAGE_ZONE.height).toBeLessThanOrEqual(near.y + near.height);
    expect(regionAt(STARTING_LANDS, MAIN_DEFAULT_SPAWN.x, MAIN_DEFAULT_SPAWN.y)?.id).toBe(REGION_VILLAGE);
  });

  it('bậc quái theo điểm sinh: near = bậc thời gian cũ, far = +1 (kẹp MAX_THREAT_TIER)', () => {
    for (const elapsed of [0, 59999, 60000, 5 * THREAT_INTERVAL_MS, 1e9]) {
      spawns.forEach((point, index) => {
        const region = regionAt(STARTING_LANDS, point.x, point.y);

        expect(region).not.toBeNull();
        expect(effectiveThreatTier(elapsed, region as NonNullable<typeof region>)).toBe(
          index < 4 ? legacyThreatTier(elapsed) : Math.min(MAX_THREAT_TIER, legacyThreatTier(elapsed) + 1),
        );
      });
    }
  });
});

describe('biển tên vùng (dữ liệu)', () => {
  it('mọi vùng có biển hợp lệ: tên không rỗng, 0–3 ◆, mô tả ≤ 40 ký tự; Arena không có biển', () => {
    for (const map of WORLD.maps) {
      for (const region of map.regions) {
        if (region.id === REGION_ARENA) {
          expect(region.display).toBeNull();
          continue;
        }

        expect(region.display, region.id).not.toBeNull();
        expect(region.display?.name.length).toBeGreaterThan(0);
        expect(region.display?.description.length).toBeLessThanOrEqual(40);
        expect(region.display?.danger).toBe(region.safe ? 0 : region.id === REGION_WILDS_NEAR ? 1 : 2);
      }
    }
  });
});

// ── Nhãn cổng khớp luật khóa (rủi ro QA W2) ─────────────────────────────────

describe('portal.kind khớp lockRules cho mọi connection', () => {
  const sources = ['./town.ts', './bossArena.ts'].map((file) =>
    readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8'),
  );
  const declared = new Map<string, string>();

  for (const text of sources) {
    for (const m of text.matchAll(/kind:\s*'(enter|return)',\s*connectionId:\s*(CONN_[A-Z_]+)/g)) {
      declared.set(m[2], m[1]);
    }
  }

  it('direction của dữ liệu = loại suy ra từ lockRules (boss_alive → return, còn lại → enter)', () => {
    let count = 0;

    for (const map of WORLD.maps) {
      for (const conn of map.connections) {
        expect(conn.direction, conn.id).toBe(conn.lockRules.includes('boss_alive') ? 'return' : 'enter');
        count += 1;
      }
    }

    expect(count).toBe(2);
  });

  it('nhãn kind truyền cho createPortal ở town.ts/bossArena.ts khớp loại suy ra, phủ mọi connection', () => {
    const constants = worldConfig as unknown as Record<string, unknown>;

    for (const map of WORLD.maps) {
      for (const conn of map.connections) {
        const name = Object.keys(constants).find((key) => key.startsWith('CONN_') && constants[key] === conn.id);

        expect(name, `không có hằng CONN_ cho ${conn.id}`).toBeDefined();
        expect(declared.get(name as string), `${conn.id} (${name}) không có nhãn kind trong createPortal`).toBe(
          conn.lockRules.includes('boss_alive') ? 'return' : 'enter',
        );
      }
    }
  });
});
