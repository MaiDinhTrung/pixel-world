import { describe, expect, it, vi } from 'vitest';

import { absorbHit, fortressMaxHp, type FortressWall } from './fortressWall';

function makeWall(maxHp = 100): FortressWall {
  return {
    x: 0,
    y: 0,
    angle: 0, // chắn về phía +x
    halfArc: Math.PI / 3,
    maxHp,
    hp: maxHp,
    onHit: vi.fn(),
    onBreak: vi.fn(),
  };
}

describe('absorbHit', () => {
  it('đỡ đòn từ phía trước và trừ HP tường', () => {
    const wall = makeWall();

    expect(absorbHit(wall, 100, 0, 30)).toBe(true);
    expect(wall.hp).toBe(70);
    expect(wall.onHit).toHaveBeenCalledTimes(1);
  });

  it('cho đòn từ phía sau và ngoài cung xuyên qua, không trừ HP tường', () => {
    const wall = makeWall();

    expect(absorbHit(wall, -100, 0, 30)).toBe(false);
    expect(absorbHit(wall, 0, 100, 30)).toBe(false); // vuông góc 90° > 60°
    expect(wall.hp).toBe(100);
    expect(wall.onHit).not.toHaveBeenCalled();
  });

  it('biên cung: trong 60° đỡ, ngoài 60° xuyên', () => {
    const wall = makeWall();
    const rad = (deg: number) => (deg * Math.PI) / 180;

    expect(absorbHit(wall, Math.cos(rad(59)), Math.sin(rad(59)), 1)).toBe(true);
    expect(absorbHit(wall, Math.cos(rad(-59)), Math.sin(rad(-59)), 1)).toBe(true);
    expect(absorbHit(wall, Math.cos(rad(61)), Math.sin(rad(61)), 1)).toBe(false);
  });

  it('xử lý đúng khi hướng chắn gần ±π', () => {
    const wall = { ...makeWall(), angle: Math.PI };

    expect(absorbHit(wall, -100, 5, 1)).toBe(true);
    expect(absorbHit(wall, -100, -5, 1)).toBe(true);
    expect(absorbHit(wall, 100, 0, 1)).toBe(false);
  });

  it('vỡ khi HP về 0: gọi onBreak đúng một lần, đòn sau đó xuyên qua', () => {
    const wall = makeWall(50);

    expect(absorbHit(wall, 100, 0, 80)).toBe(true); // dư không chuyển sang người
    expect(wall.hp).toBe(0);
    expect(wall.onBreak).toHaveBeenCalledTimes(1);
    expect(absorbHit(wall, 100, 0, 10)).toBe(false);
    expect(wall.onBreak).toHaveBeenCalledTimes(1);
  });

  it('không biết nguồn đòn (DoT...) thì xuyên qua', () => {
    const wall = makeWall();

    expect(absorbHit(wall, undefined, undefined, 10)).toBe(false);
    expect(wall.hp).toBe(100);
  });

  it('HP tường = máu tối đa × 5', () => {
    expect(fortressMaxHp(2000)).toBe(10000);
  });
});
