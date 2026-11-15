import { describe, expect, it } from 'vitest';
import {
  allocateItemUid,
  formatItemUid,
  parseItemUid,
  uidPrefixOf,
} from './ItemIds';

describe('ItemIds', () => {
  it('đúng tiền tố theo kind', () => {
    expect(uidPrefixOf('weapon')).toBe('w');
    expect(uidPrefixOf('gear')).toBe('g');
    expect(formatItemUid('weapon', 1)).toBe('w1');
    expect(formatItemUid('gear', 1)).toBe('g1');
  });

  it('cấp uid tuần tự từ nextItemSeq', () => {
    let seq = 1;
    const uids: string[] = [];

    for (let i = 0; i < 5; i += 1) {
      const allocated = allocateItemUid(i % 2 === 0 ? 'weapon' : 'gear', seq);

      uids.push(allocated.uid);
      seq = allocated.nextItemSeq;
    }

    expect(uids).toEqual(['w1', 'g2', 'w3', 'g4', 'w5']);
    expect(seq).toBe(6);
  });

  it('seq dùng base36 (vượt 35)', () => {
    expect(formatItemUid('weapon', 35)).toBe('wz');
    expect(formatItemUid('weapon', 36)).toBe('w10');
    expect(formatItemUid('gear', 1296)).toBe('g100');
  });

  it('ổn định giữa hai lần chạy và không trùng', () => {
    const run = (): string[] => {
      const out: string[] = [];
      let seq = 1;

      for (let i = 0; i < 200; i += 1) {
        const a = allocateItemUid(i % 3 === 0 ? 'gear' : 'weapon', seq);

        out.push(a.uid);
        seq = a.nextItemSeq;
      }

      return out;
    };

    const first = run();

    expect(run()).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });

  it('không đổi tham số vào và parse ngược đúng', () => {
    const allocated = allocateItemUid('gear', 40);

    expect(allocated).toEqual({ uid: 'g14', nextItemSeq: 41 });
    expect(parseItemUid('g14')).toEqual({ kind: 'gear', seq: 40 });
    expect(parseItemUid('w1')).toEqual({ kind: 'weapon', seq: 1 });
  });

  it('parse từ chối dạng sai', () => {
    for (const bad of ['', 'w', 'x1', 'w0', 'w01', 'W1', 'w-1', 'g1.5', 5, null]) {
      expect(parseItemUid(bad)).toBeNull();
    }
  });

  it('format từ chối seq không hợp lệ', () => {
    expect(() => formatItemUid('weapon', 0)).toThrow();
    expect(() => formatItemUid('weapon', 1.5)).toThrow();
    expect(() => formatItemUid('gear', Number.NaN)).toThrow();
  });
});
