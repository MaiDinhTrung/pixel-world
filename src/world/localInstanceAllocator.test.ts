import { describe, expect, it } from 'vitest';

import { MAP_BOSS_ARENA_1, MAP_STARTING_LANDS, WORLD } from '../config/worldConfig';
import { createLocalInstanceAllocator } from './localInstanceAllocator';
import type { InstanceRef } from './instance';
import type { InstancePolicy, MapDef, WorldDef } from './worldGraph';

function makeWorld(instance?: Partial<InstancePolicy>): WorldDef {
  return {
    ...WORLD,
    maps: WORLD.maps.map((map): MapDef => (map.id === MAP_STARTING_LANDS ? { ...map, instance } : map)),
  };
}

function setup(world: WorldDef = WORLD) {
  let counter = 0;
  let clock = 1000;
  const allocator = createLocalInstanceAllocator({
    world,
    now: () => (clock += 10),
    nextInstanceNumber: () => (counter += 1),
  });

  return allocator;
}

function ref(result: ReturnType<ReturnType<typeof setup>['assign']>): InstanceRef {
  if (!result.ok) {
    throw new Error(`assign thất bại: ${result.reason}`);
  }

  return result.ref;
}

describe('localInstanceAllocator: mặc định (private, capacity 1, ephemeral)', () => {
  it('id và createdAtMs xác định theo bộ đếm/đồng hồ tiêm vào', () => {
    const allocator = setup();
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));
    const b = ref(allocator.assign(MAP_BOSS_ARENA_1, 'b'));

    expect(a).toEqual({ instanceId: 'inst.1', mapId: MAP_STARTING_LANDS });
    expect(b).toEqual({ instanceId: 'inst.2', mapId: MAP_BOSS_ARENA_1 });
    expect(allocator.getInstance(a)).toEqual({ ref: a, createdAtMs: 1010, occupants: ['a'] });
    expect(allocator.getInstance(b)?.createdAtMs).toBe(1020);
  });

  it('mỗi assign tạo Instance mới và release huỷ Instance cũ', () => {
    const allocator = setup();
    const first = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));

    expect(allocator.holdingOf('a')).toEqual(first);
    expect(allocator.release(first, 'a')).toEqual({ ok: true });
    expect(allocator.getInstance(first)).toBeNull();
    expect(allocator.holdingOf('a')).toBeNull();
    expect(allocator.listInstances()).toEqual([]);

    const second = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));

    expect(second.instanceId).toBe('inst.2');
    // Hai người khác nhau trên cùng Map vẫn ở hai Instance riêng.
    const other = ref(allocator.assign(MAP_STARTING_LANDS, 'b'));

    expect(other.instanceId).toBe('inst.3');
    expect(allocator.listInstances(MAP_STARTING_LANDS)).toHaveLength(2);
    expect(allocator.listInstances(MAP_BOSS_ARENA_1)).toEqual([]);
  });

  it('already_assigned, unknown_map', () => {
    const allocator = setup();

    ref(allocator.assign(MAP_STARTING_LANDS, 'a'));
    expect(allocator.assign(MAP_BOSS_ARENA_1, 'a')).toEqual({ ok: false, reason: 'already_assigned' });
    expect(allocator.assign('map.khong_co', 'z')).toEqual({ ok: false, reason: 'unknown_map' });
    expect(allocator.listInstances()).toHaveLength(1);
  });

  it('release sai ref / sai người', () => {
    const allocator = setup();
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));

    expect(allocator.release({ instanceId: 'inst.99', mapId: MAP_STARTING_LANDS }, 'a')).toEqual({
      ok: false,
      reason: 'unknown_instance',
    });
    expect(allocator.release({ ...a, mapId: MAP_BOSS_ARENA_1 }, 'a')).toEqual({
      ok: false,
      reason: 'unknown_instance',
    });
    expect(allocator.release(a, 'nguoi_la')).toEqual({ ok: false, reason: 'not_occupant' });
    expect(allocator.getInstance(a)?.occupants).toEqual(['a']);
  });

  it('truy vấn trả bản sao', () => {
    const allocator = setup();
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));

    (a as { instanceId: string }).instanceId = 'inst.hong';
    allocator.listInstances()[0].ref.instanceId = 'inst.hong';

    expect(allocator.listInstances()[0].ref.instanceId).toBe('inst.1');
    expect(allocator.holdingOf('a')?.instanceId).toBe('inst.1');
  });
});

describe('localInstanceAllocator: shared capacity > 1', () => {
  const shared = (allocation: 'fill_first' | 'balanced', extra: Partial<InstancePolicy> = {}) =>
    makeWorld({ mode: 'shared', capacity: 3, allocation, ...extra });

  it('fill_first: dồn vào Instance nhiều người nhất còn chỗ; hết chỗ thì tạo mới', () => {
    const allocator = setup(shared('fill_first'));
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));
    const b = ref(allocator.assign(MAP_STARTING_LANDS, 'b'));
    const c = ref(allocator.assign(MAP_STARTING_LANDS, 'c'));
    const d = ref(allocator.assign(MAP_STARTING_LANDS, 'd'));

    expect([b, c]).toEqual([a, a]);
    expect(d.instanceId).toBe('inst.2');
    expect(allocator.getInstance(a)?.occupants).toEqual(['a', 'b', 'c']);

    // a rời → inst.1 có 2, inst.2 có 1: fill_first chọn inst.1 (nhiều hơn).
    allocator.release(a, 'a');
    expect(ref(allocator.assign(MAP_STARTING_LANDS, 'e'))).toEqual(a);
  });

  it('balanced: vào Instance ít người nhất; hòa theo thứ tự tạo', () => {
    const allocator = setup(shared('balanced'));
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));
    // Tạo Instance thứ hai bằng hint không hợp lệ không được; dùng đầy chỗ để buộc tạo mới.
    ref(allocator.assign(MAP_STARTING_LANDS, 'b'));
    ref(allocator.assign(MAP_STARTING_LANDS, 'c'));

    const d = ref(allocator.assign(MAP_STARTING_LANDS, 'd'));

    expect(d.instanceId).not.toBe(a.instanceId);

    // inst.1: 3 người (đầy), inst.2: 1 người → người kế vào inst.2 (ít nhất còn chỗ).
    expect(ref(allocator.assign(MAP_STARTING_LANDS, 'e'))).toEqual(d);

    // inst.1 rời 2 người → inst.1: 1, inst.2: 2 → balanced chọn inst.1.
    allocator.release(a, 'a');
    allocator.release(a, 'b');
    expect(ref(allocator.assign(MAP_STARTING_LANDS, 'f'))).toEqual(a);

    // Hòa (inst.1: 2, inst.2: 2) → Instance tạo trước.
    expect(ref(allocator.assign(MAP_STARTING_LANDS, 'g'))).toEqual(a);
  });

  it('hint.preferInstanceId được ưu tiên khi còn chỗ và đúng Map; ngược lại bị bỏ qua', () => {
    const allocator = setup(shared('fill_first'));
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));

    ref(allocator.assign(MAP_STARTING_LANDS, 'b'));
    ref(allocator.assign(MAP_STARTING_LANDS, 'c'));

    const d = ref(allocator.assign(MAP_STARTING_LANDS, 'd')); // inst.2, 1 người

    // fill_first sẽ chọn inst.2 (duy nhất còn chỗ) hoặc inst.1 sau khi có chỗ; thử hint ép inst.2 sau khi inst.1 có chỗ.
    allocator.release(a, 'a');
    allocator.release(a, 'b'); // inst.1: 1 người, inst.2: 1 người, hòa → fill_first chọn inst.1
    expect(ref(allocator.assign(MAP_STARTING_LANDS, 'e', { preferInstanceId: d.instanceId }))).toEqual(d);

    // hint trỏ Instance đầy / không tồn tại / Map khác → bỏ qua, không lỗi.
    const full = ref(allocator.assign(MAP_STARTING_LANDS, 'f', { preferInstanceId: 'inst.99' }));

    expect(['inst.1', 'inst.2']).toContain(full.instanceId);
  });

  it('shared nhưng capacity 1 vẫn tạo mới mỗi lần', () => {
    const allocator = setup(makeWorld({ mode: 'shared', capacity: 1 }));
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));
    const b = ref(allocator.assign(MAP_STARTING_LANDS, 'b'));

    expect(a.instanceId).not.toBe(b.instanceId);
  });

  it('chỉ gộp trong đúng Map', () => {
    const allocator = setup(shared('fill_first'));
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));
    const arena = ref(allocator.assign(MAP_BOSS_ARENA_1, 'b'));

    expect(arena.mapId).toBe(MAP_BOSS_ARENA_1);
    expect(arena.instanceId).not.toBe(a.instanceId);
  });

  it('persistent giữ Instance trống; ephemeral huỷ', () => {
    const allocator = setup(shared('fill_first', { persistence: 'persistent', idleTtlMs: 5000 }));
    const a = ref(allocator.assign(MAP_STARTING_LANDS, 'a'));

    expect(allocator.release(a, 'a')).toEqual({ ok: true });
    expect(allocator.getInstance(a)).toEqual({ ref: a, createdAtMs: 1010, occupants: [] });
    // Người kế tiếp tái dùng Instance trống còn đó (fill_first, còn chỗ).
    expect(ref(allocator.assign(MAP_STARTING_LANDS, 'b'))).toEqual(a);

    const eph = setup(shared('fill_first'));
    const x = ref(eph.assign(MAP_STARTING_LANDS, 'x'));

    eph.release(x, 'x');
    expect(eph.getInstance(x)).toBeNull();
  });
});
