import { describe, expect, it } from 'vitest';

import { VILLAGE_NPCS, isInsideVillage } from './economyConfig';
import { VILLAGE_VILLAGERS } from './villageConfig';

const MIN_NPC_GAP = 120;
const MIN_VILLAGER_GAP = 60;

describe('bố cục làng', () => {
  it('mọi NPC và dân làng nằm trong vùng làng', () => {
    for (const npc of VILLAGE_NPCS) {
      expect(isInsideVillage(npc.x, npc.y)).toBe(true);
    }

    for (const villager of VILLAGE_VILLAGERS) {
      expect(isInsideVillage(villager.x, villager.y)).toBe(true);
    }
  });

  it('id dân làng là duy nhất', () => {
    const ids = VILLAGE_VILLAGERS.map((villager) => villager.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('NPC tương tác cách nhau ít nhất 120 px', () => {
    for (let i = 0; i < VILLAGE_NPCS.length; i += 1) {
      for (let j = i + 1; j < VILLAGE_NPCS.length; j += 1) {
        const a = VILLAGE_NPCS[i];
        const b = VILLAGE_NPCS[j];

        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(MIN_NPC_GAP);
      }
    }
  });

  it('dân làng cách mọi NPC tương tác ít nhất 60 px', () => {
    for (const villager of VILLAGE_VILLAGERS) {
      for (const npc of VILLAGE_NPCS) {
        expect(Math.hypot(villager.x - npc.x, villager.y - npc.y)).toBeGreaterThanOrEqual(
          MIN_VILLAGER_GAP,
        );
      }
    }
  });

  it('mỗi NPC có marker không rỗng', () => {
    for (const npc of VILLAGE_NPCS) {
      expect(npc.marker.length).toBeGreaterThan(0);
    }
  });

  it('palette dân làng đủ 5 khóa h, f, e, c, b', () => {
    for (const villager of VILLAGE_VILLAGERS) {
      expect(Object.keys(villager.palette).sort()).toEqual(['b', 'c', 'e', 'f', 'h']);
    }
  });
});
