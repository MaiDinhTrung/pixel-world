/**
 * Kiểu và logic THUẦN cho Instance/TravelTicket (P1, docs/WORLD_ARCHITECTURE.md §4.3, §5.2–5.4).
 * ĐÃ NỐI vào game từ P3c-2: `WorldScene` dùng `createTravelTicket`/`isTravelTicket` qua `systems/gameInstances.ts`. Không phụ thuộc Phaser,
 * không ngẫu nhiên, không đọc đồng hồ: id và thời gian do bên gọi TIÊM VÀO.
 */
import { DEFAULT_INSTANCE_POLICY } from '../config/worldConfig';
import type { InstancePolicy, MapDef, MapId, Point } from './worldGraph';

export type InstanceId = `inst.${string}`;
export type CharacterUid = string;

/**
 * Phần "mang theo" của nhân vật khi đổi Map; tương ứng phần mang theo của RunSession (chỉ đối chiếu).
 * Đồng hồ độ khó/lịch Boss KHÔNG nằm ở đây (ở lại RunSession, quyết định Q1(a)).
 */
export interface CharacterCarry {
  vitals: { health: number; armor: number; energy: number } | null;
  skillCooldownUntil: Record<string, number>;
  dashChargeReadyAt: number[];
  dashReadyAt: number;
}

export interface InstanceRef {
  instanceId: InstanceId;
  mapId: MapId;
}

/** Trạng thái gameplay của Instance (quái, drop, Boss...) sẽ thêm ở P3. */
export interface InstanceRuntime {
  ref: InstanceRef;
  createdAtMs: number;
  occupants: readonly CharacterUid[];
}

export interface AllocHint {
  preferInstanceId?: InstanceId;
}

export interface TravelTicket {
  characterUid: CharacterUid;
  from: InstanceRef | null;
  to: { instance: InstanceRef; spawnPoint: Point };
  carry: CharacterCarry;
}

export type AssignResult =
  | { ok: true; ref: InstanceRef }
  | { ok: false; reason: 'unknown_map' | 'already_assigned' | 'capacity_full' };

export type ReleaseResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_instance' | 'not_occupant' };

export interface InstanceAllocator {
  assign(mapId: MapId, who: CharacterUid, hint?: AllocHint): AssignResult;
  release(ref: InstanceRef, who: CharacterUid): ReleaseResult;
}

/** Ghép `defaults` với `map.instance` (trường thiếu lấy mặc định); trả đối tượng mới. */
export function resolveInstancePolicy(
  map: Pick<MapDef, 'instance'>,
  defaults: InstancePolicy = DEFAULT_INSTANCE_POLICY,
): InstancePolicy {
  return { ...defaults, ...map.instance };
}

export interface CreateTravelTicketInput {
  characterUid: CharacterUid;
  from: InstanceRef | null;
  to: { instance: InstanceRef; spawnPoint: Point };
  carry: CharacterCarry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInstanceRef(value: unknown): value is InstanceRef {
  return (
    isRecord(value) &&
    typeof value.instanceId === 'string' &&
    value.instanceId.startsWith('inst.') &&
    typeof value.mapId === 'string' &&
    value.mapId.startsWith('map.')
  );
}

function isCharacterCarry(value: unknown): value is CharacterCarry {
  if (!isRecord(value)) {
    return false;
  }

  const { vitals, skillCooldownUntil, dashChargeReadyAt, dashReadyAt } = value;

  if (
    vitals !== null &&
    !(
      isRecord(vitals) &&
      isFiniteNumber(vitals.health) &&
      isFiniteNumber(vitals.armor) &&
      isFiniteNumber(vitals.energy)
    )
  ) {
    return false;
  }

  return (
    isRecord(skillCooldownUntil) &&
    Object.values(skillCooldownUntil).every(isFiniteNumber) &&
    Array.isArray(dashChargeReadyAt) &&
    dashChargeReadyAt.every(isFiniteNumber) &&
    isFiniteNumber(dashReadyAt)
  );
}

/** Kiểm cấu trúc và kiểu mọi trường của vé (dữ liệu `scene.start` là `unknown`). */
export function isTravelTicket(value: unknown): value is TravelTicket {
  if (!isRecord(value)) {
    return false;
  }

  const { characterUid, from, to, carry } = value;

  return (
    typeof characterUid === 'string' &&
    characterUid.length > 0 &&
    (from === null || isInstanceRef(from)) &&
    isRecord(to) &&
    isInstanceRef(to.instance) &&
    isRecord(to.spawnPoint) &&
    isFiniteNumber(to.spawnPoint.x) &&
    isFiniteNumber(to.spawnPoint.y) &&
    isCharacterCarry(carry)
  );
}

/** Tạo vé; `carry`, `Point` và ref được sao chép sâu nên đổi đối tượng gốc sau đó không ảnh hưởng vé. */
export function createTravelTicket(input: CreateTravelTicketInput): TravelTicket {
  const { carry } = input;

  return {
    characterUid: input.characterUid,
    from: input.from === null ? null : { instanceId: input.from.instanceId, mapId: input.from.mapId },
    to: {
      instance: { instanceId: input.to.instance.instanceId, mapId: input.to.instance.mapId },
      spawnPoint: { x: input.to.spawnPoint.x, y: input.to.spawnPoint.y },
    },
    carry: {
      vitals: carry.vitals === null ? null : { health: carry.vitals.health, armor: carry.vitals.armor, energy: carry.vitals.energy },
      skillCooldownUntil: { ...carry.skillCooldownUntil },
      dashChargeReadyAt: [...carry.dashChargeReadyAt],
      dashReadyAt: carry.dashReadyAt,
    },
  };
}
