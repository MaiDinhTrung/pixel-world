import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ELEMENT_PALETTE } from '../config/damageTypeConfig';
import {
  ART_ACCENT_COLORS,
  ART_BASE_COLORS,
  ART_PALETTE,
  ART_PALETTE_HEXES,
  artColorNumber,
} from './palette';

const ART_DIR = fileURLToPath(new URL('.', import.meta.url));

function listArtSources(dir: string): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...listArtSources(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      result.push(full);
    }
  }

  return result;
}

function toHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** Lấy mọi hex dạng #rgb/#rrggbb/#rrggbbaa và 0xRRGGBB trong văn bản, chuẩn hóa về #rrggbb chữ thường. */
export function extractHexes(text: string): string[] {
  const found: string[] = [];

  for (const match of text.matchAll(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    found.push(`#${match[1].toLowerCase()}`);
  }

  for (const match of text.matchAll(/\b0x([0-9a-fA-F]{6})\b/g)) {
    found.push(`#${match[1].toLowerCase()}`);
  }

  return found;
}

describe('registry màu art', () => {
  it('mọi giá trị là hex #rrggbb chữ thường hợp lệ', () => {
    for (const [name, hex] of Object.entries(ART_PALETTE)) {
      expect(hex, `màu "${name}" không phải #rrggbb chữ thường`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('hai nhóm nền/nhấn không trùng khóa (spread không âm thầm ghi đè)', () => {
    const baseKeys = Object.keys(ART_BASE_COLORS);
    const accentKeys = Object.keys(ART_ACCENT_COLORS);
    const overlap = baseKeys.filter((key) => accentKeys.includes(key));

    expect(overlap, `khóa trùng giữa nền và nhấn: ${overlap.join(', ')}`).toEqual([]);
    expect(Object.keys(ART_PALETTE).length).toBe(baseKeys.length + accentKeys.length);
  });

  it('danh sách phẳng khớp registry và không có hex trùng', () => {
    expect(ART_PALETTE_HEXES.length).toBe(Object.keys(ART_PALETTE).length);
    expect(new Set(ART_PALETTE_HEXES).size, 'hai khóa khác nhau dùng cùng một hex').toBe(
      ART_PALETTE_HEXES.length,
    );
  });

  it('artColorNumber đổi hex sang số đúng', () => {
    expect(artColorNumber('fireCore')).toBe(0xffd070);
    expect(artColorNumber('voidBlack')).toBe(0x0c0e12);
  });

  it('màu nhấn nguyên tố khớp ELEMENT_PALETTE (giữ một nguồn, ART_BIBLE §2B)', () => {
    const pairs: ReadonlyArray<readonly [string, string, string, string]> = [
      ['fire', ART_ACCENT_COLORS.fireCore, ART_ACCENT_COLORS.fireBody, ART_ACCENT_COLORS.fireEdge],
      ['ice', ART_ACCENT_COLORS.iceCore, ART_ACCENT_COLORS.iceBody, ART_ACCENT_COLORS.iceEdge],
      [
        'lightning',
        ART_ACCENT_COLORS.lightningCore,
        ART_ACCENT_COLORS.lightningBody,
        ART_ACCENT_COLORS.lightningEdge,
      ],
      ['dark', ART_ACCENT_COLORS.voidCore, ART_ACCENT_COLORS.voidBody, ART_ACCENT_COLORS.voidEdge],
    ];

    for (const [element, core, body, edge] of pairs) {
      const source = ELEMENT_PALETTE[element as 'fire' | 'ice' | 'lightning' | 'dark'];

      expect([toHex(source.core), toHex(source.body), toHex(source.edge)], element).toEqual([
        core,
        body,
        edge,
      ]);
    }
  });
});

describe('hex trong src/art/** thuộc registry', () => {
  it('bộ trích hex bắt được các dạng hex (tự kiểm)', () => {
    expect(extractHexes("a = '#ABCDEF'; b = 0x112233; c = '#fff'")).toEqual([
      '#abcdef',
      '#fff',
      '#112233',
    ]);
  });

  it('mọi hex trong file nguồn (trừ *.test.ts) có trong registry', () => {
    const allowed = new Set(ART_PALETTE_HEXES);
    const violations: string[] = [];

    for (const file of listArtSources(ART_DIR)) {
      const text = readFileSync(file, 'utf8');

      for (const hex of extractHexes(text)) {
        if (!allowed.has(hex)) {
          violations.push(`${file}: ${hex} không có trong ART_PALETTE`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
