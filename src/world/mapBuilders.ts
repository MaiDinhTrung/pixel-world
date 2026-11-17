import type Phaser from 'phaser';

import {
  BOSS_ARENA_BOSS_SPAWN,
  BOSS_ARENA_HEIGHT,
  BOSS_ARENA_WALL_RISE,
  BOSS_ARENA_WIDTH,
} from '../config/bossArenaConfig';
import { buildBossArena } from './bossArena';
import { buildTown, type TownInfo } from './town';
import { buildWitheredWoods } from './witheredWoods';

/**
 * Registry `builderId → MapBuilder` (P4a): `WorldScene` dựng nội dung Map theo `MapDef.builderId`.
 * Hồ sơ builder chỉ chứa phần phụ thuộc cách dựng (khung camera, điểm Boss cố định); luật theo dữ liệu
 * (kind, lighting, vùng an toàn, trần quái) đọc từ `MapDef` ở `config/worldConfig.ts`.
 */
export interface MapBuilder {
  build(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup): TownInfo;
  /** Khung camera; không có = khung thế giới (0,0,size). Mỗi lần đọc trả bản sao mới. */
  readonly cameraBounds?: { x: number; y: number; width: number; height: number };
  /** Điểm sinh Boss cố định; không có = thuật toán chọn điểm sinh quái hiện tại. Mỗi lần đọc trả bản sao mới. */
  readonly bossSpawnPoint?: { x: number; y: number };
}

const TOWN_BUILDER: MapBuilder = {
  build: (scene, obstacles) => buildTown(scene, obstacles),
};

const BOSS_ARENA_BUILDER: MapBuilder = {
  build: (scene, obstacles) => buildBossArena(scene, obstacles),
  /** Chừa thêm phía trên để thấy đỉnh tường Bắc (tường vẽ nhô lên). */
  get cameraBounds() {
    return {
      x: 0,
      y: -BOSS_ARENA_WALL_RISE,
      width: BOSS_ARENA_WIDTH,
      height: BOSS_ARENA_HEIGHT + BOSS_ARENA_WALL_RISE,
    };
  },
  get bossSpawnPoint() {
    return { ...BOSS_ARENA_BOSS_SPAWN };
  },
};

/** Rừng Sâu (P4b): khung camera = khung thế giới, không điểm Boss cố định (Boss chỉ ở Arena). */
const WITHERED_WOODS_BUILDER: MapBuilder = {
  build: (scene, obstacles) => buildWitheredWoods(scene, obstacles),
};

export const MAP_BUILDERS: Readonly<Record<string, MapBuilder>> = Object.freeze({
  town: TOWN_BUILDER,
  boss_arena: BOSS_ARENA_BUILDER,
  withered_woods: WITHERED_WOODS_BUILDER,
});

/** Builder theo `MapDef.builderId`; không có → ném lỗi (dữ liệu sai = lỗi lập trình). */
export function getMapBuilder(builderId: string): MapBuilder {
  const builder = Object.prototype.hasOwnProperty.call(MAP_BUILDERS, builderId)
    ? MAP_BUILDERS[builderId]
    : undefined;

  if (!builder) {
    throw new Error(`Không có map builder cho builderId: ${builderId}`);
  }

  return builder;
}
