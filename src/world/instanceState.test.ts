import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createInstanceGameplayState } from './instanceState';

const WORLD_SCENE = readFileSync(fileURLToPath(new URL('../scenes/WorldScene.ts', import.meta.url)), 'utf8');

describe('createInstanceGameplayState', () => {
  it('giá trị khởi đầu đúng 7 trường', () => {
    const s = createInstanceGameplayState();

    expect(s.spawnIndex).toBe(0);
    expect(s.zoneSpawnCounts).toBeInstanceOf(Map);
    expect(s.zoneSpawnCounts.size).toBe(0);
    expect(s.zoneSpawnPoints).toBeInstanceOf(Map);
    expect(s.zoneSpawnPoints.size).toBe(0);
    expect(s.zoneKillCounts).toBeInstanceOf(Map);
    expect(s.zoneKillCounts.size).toBe(0);
    expect(s.elitesSpawned).toBe(0);
    expect(s.lastEliteAt).toBeNull();
    expect(s.nextSpawnAt).toBe(0);
  });

  it('tập khoá khớp whitelist', () => {
    expect(Object.keys(createInstanceGameplayState()).sort()).toEqual(
      [
        'elitesSpawned',
        'lastEliteAt',
        'nextSpawnAt',
        'spawnIndex',
        'zoneKillCounts',
        'zoneSpawnCounts',
        'zoneSpawnPoints',
      ].sort(),
    );
  });

  it('hai lần gọi trả hai đối tượng độc lập', () => {
    const a = createInstanceGameplayState();
    const b = createInstanceGameplayState();

    expect(a).not.toBe(b);
    expect(a.zoneSpawnCounts).not.toBe(b.zoneSpawnCounts);
    expect(a.zoneSpawnPoints).not.toBe(b.zoneSpawnPoints);
    expect(a.zoneKillCounts).not.toBe(b.zoneKillCounts);

    a.spawnIndex = 5;
    a.elitesSpawned = 2;
    a.lastEliteAt = 123;
    a.nextSpawnAt = 999;
    a.zoneSpawnCounts.set('z', 1);
    a.zoneSpawnPoints.set('z', 2);
    a.zoneKillCounts.set('z', 3);

    expect(b.spawnIndex).toBe(0);
    expect(b.elitesSpawned).toBe(0);
    expect(b.lastEliteAt).toBeNull();
    expect(b.nextSpawnAt).toBe(0);
    expect(b.zoneSpawnCounts.size).toBe(0);
    expect(b.zoneSpawnPoints.size).toBe(0);
    expect(b.zoneKillCounts.size).toBe(0);
  });
});

describe('WorldScene dùng InstanceGameplayState', () => {
  it('create() gọi createInstanceGameplayState()', () => {
    const start = WORLD_SCENE.indexOf('  create(): void {');

    expect(start).toBeGreaterThan(-1);
    expect(WORLD_SCENE.slice(start, start + 600)).toContain('this.instanceState = createInstanceGameplayState();');
  });

  it('không còn khai báo 7 trường cũ trong scene', () => {
    for (const name of [
      'spawnIndex',
      'zoneSpawnCounts',
      'zoneSpawnPoints',
      'zoneKillCounts',
      'elitesSpawned',
      'lastEliteAt',
      'nextSpawnAt',
    ]) {
      expect(new RegExp(`this\\.${name}\\b`).test(WORLD_SCENE), `còn this.${name}`).toBe(false);
      expect(new RegExp(`private (readonly )?${name}\\b`).test(WORLD_SCENE), `còn khai báo ${name}`).toBe(false);
    }

    expect(WORLD_SCENE).not.toContain('resetInstanceRuntimeState');
    expect(WORLD_SCENE).toContain('resetPlayerRuntimeState');
  });
});
