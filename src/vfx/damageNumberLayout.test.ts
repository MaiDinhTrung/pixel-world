import { describe, expect, it } from 'vitest';

import {
  consolidateParts,
  formatDamage,
  mergeKey,
  partOffset,
} from './damageNumberLayout';

describe('formatDamage', () => {
  it('không hiện số cho sát thương không dương', () => {
    expect(formatDamage(0)).toBe('');
    expect(formatDamage(-3)).toBe('');
    expect(formatDamage(Number.NaN)).toBe('');
  });

  it('làm tròn và hiện tối thiểu 1 cho đòn có sát thương', () => {
    expect(formatDamage(0.3)).toBe('1');
    expect(formatDamage(7.35)).toBe('7');
    expect(formatDamage(7.5)).toBe('8');
  });

  it('rút gọn dạng k từ ngưỡng', () => {
    expect(formatDamage(9999)).toBe('9999');
    expect(formatDamage(10000)).toBe('10k');
    expect(formatDamage(12400)).toBe('12k');
  });
});

describe('consolidateParts', () => {
  it('bỏ phần ≤ 0 và sắp giảm dần', () => {
    const result = consolidateParts([
      { type: 'fire', amount: 4 },
      { type: 'ice', amount: 0 },
      { type: 'dark', amount: 10 },
    ]);

    expect(result.map((p) => p.type)).toEqual(['dark', 'fire']);
  });

  it('gộp phần nhỏ vào phần lớn nhất, giữ nguyên tổng', () => {
    const result = consolidateParts([
      { type: 'physical', amount: 50 },
      { type: 'fire', amount: 2 },
      { type: 'ice', amount: 3 },
    ]);

    expect(result).toEqual([{ type: 'physical', amount: 55 }]);
  });

  it('giữ nhiều phần khi đủ lớn', () => {
    const result = consolidateParts([
      { type: 'physical', amount: 10 },
      { type: 'fire', amount: 10 },
    ]);

    expect(result).toHaveLength(2);
  });
});

describe('partOffset', () => {
  it('số đầu ở giữa, các số sau không trùng vị trí', () => {
    const seen = new Set<string>();

    for (let i = 0; i < 5; i += 1) {
      const o = partOffset(i, 16, 10);

      seen.add(`${o.x},${o.y}`);
    }

    expect(seen.size).toBe(5);
    expect(partOffset(0, 16, 10)).toEqual({ x: 0, y: 0 });
  });
});

describe('mergeKey', () => {
  it('tách theo mục tiêu, loại và nhóm', () => {
    expect(mergeKey(1, 'fire', false)).not.toBe(mergeKey(1, 'fire', true));
    expect(mergeKey(1, 'fire', false)).not.toBe(mergeKey(2, 'fire', false));
    expect(mergeKey(1, 'fire', false)).not.toBe(mergeKey(1, 'ice', false));
  });
});
