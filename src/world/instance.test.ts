import { describe, expect, it } from 'vitest';

import { DEFAULT_INSTANCE_POLICY, MAP_BOSS_ARENA_1, MAP_STARTING_LANDS, WORLD } from '../config/worldConfig';
import {
  createTravelTicket,
  resolveInstancePolicy,
  type CharacterCarry,
  type InstanceRef,
} from './instance';

function makeCarry(): CharacterCarry {
  return {
    vitals: { health: 10, armor: 3, energy: 50 },
    skillCooldownUntil: { fireball: 1234 },
    dashChargeReadyAt: [100, 200],
    dashReadyAt: 300,
  };
}

describe('DEFAULT_INSTANCE_POLICY', () => {
  it('khoá giá trị khởi điểm', () => {
    expect(DEFAULT_INSTANCE_POLICY).toEqual({
      mode: 'private',
      capacity: 1,
      persistence: 'ephemeral',
      allocation: 'fill_first',
      idleTtlMs: 0,
    });
  });
});

describe('resolveInstancePolicy', () => {
  it('map không khai báo instance → bằng mặc định (đối tượng mới)', () => {
    const resolved = resolveInstancePolicy({});

    expect(resolved).toEqual(DEFAULT_INSTANCE_POLICY);
    expect(resolved).not.toBe(DEFAULT_INSTANCE_POLICY);
  });

  it('dữ liệu thật: cả hai map dùng mặc định', () => {
    for (const map of WORLD.maps) {
      expect(resolveInstancePolicy(map), map.id).toEqual(DEFAULT_INSTANCE_POLICY);
    }
  });

  it('ghi đè từng phần, trường thiếu lấy mặc định', () => {
    expect(resolveInstancePolicy({ instance: { mode: 'shared', capacity: 4 } })).toEqual({
      ...DEFAULT_INSTANCE_POLICY,
      mode: 'shared',
      capacity: 4,
    });
    expect(resolveInstancePolicy({ instance: { idleTtlMs: 500 } }).idleTtlMs).toBe(500);
  });

  it('không sửa đối tượng đầu vào; nhận defaults tuỳ chọn', () => {
    const map = { instance: { capacity: 2 } };
    const defaults = { ...DEFAULT_INSTANCE_POLICY };
    const before = structuredClone({ map, defaults });

    resolveInstancePolicy(map, defaults);

    expect({ map, defaults }).toEqual(before);
    expect(resolveInstancePolicy({}, { ...defaults, capacity: 9 }).capacity).toBe(9);
  });
});

describe('createTravelTicket', () => {
  const from: InstanceRef = { instanceId: 'inst.1', mapId: MAP_STARTING_LANDS };
  const to: InstanceRef = { instanceId: 'inst.2', mapId: MAP_BOSS_ARENA_1 };

  it('JSON-hoá nguyên vẹn', () => {
    const ticket = createTravelTicket({
      characterUid: 'uid-1',
      from,
      to: { instance: to, spawnPoint: { x: 5, y: 6 } },
      carry: makeCarry(),
    });

    expect(JSON.parse(JSON.stringify(ticket))).toEqual(ticket);

    const first = createTravelTicket({
      characterUid: 'uid-1',
      from: null,
      to: { instance: to, spawnPoint: { x: 5, y: 6 } },
      carry: { ...makeCarry(), vitals: null },
    });

    expect(first.from).toBeNull();
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('sao chép sâu: sửa đối tượng gốc sau khi tạo vé thì vé không đổi', () => {
    const carry = makeCarry();
    const spawnPoint = { x: 5, y: 6 };
    const src = { characterUid: 'uid-1', from: { ...from }, to: { instance: { ...to }, spawnPoint }, carry };
    const ticket = createTravelTicket(src);
    const snapshot = structuredClone(ticket);

    carry.vitals!.health = 999;
    carry.skillCooldownUntil.fireball = 0;
    carry.skillCooldownUntil.other = 1;
    carry.dashChargeReadyAt.push(1);
    carry.dashReadyAt = 77;
    spawnPoint.x = -1;
    src.from.mapId = 'map.khac';
    src.to.instance.instanceId = 'inst.99';

    expect(ticket).toEqual(snapshot);
  });

  it('khoá cấp 1 của vé và carry khớp whitelist; carry không chứa đồng hồ độ khó', () => {
    const ticket = createTravelTicket({
      characterUid: 'uid-1',
      from: null,
      to: { instance: to, spawnPoint: { x: 1, y: 2 } },
      carry: makeCarry(),
    });

    expect(Object.keys(ticket).sort()).toEqual(['carry', 'characterUid', 'from', 'to']);
    expect(Object.keys(ticket.carry).sort()).toEqual([
      'dashChargeReadyAt',
      'dashReadyAt',
      'skillCooldownUntil',
      'vitals',
    ]);

    for (const key of ['runStartedAt', 'nextBossAt', 'bossNumber', 'bossReady', 'bossWarningShown']) {
      expect(key in ticket.carry, key).toBe(false);
    }
  });
});
