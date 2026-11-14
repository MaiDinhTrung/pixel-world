import { describe, expect, it } from 'vitest';

import { computeLanding } from './landing';

const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
const base = {
  startX: 500,
  startY: 500,
  dirX: 1,
  dirY: 0,
  reach: 1,
  minRange: 40,
  maxRange: 200,
  bounds,
  isBlocked: () => false,
};

describe('computeLanding', () => {
  it('đáp đúng tầm tối đa khi kéo hết cỡ', () => {
    const r = computeLanding(base);

    expect(r.x).toBeCloseTo(700);
    expect(r.adjusted).toBe(false);
  });

  it('khoảng cách tỉ lệ với độ lớn đầu vào', () => {
    expect(computeLanding({ ...base, reach: 0 }).distance).toBeCloseTo(40);
    expect(computeLanding({ ...base, reach: 0.5 }).distance).toBeCloseTo(120);
  });

  it('không có hướng thì đứng yên', () => {
    const r = computeLanding({ ...base, dirX: 0, dirY: 0 });

    expect(r.distance).toBe(0);
  });

  it('dừng trước vật cản, không xuyên tường', () => {
    const r = computeLanding({ ...base, isBlocked: (x) => x >= 600 });

    expect(r.x).toBeLessThan(600);
    expect(r.x).toBeGreaterThan(560);
    expect(r.adjusted).toBe(true);
  });

  it('không ra ngoài bản đồ', () => {
    const r = computeLanding({ ...base, startX: 900 });

    expect(r.x).toBeLessThanOrEqual(1000);
    expect(r.adjusted).toBe(true);
  });

  it('tường sát chân thì ở lại tại chỗ', () => {
    const r = computeLanding({ ...base, isBlocked: () => true });

    expect(r.distance).toBe(0);
    expect(r.adjusted).toBe(true);
  });

  it('chuẩn hoá hướng chéo', () => {
    const r = computeLanding({ ...base, dirX: 1, dirY: 1 });

    expect(r.distance).toBeCloseTo(200);
  });
});
