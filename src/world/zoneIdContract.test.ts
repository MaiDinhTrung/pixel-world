import { describe, expect, it } from 'vitest';

import {
  CONN_ARENA_TO_VILLAGE,
  CONN_VILLAGE_TO_ARENA,
  MAP_BOSS_ARENA_1,
  MAP_STARTING_LANDS,
  WORLD,
  ZONE_ARENA,
  ZONE_VILLAGE,
  ZONE_WILDS_FAR,
  ZONE_WILDS_NEAR,
} from '../config/worldConfig';
import { migrateToLatest } from '../progression/saveMigration';
import { validateWorld } from './worldGraph';

/** Bảng ánh xạ id vùng cũ (tên "region.*") sang id mới (P0b: đổi tên thuần Region → Zone). */
const LEGACY_ZONE_ID_MAP = {
  'region.village': 'zone.village',
  'region.wilds_near': 'zone.wilds_near',
  'region.wilds_far': 'zone.wilds_far',
  'region.arena': 'zone.arena',
} as const;

const NEW_ZONE_CONSTANTS: Record<keyof typeof LEGACY_ZONE_ID_MAP, string> = {
  'region.village': ZONE_VILLAGE,
  'region.wilds_near': ZONE_WILDS_NEAR,
  'region.wilds_far': ZONE_WILDS_FAR,
  'region.arena': ZONE_ARENA,
};

/** Khóa cấp 1 của save v8 mặc định (đã sắp xếp). Thêm trường vùng vào save sẽ làm test này đỏ. */
const SAVE_V8_TOP_LEVEL_KEYS = [
  'bag',
  'characterUid',
  'equippedGear',
  'equippedWeapons',
  'extraSkills',
  'gems',
  'gold',
  'items',
  'level',
  'migrationLog',
  'nextItemSeq',
  'revision',
  'skillLevels',
  'skillLoadout',
  'statPoints',
  'stats',
  'version',
  'xp',
  'xpToNext',
];

describe('khóa id vùng (Zone) sau P0b', () => {
  it('giá trị id vùng đúng chính xác', () => {
    expect(ZONE_VILLAGE).toBe('zone.village');
    expect(ZONE_WILDS_NEAR).toBe('zone.wilds_near');
    expect(ZONE_WILDS_FAR).toBe('zone.wilds_far');
    expect(ZONE_ARENA).toBe('zone.arena');
  });

  it('id map và cổng giữ giá trị cũ', () => {
    expect(MAP_STARTING_LANDS).toBe('map.starting_lands');
    expect(MAP_BOSS_ARENA_1).toBe('map.boss_arena_1');
    expect(CONN_VILLAGE_TO_ARENA).toBe('conn.village_to_arena');
    expect(CONN_ARENA_TO_VILLAGE).toBe('conn.arena_to_village');
  });

  it('tiền tố "region." bị dành riêng; mọi ZoneId bắt đầu "zone."', () => {
    for (const map of WORLD.maps) {
      expect(map.id.startsWith('region.'), map.id).toBe(false);

      for (const conn of map.connections) {
        expect(conn.id.startsWith('region.'), conn.id).toBe(false);
      }

      for (const zone of map.zones) {
        expect(zone.id.startsWith('region.'), zone.id).toBe(false);
        expect(zone.id.startsWith('zone.'), zone.id).toBe(true);
      }
    }
  });

  it('validateWorld(WORLD) không lỗi', () => {
    expect(validateWorld(WORLD)).toEqual([]);
  });

  it('bảng ánh xạ cũ → mới khớp hằng tương ứng', () => {
    for (const [legacy, next] of Object.entries(LEGACY_ZONE_ID_MAP)) {
      expect(NEW_ZONE_CONSTANTS[legacy as keyof typeof LEGACY_ZONE_ID_MAP], legacy).toBe(next);
    }
  });

  it('save v8 mặc định không chứa id vùng và giữ nguyên bộ khóa cấp 1', () => {
    const result = migrateToLatest('knight', undefined);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const json = JSON.stringify(result.save);

    expect(json.includes('region.')).toBe(false);
    expect(json.includes('zone.')).toBe(false);
    expect(Object.keys(result.save).sort()).toEqual(SAVE_V8_TOP_LEVEL_KEYS);
  });
});
