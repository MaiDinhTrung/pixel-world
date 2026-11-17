import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { isInsideVillage } from '../config/economyConfig';
import { MAP_BOSS_ARENA_1, WORLD } from '../config/worldConfig';
import { findMap, zoneAt, type MapDef } from '../world/worldGraph';

/**
 * Lỗi đã biết (phát hiện ở P4a): kiếm huỷ combo theo toạ độ làng CỨNG (`isInsideVillage`), nên ở góc Đông-Nam
 * Đấu Trường (trùng toạ độ `VILLAGE_ZONE`) combo bị huỷ. Nay kiếm hỏi scene vùng an toàn của Map hiện tại.
 */
const swordText = readFileSync(fileURLToPath(new URL('./SwordWeapon.ts', import.meta.url)), 'utf8');
const sceneText = readFileSync(
  fileURLToPath(new URL('../scenes/WorldScene.ts', import.meta.url)),
  'utf8',
);

describe('Kiếm dùng vùng an toàn theo Map', () => {
  it('SwordWeapon không còn dùng toạ độ làng cứng', () => {
    expect(swordText).not.toContain('isInsideVillage');
    expect(swordText).toContain('this.isSafePoint(this.player.x, this.player.y)');
  });

  it('WorldScene truyền isSafeZonePoint của Map hiện tại khi tạo kiếm', () => {
    expect(sceneText).toMatch(
      /new SwordWeapon\(\s*this,\s*this\.player,\s*\(\) => this\.getEnemies\(\),\s*\(x, y\) => this\.isSafeZonePoint\(x, y\),?\s*\)/,
    );
  });

  it('góc Đông-Nam Đấu Trường: toạ độ cứng báo "trong làng" nhưng vùng của Map báo không an toàn', () => {
    const arena = findMap(WORLD, MAP_BOSS_ARENA_1) as MapDef;
    // Điểm người chơi đứng tới được (ngoài khối góc vát Đông-Nam, trong tường dày 64; QA xác minh bossArena.ts:392-413).
    const point = { x: 1320, y: 1000 };

    expect(point.x).toBeLessThan(arena.size.width);
    expect(point.y).toBeLessThan(arena.size.height);
    expect(isInsideVillage(point.x, point.y)).toBe(true);
    expect(zoneAt(arena, point.x, point.y)?.safe === true).toBe(false);
  });
});
