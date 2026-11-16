/**
 * Mô hình World/Region/Map THUẦN (Gói W1, docs/WORLD_MAP_DESIGN.md §3): kiểu dữ liệu, tra cứu vùng,
 * luật khóa cổng, thời gian → bậc độ khó theo vùng, kiểm tra dữ liệu.
 *
 * ĐÃ NỐI (W2): WorldScene/BossArenaScene đọc cổng, đích, khóa cổng và bậc thời gian từ đây. W3: bậc theo vùng của
 * điểm sinh (`regionAt` + `effectiveThreatTier`) và biển tên vùng (`RegionDef.display`). Không phụ thuộc Phaser,
 * không ngẫu nhiên, không đọc thời gian hệ thống. Dữ liệu cụ thể ở `config/worldConfig.ts`.
 */
import { MAX_THREAT_TIER, THREAT_INTERVAL_MS } from '../config/combatConfig';
import {
  getPortalDenyReason,
  type PortalAccessInput,
  type PortalDenyReason,
  type PortalKind,
} from './bossArenaRules';

// ── Id ổn định (không đổi tên sau phát hành) ────────────────────────────────

export type MapId = `map.${string}`;
export type RegionId = `region.${string}`;
export type ConnectionId = `conn.${string}`;
export type SpawnId = 'default' | `fromPortal:${ConnectionId}`;

// ── Kiểu dữ liệu ────────────────────────────────────────────────────────────

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type EnemyKind = 'melee' | 'ranged';

export interface SpawnTable {
  /** Xoay vòng theo chỉ số sinh (spawnIndex % pattern.length). Rỗng = không sinh quái. */
  readonly pattern: readonly EnemyKind[];
  /** Điểm sinh riêng của vùng; rỗng = dùng điểm sinh mặc định của map (chưa mô tả ở W1). */
  readonly points: readonly Point[];
}

/** Thông tin biển tên vùng (W3, D9): tên, mức nguy hiểm ◆ (0 = an toàn), một dòng mô tả ≤ REGION_DESCRIPTION_MAX_CHARS ký tự. */
export interface RegionDisplay {
  readonly name: string;
  readonly danger: number;
  readonly description: string;
}

/** Số ◆ tối đa của biển tên (D9: 1–3; 0 = an toàn). */
export const REGION_DANGER_MAX = 3;
/** Độ dài tối đa của dòng mô tả trên biển tên (D9). */
export const REGION_DESCRIPTION_MAX_CHARS = 40;

export interface RegionDef {
  readonly id: RegionId;
  readonly mapId: MapId;
  /** Hình chữ nhật (biên TÍNH CẢ cạnh, khớp isInsideVillage). null = "phần còn lại" của map (tối đa một vùng/map). */
  readonly bounds: Rect | null;
  readonly safe: boolean;
  /** tierEffective = clamp(timeTier + tierOffset, tierFloor, tierCap). */
  readonly tierOffset: number;
  readonly tierFloor: number;
  readonly tierCap: number;
  readonly spawnTable: SpawnTable;
  /** Trần quái sống riêng của vùng; null = không có trần riêng. */
  readonly maxAliveCap: number | null;
  /** Chừa chỗ cho Elite (gói sau W3); luôn rỗng ở W1. */
  readonly eliteSlots: readonly never[];
  /** Biển tên khi vào vùng; null = không hiện biển (ví dụ Arena). */
  readonly display: RegionDisplay | null;
}

/** `always_open` và `boss_alive` làm việc thật; `boss_ready`, `min_level` chừa chỗ (chưa có trong kiểu). */
export type LockRule = 'always_open' | 'boss_alive';

export interface ConnectionDef {
  readonly id: ConnectionId;
  readonly from: { readonly mapId: MapId; readonly x: number; readonly y: number };
  readonly to: { readonly mapId: MapId; readonly spawnId: SpawnId };
  readonly type: 'portal';
  readonly direction: PortalKind;
  readonly lockRules: readonly LockRule[];
  readonly chargeMs: number;
  readonly fadeColor: { readonly r: number; readonly g: number; readonly b: number };
  readonly visual: {
    readonly color: number;
    readonly label: string;
    readonly labelColor: string;
  };
}

export interface MapDef {
  readonly id: MapId;
  readonly sceneKey: string;
  readonly size: { readonly width: number; readonly height: number };
  readonly kind: 'overworld' | 'boss';
  readonly lighting: 'day_night' | 'fixed';
  readonly playerSpawns: Readonly<Partial<Record<SpawnId, Point>>>;
  readonly regions: readonly RegionDef[];
  readonly connections: readonly ConnectionDef[];
  /** Nơi hồi sinh khi chết (D6: về làng). */
  readonly deathRespawn: { readonly mapId: MapId; readonly spawnId: SpawnId };
}

export interface WorldDef {
  readonly maps: readonly MapDef[];
}

/** Sự thật của lượt chơi mà luật khóa đọc (hàm thuần của WorldFacts). */
export interface WorldFacts {
  readonly bossAlive: boolean;
  readonly bossReady: boolean;
  readonly playerLevel: number;
}

/** Phần đầu vào cổng không suy ra được từ connection/facts (UI, hồi cổng...). Mặc định: mọi thứ trung tính. */
export type ConnectionAccessInput = Omit<PortalAccessInput, 'kind' | 'bossAlive'>;

const NEUTRAL_ACCESS: ConnectionAccessInput = {
  panelOpen: false,
  playerDead: false,
  now: 0,
  portalCooldownUntil: 0,
  leaping: false,
  traveling: false,
};

// ── Tra cứu vùng ────────────────────────────────────────────────────────────

function rectContains(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * Vùng hẹp nhất (diện tích nhỏ nhất) chứa điểm; không vùng nào chứa → vùng "phần còn lại"
 * (bounds null) của map; map không có vùng như vậy → null.
 */
export function regionAt(map: MapDef, x: number, y: number): RegionDef | null {
  let best: RegionDef | null = null;
  let bestArea = Infinity;
  let fallback: RegionDef | null = null;

  for (const region of map.regions) {
    if (region.bounds === null) {
      fallback ??= region;
      continue;
    }

    if (!rectContains(region.bounds, x, y)) {
      continue;
    }

    const area = region.bounds.width * region.bounds.height;

    if (area < bestArea) {
      best = region;
      bestArea = area;
    }
  }

  return best ?? fallback;
}

// ── Luật khóa cổng ──────────────────────────────────────────────────────────

/**
 * null = được dùng cổng; ngược lại là lý do từ chối. BỌC `getPortalDenyReason` (không viết lại luật):
 * cổng có luật `boss_alive` là cổng loại 'return' (khóa khi Boss sống), còn lại là 'enter'.
 */
export function evaluateConnection(
  conn: ConnectionDef,
  facts: WorldFacts,
  accessInput: ConnectionAccessInput = NEUTRAL_ACCESS,
): PortalDenyReason | null {
  const kind: PortalKind = conn.lockRules.includes('boss_alive') ? 'return' : 'enter';

  return getPortalDenyReason({
    ...accessInput,
    kind,
    bossAlive: facts.bossAlive,
  });
}

export type TravelDenyReason = PortalDenyReason | 'unknown_connection';

export type TravelResult =
  | { readonly ok: true; readonly to: { readonly mapId: MapId; readonly spawnId: SpawnId } }
  | { readonly ok: false; readonly reason: TravelDenyReason };

export function findMap(world: WorldDef, mapId: MapId): MapDef | null {
  return world.maps.find((map) => map.id === mapId) ?? null;
}

export function findConnection(
  world: WorldDef,
  connectionId: ConnectionId,
): ConnectionDef | null {
  for (const map of world.maps) {
    for (const conn of map.connections) {
      if (conn.id === connectionId) {
        return conn;
      }
    }
  }

  return null;
}

export function requestTravel(
  world: WorldDef,
  connectionId: ConnectionId,
  facts: WorldFacts,
  accessInput?: ConnectionAccessInput,
): TravelResult {
  const conn = findConnection(world, connectionId);

  if (conn === null) {
    return { ok: false, reason: 'unknown_connection' };
  }

  const denied = evaluateConnection(conn, facts, accessInput);

  if (denied !== null) {
    return { ok: false, reason: denied };
  }

  return { ok: true, to: { mapId: conn.to.mapId, spawnId: conn.to.spawnId } };
}

// ── Độ khó theo vùng ────────────────────────────────────────────────────────

/**
 * Bậc theo thời gian, CÙNG công thức WorldScene.getThreatTier:
 * min(MAX_THREAT_TIER, max(0, floor(elapsed / THREAT_INTERVAL_MS))).
 * `elapsedMs` là `time − runStartedAt` (thời gian đã trôi của lượt chơi), KHÔNG phải thời gian tuyệt đối.
 */
export function timeThreatTier(elapsedMs: number): number {
  return Math.min(
    MAX_THREAT_TIER,
    Math.max(0, Math.floor(elapsedMs / THREAT_INTERVAL_MS)),
  );
}

/**
 * tierEffective = clamp(timeTier + tierOffset, tierFloor, tierCap).
 * `elapsedMs` là `time − runStartedAt` (không phải thời gian tuyệt đối).
 */
export function effectiveThreatTier(
  elapsedMs: number,
  region: Pick<RegionDef, 'tierOffset' | 'tierFloor' | 'tierCap'>,
): number {
  const raw = timeThreatTier(elapsedMs) + region.tierOffset;

  return Math.min(region.tierCap, Math.max(region.tierFloor, raw));
}

// ── Kiểm tra dữ liệu ────────────────────────────────────────────────────────

export type WorldErrorCode =
  | 'duplicate_map_id'
  | 'duplicate_region_id'
  | 'duplicate_connection_id'
  | 'region_map_mismatch'
  | 'region_out_of_bounds'
  | 'region_invalid_tier'
  | 'region_invalid_display'
  | 'multiple_fallback_regions'
  | 'no_regions'
  | 'connection_from_out_of_bounds'
  | 'missing_target_map'
  | 'missing_target_spawn'
  | 'missing_death_respawn'
  | 'missing_default_spawn'
  | 'spawn_out_of_bounds'
  | 'orphan_connection'
  | 'map_without_exit'
  | 'map_without_entrance';

export interface WorldError {
  readonly code: WorldErrorCode;
  readonly message: string;
}

function insideMap(map: MapDef, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= map.size.width && y <= map.size.height;
}

/** Danh sách lỗi dữ liệu; rỗng = hợp lệ. */
export function validateWorld(world: WorldDef): WorldError[] {
  const errors: WorldError[] = [];
  const fail = (code: WorldErrorCode, message: string): void => {
    errors.push({ code, message });
  };

  const mapsById = new Map<string, MapDef>();
  const regionIds = new Set<string>();
  const connectionIds = new Set<string>();

  for (const map of world.maps) {
    if (mapsById.has(map.id)) {
      fail('duplicate_map_id', `map trùng id: ${map.id}`);
    } else {
      mapsById.set(map.id, map);
    }
  }

  const incoming = new Set<string>();

  for (const map of world.maps) {
    if (map.regions.length === 0) {
      fail('no_regions', `${map.id} không có vùng nào`);
    }

    if (map.regions.filter((region) => region.bounds === null).length > 1) {
      fail('multiple_fallback_regions', `${map.id} có hơn một vùng "phần còn lại"`);
    }

    if (map.playerSpawns.default === undefined) {
      fail('missing_default_spawn', `${map.id} thiếu spawn 'default'`);
    }

    for (const [spawnId, point] of Object.entries(map.playerSpawns)) {
      if (point !== undefined && !insideMap(map, point.x, point.y)) {
        fail('spawn_out_of_bounds', `${map.id} spawn ${spawnId} ngoài biên map`);
      }
    }

    const respawnMap = mapsById.get(map.deathRespawn.mapId);

    if (
      respawnMap === undefined ||
      respawnMap.playerSpawns[map.deathRespawn.spawnId] === undefined
    ) {
      fail('missing_death_respawn', `${map.id} deathRespawn trỏ tới nơi không tồn tại`);
    }

    for (const region of map.regions) {
      if (regionIds.has(region.id)) {
        fail('duplicate_region_id', `vùng trùng id: ${region.id}`);
      }

      regionIds.add(region.id);

      if (region.mapId !== map.id) {
        fail('region_map_mismatch', `${region.id}.mapId (${region.mapId}) khác map chứa nó (${map.id})`);
      }

      if (region.tierFloor > region.tierCap) {
        fail('region_invalid_tier', `${region.id} có tierFloor > tierCap`);
      }

      const display = region.display;

      if (
        display !== null &&
        (display.name.trim() === '' ||
          !Number.isInteger(display.danger) ||
          display.danger < 0 ||
          display.danger > REGION_DANGER_MAX ||
          display.description.length > REGION_DESCRIPTION_MAX_CHARS)
      ) {
        fail('region_invalid_display', `${region.id} có biển tên không hợp lệ (tên rỗng, ◆ ngoài 0–${REGION_DANGER_MAX} hoặc mô tả quá ${REGION_DESCRIPTION_MAX_CHARS} ký tự)`);
      }

      const rect = region.bounds;

      if (
        rect !== null &&
        (rect.width <= 0 ||
          rect.height <= 0 ||
          rect.x < 0 ||
          rect.y < 0 ||
          rect.x + rect.width > map.size.width ||
          rect.y + rect.height > map.size.height)
      ) {
        fail('region_out_of_bounds', `${region.id} nằm ngoài biên ${map.id} hoặc kích thước không dương`);
      }
    }

    for (const conn of map.connections) {
      if (connectionIds.has(conn.id)) {
        fail('duplicate_connection_id', `connection trùng id: ${conn.id}`);
      }

      connectionIds.add(conn.id);

      if (conn.from.mapId !== map.id) {
        fail('orphan_connection', `${conn.id}.from.mapId (${conn.from.mapId}) khác map chứa nó (${map.id})`);
      }

      if (!insideMap(map, conn.from.x, conn.from.y)) {
        fail('connection_from_out_of_bounds', `${conn.id} có điểm xuất phát ngoài biên ${map.id}`);
      }

      const target = mapsById.get(conn.to.mapId);

      if (target === undefined) {
        fail('missing_target_map', `${conn.id} trỏ tới map không tồn tại: ${conn.to.mapId}`);
        continue;
      }

      incoming.add(target.id);

      if (target.playerSpawns[conn.to.spawnId] === undefined) {
        fail('missing_target_spawn', `${conn.id} trỏ tới spawn không tồn tại: ${conn.to.mapId}/${conn.to.spawnId}`);
      }
    }

    if (map.connections.length === 0) {
      fail('map_without_exit', `${map.id} không có connection đi`);
    }
  }

  for (const map of world.maps) {
    if (!incoming.has(map.id)) {
      fail('map_without_entrance', `${map.id} không có connection đi tới`);
    }
  }

  return errors;
}
