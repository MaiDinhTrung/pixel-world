import { describe, expect, it } from 'vitest';

import { MAP_BOSS_ARENA_1, MAP_STARTING_LANDS } from '../config/worldConfig';
import type { InstanceRef } from '../world/instance';
import type { MapId } from '../world/worldGraph';
import { getGameInstances, type GameClockSource } from './gameInstances';

function fakeGame(time = 0): { loop: { time: number } } {
  return { loop: { time } };
}

const WHO = 'uid-1';

describe('getGameInstances', () => {
  it('cùng game cho cùng đối tượng, khác game cho đối tượng khác', () => {
    const a = fakeGame();
    const b = fakeGame();

    expect(getGameInstances(a)).toBe(getGameInstances(a));
    expect(getGameInstances(a)).not.toBe(getGameInstances(b));
  });

  it('bộ đếm id độc lập giữa hai game', () => {
    expect(getGameInstances(fakeGame()).enter(MAP_STARTING_LANDS, WHO).instanceId).toBe('inst.1');
    expect(getGameInstances(fakeGame()).enter(MAP_STARTING_LANDS, WHO).instanceId).toBe('inst.1');
  });
});

describe('enter', () => {
  it('cấp inst.1, lần hai giải phóng cái cũ và cấp inst.2', () => {
    const gi = getGameInstances(fakeGame());
    const first = gi.enter(MAP_STARTING_LANDS, WHO);

    expect(first).toEqual({ instanceId: 'inst.1', mapId: MAP_STARTING_LANDS });
    expect(gi.listInstances()).toHaveLength(1);

    const second = gi.enter(MAP_STARTING_LANDS, WHO);

    expect(second).toEqual({ instanceId: 'inst.2', mapId: MAP_STARTING_LANDS });
    expect(gi.listInstances()).toHaveLength(1);
    expect(gi.holdingOf(WHO)).toEqual(second);
  });

  it('Map không tồn tại thì ném', () => {
    const gi = getGameInstances(fakeGame());

    expect(() => gi.enter('map.khong_co' as MapId, WHO)).toThrow();
    expect(gi.listInstances()).toHaveLength(0);
  });

  it('createdAtMs lấy từ nguồn đồng hồ giả', () => {
    const game = fakeGame(1234);
    const gi = getGameInstances(game);
    const ref = gi.enter(MAP_STARTING_LANDS, WHO);

    expect(gi.getInstance(ref)?.createdAtMs).toBe(1234);

    game.loop.time = 5678;
    const next = gi.enter(MAP_STARTING_LANDS, WHO);

    expect(gi.getInstance(next)?.createdAtMs).toBe(5678);
  });
});

describe('moveTo', () => {
  it('trả from đúng và to mới, số Instance không tăng', () => {
    const gi = getGameInstances(fakeGame());
    const start = gi.enter(MAP_STARTING_LANDS, WHO);
    const move = gi.moveTo(MAP_BOSS_ARENA_1, WHO);

    expect(move.from).toEqual(start);
    expect(move.to).toEqual({ instanceId: 'inst.2', mapId: MAP_BOSS_ARENA_1 });
    expect(gi.listInstances()).toHaveLength(1);
    expect(gi.listInstances(MAP_STARTING_LANDS)).toHaveLength(0);
  });

  it('from null khi chưa giữ Instance nào', () => {
    const gi = getGameInstances(fakeGame());
    const move = gi.moveTo(MAP_BOSS_ARENA_1, WHO);

    expect(move.from).toBeNull();
    expect(gi.listInstances()).toHaveLength(1);
  });
});

describe('resolve', () => {
  it('vé khớp thì dùng đúng ref đã cấp, không cấp mới', () => {
    const gi = getGameInstances(fakeGame());

    gi.enter(MAP_STARTING_LANDS, WHO);

    const move = gi.moveTo(MAP_BOSS_ARENA_1, WHO);
    const resolved = gi.resolve(MAP_BOSS_ARENA_1, WHO, move.to);

    expect(resolved).toEqual(move.to);
    expect(gi.listInstances()).toHaveLength(1);

    const again = gi.listInstances()[0];

    expect(again).toEqual(move.to);
  });

  it('vé lệch Map thì cấp mới', () => {
    const gi = getGameInstances(fakeGame());
    const move = gi.moveTo(MAP_BOSS_ARENA_1, WHO);
    const resolved = gi.resolve(MAP_STARTING_LANDS, WHO, move.to);

    expect(resolved.mapId).toBe(MAP_STARTING_LANDS);
    expect(resolved.instanceId).not.toBe(move.to.instanceId);
    expect(gi.listInstances()).toHaveLength(1);
  });

  it('vé lệch Instance thì cấp mới', () => {
    const gi = getGameInstances(fakeGame());

    gi.moveTo(MAP_BOSS_ARENA_1, WHO);

    const stale: InstanceRef = { instanceId: 'inst.99', mapId: MAP_BOSS_ARENA_1 };
    const resolved = gi.resolve(MAP_BOSS_ARENA_1, WHO, stale);

    expect(resolved.instanceId).not.toBe('inst.99');
    expect(resolved.instanceId).toBe('inst.2');
    expect(gi.listInstances()).toHaveLength(1);
  });

  it('không có vé thì như enter', () => {
    const gi = getGameInstances(fakeGame());
    const ref = gi.resolve(MAP_STARTING_LANDS, WHO, null);

    expect(ref).toEqual({ instanceId: 'inst.1', mapId: MAP_STARTING_LANDS });
  });
});

describe('leave', () => {
  it('idempotent và không ném với ref lạ', () => {
    const gi = getGameInstances(fakeGame());
    const ref = gi.enter(MAP_STARTING_LANDS, WHO);

    gi.leave(ref, WHO);
    expect(gi.listInstances()).toHaveLength(0);
    expect(gi.holdingOf(WHO)).toBeNull();

    expect(() => gi.leave(ref, WHO)).not.toThrow();
    expect(() => gi.leave({ instanceId: 'inst.77', mapId: MAP_BOSS_ARENA_1 }, WHO)).not.toThrow();
    expect(() => gi.leave(ref, 'nguoi-la')).not.toThrow();
  });

  it('chuỗi enter -> moveTo -> leave kết thúc với listInstances rỗng', () => {
    const gi = getGameInstances(fakeGame());

    gi.enter(MAP_STARTING_LANDS, WHO);

    const move = gi.moveTo(MAP_BOSS_ARENA_1, WHO);

    gi.leave(move.to, WHO);
    expect(gi.listInstances()).toEqual([]);
  });

  it('qua cổng nhiều lần không rò Instance', () => {
    const gi = getGameInstances(fakeGame());
    let held = gi.enter(MAP_STARTING_LANDS, WHO);

    for (let i = 0; i < 20; i += 1) {
      const target = i % 2 === 0 ? MAP_BOSS_ARENA_1 : MAP_STARTING_LANDS;
      const move = gi.moveTo(target, WHO);

      held = gi.resolve(target, WHO, move.to);
      expect(gi.listInstances()).toHaveLength(1);
    }

    gi.leave(held, WHO);
    expect(gi.listInstances()).toHaveLength(0);
  });
});

describe('kiểu nguồn đồng hồ', () => {
  it('chấp nhận đối tượng cấu trúc, không cần Phaser', () => {
    const source: GameClockSource = { loop: { time: 1 } };

    expect(getGameInstances(source).listInstances()).toEqual([]);
  });
});
