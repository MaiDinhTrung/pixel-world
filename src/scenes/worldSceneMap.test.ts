import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SCENE_KEYS } from '../config/constants';
import { isInsideVillage, VILLAGE_ZONE } from '../config/economyConfig';
import { MAP_BOSS_ARENA_1, MAP_STARTING_LANDS, WORLD } from '../config/worldConfig';
import { findMap, zoneAt, type MapDef } from '../world/worldGraph';

/** P4a: một scene map chung (`WorldScene`) — khoá nguồn + tương đương vùng an toàn theo dữ liệu. */
const text = readFileSync(fileURLToPath(new URL('./WorldScene.ts', import.meta.url)), 'utf8');
const gameConfigText = readFileSync(
  fileURLToPath(new URL('../config/gameConfig.ts', import.meta.url)),
  'utf8',
);

const MAIN = findMap(WORLD, MAP_STARTING_LANDS) as MapDef;
const ARENA = findMap(WORLD, MAP_BOSS_ARENA_1) as MapDef;

/** Đoạn thân phương thức (từ khai báo tới dòng `  }` đóng đầu tiên ở thụt lề 2). */
function methodBody(signature: string): string {
  const start = text.indexOf(signature);

  expect(start).toBeGreaterThan(-1);

  // Chấp nhận cả CRLF lẫn LF.
  const close = /\r?\n {2}\}\r?\n/g;

  close.lastIndex = start;

  const end = close.exec(text)?.index ?? -1;

  expect(end).toBeGreaterThan(start);

  return text.slice(start, end);
}

describe('P4a: một scene map, Map do dữ liệu quyết định', () => {
  it('mọi Map chạy trong SCENE_KEYS.world; không còn BossArenaScene/khoá bossArena', () => {
    expect(WORLD.maps.every((map) => map.sceneKey === SCENE_KEYS.world)).toBe(true);
    expect(Object.keys(SCENE_KEYS)).not.toContain('bossArena');
    expect(text).not.toContain('BossArenaScene');
    expect(gameConfigText).not.toContain('BossArenaScene');
    const sceneList = /scene:\s*\[([^\]]*)\]/.exec(gameConfigText)?.[1] ?? '';

    expect(sceneList.match(/\bWorldScene\b/g)?.length).toBe(1); // đúng một scene map được đăng ký
  });

  it('init đọc mapId và rơi về MAP_STARTING_LANDS', () => {
    const init = methodBody('  init(data?:');

    expect(init).toMatch(/mapId\?: unknown/);
    expect(init).toContain('findMap(WORLD, data.mapId');
    expect(init).toContain(': MAP_STARTING_LANDS');
    expect(init).toContain('this.mapId =');
  });

  it('startPortalTravel truyền mapId + ticket + clock (không run)', () => {
    const start = text.indexOf('private startPortalTravel');
    const end = text.indexOf('private updatePortalVisual');
    const call = /scene\.start\(([^)]*)\)/.exec(text.slice(start, end));
    const args = call?.[1] ?? '';

    expect(args).toMatch(/\bmapId:\s*targetMap\.id\b/);
    expect(args).toMatch(/\bticket\b/);
    expect(args).toMatch(/\bclock\s*:/);
    expect(args).not.toMatch(/\brun\s*[:,]/);
  });

  it('restartRun truyền mapId lấy từ deathRespawn', () => {
    const body = methodBody('private restartRun()');

    expect(body).toContain('this.getMapDef().deathRespawn.mapId');
    expect(body).toMatch(/scene\.restart\(\{ characterId: this\.characterId, mapId: respawnMap\.id \}\)/);
  });

  it("update đẩy quái khỏi vùng sạch cổng chỉ khi kind === 'boss'", () => {
    const body = methodBody('  update(time: number, delta: number): void {');

    expect(body).toMatch(
      /if \(this\.getMapDef\(\)\.kind === 'boss'\) \{\s*this\.keepEnemiesOutOfPortalZone\(\);/,
    );
  });

  it('các khác biệt Arena đọc từ dữ liệu MapDef / hồ sơ builder', () => {
    expect(methodBody('private get inBossArena()')).toContain("kind === 'boss'");
    expect(methodBody('private buildMap()')).toContain('.build(this, this.obstacles)');
    expect(methodBody('private getCameraBounds()')).toContain('cameraBounds ?? this.getWorldBounds()');
    expect(methodBody('private createLighting()')).toContain("lighting === 'day_night'");
    expect(methodBody('private createDayNightControl()')).toContain("lighting === 'day_night'");
    expect(methodBody('private isSafeZonePoint(')).toContain('?.safe === true');
    expect(methodBody('private getMaxAliveEnemies(')).toContain('maxAliveCap');
    expect(methodBody('private getBossSpawnPoint()')).toContain('bossSpawnPoint');
    expect(text).not.toMatch(/extends WorldScene/);
  });
});

describe('P4a A6: zoneAt(...).safe tương đương isInsideVillage', () => {
  it('lưới phủ map chính (bước 40 px, gồm 4 cạnh và 4 góc làng) cho cùng kết quả', () => {
    const xs = new Set<number>();
    const ys = new Set<number>();

    for (let x = 0; x <= MAIN.size.width; x += 40) {
      xs.add(x);
    }

    for (let y = 0; y <= MAIN.size.height; y += 40) {
      ys.add(y);
    }

    // Cạnh làng và lân cận ±1 px (biên tính cả cạnh).
    for (const edge of [VILLAGE_ZONE.x, VILLAGE_ZONE.x + VILLAGE_ZONE.width]) {
      xs.add(edge - 1).add(edge).add(edge + 1);
    }

    for (const edge of [VILLAGE_ZONE.y, VILLAGE_ZONE.y + VILLAGE_ZONE.height]) {
      ys.add(edge - 1).add(edge).add(edge + 1);
    }

    let checked = 0;

    for (const x of xs) {
      for (const y of ys) {
        expect(zoneAt(MAIN, x, y)?.safe === true).toBe(isInsideVillage(x, y));
        checked += 1;
      }
    }

    expect(checked).toBeGreaterThan(5000);

    const corners = [
      [VILLAGE_ZONE.x, VILLAGE_ZONE.y],
      [VILLAGE_ZONE.x + VILLAGE_ZONE.width, VILLAGE_ZONE.y],
      [VILLAGE_ZONE.x, VILLAGE_ZONE.y + VILLAGE_ZONE.height],
      [VILLAGE_ZONE.x + VILLAGE_ZONE.width, VILLAGE_ZONE.y + VILLAGE_ZONE.height],
    ] as const;

    for (const [x, y] of corners) {
      expect(zoneAt(MAIN, x, y)?.safe).toBe(true);
      expect(isInsideVillage(x, y)).toBe(true);
    }
  });

  it('mọi điểm Arena không an toàn', () => {
    for (let x = -40; x <= ARENA.size.width + 40; x += 40) {
      for (let y = -40; y <= ARENA.size.height + 40; y += 40) {
        expect(zoneAt(ARENA, x, y)?.safe === true).toBe(false);
      }
    }
  });
});
