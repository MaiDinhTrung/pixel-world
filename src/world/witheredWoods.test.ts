import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { VILLAGE } from '../config/assets';
import {
  BOSS_ARENA_ENTRANCE,
  BOSS_ARENA_RETURN_COLOR,
  BOSS_ARENA_RETURN_COLOR_CSS,
} from '../config/bossArenaConfig';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/constants';
import {
  WOODS_ARRIVAL_IN_LANDS,
  WOODS_DECOR,
  WOODS_EDGE_BOUNDS,
  WOODS_ENEMY_SPAWNS,
  WOODS_ENTRANCE,
  WOODS_HEIGHT,
  WOODS_PATHS,
  WOODS_PLAYER_SPAWN,
  WOODS_POND,
  WOODS_PORTAL_COLOR,
  WOODS_PORTAL_COLOR_CSS,
  WOODS_RETURN_PORTAL,
  WOODS_TREE_POSITIONS,
  WOODS_WIDTH,
} from '../config/witheredWoodsConfig';
import {
  MAP_WITHERED_WOODS,
  WILDS_NEAR_BOUNDS,
  WORLD,
  ZONE_WOODS_DEEP,
  ZONE_WOODS_EDGE,
} from '../config/worldConfig';
import { findMap, zoneAt, type MapDef, type Point } from './worldGraph';

/**
 * P4b — Rừng Sâu: bất biến bố cục (điểm sinh, cây, cổng) và "không asset mới" (quét nguồn builder).
 * witheredWoods.ts kéo Phaser nên chỉ đọc nguồn, không import.
 */

const WOODS = findMap(WORLD, MAP_WITHERED_WOODS) as MapDef;
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const read = (file: string): string => readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');

/** Lấy các cặp {x, y} trong khối `const NAME ... = [ ... ];` của nguồn town.ts (không import Phaser). */
function pointsInBlock(source: string, name: string): Point[] {
  const start = source.indexOf(`const ${name}`);
  const end = source.indexOf('\n]', start);

  expect(start, name).toBeGreaterThanOrEqual(0);

  return [...source.slice(start, end).matchAll(/x:\s*(\d+),\s*(?:y|baseY):\s*(\d+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

describe('Rừng Sâu: điểm sinh quái', () => {
  it('≥ 8 điểm, mỗi vùng ≥ 4, chia đều; mọi điểm trong map', () => {
    const edge = WOODS_ENEMY_SPAWNS.filter((p) => zoneAt(WOODS, p.x, p.y)?.id === ZONE_WOODS_EDGE);
    const deep = WOODS_ENEMY_SPAWNS.filter((p) => zoneAt(WOODS, p.x, p.y)?.id === ZONE_WOODS_DEEP);

    expect(WOODS_ENEMY_SPAWNS.length).toBeGreaterThanOrEqual(8);
    expect(edge.length).toBeGreaterThanOrEqual(4);
    expect(deep.length).toBeGreaterThanOrEqual(4);
    expect(edge.length).toBe(deep.length);

    for (const p of WOODS_ENEMY_SPAWNS) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(WOODS_WIDTH);
      expect(p.y).toBeLessThan(WOODS_HEIGHT);
    }
  });

  it('mọi điểm cách điểm xuất hiện và cổng về ≥ 350 px', () => {
    for (const p of WOODS_ENEMY_SPAWNS) {
      expect(dist(p, WOODS_PLAYER_SPAWN), `(${p.x},${p.y})`).toBeGreaterThanOrEqual(350);
      expect(dist(p, WOODS_RETURN_PORTAL), `(${p.x},${p.y})`).toBeGreaterThanOrEqual(350);
    }
  });

  it('Bìa Rừng là nửa Nam đúng như dữ liệu vùng', () => {
    expect(WOODS.zones[0].bounds).toEqual(WOODS_EDGE_BOUNDS);
    expect(WOODS_EDGE_BOUNDS.y + WOODS_EDGE_BOUNDS.height).toBe(WOODS_HEIGHT);
    expect(WOODS_EDGE_BOUNDS.y * 2).toBe(WOODS_HEIGHT);
  });
});

describe('Rừng Sâu: bố cục', () => {
  it('điểm xuất hiện lệch cổng về ≥ 120 px (không chạm lại ngay), cả hai trong Bìa Rừng', () => {
    expect(dist(WOODS_PLAYER_SPAWN, WOODS_RETURN_PORTAL)).toBeGreaterThanOrEqual(120);
    expect(zoneAt(WOODS, WOODS_PLAYER_SPAWN.x, WOODS_PLAYER_SPAWN.y)?.id).toBe(ZONE_WOODS_EDGE);
    expect(zoneAt(WOODS, WOODS_RETURN_PORTAL.x, WOODS_RETURN_PORTAL.y)?.id).toBe(ZONE_WOODS_EDGE);
  });

  it('cây không chặn lối đi, hồ, điểm sinh, điểm xuất hiện và cổng', () => {
    for (const tree of WOODS_TREE_POSITIONS) {
      const label = `cây (${tree.x},${tree.y})`;

      expect(tree.x, label).toBeGreaterThanOrEqual(0);
      expect(tree.x, label).toBeLessThanOrEqual(WOODS_WIDTH);
      expect(tree.y, label).toBeLessThanOrEqual(WOODS_HEIGHT);

      // Vật cản cây: 26×14 tại (x, y - 8) — không chạm dải lối đi (nới 8 px).
      for (const path of WOODS_PATHS) {
        const overlaps =
          tree.x + 13 + 8 > path.x &&
          tree.x - 13 - 8 < path.x + path.width &&
          tree.y - 1 + 8 > path.y &&
          tree.y - 15 - 8 < path.y + path.height;

        expect(overlaps, `${label} chồng lối đi`).toBe(false);
      }

      const inPond =
        tree.x + 13 > WOODS_POND.x &&
        tree.x - 13 < WOODS_POND.x + WOODS_POND.width &&
        tree.y - 1 > WOODS_POND.y &&
        tree.y - 15 < WOODS_POND.y + WOODS_POND.height;

      expect(inPond, `${label} trong hồ`).toBe(false);

      for (const p of WOODS_ENEMY_SPAWNS) {
        expect(dist(tree, p), `${label} sát điểm sinh (${p.x},${p.y})`).toBeGreaterThanOrEqual(110);
      }

      expect(dist(tree, WOODS_PLAYER_SPAWN), label).toBeGreaterThanOrEqual(200);
      expect(dist(tree, WOODS_RETURN_PORTAL), label).toBeGreaterThanOrEqual(200);
    }
  });

  it('điểm sinh quái không nằm trong hồ', () => {
    for (const p of WOODS_ENEMY_SPAWNS) {
      const inPond =
        p.x >= WOODS_POND.x - 60 &&
        p.x <= WOODS_POND.x + WOODS_POND.width + 60 &&
        p.y >= WOODS_POND.y - 60 &&
        p.y <= WOODS_POND.y + WOODS_POND.height + 60;

      expect(inPond, `(${p.x},${p.y})`).toBe(false);
    }
  });

  it('số vật thể Rừng (cây + trang trí) ≤ số vật thể của làng (cây + prop + trang trí + nhà)', () => {
    const town = read('./town.ts');
    const villageCount =
      pointsInBlock(town, 'TREES').length +
      pointsInBlock(town, 'PROPS').length +
      pointsInBlock(town, 'DECOR').length +
      pointsInBlock(town, 'BUILDINGS').length;

    expect(WOODS_TREE_POSITIONS.length + WOODS_DECOR.length).toBeLessThanOrEqual(villageCount);
  });
});

describe('Rừng Sâu: cổng ở map chính', () => {
  it('cổng Rừng trong Hoang Địa Sâu (ngoài WILDS_NEAR_BOUNDS), trong map, cách mọi ENEMY_SPAWNS của làng ≥ 300 px', () => {
    const near = WILDS_NEAR_BOUNDS;
    const outsideNear =
      WOODS_ENTRANCE.x < near.x ||
      WOODS_ENTRANCE.x > near.x + near.width ||
      WOODS_ENTRANCE.y < near.y ||
      WOODS_ENTRANCE.y > near.y + near.height;

    expect(outsideNear).toBe(true);
    expect(WOODS_ENTRANCE.x).toBeLessThan(WORLD_WIDTH);
    expect(WOODS_ENTRANCE.y).toBeLessThan(WORLD_HEIGHT);

    const spawns = pointsInBlock(read('./town.ts'), 'ENEMY_SPAWNS');

    expect(spawns).toHaveLength(8);

    for (const p of spawns) {
      expect(dist(WOODS_ENTRANCE, p), `(${p.x},${p.y})`).toBeGreaterThanOrEqual(300);
    }

    expect(dist(WOODS_ENTRANCE, BOSS_ARENA_ENTRANCE)).toBeGreaterThan(500);
  });

  it('cổng Rừng không chồng vật cản cây của làng; điểm về lệch cổng ≥ 120 px', () => {
    for (const tree of pointsInBlock(read('./town.ts'), 'TREES')) {
      expect(dist(WOODS_ENTRANCE, tree), `cây (${tree.x},${tree.y})`).toBeGreaterThanOrEqual(100);
      expect(dist(WOODS_ARRIVAL_IN_LANDS, tree), `cây (${tree.x},${tree.y})`).toBeGreaterThanOrEqual(60);
    }

    expect(dist(WOODS_ARRIVAL_IN_LANDS, WOODS_ENTRANCE)).toBeGreaterThanOrEqual(120);
  });
});

describe('Rừng Sâu: không asset mới (quét nguồn)', () => {
  const builder = read('./witheredWoods.ts');

  it('không sinh texture mới (generateTexture / createCanvas / addCanvas / textures.add)', () => {
    expect(builder).not.toMatch(/generateTexture|createCanvas|addCanvas|textures\.add/);
    expect(builder).not.toMatch(/\bload\.(image|spritesheet|audio)/);
  });

  it('chỉ dùng key VILLAGE.* có sẵn và khoá vignette có sẵn', () => {
    const villageKeys = [...builder.matchAll(/VILLAGE\.(\w+)\.key/g)].map((m) => m[1]);

    expect(villageKeys.length).toBeGreaterThan(0);

    for (const key of villageKeys) {
      expect(Object.keys(VILLAGE), key).toContain(key);
    }

    // Không có chuỗi key texture tự đặt (dạng 'woods-...').
    expect(builder).not.toMatch(/['"`]woods-/);

    for (const decor of WOODS_DECOR) {
      expect(Object.keys(VILLAGE)).toContain(decor.asset);
    }
  });

  it('màu cổng Rừng = màu xanh có sẵn của cổng về (không sinh key texture cổng mới)', () => {
    expect(WOODS_PORTAL_COLOR).toBe(BOSS_ARENA_RETURN_COLOR);
    expect(WOODS_PORTAL_COLOR_CSS).toBe(BOSS_ARENA_RETURN_COLOR_CSS);
  });
});
