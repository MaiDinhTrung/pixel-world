import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

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
  REGION_WILDS,
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
        expect(region?.id, `(${x},${y})`).toBe(isInsideVillage(x, y) ? REGION_VILLAGE : REGION_WILDS);
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

  it('region.arena dùng trần quái con của Arena; làng an toàn, không sinh quái; wilds xoay vòng 2:1', () => {
    const arena = BOSS_ARENA.regions[0];
    const village = STARTING_LANDS.regions.find((region) => region.id === REGION_VILLAGE);
    const wilds = STARTING_LANDS.regions.find((region) => region.id === REGION_WILDS);

    expect(arena.maxAliveCap).toBe(BOSS_ARENA_MINION_MAX_ALIVE);
    expect(village?.safe).toBe(true);
    expect(village?.spawnTable.pattern).toEqual([]);
    expect(wilds?.safe).toBe(false);
    expect(wilds?.spawnTable.pattern).toEqual(['melee', 'melee', 'ranged']);
    expect(wilds?.tierOffset).toBe(0);
    expect(wilds?.tierFloor).toBe(0);
    expect(STARTING_LANDS.lighting).toBe('day_night');
    expect(BOSS_ARENA.lighting).toBe('fixed');
  });

  it('spawn mặc định của map chính khớp số viết cứng trong world/town.ts (chống lệch)', () => {
    const text = readFileSync(fileURLToPath(new URL('./town.ts', import.meta.url)), 'utf8');
    const match = /playerSpawn:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/.exec(text);

    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(MAIN_DEFAULT_SPAWN.x);
    expect(Number(match?.[2])).toBe(MAIN_DEFAULT_SPAWN.y);
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

  it('dữ liệu thật: mọi vùng hiện có (offset 0) cho đúng bậc cũ', () => {
    for (const map of WORLD.maps) {
      for (const region of map.regions) {
        for (const elapsed of [0, 59999, 60000, 359999, 360000, 1e9]) {
          expect(effectiveThreatTier(elapsed, region)).toBe(legacyThreatTier(elapsed));
        }
      }
    }
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
