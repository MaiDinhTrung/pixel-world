/**
 * Dữ liệu World/Map/Zone (Region nhóm Map sẽ thêm ở gói sau; xem docs/WORLD_ARCHITECTURE.md) (Gói W1, docs/WORLD_MAP_DESIGN.md): mô tả ĐÚNG các bản đồ hiện có (P4b: thêm Region Rừng Úa / Map Rừng Sâu).
 * ĐÃ NỐI (W2; P4a: một scene WorldScene cho mọi Map): WorldScene/town/bossArena đọc id, đích và luật cổng từ đây. Chỉ THAM CHIẾU
 * hằng số có sẵn, không sao chép số (MAIN_DEFAULT_SPAWN là nguồn thật, xem chú thích bên dưới).
 */
import type {
  ConnectionId,
  InstancePolicy,
  MapDef,
  MapId,
  RegionDef,
  RegionId,
  WorldDef,
  ZoneId,
} from '../world/worldGraph';
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
import {
  WOODS_ARRIVAL_IN_LANDS,
  WOODS_DEEP_ELITE_SLOTS,
  WOODS_DEEP_SPAWN_PATTERN,
  WOODS_DEEP_TIER_FLOOR,
  WOODS_DEEP_TIER_OFFSET,
  WOODS_EDGE_BOUNDS,
  WOODS_EDGE_ELITE_SLOTS,
  WOODS_EDGE_SPAWN_PATTERN,
  WOODS_EDGE_TIER_FLOOR,
  WOODS_EDGE_TIER_OFFSET,
  WOODS_ENTER_PROMPT,
  WOODS_ENTRANCE,
  WOODS_ENTRANCE_LABEL,
  WOODS_FADE_TO_LANDS,
  WOODS_FADE_TO_WOODS,
  WOODS_HEIGHT,
  WOODS_PLAYER_SPAWN,
  WOODS_PORTAL_CHARGE_MS,
  WOODS_PORTAL_COLOR,
  WOODS_PORTAL_COLOR_CSS,
  WOODS_RETURN_LABEL,
  WOODS_RETURN_PORTAL,
  WOODS_RETURN_PROMPT,
  WOODS_TIER_CAP,
  WOODS_WIDTH,
} from './witheredWoodsConfig';

export const MAP_STARTING_LANDS: MapId = 'map.starting_lands';
export const MAP_BOSS_ARENA_1: MapId = 'map.boss_arena_1';
/** Map overworld của Region Rừng Úa (P4b): "Rừng Sâu". */
export const MAP_WITHERED_WOODS: MapId = 'map.withered_woods';

export const REGION_STARTING: RegionId = 'region.starting';
/** Region thứ hai (P4b): "Rừng Úa". */
export const REGION_WITHERED: RegionId = 'region.withered';

/**
 * Chính sách Instance mặc định (P1, GIÁ TRỊ KHỞI ĐIỂM): tái hiện hành vi hiện tại, mỗi lần chuyển Map tạo Instance
 * mới và Instance cũ bị huỷ. Map ghi đè từng phần bằng `MapDef.instance`. Chưa nối vào game.
 */
export const DEFAULT_INSTANCE_POLICY: InstancePolicy = {
  mode: 'private',
  capacity: 1,
  persistence: 'ephemeral',
  allocation: 'fill_first',
  idleTtlMs: 0,
};

export const ZONE_VILLAGE: ZoneId = 'zone.village';
/** Vùng ngoài làng, GẦN làng (W3): độ khó như bậc thời gian toàn cục. */
export const ZONE_WILDS_NEAR: ZoneId = 'zone.wilds_near';
/** Vùng ngoài làng, XA làng (W3): "phần còn lại" của map, quái sinh ra mạnh hơn. */
export const ZONE_WILDS_FAR: ZoneId = 'zone.wilds_far';
export const ZONE_ARENA: ZoneId = 'zone.arena';
/** Rừng Sâu (P4b): Bìa Rừng = nửa Nam (WOODS_EDGE_BOUNDS), Lõi Rừng = phần còn lại. */
export const ZONE_WOODS_EDGE: ZoneId = 'zone.woods_edge';
export const ZONE_WOODS_DEEP: ZoneId = 'zone.woods_deep';

export const CONN_VILLAGE_TO_ARENA: ConnectionId = 'conn.village_to_arena';
export const CONN_ARENA_TO_VILLAGE: ConnectionId = 'conn.arena_to_village';
/** Cổng Hoang Địa Sâu → Rừng Sâu và cổng về (P4b). */
export const CONN_LANDS_TO_WOODS: ConnectionId = 'conn.lands_to_woods';
export const CONN_WOODS_TO_LANDS: ConnectionId = 'conn.woods_to_lands';

/**
 * Mẫu xoay vòng của ARENA (giữ nguyên từ M1; M2 không đổi): id archetype (`enemyConfig.ts`); `grunt`,`grunt`,`caster`
 * = cận chiến, cận chiến, bắn xa (tỉ lệ 2:1, tương đương `spawnIndex % 3 === 2` → bắn xa của WorldScene.spawnEnemy cũ).
 * Hai vùng ngoài làng dùng mẫu riêng ở dưới.
 */
const CURRENT_SPAWN_PATTERN = ['grunt', 'grunt', 'caster'] as const;

/**
 * Mẫu sinh vùng GẦN làng (M2): 2 grunt : 1 caster : 1 swarmer mỗi chu kỳ 4. Thứ tự chọn: world/spawnPattern.ts
 * (`pickStaggeredArchetype`, bộ đếm riêng của vùng). GIÁ TRỊ KHỞI ĐIỂM.
 */
export const WILDS_NEAR_SPAWN_PATTERN = ['grunt', 'grunt', 'caster', 'swarmer'] as const;

/**
 * Mẫu sinh vùng XA làng (M2): 1 grunt, 2 brute, 2 caster, 1 swarmer mỗi chu kỳ 6 (nhiều quái nặng/bắn xa hơn vùng gần).
 * GIÁ TRỊ KHỞI ĐIỂM.
 */
export const WILDS_FAR_SPAWN_PATTERN = ['grunt', 'brute', 'caster', 'swarmer', 'caster', 'brute'] as const;

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
export const ZONE_TRACKER = { stableMs: 400, cooldownMs: 20000 } as const;

/**
 * Biển tên vùng (ui/RegionBanner.ts). Tọa độ theo khung thiết kế 960x540 (scrollFactor 0).
 * Đặt phía trên giữa: dưới dòng đồng hồ HUD (y 10), trên toast (y 144), xa tâm màn (y 270).
 * holdMs: thời gian hiện đủ sáng; fadeInMs/fadeOutMs: thời gian hiện dần/mờ dần (không nhấp nháy, không flash).
 * depth: trên HUD (5000–5004), dưới toast/lời nhắc (5050) và màn chết (5100).
 * Màu đồng trầm (cùng VILLAGE_MARKER), không dùng đỏ/cam (dành cho đạn quái và telegraph).
 * Cỡ chữ (px) >= nhãn cổng (15 px) để đọc được trên điện thoại.
 */
export const ZONE_BANNER = {
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
  regionId: REGION_STARTING,
  builderId: 'town',
  sceneKey: SCENE_KEYS.world,
  size: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  kind: 'overworld',
  lighting: 'day_night',
  playerSpawns: {
    default: { ...MAIN_DEFAULT_SPAWN },
    // Về từ Rừng Sâu (P4b): đặt cạnh cổng Rừng ở Hoang Địa Sâu (resolveArrival thử `fromPortal:<id>` trước).
    [`fromPortal:${CONN_WOODS_TO_LANDS}`]: { ...WOODS_ARRIVAL_IN_LANDS },
  },
  zones: [
    {
      id: ZONE_VILLAGE,
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
      // GẦN làng: hình chữ nhật WILDS_NEAR_BOUNDS (chứa cả làng; zoneAt chọn vùng hẹp nhất nên làng vẫn là village).
      // Điểm sinh quái vẫn nằm ở world/town.ts (ENEMY_SPAWNS).
      id: ZONE_WILDS_NEAR,
      mapId: MAP_STARTING_LANDS,
      bounds: { ...WILDS_NEAR_BOUNDS },
      safe: false,
      tierOffset: 0,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: { pattern: [...WILDS_NEAR_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: ['grunt'], // M3: Elite nền grunt (GIÁ TRỊ KHỞI ĐIỂM)
      display: { name: 'Đồng Hoang Úa', danger: 1, description: 'Gió lạnh mang mùi tử khí' },
    },
    {
      // XA làng: "phần còn lại" của map (bounds null). Quái sinh ở đây mạnh hơn WILDS_FAR_TIER_OFFSET bậc;
      // trần vẫn là MAX_THREAT_TIER (không nâng trần chung).
      id: ZONE_WILDS_FAR,
      mapId: MAP_STARTING_LANDS,
      bounds: null,
      safe: false,
      tierOffset: WILDS_FAR_TIER_OFFSET,
      tierFloor: 0,
      tierCap: MAX_THREAT_TIER,
      spawnTable: { pattern: [...WILDS_FAR_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: ['brute'], // M3: Elite nền brute (GIÁ TRỊ KHỞI ĐIỂM)
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
    {
      // P4b: cổng Rừng ở Hoang Địa Sâu (cuối đường lát đá phía Đông), luôn mở.
      id: CONN_LANDS_TO_WOODS,
      from: {
        mapId: MAP_STARTING_LANDS,
        x: WOODS_ENTRANCE.x,
        y: WOODS_ENTRANCE.y,
      },
      to: { mapId: MAP_WITHERED_WOODS, spawnId: 'default' },
      type: 'portal',
      direction: 'enter',
      lockRules: ['always_open'],
      chargeMs: WOODS_PORTAL_CHARGE_MS,
      fadeColor: { ...WOODS_FADE_TO_WOODS },
      visual: {
        color: WOODS_PORTAL_COLOR,
        label: WOODS_ENTRANCE_LABEL,
        labelColor: WOODS_PORTAL_COLOR_CSS,
        prompt: WOODS_ENTER_PROMPT,
      },
    },
  ],
  deathRespawn: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
};

const BOSS_ARENA_1: MapDef = {
  id: MAP_BOSS_ARENA_1,
  regionId: REGION_STARTING,
  builderId: 'boss_arena',
  sceneKey: SCENE_KEYS.world,
  size: { width: BOSS_ARENA_WIDTH, height: BOSS_ARENA_HEIGHT },
  kind: 'boss',
  lighting: 'fixed',
  playerSpawns: { default: { ...BOSS_ARENA_PLAYER_SPAWN } },
  zones: [
    {
      // Cả Arena là một vùng (bounds null). Quái con dùng cùng quy tắc xoay vòng của WorldScene.spawnEnemy.
      id: ZONE_ARENA,
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
  // Chết ở Arena: WorldScene.restartRun → lượt mới ở map chính (làng), D6.
  deathRespawn: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
};

/**
 * Rừng Sâu (P4b, `world/witheredWoods.ts`): overworld ánh sáng cố định (hoàng hôn), không Boss, không vùng an toàn.
 * Số liệu ở `config/witheredWoodsConfig.ts` (GIÁ TRỊ KHỞI ĐIỂM). Chết ở đây → lượt mới ở làng (D6).
 */
const WITHERED_WOODS: MapDef = {
  id: MAP_WITHERED_WOODS,
  regionId: REGION_WITHERED,
  builderId: 'withered_woods',
  sceneKey: SCENE_KEYS.world,
  size: { width: WOODS_WIDTH, height: WOODS_HEIGHT },
  kind: 'overworld',
  lighting: 'fixed',
  playerSpawns: { default: { ...WOODS_PLAYER_SPAWN } },
  zones: [
    {
      id: ZONE_WOODS_EDGE,
      mapId: MAP_WITHERED_WOODS,
      bounds: { ...WOODS_EDGE_BOUNDS },
      safe: false,
      tierOffset: WOODS_EDGE_TIER_OFFSET,
      tierFloor: WOODS_EDGE_TIER_FLOOR,
      tierCap: WOODS_TIER_CAP,
      spawnTable: { pattern: [...WOODS_EDGE_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: [...WOODS_EDGE_ELITE_SLOTS],
      display: { name: 'Bìa Rừng', danger: 2, description: 'Lá úa rơi, bóng cây dày dần' },
    },
    {
      id: ZONE_WOODS_DEEP,
      mapId: MAP_WITHERED_WOODS,
      bounds: null,
      safe: false,
      tierOffset: WOODS_DEEP_TIER_OFFSET,
      tierFloor: WOODS_DEEP_TIER_FLOOR,
      tierCap: WOODS_TIER_CAP,
      spawnTable: { pattern: [...WOODS_DEEP_SPAWN_PATTERN], points: [] },
      maxAliveCap: null,
      eliteSlots: [...WOODS_DEEP_ELITE_SLOTS],
      display: { name: 'Lõi Rừng', danger: 3, description: 'Không còn lối nào an toàn' },
    },
  ],
  connections: [
    {
      id: CONN_WOODS_TO_LANDS,
      from: {
        mapId: MAP_WITHERED_WOODS,
        x: WOODS_RETURN_PORTAL.x,
        y: WOODS_RETURN_PORTAL.y,
      },
      // Đích là spawn `fromPortal:` của map chính: cạnh cổng Rừng (WOODS_ARRIVAL_IN_LANDS).
      to: { mapId: MAP_STARTING_LANDS, spawnId: `fromPortal:${CONN_WOODS_TO_LANDS}` },
      type: 'portal',
      direction: 'enter',
      lockRules: ['always_open'],
      chargeMs: WOODS_PORTAL_CHARGE_MS,
      fadeColor: { ...WOODS_FADE_TO_LANDS },
      visual: {
        color: WOODS_PORTAL_COLOR,
        label: WOODS_RETURN_LABEL,
        labelColor: WOODS_PORTAL_COLOR_CSS,
        prompt: WOODS_RETURN_PROMPT,
      },
    },
  ],
  deathRespawn: { mapId: MAP_STARTING_LANDS, spawnId: 'default' },
};

/** Region đầu tiên (P1): GIÁ TRỊ KHỞI ĐIỂM, `danger` chưa hiển thị ở đâu; chưa khai báo `respawn`. */
const REGION_STARTING_DEF: RegionDef = {
  id: REGION_STARTING,
  display: { name: 'Khởi Nguyên', description: 'Làng và vùng hoang địa đầu tiên', danger: 1 },
  mapIds: [MAP_STARTING_LANDS, MAP_BOSS_ARENA_1],
  entryMapId: MAP_STARTING_LANDS,
};

/** Region thứ hai (P4b): GIÁ TRỊ KHỞI ĐIỂM; chưa khai báo `respawn` (chết → deathRespawn của Map, về làng). */
const REGION_WITHERED_DEF: RegionDef = {
  id: REGION_WITHERED,
  display: { name: 'Rừng Úa', description: 'Khu rừng chết bên kia Hoang Địa', danger: 2 },
  mapIds: [MAP_WITHERED_WOODS],
  entryMapId: MAP_WITHERED_WOODS,
};

export const WORLD: WorldDef = {
  regions: [REGION_STARTING_DEF, REGION_WITHERED_DEF],
  maps: [STARTING_LANDS, BOSS_ARENA_1, WITHERED_WOODS],
};
