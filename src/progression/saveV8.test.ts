import { describe, expect, it } from 'vitest';
import { createDefaultSave } from './CharacterProgress';
import { migrateV7ToV8 } from './saveMigration';
import { validateSaveV8, type CharacterSaveV8 } from './saveV8';

/** Save v8 hợp lệ làm gốc (knight mặc định + vài món để đủ trường hợp). */
function validSave(): CharacterSaveV8 {
  const v7 = createDefaultSave('knight');

  // Knight: w1=sword, w2=shield, g3=iron_helm (hat), g4=iron_cuirass, g5=worn_boots.
  v7.gearLevels = { iron_helm: 3 };
  v7.gearSockets = { iron_helm: ['damage', null] };

  const result = migrateV7ToV8('knight', v7);

  if (!result.ok) {
    throw new Error(`save gốc không hợp lệ: ${result.errors.join('; ')}`);
  }

  return result.save;
}

/** Sửa một bản sao của save hợp lệ rồi trả lỗi. */
function errorsAfter(mutate: (save: any) => void): string[] {
  const save = JSON.parse(JSON.stringify(validSave()));

  mutate(save);

  return validateSaveV8(save);
}

describe('validateSaveV8', () => {
  it('save hợp lệ đi qua', () => {
    expect(validateSaveV8(validSave())).toEqual([]);
  });

  it('không phải đối tượng', () => {
    for (const bad of [undefined, null, 'x', 5, []]) {
      expect(validateSaveV8(bad).length).toBeGreaterThan(0);
    }
  });

  it('bắt version sai', () => {
    expect(errorsAfter((s) => (s.version = 7)).length).toBeGreaterThan(0);
  });

  it('bắt uid không khớp khóa', () => {
    const errors = errorsAfter((s) => {
      s.items.w1.uid = 'w9';
    });

    expect(errors.some((e) => e.includes('uid không khớp khóa'))).toBe(true);
  });

  it('bắt uid sai tiền tố so với kind', () => {
    const errors = errorsAfter((s) => {
      s.items.w1.kind = 'gear';
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('bắt uid trùng (hai khóa cùng uid)', () => {
    const errors = errorsAfter((s) => {
      s.items.w2.uid = 'w1';
    });

    expect(errors.some((e) => e.includes('uid không khớp khóa'))).toBe(true);
  });

  it('bắt bag thiếu uid (item không nằm trong bag)', () => {
    const errors = errorsAfter((s) => {
      s.bag.pop();
    });

    expect(errors.some((e) => e.includes('không nằm trong bag'))).toBe(true);
  });

  it('bắt bag thừa uid (không tồn tại) và uid lặp', () => {
    expect(
      errorsAfter((s) => s.bag.push('w99')).some((e) =>
        e.includes('không tồn tại'),
      ),
    ).toBe(true);
    expect(
      errorsAfter((s) => s.bag.push(s.bag[0])).some((e) =>
        e.includes('lặp'),
      ),
    ).toBe(true);
  });

  it('bắt defId trùng trong cùng kind', () => {
    const errors = errorsAfter((s) => {
      s.items.w2.defId = s.items.w1.defId;
    });

    expect(errors.some((e) => e.includes('bị trùng'))).toBe(true);
  });

  it('bắt defId không hợp lệ', () => {
    expect(
      errorsAfter((s) => (s.items.w1.defId = 'khong_co')).length,
    ).toBeGreaterThan(0);
    expect(
      errorsAfter((s) => (s.items.g3.defId = 'khong_co')).length,
    ).toBeGreaterThan(0);
  });

  it('bắt level và sockets sai', () => {
    expect(errorsAfter((s) => (s.items.g3.level = 0)).length).toBeGreaterThan(0);
    expect(errorsAfter((s) => (s.items.g3.level = 100)).length).toBeGreaterThan(
      0,
    );
    expect(errorsAfter((s) => (s.items.w1.level = 2)).length).toBeGreaterThan(0);
    expect(
      errorsAfter((s) => (s.items.g3.sockets = [null, null, null, null])).length,
    ).toBeGreaterThan(0);
    expect(
      errorsAfter((s) => (s.items.g3.sockets = ['khong_co'])).length,
    ).toBeGreaterThan(0);
  });

  it('bắt trang bị đặt sai ô', () => {
    const errors = errorsAfter((s) => {
      // g3 là mũ của knight; đặt vào ô giáp.
      s.equippedGear.armor = 'g3';
    });

    expect(errors.some((e) => e.includes('sai ô'))).toBe(true);
  });

  it('bắt ô trang bị trỏ vũ khí hoặc uid không tồn tại', () => {
    expect(
      errorsAfter((s) => (s.equippedGear.hat = 'w1')).some((e) =>
        e.includes('không phải trang bị'),
      ),
    ).toBe(true);
    expect(
      errorsAfter((s) => (s.equippedGear.hat = 'g99')).some((e) =>
        e.includes('không tồn tại'),
      ),
    ).toBe(true);
  });

  it('bắt vũ khí trùng ô và ô trỏ trang bị', () => {
    expect(
      errorsAfter((s) => (s.equippedWeapons = ['w1', 'w1'])).some((e) =>
        e.includes('trùng uid'),
      ),
    ).toBe(true);
    expect(
      errorsAfter((s) => (s.equippedWeapons = ['g3', null])).some((e) =>
        e.includes('không phải vũ khí'),
      ),
    ).toBe(true);
  });

  it('bắt nextItemSeq thấp', () => {
    const errors = errorsAfter((s) => {
      s.nextItemSeq = 2;
    });

    expect(errors.some((e) => e.includes('nextItemSeq'))).toBe(true);
  });

  it('bắt revision 0, thiếu hoặc không nguyên', () => {
    expect(errorsAfter((s) => (s.revision = 0)).length).toBeGreaterThan(0);
    expect(errorsAfter((s) => delete s.revision).length).toBeGreaterThan(0);
    expect(errorsAfter((s) => (s.revision = 1.5)).length).toBeGreaterThan(0);
  });

  it('bắt giá trị không JSON-hóa được', () => {
    expect(errorsAfter((s) => (s.gold = Number.NaN)).length).toBeGreaterThan(0);
    expect(
      errorsAfter((s) => (s.stats.extra = undefined)).some((e) =>
        e.includes('JSON'),
      ),
    ).toBe(true);
    expect(
      errorsAfter((s) => (s.skillLevels.m = new Map())).some((e) =>
        e.includes('không phải dạng thuần'),
      ),
    ).toBe(true);
    expect(
      errorsAfter((s) => (s.skillLevels.f = () => 1)).some((e) =>
        e.includes('JSON'),
      ),
    ).toBe(true);
  });

  it('bắt thiếu items / bag / migrationLog', () => {
    expect(errorsAfter((s) => delete s.items).length).toBeGreaterThan(0);
    expect(errorsAfter((s) => delete s.bag).length).toBeGreaterThan(0);
    expect(errorsAfter((s) => delete s.migrationLog).length).toBeGreaterThan(0);
  });
});
