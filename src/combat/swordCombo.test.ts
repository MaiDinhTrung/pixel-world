import { describe, expect, it } from 'vitest';

import {
  advanceCombo,
  clampLunge,
  isInSector,
  resolveComboStep,
  type ComboState,
} from './swordCombo';

describe('combo Kiếm', () => {
  it('đi lần lượt 0 → 1 → 2 → 0 khi đánh liên tục', () => {
    const state: ComboState = { step: 0, expireAt: 0 };
    const seen: number[] = [];
    let t = 1000;

    for (let i = 0; i < 4; i += 1) {
      const step = resolveComboStep(state, t);

      seen.push(step);
      advanceCombo(state, step, t + 300, 600);
      t += 350;
    }

    expect(seen).toEqual([0, 1, 2, 0]);
  });

  it('reset về đòn 1 khi ngừng quá thời gian quy định', () => {
    const state: ComboState = { step: 0, expireAt: 0 };

    advanceCombo(state, 0, 1300, 600);
    expect(resolveComboStep(state, 1900)).toBe(1);
    expect(resolveComboStep(state, 1901)).toBe(0);
  });
});

describe('isInSector', () => {
  const half = Math.PI / 4;

  it('trúng mục tiêu trước mặt trong tầm', () => {
    expect(isInSector(40, 0, 0, half, 60)).toBe(true);
  });

  it('trượt mục tiêu quá tầm hoặc ở sau lưng', () => {
    expect(isInSector(70, 0, 0, half, 60)).toBe(false);
    expect(isInSector(-30, 0, 0, half, 60)).toBe(false);
  });

  it('xử lý đúng quanh ±π', () => {
    expect(isInSector(-40, 1, Math.PI, half, 60)).toBe(true);
  });
});

describe('clampLunge', () => {
  const origin = { x: 0, y: 0 };

  it('lao tối đa khi đường trống', () => {
    expect(clampLunge(origin, 1, 0, 36, 30, 30, [])).toBe(36);
  });

  it('dừng trước quái chắn đường, không xuyên qua', () => {
    expect(clampLunge(origin, 1, 0, 36, 30, 30, [{ x: 50, y: 5 }])).toBe(20);
    expect(clampLunge(origin, 1, 0, 36, 30, 30, [{ x: 20, y: 0 }])).toBe(0);
  });

  it('bỏ qua quái sau lưng hoặc lệch hành lang', () => {
    expect(clampLunge(origin, 1, 0, 36, 30, 30, [{ x: -40, y: 0 }])).toBe(36);
    expect(clampLunge(origin, 1, 0, 36, 30, 30, [{ x: 40, y: 80 }])).toBe(36);
  });
});
