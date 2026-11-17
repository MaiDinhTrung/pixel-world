import { describe, expect, it, vi } from 'vitest';

// mapBuilders.ts chỉ dùng Phaser làm kiểu; hai builder thật kéo Phaser nên mô phỏng (không dựng gì thật ở đây).
vi.mock('phaser', () => ({ default: {} }));
vi.mock('./town', () => ({ buildTown: vi.fn(() => ({ tag: 'town' })) }));
vi.mock('./bossArena', () => ({ buildBossArena: vi.fn(() => ({ tag: 'boss_arena' })) }));

import {
  BOSS_ARENA_BOSS_SPAWN,
  BOSS_ARENA_HEIGHT,
  BOSS_ARENA_WALL_RISE,
  BOSS_ARENA_WIDTH,
} from '../config/bossArenaConfig';
import { WORLD } from '../config/worldConfig';
import { buildBossArena } from './bossArena';
import { getMapBuilder, MAP_BUILDERS } from './mapBuilders';
import { buildTown } from './town';

describe('MAP_BUILDERS', () => {
  it('mọi builderId trong WORLD.maps đều có builder', () => {
    for (const map of WORLD.maps) {
      expect(Object.keys(MAP_BUILDERS)).toContain(map.builderId);
      expect(() => getMapBuilder(map.builderId)).not.toThrow();
    }
  });

  it('builderId không có → ném lỗi (kể cả khoá của Object.prototype)', () => {
    expect(() => getMapBuilder('khong_co')).toThrow(/khong_co/);
    expect(() => getMapBuilder('toString')).toThrow();
  });

  it('build gọi đúng hàm dựng với scene + obstacles', () => {
    const scene = {} as never;
    const obstacles = {} as never;

    expect(getMapBuilder('town').build(scene, obstacles)).toEqual({ tag: 'town' });
    expect(buildTown).toHaveBeenCalledWith(scene, obstacles);
    expect(getMapBuilder('boss_arena').build(scene, obstacles)).toEqual({ tag: 'boss_arena' });
    expect(buildBossArena).toHaveBeenCalledWith(scene, obstacles);
  });

  it('hồ sơ boss_arena: khung camera chừa đỉnh tường Bắc, điểm Boss cố định', () => {
    const arena = getMapBuilder('boss_arena');

    expect(arena.cameraBounds).toEqual({
      x: 0,
      y: -BOSS_ARENA_WALL_RISE,
      width: BOSS_ARENA_WIDTH,
      height: BOSS_ARENA_HEIGHT + BOSS_ARENA_WALL_RISE,
    });
    expect(arena.bossSpawnPoint).toEqual(BOSS_ARENA_BOSS_SPAWN);
  });

  it('hồ sơ boss_arena trả bản sao: sửa kết quả không ảnh hưởng hằng hay lần đọc sau', () => {
    const arena = getMapBuilder('boss_arena');
    const spawn = arena.bossSpawnPoint as { x: number; y: number };
    const bounds = arena.cameraBounds as { x: number; y: number; width: number; height: number };
    const before = { ...BOSS_ARENA_BOSS_SPAWN };

    expect(spawn).not.toBe(BOSS_ARENA_BOSS_SPAWN);
    spawn.x = -1;
    bounds.y = 12345;

    expect(BOSS_ARENA_BOSS_SPAWN).toEqual(before);
    expect(arena.bossSpawnPoint).toEqual(before);
    expect(arena.cameraBounds?.y).toBe(-BOSS_ARENA_WALL_RISE);
  });

  it('hồ sơ town không có cameraBounds/bossSpawnPoint (dùng khung thế giới + thuật toán cũ)', () => {
    const town = getMapBuilder('town');

    expect(town.cameraBounds).toBeUndefined();
    expect(town.bossSpawnPoint).toBeUndefined();
  });
});
