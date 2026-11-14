import { describe, expect, it } from 'vitest';

import { WEAPON_IDS } from '../config/weaponInfo';
import { WEAPON_SPRITE_SPEC } from '../config/weaponSpriteConfig';
import { getArtSize, WEAPON_ART } from './weaponArt';

describe('art vũ khí', () => {
  it('mọi vũ khí đều có art và thông số gắn sprite', () => {
    for (const id of WEAPON_IDS) {
      expect(WEAPON_ART[id], `thiếu art ${id}`).toBeDefined();
      expect(WEAPON_SPRITE_SPEC[id], `thiếu spec ${id}`).toBeDefined();
    }
  });

  it.each(WEAPON_IDS)('%s: hàng đều nhau, màu có trong palette, điểm cầm nằm trong ảnh', (id) => {
    const art = WEAPON_ART[id];
    const { width, height } = getArtSize(art);
    const lengths = new Set(art.rows.map((row) => row.length));

    expect(lengths.size, 'các hàng lệch độ dài').toBe(1);

    for (const row of art.rows) {
      for (const char of row) {
        if (char !== '.') {
          expect(art.palette[char], `ký tự '${char}' chưa có màu`).toBeDefined();
        }
      }
    }

    const { grip } = WEAPON_SPRITE_SPEC[id];

    expect(grip.x + art.pad).toBeGreaterThanOrEqual(0);
    expect(grip.x + art.pad).toBeLessThanOrEqual(width);
    expect(grip.y + art.pad).toBeGreaterThanOrEqual(0);
    expect(grip.y + art.pad).toBeLessThanOrEqual(height);
  });

  it('vũ khí cầm tay nằm trong ngân sách kích thước (không lớn hơn ~frame nhân vật 48 px + viền)', () => {
    for (const id of WEAPON_IDS) {
      const { width, height } = getArtSize(WEAPON_ART[id]);

      expect(Math.max(width, height), `${id} quá lớn`).toBeLessThanOrEqual(60);
    }
  });
});
