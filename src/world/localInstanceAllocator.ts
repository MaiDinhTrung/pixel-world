/**
 * Bộ cấp Instance CỤC BỘ (P1, docs/WORLD_ARCHITECTURE.md §4.3): cài `InstanceAllocator` trong bộ nhớ, thuần.
 * Id (`inst.<số>`) từ `nextInstanceNumber()` và thời gian từ `now()` đều do bên gọi TIÊM VÀO. Không timer, không I/O.
 * CHƯA NỐI vào game.
 *
 * Lưu ý: `idleTtlMs` CHƯA được thi hành ở P1 (Instance `persistent` trống được giữ vô thời hạn).
 * `capacity_full` chỉ nằm trong kiểu; bộ cấp luôn tạo Instance mới khi hết chỗ.
 */
import {
  resolveInstancePolicy,
  type AllocHint,
  type AssignResult,
  type CharacterUid,
  type InstanceAllocator,
  type InstanceId,
  type InstanceRef,
  type InstanceRuntime,
  type ReleaseResult,
} from './instance';
import { findMap, type MapId, type WorldDef } from './worldGraph';

export interface LocalInstanceAllocatorOptions {
  world: WorldDef;
  now: () => number;
  nextInstanceNumber: () => number;
}

export interface LocalInstanceAllocator extends InstanceAllocator {
  getInstance(ref: InstanceRef): InstanceRuntime | null;
  holdingOf(who: CharacterUid): InstanceRef | null;
  listInstances(mapId?: MapId): InstanceRuntime[];
}

interface Entry {
  ref: InstanceRef;
  createdAtMs: number;
  occupants: CharacterUid[];
  persistent: boolean;
}

function snapshot(entry: Entry): InstanceRuntime {
  return {
    ref: { instanceId: entry.ref.instanceId, mapId: entry.ref.mapId },
    createdAtMs: entry.createdAtMs,
    occupants: [...entry.occupants],
  };
}

export function createLocalInstanceAllocator(options: LocalInstanceAllocatorOptions): LocalInstanceAllocator {
  const { world, now, nextInstanceNumber } = options;
  /** Map giữ thứ tự chèn = thứ tự tạo. */
  const entries = new Map<InstanceId, Entry>();
  const holdings = new Map<CharacterUid, InstanceRef>();

  function create(mapId: MapId): Entry {
    const instanceId: InstanceId = `inst.${nextInstanceNumber()}`;
    const entry: Entry = {
      ref: { instanceId, mapId },
      createdAtMs: now(),
      occupants: [],
      persistent: false,
    };

    entries.set(instanceId, entry);

    return entry;
  }

  return {
    assign(mapId, who, hint?: AllocHint): AssignResult {
      const map = findMap(world, mapId);

      if (map === null) {
        return { ok: false, reason: 'unknown_map' };
      }

      if (holdings.has(who)) {
        return { ok: false, reason: 'already_assigned' };
      }

      const policy = resolveInstancePolicy(map);
      let target: Entry | null = null;

      if (policy.mode === 'shared' && policy.capacity > 1) {
        const open = [...entries.values()].filter(
          (entry) => entry.ref.mapId === mapId && entry.occupants.length < policy.capacity,
        );
        const preferred =
          hint?.preferInstanceId === undefined
            ? undefined
            : open.find((entry) => entry.ref.instanceId === hint.preferInstanceId);

        if (preferred !== undefined) {
          target = preferred;
        } else {
          for (const entry of open) {
            if (target === null) {
              target = entry;
            } else if (
              policy.allocation === 'fill_first'
                ? entry.occupants.length > target.occupants.length
                : entry.occupants.length < target.occupants.length
            ) {
              // So sánh nghiêm ngặt nên hòa giữ Instance tạo trước.
              target = entry;
            }
          }
        }
      }

      const entry = target ?? create(mapId);

      entry.persistent = policy.persistence === 'persistent';
      entry.occupants.push(who);

      const ref: InstanceRef = { instanceId: entry.ref.instanceId, mapId: entry.ref.mapId };

      holdings.set(who, ref);

      return { ok: true, ref: { ...ref } };
    },

    release(ref, who): ReleaseResult {
      const entry = entries.get(ref.instanceId);

      if (entry === undefined || entry.ref.mapId !== ref.mapId) {
        return { ok: false, reason: 'unknown_instance' };
      }

      const index = entry.occupants.indexOf(who);

      if (index < 0) {
        return { ok: false, reason: 'not_occupant' };
      }

      entry.occupants.splice(index, 1);
      holdings.delete(who);

      if (entry.occupants.length === 0 && !entry.persistent) {
        entries.delete(entry.ref.instanceId);
      }

      return { ok: true };
    },

    getInstance(ref) {
      const entry = entries.get(ref.instanceId);

      return entry === undefined || entry.ref.mapId !== ref.mapId ? null : snapshot(entry);
    },

    holdingOf(who) {
      const ref = holdings.get(who);

      return ref === undefined ? null : { ...ref };
    },

    listInstances(mapId) {
      return [...entries.values()]
        .filter((entry) => mapId === undefined || entry.ref.mapId === mapId)
        .map(snapshot);
    },
  };
}
