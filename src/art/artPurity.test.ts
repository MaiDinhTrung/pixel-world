import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Module art mới phải THUẦN: không kéo gameplay vào, không ngẫu nhiên/thời gian, không đọc ngược pixel.
 * Quét mọi file .ts không phải test dưới src/art/ (kể cả khi thư mục chỉ có palette.ts).
 */
const ART_DIR = fileURLToPath(new URL('.', import.meta.url));

const FORBIDDEN: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  {
    name: 'import từ entities|combat|skills|scenes',
    pattern: /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"][^'"]*\/(?:entities|combat|skills|scenes)(?:\/[^'"]*)?['"]/,
  },
  { name: 'Math.random', pattern: /Math\s*\.\s*random/ },
  { name: 'Date.', pattern: /\bDate\s*\./ },
  { name: 'getPixel|snapshot|readPixels', pattern: /getPixel|snapshot|readPixels/ },
];

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

describe('độ thuần của src/art', () => {
  it('bộ quét bắt được từng kiểu vi phạm (tự kiểm, để test không "xanh giả")', () => {
    const samples: Record<string, string> = {
      'import từ entities|combat|skills|scenes': "import { Player } from '../entities/Player';",
      'Math.random': 'const r = Math.random();',
      'Date.': 'const t = Date.now();',
      'getPixel|snapshot|readPixels': 'texture.getPixel(1, 2);',
    };

    for (const rule of FORBIDDEN) {
      expect(rule.pattern.test(samples[rule.name]), `luật "${rule.name}" không bắt được mẫu vi phạm`).toBe(true);
    }

    expect(FORBIDDEN[0].pattern.test("import { x } from '../config/vfxConfig';")).toBe(false);
    expect(FORBIDDEN[0].pattern.test("import { y } from '../skills/skills';")).toBe(true);
    expect(FORBIDDEN[0].pattern.test("import('../scenes/WorldScene')")).toBe(true);
  });

  it('có ít nhất một file nguồn để quét (palette.ts)', () => {
    const names = listArtSources(ART_DIR).map((file) => file.replace(/\\/g, '/'));

    expect(names.some((name) => name.endsWith('/art/palette.ts'))).toBe(true);
  });

  it('không file nguồn nào trong src/art vi phạm', () => {
    const violations: string[] = [];

    for (const file of listArtSources(ART_DIR)) {
      const text = readFileSync(file, 'utf8');

      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(text)) {
          violations.push(`${file}: vi phạm "${rule.name}"`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
