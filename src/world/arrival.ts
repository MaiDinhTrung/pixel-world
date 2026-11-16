/**
 * Chọn điểm xuất hiện khi vào Map (P1, docs/WORLD_ARCHITECTURE.md §6): thuần, CHƯA NỐI vào game.
 * Thứ tự: fromPortal:<connectionId> → request.spawnId → 'default'; kết quả kẹp theo `map.size`.
 */
import type { ConnectionId, MapDef, Point, SpawnId } from './worldGraph';

export interface ArrivalRequest {
  spawnId: SpawnId;
  connectionId?: ConnectionId;
}

export interface ArrivalResult {
  spawnId: SpawnId;
  point: Point;
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

export function resolveArrival(map: MapDef, request: ArrivalRequest): ArrivalResult {
  const candidates: SpawnId[] = [];

  if (request.connectionId !== undefined) {
    candidates.push(`fromPortal:${request.connectionId}`);
  }

  candidates.push(request.spawnId, 'default');

  for (const spawnId of candidates) {
    const point = map.playerSpawns[spawnId];

    if (point !== undefined) {
      return {
        spawnId,
        point: { x: clamp(point.x, map.size.width), y: clamp(point.y, map.size.height) },
      };
    }
  }

  throw new Error(`resolveArrival: ${map.id} thiếu spawn 'default'`);
}
