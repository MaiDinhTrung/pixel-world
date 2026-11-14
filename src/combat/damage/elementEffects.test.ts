import { describe, expect, it } from 'vitest';

import {
  IceStackTracker,
  LeechLimiter,
  pickChainTargets,
} from './elementEffects';

describe('lightning chain', () => {
  const src = { x: 0, y: 0 };
  const a = { x: 50, y: 0 };
  const b = { x: 100, y: 0 };
  const c = { x: 150, y: 0 };
  const far = { x: 900, y: 0 };

  it('lan tối đa 2 bước, mỗi bước ×0.6', () => {
    const links = pickChainTargets(src, [src, a, b, c, far], [src]);

    expect(links.map((l) => l.target)).toEqual([a, b]);
    expect(links[0].mult).toBeCloseTo(0.6);
    expect(links[1].mult).toBeCloseTo(0.36);
  });
  it('không lan vào đích đã bị đánh hoặc ngoài bán kính', () => {
    expect(pickChainTargets(src, [src, far], [src])).toEqual([]);
    expect(pickChainTargets(src, [src, a], [src, a])).toEqual([]);
  });
  it('mỗi đích chỉ trúng một lần', () => {
    const links = pickChainTargets(src, [src, a], [src]);

    expect(links).toHaveLength(1);
  });
});

describe('ice stacks', () => {
  it('đủ 3 tầng trong 3 giây thì đóng băng', () => {
    const t = new IceStackTracker();

    expect(t.add(0)).toBe(false);
    expect(t.add(1000)).toBe(false);
    expect(t.add(2000)).toBe(true);
  });
  it('tầng cũ ngoài cửa sổ không tính', () => {
    const t = new IceStackTracker();

    t.add(0);
    t.add(1000);
    expect(t.add(5000)).toBe(false);
  });
  it('đóng băng xong thì đếm lại từ đầu', () => {
    const t = new IceStackTracker();

    t.add(0);
    t.add(100);
    t.add(200);
    expect(t.add(300)).toBe(false);
  });
});

describe('dark leech', () => {
  it('hút 8% sát thương, tích phần lẻ', () => {
    const l = new LeechLimiter();

    expect(l.take(10, 0, 100)).toBe(0); // 0.8
    expect(l.take(10, 100, 100)).toBe(1); // 1.6 → 1
  });
  it('boss hút kém hơn (mult 0.5)', () => {
    const l = new LeechLimiter();

    expect(l.take(25, 0, 100, 0.5)).toBe(1); // 1.0
  });
  it('trần 10% HP tối đa mỗi giây, sang giây mới thì hồi lại', () => {
    const l = new LeechLimiter();
    let healed = 0;

    for (let i = 0; i < 20; i += 1) {
      healed += l.take(1000, 10 + i, 20); // cần 80 mỗi lần, trần 2/giây
    }

    expect(healed).toBe(2);
    expect(l.take(1000, 1500, 20)).toBe(2);
  });
});
