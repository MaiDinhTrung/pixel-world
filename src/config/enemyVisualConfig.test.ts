import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ELEMENT_COLORS } from './damageTypeConfig';
import { ENEMY_ARCHETYPES } from './enemyConfig';
import {
  ENEMY_HITBOX_WORLD_SIZE,
  ENEMY_VARIANT_PALETTES,
  ENEMY_VISUALS,
} from './enemyVisualConfig';
import { NEON } from './palette';
import { TEXTURE_KEYS } from './constants';

describe('ENEMY_VISUALS (M2)', () => {
  it('có đủ archetype, không thừa', () => {
    expect(Object.keys(ENEMY_VISUALS).sort()).toEqual(Object.keys(ENEMY_ARCHETYPES).sort());
  });

  it('hitbox bodySize x displayScale = 40 cho MỌI archetype (V2)', () => {
    expect(ENEMY_HITBOX_WORLD_SIZE).toBe(40);

    for (const [id, visual] of Object.entries(ENEMY_VISUALS)) {
      expect(visual.bodySize * visual.displayScale, id).toBeCloseTo(ENEMY_HITBOX_WORLD_SIZE, 9);
    }
  });

  it('giá trị đã duyệt: grunt 2/20, swarmer 1.6/25, brute 2.5/16, caster 2/20', () => {
    expect([ENEMY_VISUALS.grunt.displayScale, ENEMY_VISUALS.grunt.bodySize]).toEqual([2, 20]);
    expect([ENEMY_VISUALS.caster.displayScale, ENEMY_VISUALS.caster.bodySize]).toEqual([2, 20]);
    expect([ENEMY_VISUALS.swarmer.displayScale, ENEMY_VISUALS.swarmer.bodySize]).toEqual([1.6, 25]);
    expect([ENEMY_VISUALS.brute.displayScale, ENEMY_VISUALS.brute.bodySize]).toEqual([2.5, 16]);
  });

  it('texture key/animPrefix: key cũ giữ nguyên, hai key mới có trong TEXTURE_KEYS', () => {
    expect(TEXTURE_KEYS.enemySwarmer).toBe('enemy-swarmer');
    expect(TEXTURE_KEYS.enemyBruiser).toBe('enemy-bruiser');
    expect([TEXTURE_KEYS.enemy, TEXTURE_KEYS.rangedEnemy, TEXTURE_KEYS.boss]).toEqual(['enemy', 'rangedEnemy', 'boss']);
    expect(ENEMY_VISUALS.grunt.textureKey).toBe('enemy');
    expect(ENEMY_VISUALS.caster.textureKey).toBe('rangedEnemy');
    expect(ENEMY_VISUALS.swarmer.textureKey).toBe('enemy-swarmer');
    expect(ENEMY_VISUALS.brute.textureKey).toBe('enemy-bruiser');

    for (const [id, visual] of Object.entries(ENEMY_VISUALS)) {
      expect(visual.animPrefix, id).toBe(visual.textureKey);
    }

    // Mỗi archetype một texture riêng.
    expect(new Set(Object.values(ENEMY_VISUALS).map((v) => v.textureKey)).size).toBe(Object.keys(ENEMY_VISUALS).length);
  });
});

function hexToRgb(hex: string): [number, number, number] {
  expect(hex, hex).toMatch(/^#[0-9a-f]{6}$/);

  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Trả về [hue 0..360, saturation 0..1, lightness 0..1]. */
function hsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    return [0, 0, l];
  }

  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;

  return [h * 60, s, l];
}

describe('bảng màu sheet quái mới (V1)', () => {
  const APPROVED: Record<string, readonly string[]> = {
    swarmer: ['#08161a', '#1c4a46', '#2f7a6e', '#6fc4ae', '#f2e8cc'],
    brute: ['#0c1016', '#272e3a', '#4a5568', '#8d9bb0', '#fff6c2'],
  };

  it('đúng danh sách hex đã duyệt', () => {
    for (const [id, palette] of Object.entries(ENEMY_VARIANT_PALETTES)) {
      expect(Object.values(palette), id).toEqual(APPROVED[id]);
    }
  });

  it('không đỏ/cam bão hòa; khác màu đạn quái và 4+ màu telegraph hệ', () => {
    const forbidden = new Set<string>([
      '#d8402a',
      ...Object.values(ELEMENT_COLORS).map((value) => `#${value.toString(16).padStart(6, '0')}`),
      `#${NEON.enemyBullet.toString(16).padStart(6, '0')}`,
    ]);

    for (const [id, palette] of Object.entries(ENEMY_VARIANT_PALETTES)) {
      for (const [name, hex] of Object.entries(palette)) {
        const [hue, saturation, lightness] = hsl(hexToRgb(hex));
        const warm = hue <= 40 || hue >= 340;
        // Kem rất sáng (lightness > 0.8) và xám tối không tính là đỏ/cam bão hòa.
        const saturatedWarm = warm && saturation >= 0.5 && lightness >= 0.2 && lightness <= 0.8;

        expect(saturatedWarm, `${id}.${name} ${hex}`).toBe(false);
        expect(forbidden.has(hex), `${id}.${name} ${hex} trùng màu đạn/telegraph`).toBe(false);
      }
    }
  });
});

describe('độ thuần của enemyVisualConfig.ts', () => {
  const text = readFileSync(fileURLToPath(new URL('./enemyVisualConfig.ts', import.meta.url)), 'utf8');

  it('không nạp Phaser/scene/entity/combat/skills, không ngẫu nhiên/thời gian/trình duyệt', () => {
    expect(text).not.toMatch(/(?:from\s+|import\s+)['"]phaser(?:\/[^'"]*)?['"]/);
    expect(text).not.toMatch(/from\s+['"][^'"]*\/(?:entities|combat|skills|scenes)(?:\/[^'"]*)?['"]/);
    expect(text).not.toMatch(/Math\s*\.\s*random|\bDate\s*\.|\b(?:window|localStorage)\b/);
  });
});
