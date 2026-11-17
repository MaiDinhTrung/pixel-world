/**
 * Chuyển Map theo dữ liệu (P2, docs/WORLD_ARCHITECTURE.md §3.3, §6): thông tin đi qua cổng, điểm xuất hiện
 * của scene, kẹp vị trí theo kích thước Map, chọn cổng gần nhất. THUẦN: không Phaser, không ngẫu nhiên, không đọc giờ.
 */
import { resolveArrival } from './arrival';
import {
  findConnection,
  findMap,
  type ConnectionDef,
  type ConnectionId,
  type MapDef,
  type MapId,
  type Point,
  type SpawnId,
  type WorldDef,
} from './worldGraph';

export interface FadeColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ConnectionTravelInfo {
  connection: ConnectionDef;
  targetMap: MapDef;
  sceneKey: string;
  fadeColor: FadeColor;
  chargeMs: number;
}

export interface SceneArrival {
  spawnId: SpawnId;
  point: Point;
  /** Màu fade của connection đã dùng; null khi không qua cổng. */
  fadeColor: FadeColor | null;
}

export function getConnectionTravelInfo(
  world: WorldDef,
  connectionId: ConnectionId,
): ConnectionTravelInfo {
  const connection = findConnection(world, connectionId);

  if (connection === null) {
    throw new Error(`getConnectionTravelInfo: không tìm thấy connection ${connectionId}`);
  }

  const targetMap = findMap(world, connection.to.mapId);

  if (targetMap === null) {
    throw new Error(
      `getConnectionTravelInfo: ${connectionId} trỏ tới map không tồn tại ${connection.to.mapId}`,
    );
  }

  return {
    connection,
    targetMap,
    sceneKey: targetMap.sceneKey,
    fadeColor: connection.fadeColor,
    chargeMs: connection.chargeMs,
  };
}

/** Điểm xuất hiện khi scene của `mapId` bắt đầu; connection không dẫn tới map này coi như không có. */
export function resolveSceneArrival(
  world: WorldDef,
  mapId: MapId,
  arrivalConnectionId: ConnectionId | null,
): SceneArrival {
  const map = findMap(world, mapId);

  if (map === null) {
    throw new Error(`resolveSceneArrival: không tìm thấy map ${mapId}`);
  }

  const connection =
    arrivalConnectionId === null ? null : findConnection(world, arrivalConnectionId);

  if (connection === null || connection.to.mapId !== mapId) {
    const { spawnId, point } = resolveArrival(map, { spawnId: 'default' });

    return { spawnId, point, fadeColor: null };
  }

  const { spawnId, point } = resolveArrival(map, {
    spawnId: connection.to.spawnId,
    connectionId: connection.id,
  });

  return { spawnId, point, fadeColor: connection.fadeColor };
}

/** Kẹp (x, y) vào [margin, size - margin]; margin quá lớn thì trả tâm theo trục đó. */
export function clampToMap(map: MapDef, x: number, y: number, margin: number): Point {
  const axis = (value: number, size: number): number =>
    margin * 2 > size ? size / 2 : Math.min(size - margin, Math.max(margin, value));

  return { x: axis(x, map.size.width), y: axis(y, map.size.height) };
}

/** Cổng gần nhất trong `radius` (≤); hòa → cổng đứng trước trong mảng; không có → null. */
export function nearestPortal<T extends Point>(
  portals: readonly T[],
  x: number,
  y: number,
  radius: number,
): T | null {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const portal of portals) {
    const distance = Math.hypot(portal.x - x, portal.y - y);

    if (distance <= radius && distance < bestDistance) {
      best = portal;
      bestDistance = distance;
    }
  }

  return best;
}
