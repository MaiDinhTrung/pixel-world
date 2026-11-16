/**
 * Mô hình World/Map/Zone (Region nhóm Map sẽ thêm ở gói sau; xem docs/WORLD_ARCHITECTURE.md) THUẦN (Gói W1, docs/WORLD_MAP_DESIGN.md §3): kiểu dữ liệu, tra cứu vùng,
 * luật khóa cổng, thời gian → bậc độ khó theo vùng, kiểm tra dữ liệu.
 *
 * ĐÃ NỐI (W2): WorldScene/BossArenaScene đọc cổng, đích, khóa cổng và bậc thời gian từ đây. W3: bậc theo vùng của
 * điểm sinh (`zoneAt` + `effectiveThreatTier`) và biển tên vùng (`ZoneDef.display`). Không phụ thuộc Phaser,
 * không ngẫu nhiên, không đọc thời gian hệ thống. Dữ liệu cụ thể ở `config/worldConfig.ts`.
 */
import { MAX_THREAT_TIER, THREAT_INTERVAL_MS } from '../config/combatConfig';
import { findArchetype, type ArchetypeId } from '../config/enemyConfig';
import {
  getPortalDenyReason,
  type PortalAccessInput,
  type PortalDenyReason,
  type PortalKind,
} from './bossArenaRules';

// ── Id ổn định (không đổi tên sau phát hành) ────────────────────────────────

export type MapId = `map.${string}`;
export type ZoneId = `zone.${string}`;
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

/** Id archetype quái (M1): định nghĩa ở `config/enemyConfig.ts`. */
export type EnemyKind = ArchetypeId;

export interface SpawnTable {
  /** Xoay vòng theo chỉ số sinh (spawnIndex % pattern.length). Mỗi phần tử là id archetype. Rỗng = không sinh quái. */
  readonly pattern: readonly EnemyKind[];
  /** Điểm sinh riêng của vùng; rỗng = dùng điểm sinh mặc định của map (chưa mô tả ở W1). */
  readonly points: readonly Point[];
}

/** Thông tin biển tên vùng (W3, D9): tên, mức nguy hiểm ◆ (0 = an toàn), một dòng mô tả ≤ ZONE_DESCRIPTION_MAX_CHARS ký tự. */
export interface ZoneDisplay {
  readonly name: string;
  readonly danger: number;
  readonly description: string;
}

/** Số ◆ tối đa của biển tên (D9: 1–3; 0 = an toàn). */
export const ZONE_DANGER_MAX = 3;
/** Độ dài tối đa của dòng mô tả trên biển tên (D9). */
export const ZONE_DESCRIPTION_MAX_CHARS = 40;

export interface ZoneDef {
  readonly id: ZoneId;
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
  /**
   * Archetype nền của Elite ở vùng này (M3): Elite thứ `n` của vùng dùng `eliteSlots[n % độ dài]`. Chỉ archetype cận chiến;
   * rỗng = vùng không sinh Elite (bắt buộc với vùng an toàn và vùng có điểm sinh riêng như Arena).
   */
  readonly eliteSlots: readonly ArchetypeId[];
  /** Biển tên khi vào vùng; null = không hiện biển (ví dụ Arena). */
  readonly display: ZoneDisplay | null;
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
  readonly zones: readonly ZoneDef[];
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
export function zoneAt(map: MapDef, x: number, y: number): ZoneDef | null {
  let best: ZoneDef | null = null;
  let bestArea = Infinity;
  let fallback: ZoneDef | null = null;

  for (const zone of map.zones) {
    if (zone.bounds === null) {
      fallback ??= zone;
      continue;
    }

    if (!rectContains(zone.bounds, x, y)) {
      continue;
    }

    const area = zone.bounds.width * zone.bounds.height;

    if (area < bestArea) {
      best = zone;
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
  zone: Pick<ZoneDef, 'tierOffset' | 'tierFloor' | 'tierCap'>,
): number {
  const raw = timeThreatTier(elapsedMs) + zone.tierOffset;

  return Math.min(zone.tierCap, Math.max(zone.tierFloor, raw));
}

// ── Kiểm tra dữ liệu ────────────────────────────────────────────────────────

export type WorldErrorCode =
  | 'duplicate_map_id'
  | 'duplicate_zone_id'
  | 'duplicate_connection_id'
  | 'zone_map_mismatch'
  | 'zone_out_of_bounds'
  | 'zone_invalid_tier'
  | 'zone_invalid_display'
  | 'zone_unknown_archetype'
  | 'zone_invalid_elite'
  | 'multiple_fallback_zones'
  | 'no_zones'
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
  const zoneIds = new Set<string>();
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
    if (map.zones.length === 0) {
      fail('no_zones', `${map.id} không có vùng nào`);
    }

    if (map.zones.filter((zone) => zone.bounds === null).length > 1) {
      fail('multiple_fallback_zones', `${map.id} có hơn một vùng "phần còn lại"`);
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

    for (const zone of map.zones) {
      if (zoneIds.has(zone.id)) {
        fail('duplicate_zone_id', `vùng trùng id: ${zone.id}`);
      }

      zoneIds.add(zone.id);

      if (zone.mapId !== map.id) {
        fail('zone_map_mismatch', `${zone.id}.mapId (${zone.mapId}) khác map chứa nó (${map.id})`);
      }

      if (zone.tierFloor > zone.tierCap) {
        fail('zone_invalid_tier', `${zone.id} có tierFloor > tierCap`);
      }

      for (const archetypeId of zone.spawnTable.pattern) {
        if (findArchetype(archetypeId) === undefined) {
          fail('zone_unknown_archetype', `${zone.id} có spawnTable.pattern chứa archetype không tồn tại: ${String(archetypeId)}`);
        }
      }

      for (const slot of zone.eliteSlots) {
        const archetype = findArchetype(slot);

        if (archetype === undefined) {
          fail('zone_invalid_elite', `${zone.id} có eliteSlots chứa archetype không tồn tại: ${String(slot)}`);
        } else if (archetype.kind !== 'melee') {
          fail('zone_invalid_elite', `${zone.id} có eliteSlots chứa archetype không phải cận chiến: ${slot}`);
        } else if (zone.safe || zone.spawnTable.points.length > 0) {
          fail('zone_invalid_elite', `${zone.id} là vùng an toàn hoặc có điểm sinh riêng (Arena) nhưng có eliteSlots`);
        }
      }

      const display = zone.display;

      if (
        display !== null &&
        (display.name.trim() === '' ||
          !Number.isInteger(display.danger) ||
          display.danger < 0 ||
          display.danger > ZONE_DANGER_MAX ||
          display.description.length > ZONE_DESCRIPTION_MAX_CHARS)
      ) {
        fail('zone_invalid_display', `${zone.id} có biển tên không hợp lệ (tên rỗng, ◆ ngoài 0–${ZONE_DANGER_MAX} hoặc mô tả quá ${ZONE_DESCRIPTION_MAX_CHARS} ký tự)`);
      }

      const rect = zone.bounds;

      if (
        rect !== null &&
        (rect.width <= 0 ||
          rect.height <= 0 ||
          rect.x < 0 ||
          rect.y < 0 ||
          rect.x + rect.width > map.size.width ||
          rect.y + rect.height > map.size.height)
      ) {
        fail('zone_out_of_bounds', `${zone.id} nằm ngoài biên ${map.id} hoặc kích thước không dương`);
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
