/**
 * Dữ liệu World/Region/Map (Gói W1, docs/WORLD_MAP_DESIGN.md): mô tả ĐÚNG hai bản đồ hiện có.
 * ĐÃ NỐI (W2): WorldScene/BossArenaScene/town/bossArena đọc id, đích và luật cổng từ đây. Chỉ THAM CHIẾU
 * hằng số có sẵn, không sao chép số (MAIN_DEFAULT_SPAWN là nguồn thật, xem chú thích bên dưới).
 */
import type { MapDef, MapId, RegionId, ConnectionId, WorldDef } from '../world/worldGraph';
import {
  BOSS_ARENA_ENTRANCE,
  BOSS_ARENA_ENTRANCE_LABEL,
  BOSS_ARENA_ENTRY_COLOR,
  BOSS_ARENA_ENTRY_COLOR_CSS,
  BOSS_ARENA_FADE_TO_ARENA,
  BOSS_ARENA_FADE_TO_WORLD,
  BOSS_ARENA_HEIGHT,
  BOSS_ARENA_MINION_MAX_ALIVE,
  BOSS_ARENA_MINION_SPAWNS,
  BOSS_ARENA_PLAYER_SPAWN,
  BOSS_ARENA_PORTAL_CHARGE_MS,
  BOSS_ARENA_RETURN_COLOR,
  BOSS_ARENA_RETURN_COLOR_CSS,
  BOSS_ARENA_RETURN_LABEL,
  BOSS_ARENA_RETURN_PORTAL,
  BOSS_ARENA_WIDTH,
} from './bossArenaConfig';
import { MAX_THREAT_TIER } from './combatConfig';
import { SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { VILLAGE_ZONE } from './economyConfig';

export const MAP_STARTING_LANDS: MapId = 'map.starting_lands';
export const MAP_BOSS_ARENA_1: MapId = 'map.boss_arena_1';

export const REGION_VILLAGE: RegionId = 'region.village';
export const REGION_WILDS: RegionId = 'region.wilds';
export const REGION_ARENA: RegionId = 'region.arena';

export const CONN_VILLAGE_TO_ARENA: ConnectionId = 'conn.village_to_arena';
export const CONN_ARENA_TO_VILLAGE: ConnectionId = 'conn.arena_to_village';

/**
 * Quy tắc xoay vòng hiện tại của WorldScene.spawnEnemy: `spawnIndex % 3 === 2` → ranged,
 * còn lại melee (tỉ lệ 2:1). [ĐÃ XÁC MINH ở WorldScene.ts ~dòng 1244]
 */
const CURRENT_SPAWN_PATTERN = ['melee', 'melee', 'ranged'] as const;

/**
 * Vị trí người chơi xuất hiện ở bản đồ chính (lúc vào game VÀ khi về từ Arena: RunSession không lưu tọa độ
 * nên WorldScene.create luôn đặt người chơi ở `town.playerSpawn`). [ĐÃ XÁC MINH]
 * NGUỒN THẬT (W2): world/town.ts đọc `playerSpawn` từ đây. Test khóa giá trị {1920, 1440}.
 */
export const MAIN_DEFAULT_SPAWN = { x: 1920, y: 1440 } as const;

const STARTING_LANDS: MapDef = {
  id: MAP_STARTING_LANDS,
  sceneKey: SCENE_KEYS.world,
  size: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  kind: 'overworld',
  lighting: 'day_night',
  playerSpawns: { default: { ...MAIN_DEFAULT_SPAWN } },
  regions: [
    {
      id: REGION_VILLAGE,
      mapId: MAP_STARTING_LANDS,
      bounds: { ...VILLAGE_ZONE },
      safe: true,
      tierOffset: 0,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: { pattern: [], points: [] },
      maxAliveCap: null,
      eliteSlots: [],
    },
    {
      // "Phần còn lại" của map (bounds null). Điểm sinh quái vẫn nằm ở world/town.ts (ENEMY_SPAWNS) ở W1.
      id: REGION_WILDS,
      mapId: MAP_STARTING_LANDS,
      bounds: null,
      safe: false,
      tierOffset: 0,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: { pattern: [...CURRENT_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: [],
    },
  ],
  connections: [
    {
      id: CONN_VILLAGE_TO_ARENA,
      from: {
        mapId: MAP_STARTING_LANDS,
        x: BOSS_ARENA_ENTRANCE.x,
        y: BOSS_ARENA_ENTRANCE.y,
      },
      to: { mapId: MAP_BOSS_ARENA_1, spawnId: 'default' },
      type: 'portal',
      direction: 'enter',
      lockRules: ['always_open'],
      chargeMs: BOSS_ARENA_PORTAL_CHARGE_MS,
      fadeColor: { ...BOSS_ARENA_FADE_TO_ARENA },
      visual: {
        color: BOSS_ARENA_ENTRY_COLOR,
        label: BOSS_ARENA_ENTRANCE_LABEL,
        labelColor: BOSS_ARENA_ENTRY_COLOR_CSS,
      },
    },
  ],
  deathRespawn: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
};

const BOSS_ARENA_1: MapDef = {
  id: MAP_BOSS_ARENA_1,
  sceneKey: SCENE_KEYS.bossArena,
  size: { width: BOSS_ARENA_WIDTH, height: BOSS_ARENA_HEIGHT },
  kind: 'boss',
  lighting: 'fixed',
  playerSpawns: { default: { ...BOSS_ARENA_PLAYER_SPAWN } },
  regions: [
    {
      // Cả Arena là một vùng (bounds null). Quái con dùng cùng quy tắc xoay vòng của WorldScene.spawnEnemy.
      id: REGION_ARENA,
      mapId: MAP_BOSS_ARENA_1,
      bounds: null,
      safe: false,
      tierOffset: 0,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: {
        pattern: [...CURRENT_SPAWN_PATTERN],
        points: BOSS_ARENA_MINION_SPAWNS.map((point) => ({ ...point })),
      },
      maxAliveCap: BOSS_ARENA_MINION_MAX_ALIVE,
      eliteSlots: [],
    },
  ],
  connections: [
    {
      id: CONN_ARENA_TO_VILLAGE,
      from: {
        mapId: MAP_BOSS_ARENA_1,
        x: BOSS_ARENA_RETURN_PORTAL.x,
        y: BOSS_ARENA_RETURN_PORTAL.y,
      },
      to: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
      type: 'portal',
      direction: 'return',
      lockRules: ['boss_alive'],
      chargeMs: BOSS_ARENA_PORTAL_CHARGE_MS,
      fadeColor: { ...BOSS_ARENA_FADE_TO_WORLD },
      visual: {
        color: BOSS_ARENA_RETURN_COLOR,
        label: BOSS_ARENA_RETURN_LABEL,
        labelColor: BOSS_ARENA_RETURN_COLOR_CSS,
      },
    },
  ],
  // Chết ở Arena: BossArenaScene.restartRun → về WorldScene (làng), D6.
  deathRespawn: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
};

export const WORLD: WorldDef = { maps: [STARTING_LANDS, BOSS_ARENA_1] };
