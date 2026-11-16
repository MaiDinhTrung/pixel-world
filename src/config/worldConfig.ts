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
import { VILLAGE_MARKER } from './atmosphereConfig';
import { MAX_THREAT_TIER } from './combatConfig';
import { SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { VILLAGE_ZONE } from './economyConfig';

export const MAP_STARTING_LANDS: MapId = 'map.starting_lands';
export const MAP_BOSS_ARENA_1: MapId = 'map.boss_arena_1';

export const REGION_VILLAGE: RegionId = 'region.village';
/** Vùng ngoài làng, GẦN làng (W3): độ khó như bậc thời gian toàn cục. */
export const REGION_WILDS_NEAR: RegionId = 'region.wilds_near';
/** Vùng ngoài làng, XA làng (W3): "phần còn lại" của map, quái sinh ra mạnh hơn. */
export const REGION_WILDS_FAR: RegionId = 'region.wilds_far';
export const REGION_ARENA: RegionId = 'region.arena';

export const CONN_VILLAGE_TO_ARENA: ConnectionId = 'conn.village_to_arena';
export const CONN_ARENA_TO_VILLAGE: ConnectionId = 'conn.arena_to_village';

/**
 * Mẫu xoay vòng hiện tại (M1): id archetype (`enemyConfig.ts`); `grunt`,`grunt`,`caster` = cận chiến, cận chiến,
 * bắn xa (tỉ lệ 2:1, tương đương `spawnIndex % 3 === 2` → bắn xa của WorldScene.spawnEnemy cũ).
 */
const CURRENT_SPAWN_PATTERN = ['grunt', 'grunt', 'caster'] as const;

/**
 * Vị trí người chơi xuất hiện ở bản đồ chính (lúc vào game VÀ khi về từ Arena: RunSession không lưu tọa độ
 * nên WorldScene.create luôn đặt người chơi ở `town.playerSpawn`). [ĐÃ XÁC MINH]
 * NGUỒN THẬT (W2): world/town.ts đọc `playerSpawn` từ đây. Test khóa giá trị {1920, 1440}.
 */
export const MAIN_DEFAULT_SPAWN = { x: 1920, y: 1440 } as const;

// ── W3: vùng gần/xa làng, biển tên vùng (GIÁ TRỊ KHỞI ĐIỂM, chỉnh sau khi chơi thử) ─────────────────────

/**
 * Vùng GẦN làng (hình chữ nhật, px thế giới; biên tính cả cạnh). Chứa 4 điểm sinh gần làng của ENEMY_SPAWNS
 * (world/town.ts): (1050,1150), (2750,1150), (1050,1750), (2750,1750) và cả làng (VILLAGE_ZONE).
 * Mọi điểm ngoài hình này (trong map chính) là vùng XA. Không đổi ENEMY_SPAWNS khi chỉnh số này
 * (test worldGraph khóa 4 điểm gần → near, 4 điểm xa → far).
 */
export const WILDS_NEAR_BOUNDS = { x: 700, y: 700, width: 2400, height: 1300 } as const;

/** Vùng XA làng: bậc của quái SINH ở đây = bậc thời gian + giá trị này (kẹp theo `tierCap`). */
export const WILDS_FAR_TIER_OFFSET = 1;

/**
 * Theo dõi vùng của người chơi (world/regionTracker.ts).
 * stableMs: vùng mới phải được giữ liên tục ít nhất ngần này ms mới tính là đã vào (chống nhấp nháy ở biên).
 * cooldownMs: không hiện lại biển của CÙNG một vùng trong ngần này ms kể từ lần hiện trước.
 */
export const REGION_TRACKER = { stableMs: 400, cooldownMs: 20000 } as const;

/**
 * Biển tên vùng (ui/RegionBanner.ts). Tọa độ theo khung thiết kế 960x540 (scrollFactor 0).
 * Đặt phía trên giữa: dưới dòng đồng hồ HUD (y 10), trên toast (y 144), xa tâm màn (y 270).
 * holdMs: thời gian hiện đủ sáng; fadeInMs/fadeOutMs: thời gian hiện dần/mờ dần (không nhấp nháy, không flash).
 * depth: trên HUD (5000–5004), dưới toast/lời nhắc (5050) và màn chết (5100).
 * Màu đồng trầm (cùng VILLAGE_MARKER), không dùng đỏ/cam (dành cho đạn quái và telegraph).
 * Cỡ chữ (px) >= nhãn cổng (15 px) để đọc được trên điện thoại.
 */
export const REGION_BANNER = {
  centerX: 480,
  nameY: 62,
  subY: 90,
  depth: 5040,
  nameFontPx: 22,
  subFontPx: 15,
  nameColor: VILLAGE_MARKER.textColor,
  subColor: '#b5ad98',
  strokeColor: '#0b0c12',
  strokeThickness: 4,
  fadeInMs: 250,
  holdMs: 2500,
  fadeOutMs: 700,
} as const;

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
      display: { name: 'Làng Khởi Nguyên', danger: 0, description: 'Nơi trú ẩn cuối cùng' },
    },
    {
      // GẦN làng: hình chữ nhật WILDS_NEAR_BOUNDS (chứa cả làng; regionAt chọn vùng hẹp nhất nên làng vẫn là village).
      // Điểm sinh quái vẫn nằm ở world/town.ts (ENEMY_SPAWNS).
      id: REGION_WILDS_NEAR,
      mapId: MAP_STARTING_LANDS,
      bounds: { ...WILDS_NEAR_BOUNDS },
      safe: false,
      tierOffset: 0,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: { pattern: [...CURRENT_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: [],
      display: { name: 'Đồng Hoang Úa', danger: 1, description: 'Gió lạnh mang mùi tử khí' },
    },
    {
      // XA làng: "phần còn lại" của map (bounds null). Quái sinh ở đây mạnh hơn WILDS_FAR_TIER_OFFSET bậc;
      // trần vẫn là MAX_THREAT_TIER (không nâng trần chung).
      id: REGION_WILDS_FAR,
      mapId: MAP_STARTING_LANDS,
      bounds: null,
      safe: false,
      tierOffset: WILDS_FAR_TIER_OFFSET,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: { pattern: [...CURRENT_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: [],
      display: { name: 'Hoang Địa Sâu', danger: 2, description: 'Kẻ yếu không trở về' },
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
      display: null, // Arena không có biển tên.
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
