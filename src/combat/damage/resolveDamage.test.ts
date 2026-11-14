import { describe, expect, it } from 'vitest';

import {
  PHYSICAL_ONLY,
  applyDamageFloor,
  effectiveResist,
  resolveDamage,
  splitPlayerDamage,
  stochasticRound,
} from './resolveDamage';

const never = () => 1; // rng không bao giờ trúng
const always = () => 0; // rng luôn trúng

describe('physical', () => {
  it('giữ nguyên số khi mục tiêu không giáp', () => {
    expect(resolveDamage(4, PHYSICAL_ONLY, {}, {}, never).total).toBe(4);
  });
  it('giáp quái giảm, xuyên giáp giảm bớt tác dụng', () => {
    expect(resolveDamage(10, PHYSICAL_ONLY, {}, { physReduction: 0.4 }).total).toBeCloseTo(6);
    expect(
      resolveDamage(10, PHYSICAL_ONLY, { armorPen: 0.5 }, { physReduction: 0.4 }).total,
    ).toBeCloseTo(8);
  });
});

describe('elemental', () => {
  const parts = [{ type: 'fire', ratio: 1 }] as const;

  it('kháng giảm sát thương, trần 75%', () => {
    expect(resolveDamage(10, parts, {}, { resist: { fire: 0.5 } }).total).toBeCloseTo(5);
    expect(resolveDamage(10, parts, {}, { resist: { fire: 0.99 } }).total).toBeCloseTo(2.5);
  });
  it('boss trần 50%', () => {
    expect(
      resolveDamage(10, parts, {}, { resist: { fire: 0.9 }, resCap: 0.5 }).total,
    ).toBeCloseTo(5);
  });
  it('ví dụ 6: resPen 20 + shred 30 bị cắt ở 50 điểm', () => {
    const r = effectiveResist('fire', { resPen: 0.2 }, { resist: { fire: 0.75 }, resShred: 0.3 });

    expect(r).toBeCloseTo(0.25);
    expect(
      resolveDamage(10, parts, { resPen: 0.2 }, { resist: { fire: 0.75 }, resShred: 0.3 }).total,
    ).toBeCloseTo(7.5);
  });
  it('kháng âm nhận thêm tối đa +50%', () => {
    expect(resolveDamage(10, parts, {}, { resist: { fire: -2 } }).total).toBeCloseTo(15);
  });
});

describe('hybrid', () => {
  it('ví dụ 7: 60% vật lý / 40% lửa', () => {
    const hybrid = [
      { type: 'physical', ratio: 0.6 },
      { type: 'fire', ratio: 0.4 },
    ] as const;
    const def = { physReduction: 0.2, resist: { fire: 0.5 } };

    expect(resolveDamage(4.2, hybrid, {}, def).total).toBeCloseTo(2.856, 2);
  });
  it('cộng sát thương theo loại chỉ áp cho phần cùng loại', () => {
    const hybrid = [
      { type: 'physical', ratio: 0.5 },
      { type: 'fire', ratio: 0.5 },
    ] as const;

    expect(resolveDamage(10, hybrid, { typeDamage: { fire: 1 } }, {}).total).toBeCloseTo(15);
  });
});

describe('crit', () => {
  it('ví dụ 8: 6 × (1.5 + 0.3) = 10.8, một lần tung cho cả đòn', () => {
    const r = resolveDamage(6, PHYSICAL_ONLY, { critChance: 1, critBonus: 0.3 }, {}, always);

    expect(r.crit).toBe(true);
    expect(r.total).toBeCloseTo(10.8);
  });
  it('hệ số chí mạng bị chặn ở 3.0', () => {
    expect(
      resolveDamage(1, PHYSICAL_ONLY, { critChance: 1, critBonus: 9 }, {}, always).total,
    ).toBeCloseTo(3);
  });
});

describe('chống bất tử', () => {
  it('ví dụ 10: sàn 20%', () => {
    expect(applyDamageFloor(10, 0.7)).toBeCloseTo(2);
    expect(applyDamageFloor(10, 5)).toBe(5);
  });
});

describe('người chơi nhận đòn', () => {
  it('ví dụ 1: giáp 8 đỡ trọn đòn vật lý 8', () => {
    expect(splitPlayerDamage(8, 'physical', 8)).toEqual({ toPool: 8, toHealth: 0 });
  });
  it('ví dụ 2-3: nguyên tố chỉ được giáp đỡ một nửa, thêm giáp không đổi HP mất', () => {
    expect(splitPlayerDamage(8, 'fire', 8)).toEqual({ toPool: 4, toHealth: 4 });
    expect(splitPlayerDamage(8, 'fire', 18)).toEqual({ toPool: 4, toHealth: 4 });
  });
  it('xuyên giáp đẩy sát thương vào HP', () => {
    expect(splitPlayerDamage(8, 'physical', 8, 0.5)).toEqual({ toPool: 4, toHealth: 4 });
  });
  it('luôn ít nhất 1 sát thương', () => {
    expect(splitPlayerDamage(0.1, 'physical', 0, 0, never).toHealth).toBe(1);
  });
});

describe('làm tròn ngẫu nhiên', () => {
  it('giữ kỳ vọng qua 10.000 lần', () => {
    let sum = 0;

    for (let i = 0; i < 10000; i += 1) {
      sum += stochasticRound(2.3);
    }

    expect(sum / 10000).toBeCloseTo(2.3, 1);
  });
});
