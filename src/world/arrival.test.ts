import { describe, expect, it } from 'vitest';

import {
  CONN_VILLAGE_TO_ARENA,
  MAIN_DEFAULT_SPAWN,
  MAP_BOSS_ARENA_1,
  MAP_STARTING_LANDS,
  WORLD,
} from '../config/worldConfig';
import { resolveArrival } from './arrival';
import type { MapDef } from './worldGraph';

const MAIN = WORLD.maps.find((map) => map.id === MAP_STARTING_LANDS) as MapDef;
const ARENA = WORLD.maps.find((map) => map.id === MAP_BOSS_ARENA_1) as MapDef;

function withSpawns(map: MapDef, playerSpawns: MapDef['playerSpawns']): MapDef {
  return { ...map, playerSpawns };
}

describe('resolveArrival', () => {
  it('dữ liệu thật: default trả điểm spawn của map', () => {
    expect(resolveArrival(MAIN, { spawnId: 'default' })).toEqual({
      spawnId: 'default',
      point: { ...MAIN_DEFAULT_SPAWN },
    });
  });

  it('thứ tự: fromPortal → spawnId → default', () => {
    const map = withSpawns(MAIN, {
      default: { x: 1, y: 1 },
      'anchor.gate': { x: 2, y: 2 },
      [`fromPortal:${CONN_VILLAGE_TO_ARENA}`]: { x: 3, y: 3 },
    });

    expect(resolveArrival(map, { spawnId: 'anchor.gate', connectionId: CONN_VILLAGE_TO_ARENA })).toEqual({
      spawnId: `fromPortal:${CONN_VILLAGE_TO_ARENA}`,
      point: { x: 3, y: 3 },
    });
    expect(resolveArrival(map, { spawnId: 'anchor.gate' })).toEqual({ spawnId: 'anchor.gate', point: { x: 2, y: 2 } });
    // connectionId không có điểm riêng → rơi về spawnId.
    expect(resolveArrival(map, { spawnId: 'anchor.gate', connectionId: 'conn.khac' })).toEqual({
      spawnId: 'anchor.gate',
      point: { x: 2, y: 2 },
    });
    // spawnId không có → default.
    expect(resolveArrival(map, { spawnId: 'anchor.khong_co', connectionId: 'conn.khac' })).toEqual({
      spawnId: 'default',
      point: { x: 1, y: 1 },
    });
  });

  it('kẹp theo map.size (Arena nhỏ hơn map chính)', () => {
    expect(ARENA.size.width).toBeLessThan(MAIN.size.width);

    const map = withSpawns(ARENA, { default: { x: MAIN.size.width, y: MAIN.size.height }, 'anchor.neg': { x: -50, y: -1 } });

    expect(resolveArrival(map, { spawnId: 'default' }).point).toEqual({
      x: ARENA.size.width,
      y: ARENA.size.height,
    });
    expect(resolveArrival(map, { spawnId: 'anchor.neg' }).point).toEqual({ x: 0, y: 0 });
  });

  it('trả bản sao Point (không dùng chung đối tượng với dữ liệu map)', () => {
    const result = resolveArrival(MAIN, { spawnId: 'default' });

    expect(result.point).not.toBe(MAIN.playerSpawns.default);
    (result.point as { x: number }).x = -1;
    expect(MAIN.playerSpawns.default).toEqual({ ...MAIN_DEFAULT_SPAWN });
  });

  it("map thiếu 'default' → ném Error", () => {
    const map = withSpawns(MAIN, {});

    expect(() => resolveArrival(map, { spawnId: 'default' })).toThrow(Error);
    expect(() => resolveArrival(map, { spawnId: 'anchor.x' })).toThrow(/default/);
  });
});
