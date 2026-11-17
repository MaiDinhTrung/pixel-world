import { describe, expect, it } from 'vitest';

import {
  BOSS_ARENA_FADE_TO_ARENA,
  BOSS_ARENA_FADE_TO_WORLD,
  BOSS_ARENA_PORTAL_CHARGE_MS,
} from '../config/bossArenaConfig';
import { SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import {
  WOODS_ARRIVAL_IN_LANDS,
  WOODS_ENTRANCE,
  WOODS_FADE_TO_LANDS,
  WOODS_FADE_TO_WOODS,
  WOODS_PLAYER_SPAWN,
  WOODS_PORTAL_CHARGE_MS,
  WOODS_RETURN_PORTAL,
} from '../config/witheredWoodsConfig';
import {
  CONN_ARENA_TO_VILLAGE,
  CONN_LANDS_TO_WOODS,
  CONN_VILLAGE_TO_ARENA,
  CONN_WOODS_TO_LANDS,
  MAP_BOSS_ARENA_1,
  MAP_STARTING_LANDS,
  MAP_WITHERED_WOODS,
  WORLD,
  ZONE_WILDS_FAR,
} from '../config/worldConfig';
import {
  clampToMap,
  getConnectionTravelInfo,
  nearestPortal,
  resolveSceneArrival,
} from './travel';
import { findMap, requestTravel, zoneAt, type ConnectionId, type MapDef } from './worldGraph';

const MAIN = findMap(WORLD, MAP_STARTING_LANDS) as MapDef;
const ARENA = findMap(WORLD, MAP_BOSS_ARENA_1) as MapDef;

describe('getConnectionTravelInfo', () => {
  it('vào Arena: scene, màu fade, thời gian sạc lấy từ dữ liệu', () => {
    const info = getConnectionTravelInfo(WORLD, CONN_VILLAGE_TO_ARENA);

    expect(info.sceneKey).toBe(SCENE_KEYS.world);
    expect(info.targetMap.id).toBe(MAP_BOSS_ARENA_1);
    expect(info.fadeColor).toEqual(BOSS_ARENA_FADE_TO_ARENA);
    expect(info.chargeMs).toBe(BOSS_ARENA_PORTAL_CHARGE_MS);
    expect(info.chargeMs).toBe(800);
  });

  it('về làng: scene, màu fade, thời gian sạc lấy từ dữ liệu', () => {
    const info = getConnectionTravelInfo(WORLD, CONN_ARENA_TO_VILLAGE);

    expect(info.sceneKey).toBe(SCENE_KEYS.world);
    expect(info.targetMap.id).toBe(MAP_STARTING_LANDS);
    expect(info.fadeColor).toEqual(BOSS_ARENA_FADE_TO_WORLD);
    expect(info.chargeMs).toBe(BOSS_ARENA_PORTAL_CHARGE_MS);
  });

  it('connection lạ → ném lỗi', () => {
    expect(() => getConnectionTravelInfo(WORLD, 'conn.khong_co')).toThrow(/conn\.khong_co/);
  });
});

describe('resolveSceneArrival', () => {
  it('không qua cổng → điểm default, fadeColor null', () => {
    const main = resolveSceneArrival(WORLD, MAP_STARTING_LANDS, null);
    const arena = resolveSceneArrival(WORLD, MAP_BOSS_ARENA_1, null);

    expect(main.point).toEqual({ x: 1920, y: 1440 });
    expect(main.spawnId).toBe('default');
    expect(main.fadeColor).toBeNull();
    expect(arena.point).toEqual({ x: 800, y: 900 });
    expect(arena.fadeColor).toBeNull();
  });

  it('qua cổng vào Arena → default của Arena, fade đỏ thẫm', () => {
    const arrival = resolveSceneArrival(WORLD, MAP_BOSS_ARENA_1, CONN_VILLAGE_TO_ARENA);

    expect(arrival.point).toEqual({ x: 800, y: 900 });
    expect(arrival.spawnId).toBe('default');
    expect(arrival.fadeColor).toEqual(BOSS_ARENA_FADE_TO_ARENA);
  });

  it('qua cổng về làng → default của map chính, fade xanh', () => {
    const arrival = resolveSceneArrival(WORLD, MAP_STARTING_LANDS, CONN_ARENA_TO_VILLAGE);

    expect(arrival.point).toEqual({ x: 1920, y: 1440 });
    expect(arrival.spawnId).toBe('default');
    expect(arrival.fadeColor).toEqual(BOSS_ARENA_FADE_TO_WORLD);
  });

  it('connection không dẫn tới map này (hoặc không tồn tại) → default, fadeColor null', () => {
    const wrong = resolveSceneArrival(WORLD, MAP_STARTING_LANDS, CONN_VILLAGE_TO_ARENA);
    const unknown = resolveSceneArrival(WORLD, MAP_BOSS_ARENA_1, 'conn.khong_co' as ConnectionId);

    expect(wrong.point).toEqual({ x: 1920, y: 1440 });
    expect(wrong.fadeColor).toBeNull();
    expect(unknown.point).toEqual({ x: 800, y: 900 });
    expect(unknown.fadeColor).toBeNull();
  });
});

describe('P4b: đi lại Hoang Địa ↔ Rừng Sâu', () => {
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
    Math.hypot(a.x - b.x, a.y - b.y);

  it('getConnectionTravelInfo hai chiều: đúng đích, scene world, màu fade và thời gian sạc từ dữ liệu', () => {
    const go = getConnectionTravelInfo(WORLD, CONN_LANDS_TO_WOODS);
    const back = getConnectionTravelInfo(WORLD, CONN_WOODS_TO_LANDS);

    expect(go.targetMap.id).toBe(MAP_WITHERED_WOODS);
    expect(go.sceneKey).toBe(SCENE_KEYS.world);
    expect(go.fadeColor).toEqual(WOODS_FADE_TO_WOODS);
    expect(go.chargeMs).toBe(WOODS_PORTAL_CHARGE_MS);
    expect(back.targetMap.id).toBe(MAP_STARTING_LANDS);
    expect(back.sceneKey).toBe(SCENE_KEYS.world);
    expect(back.fadeColor).toEqual(WOODS_FADE_TO_LANDS);
    expect(back.chargeMs).toBe(WOODS_PORTAL_CHARGE_MS);
  });

  it('requestTravel hai chiều thành công (luôn mở, kể cả khi Boss sống)', () => {
    const facts = { bossAlive: true, bossReady: true, playerLevel: 1 };

    expect(requestTravel(WORLD, CONN_LANDS_TO_WOODS, facts)).toEqual({
      ok: true,
      to: { mapId: MAP_WITHERED_WOODS, spawnId: 'default' },
    });
    expect(requestTravel(WORLD, CONN_WOODS_TO_LANDS, facts)).toMatchObject({
      ok: true,
      to: { mapId: MAP_STARTING_LANDS },
    });
  });

  it('vào Rừng → điểm xuất hiện Rừng, lệch cổng về ≥ 120 px', () => {
    const arrival = resolveSceneArrival(WORLD, MAP_WITHERED_WOODS, CONN_LANDS_TO_WOODS);

    expect(arrival.point).toEqual(WOODS_PLAYER_SPAWN);
    expect(arrival.fadeColor).toEqual(WOODS_FADE_TO_WOODS);
    expect(dist(arrival.point, WOODS_RETURN_PORTAL)).toBeGreaterThanOrEqual(120);
  });

  it('về từ Rừng → cạnh cổng Rừng ở map chính (lệch ≥ 120 px, trong Hoang Địa Sâu), không phải giữa làng', () => {
    const arrival = resolveSceneArrival(WORLD, MAP_STARTING_LANDS, CONN_WOODS_TO_LANDS);

    expect(arrival.point).toEqual(WOODS_ARRIVAL_IN_LANDS);
    expect(arrival.spawnId).toBe(`fromPortal:${CONN_WOODS_TO_LANDS}`);
    expect(arrival.fadeColor).toEqual(WOODS_FADE_TO_LANDS);
    expect(dist(arrival.point, WOODS_ENTRANCE)).toBeGreaterThanOrEqual(120);
    expect(zoneAt(MAIN, arrival.point.x, arrival.point.y)?.id).toBe(ZONE_WILDS_FAR);
  });

  it('hồi quy: về từ Arena vẫn ra giữa làng; vào game không qua cổng vẫn ở làng', () => {
    expect(resolveSceneArrival(WORLD, MAP_STARTING_LANDS, CONN_ARENA_TO_VILLAGE).point).toEqual({ x: 1920, y: 1440 });
    expect(resolveSceneArrival(WORLD, MAP_STARTING_LANDS, null).point).toEqual({ x: 1920, y: 1440 });
  });
});

describe('clampToMap', () => {
  it('trong biên → giữ nguyên', () => {
    expect(clampToMap(MAIN, 1000, 1000, 48)).toEqual({ x: 1000, y: 1000 });
    expect(clampToMap(ARENA, 800, 500, 48)).toEqual({ x: 800, y: 500 });
  });

  it('map chính cho kết quả y hệt công thức cũ theo WORLD_WIDTH/HEIGHT', () => {
    const old = (v: number, max: number, m: number): number => Math.min(max - m, Math.max(m, v));

    for (const [x, y, m] of [
      [-10, -10, 48],
      [WORLD_WIDTH + 100, WORLD_HEIGHT + 100, 48],
      [3830, 10, 72],
      [1234, 2550, 48],
    ] as const) {
      expect(clampToMap(MAIN, x, y, m)).toEqual({
        x: old(x, WORLD_WIDTH, m),
        y: old(y, WORLD_HEIGHT, m),
      });
    }
  });

  it('Arena 1600x1088: (1590, 1080) margin 48 → (1552, 1040)', () => {
    expect(ARENA.size).toEqual({ width: 1600, height: 1088 });
    expect(clampToMap(ARENA, 1590, 1080, 48)).toEqual({ x: 1552, y: 1040 });
  });

  it('margin quá lớn → trả tâm, không ném', () => {
    expect(clampToMap(ARENA, 10, 10, 5000)).toEqual({ x: 800, y: 544 });
  });
});

describe('nearestPortal', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };

  it('trả cổng gần nhất trong bán kính (kể cả đúng bằng bán kính)', () => {
    expect(nearestPortal([a, b], 90, 0, 50)).toBe(b);
    expect(nearestPortal([a, b], 0, 50, 50)).toBe(a);
  });

  it('hòa khoảng cách → cổng đứng trước trong mảng', () => {
    expect(nearestPortal([a, b], 50, 0, 60)).toBe(a);
    expect(nearestPortal([b, a], 50, 0, 60)).toBe(b);
  });

  it('ngoài tầm hoặc rỗng → null', () => {
    expect(nearestPortal([a, b], 50, 500, 60)).toBeNull();
    expect(nearestPortal([], 0, 0, 60)).toBeNull();
  });
});
