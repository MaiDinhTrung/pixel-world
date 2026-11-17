/**
 * Instance của game (P3c-2, docs/WORLD_ARCHITECTURE.md §4.2): một `LocalInstanceAllocator` cho mỗi game.
 * Phần logic THUẦN (không import Phaser): nhận nguồn đồng hồ cấu trúc `{ loop: { time } }` để test được.
 * Không ngẫu nhiên, không đọc đồng hồ hệ thống.
 */
import { WORLD } from '../config/worldConfig';
import type { CharacterUid, InstanceRef, InstanceRuntime } from '../world/instance';
import { createLocalInstanceAllocator, type LocalInstanceAllocator } from '../world/localInstanceAllocator';
import type { MapId } from '../world/worldGraph';

export interface GameClockSource {
  readonly loop: { readonly time: number };
}

export interface GameInstances {
  /** Cấp Instance mới cho `who` ở `mapId`; nếu `who` đang giữ Instance thì giải phóng trước. Map không tồn tại → ném Error. */
  enter(mapId: MapId, who: CharacterUid): InstanceRef;
  /** Chuyển đi: giải phóng Instance đang giữ và cấp Instance mới ở `mapId`. */
  moveTo(mapId: MapId, who: CharacterUid): { from: InstanceRef | null; to: InstanceRef };
  /** Dùng Instance đã cấp sẵn từ vé nếu `who` đang giữ đúng nó và đúng `mapId`; ngược lại như `enter`. */
  resolve(mapId: MapId, who: CharacterUid, ticketTo: InstanceRef | null): InstanceRef;
  /** Giải phóng `ref` của `who`; bỏ qua lỗi unknown_instance/not_occupant (idempotent). */
  leave(ref: InstanceRef, who: CharacterUid): void;
  holdingOf(who: CharacterUid): InstanceRef | null;
  listInstances(mapId?: MapId): readonly InstanceRef[];
  /** Trạng thái chạy của một Instance (gồm `createdAtMs`); null nếu không tồn tại. */
  getInstance(ref: InstanceRef): InstanceRuntime | null;
}

function createGameInstances(game: GameClockSource): GameInstances {
  let counter = 0;
  const allocator: LocalInstanceAllocator = createLocalInstanceAllocator({
    world: WORLD,
    now: () => game.loop.time,
    nextInstanceNumber: () => {
      counter += 1;

      return counter;
    },
  });

  function leave(ref: InstanceRef, who: CharacterUid): void {
    // Lỗi unknown_instance/not_occupant được bỏ qua có chủ đích (idempotent).
    allocator.release(ref, who);
  }

  function enter(mapId: MapId, who: CharacterUid): InstanceRef {
    const held = allocator.holdingOf(who);

    if (held !== null) {
      leave(held, who);
    }

    const result = allocator.assign(mapId, who);

    if (!result.ok) {
      throw new Error(`gameInstances: không cấp được Instance cho ${who} ở ${mapId}: ${result.reason}`);
    }

    return result.ref;
  }

  return {
    enter,

    moveTo(mapId, who) {
      const from = allocator.holdingOf(who);

      return { from, to: enter(mapId, who) };
    },

    resolve(mapId, who, ticketTo) {
      const held = allocator.holdingOf(who);

      if (
        ticketTo !== null &&
        held !== null &&
        held.instanceId === ticketTo.instanceId &&
        held.mapId === ticketTo.mapId &&
        held.mapId === mapId
      ) {
        return held;
      }

      return enter(mapId, who);
    },

    leave,

    holdingOf: (who) => allocator.holdingOf(who),

    listInstances: (mapId) => allocator.listInstances(mapId).map((runtime) => runtime.ref),

    getInstance: (ref) => allocator.getInstance(ref),
  };
}

const registry = new WeakMap<object, GameInstances>();

/** Một bộ Instance cho mỗi game (khoá theo đối tượng game). */
export function getGameInstances(game: GameClockSource): GameInstances {
  let instances = registry.get(game);

  if (instances === undefined) {
    instances = createGameInstances(game);
    registry.set(game, instances);
  }

  return instances;
}
