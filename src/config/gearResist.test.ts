import { describe, expect, it } from 'vitest';

import { createBaseStats } from '../progression/buffTypes';
import { applyGearBonuses, getScaledGearBonuses } from './gearConfig';

describe('kháng trên trang bị', () => {
  it('cấp 1 đúng số gốc', () => {
    expect(getScaledGearBonuses('iron_helm', 1).resist?.fire).toBe(10);
  });
  it('cấp 99 chỉ thêm tối đa 5 điểm, không ×25', () => {
    expect(getScaledGearBonuses('iron_helm', 99).resist?.fire).toBe(15);
  });
  it('trần 25 điểm trên một món', () => {
    expect(getScaledGearBonuses('dragon_plate', 99).resist?.fire).toBe(25);
  });
  it('cộng dồn nhiều món, không sửa stats gốc', () => {
    const base = createBaseStats();
    const out = applyGearBonuses(base, {
      hat: 'dragon_crown', // hỏa 15
      armor: 'dragon_plate', // hỏa 20
      boots: null,
    });

    expect(out.resist.fire).toBeCloseTo(0.35);
    expect(base.resist.fire).toBeUndefined();
  });
});
