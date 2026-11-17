import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DEFAULT_INSTANCE_POLICY, MAP_BOSS_ARENA_1, MAP_STARTING_LANDS, WORLD } from '../config/worldConfig';
import {
  createTravelTicket,
  isTravelTicket,
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

describe('isTravelTicket', () => {
  const from: InstanceRef = { instanceId: 'inst.1', mapId: MAP_STARTING_LANDS };
  const to: InstanceRef = { instanceId: 'inst.2', mapId: MAP_BOSS_ARENA_1 };

  function validTicket(): ReturnType<typeof createTravelTicket> {
    return createTravelTicket({
      characterUid: 'uid-1',
      from,
      to: { instance: to, spawnPoint: { x: 5, y: 6 } },
      carry: makeCarry(),
    });
  }

  it('chấp nhận vé do createTravelTicket tạo', () => {
    expect(isTravelTicket(validTicket())).toBe(true);
  });

  it('chấp nhận from null, vitals null, mảng và cooldown rỗng', () => {
    const ticket = createTravelTicket({
      characterUid: 'uid-1',
      from: null,
      to: { instance: to, spawnPoint: { x: 0, y: 0 } },
      carry: { vitals: null, skillCooldownUntil: {}, dashChargeReadyAt: [], dashReadyAt: 0 },
    });

    expect(isTravelTicket(ticket)).toBe(true);
  });

  it('từ chối giá trị không phải đối tượng', () => {
    expect(isTravelTicket(null)).toBe(false);
    expect(isTravelTicket(undefined)).toBe(false);
    expect(isTravelTicket([])).toBe(false);
    expect(isTravelTicket('ticket')).toBe(false);
    expect(isTravelTicket(42)).toBe(false);
  });

  it('từ chối vé thiếu hoặc hỏng trường', () => {
    const cases: Array<[string, (t: Record<string, any>) => void]> = [
      ['thiếu carry', (t) => delete t.carry],
      ['thiếu to.instance', (t) => delete t.to.instance],
      ['instanceId sai tiền tố', (t) => (t.to.instance.instanceId = 'x.2')],
      ['mapId sai tiền tố', (t) => (t.from.mapId = 'starting')],
      ['spawnPoint NaN', (t) => (t.to.spawnPoint.x = NaN)],
      ['spawnPoint Infinity', (t) => (t.to.spawnPoint.y = Infinity)],
      ['dashReadyAt không số', (t) => (t.carry.dashReadyAt = '300')],
      ['characterUid rỗng', (t) => (t.characterUid = '')],
      ['vitals thiếu trường', (t) => delete t.carry.vitals.armor],
      ['cooldown không số', (t) => (t.carry.skillCooldownUntil.fireball = 'a')],
      ['dashChargeReadyAt không phải mảng', (t) => (t.carry.dashChargeReadyAt = {})],
    ];

    for (const [name, mutate] of cases) {
      const ticket = JSON.parse(JSON.stringify(validTicket())) as Record<string, any>;

      mutate(ticket);
      expect(isTravelTicket(ticket), name).toBe(false);
    }
  });

  it('khoá nguồn: WorldScene truyền ticket/clock qua scene.start, không còn run', () => {
    const text = readFileSync(new URL('../scenes/WorldScene.ts', import.meta.url), 'utf8');
    const startCalls = text.match(/this\.scene\.start\([^)]*\)/g) ?? [];
    const travel = startCalls.filter((call) => call.includes('arrivalConnectionId'));

    expect(travel.length).toBeGreaterThan(0);

    for (const call of travel) {
      expect(call).toContain('ticket');
      expect(call).toContain('clock');
    }

    expect(text).not.toMatch(/\brun,|\brun:/);
  });
});
