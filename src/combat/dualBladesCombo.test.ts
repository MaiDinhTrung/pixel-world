import { describe, expect, it } from 'vitest';

import {
  advanceComboStep,
  DUAL_BLADES_COMBO_STEPS,
  resolveComboStep,
} from './dualBladesCombo';

describe('combo Song Đao', () => {
  it('đi hết vòng 0 → 1 → 2 → 0', () => {
    let step = 0;
    const seen: number[] = [];

    for (let i = 0; i < DUAL_BLADES_COMBO_STEPS + 1; i += 1) {
      seen.push(resolveComboStep(step, 100, 500));
      step = advanceComboStep(seen[seen.length - 1]);
    }

    expect(seen).toEqual([0, 1, 2, 0]);
  });

  it('nghỉ quá cửa sổ thì về bước 0', () => {
    expect(resolveComboStep(2, 501, 500)).toBe(0);
    expect(resolveComboStep(2, 500, 500)).toBe(2);
  });

  it('bước không hợp lệ về 0', () => {
    expect(resolveComboStep(-1, 0, 500)).toBe(0);
    expect(resolveComboStep(9, 0, 500)).toBe(0);
  });
});
