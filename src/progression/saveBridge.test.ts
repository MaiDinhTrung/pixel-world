import { describe, expect, it } from 'vitest';
import type { WeaponId } from '../combat/Weapon';
import { CHARACTERS, type CharacterId } from '../config/characters';
import {
  GEAR_IDS,
  GEAR_INFO,
  GEAR_SLOTS,
  MAX_GEAR_LEVEL,
  type GearId,
} from '../config/gearConfig';
import { GEM_IDS, MAX_SOCKETS, type GemId } from '../config/gemConfig';
import { WEAPON_IDS } from '../config/weaponInfo';
import {
  createDefaultSave,
  normalizeCharacterSave,
  type CharacterSave,
} from './CharacterProgress';
import { applyV7ShapeToV8 } from './saveBridge';
import { migrateV7ToV8, v8ToV7Shape } from './saveMigration';
import { validateSaveV8, type CharacterSaveV8 } from './saveV8';

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toV8(id: CharacterId, v7: CharacterSave): CharacterSaveV8 {
  const result = migrateV7ToV8(id, v7);

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.save;
}

function apply(prev: CharacterSaveV8, next: CharacterSave): CharacterSaveV8 {
  const result = applyV7ShapeToV8(prev, next);

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.save;
}

function uidOf(
  save: CharacterSaveV8,
  kind: 'weapon' | 'gear',
  defId: string,
): string | undefined {
  return Object.values(save.items).find(
    (it) => it.kind === kind && it.defId === defId,
  )?.uid;
}

// Bộ sinh save v7 xác định theo bảng (không random), gần giống saveMigration.test.ts.
const weaponSets: WeaponId[][] = [
  [...CHARACTERS.knight.startingWeapons],
  [...CHARACTERS.ranger.allowedWeapons],
  [...CHARACTERS.mage.allowedWeapons],
  [...WEAPON_IDS],
];
const gemPatterns: ((GemId | null)[] | undefined)[] = [
  undefined,
  [],
  [null],
  ['damage'],
  [null, 'thorns'],
  ['lifesteal', null, 'evasion'],
];

function build(id: CharacterId, variant: number): CharacterSave {
  const weapons = weaponSets[variant % weaponSets.length];
  const rotated = GEAR_IDS.map(
    (_, i) => GEAR_IDS[(i + variant) % GEAR_IDS.length],
  );
  const gearInventory = rotated.slice(0, 3 + (variant % (GEAR_IDS.length - 2)));
  const equippedGear: Record<string, GearId | null> = {};

  for (const slot of GEAR_SLOTS) {
    const options = gearInventory.filter((g) => GEAR_INFO[g].slot === slot);

    equippedGear[slot] =
      options.length === 0 || (variant + slot.length) % 5 === 0
        ? null
        : options[variant % options.length];
  }

  const gearLevels: Record<string, number> = {};
  const gearSockets: Record<string, (GemId | null)[]> = {};

  gearInventory.forEach((g, i) => {
    const bucket = (i + variant) % 4;

    gearLevels[g] = bucket === 0 ? 1 : bucket === 1 ? 2 + variant : MAX_GEAR_LEVEL;

    const pattern = gemPatterns[(i * 2 + variant) % gemPatterns.length];

    if (pattern) {
      gearSockets[g] = pattern.slice(0, MAX_SOCKETS);
    }
  });

  const equipped: (WeaponId | null)[] =
    variant % 4 === 3
      ? [null, weapons[0]]
      : variant % 4 === 2
        ? [weapons[weapons.length - 1], null]
        : [weapons[0], weapons[1] ?? null];

  const gems: Record<string, number> = {};

  GEM_IDS.forEach((g, i) => {
    gems[g] = (i + variant) % 3;
  });

  return normalizeCharacterSave(id, {
    ...createDefaultSave(id),
    level: 1 + variant * 3,
    gold: 100 * variant,
    gems,
    inventory: weapons,
    equipped,
    gearInventory,
    equippedGear,
    gearLevels,
    gearSockets,
  });
}

const cases: { id: CharacterId; variant: number }[] = [];

for (const id of CHARACTER_IDS) {
  for (let variant = 0; variant < 7; variant += 1) {
    cases.push({ id, variant });
  }
}

describe('(1) apply(prev, v8ToV7Shape(prev)) bằng prev', () => {
  for (const id of CHARACTER_IDS) {
    it(`save mặc định ${id}`, () => {
      const prev = toV8(id, createDefaultSave(id));

      expect(apply(prev, v8ToV7Shape(prev))).toEqual(prev);
    });
  }

  it('có >= 20 save sinh theo bảng, đa dạng, đều giữ nguyên', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);

    const levels = new Set<number>();
    const sockets = new Set<string>();

    for (const { id, variant } of cases) {
      const v7 = build(id, variant);
      const prev = toV8(id, v7);

      Object.values(v7.gearLevels).forEach((l) => levels.add(l as number));
      Object.values(v7.gearSockets).forEach((s) => sockets.add(JSON.stringify(s)));
      expect(apply(prev, v8ToV7Shape(prev)), `${id}#${variant}`).toEqual(prev);
    }

    expect(levels.size).toBeGreaterThan(4);
    expect(sockets.size).toBeGreaterThan(3);
  });
});

describe('(2) thêm đồ mới', () => {
  it('uid mới = nextItemSeq cũ, nextItemSeq +1, uid khác không đổi', () => {
    const prev = toV8('knight', createDefaultSave('knight'));
    const shape = v8ToV7Shape(prev);
    const newWeapon = WEAPON_IDS.find((w) => !shape.inventory.includes(w)) as WeaponId;
    const newGear = GEAR_IDS.find((g) => !shape.gearInventory.includes(g)) as GearId;
    const next: CharacterSave = {
      ...shape,
      inventory: [...shape.inventory, newWeapon],
      gearInventory: [...shape.gearInventory, newGear],
    };
    const snapshot = clone(prev);
    const save = apply(prev, next);

    expect(prev).toEqual(snapshot);
    expect(save.nextItemSeq).toBe(prev.nextItemSeq + 2);
    expect(uidOf(save, 'weapon', newWeapon)).toBe(`w${prev.nextItemSeq.toString(36)}`);
    expect(uidOf(save, 'gear', newGear)).toBe(
      `g${(prev.nextItemSeq + 1).toString(36)}`,
    );

    for (const uid of prev.bag) {
      expect(save.items[uid]).toEqual(prev.items[uid]);
    }

    expect(validateSaveV8(save)).toEqual([]);
  });
});

describe('(3) bỏ rồi thêm lại cùng defId', () => {
  it('cấp uid mới, không tái dùng uid cũ', () => {
    const prev = toV8('knight', createDefaultSave('knight'));
    const shape = v8ToV7Shape(prev);
    const gone = shape.gearInventory[shape.gearInventory.length - 1];
    const oldUid = uidOf(prev, 'gear', gone) as string;
    const without: CharacterSave = {
      ...shape,
      gearInventory: shape.gearInventory.filter((g) => g !== gone),
      equippedGear: {
        hat: shape.equippedGear.hat === gone ? null : shape.equippedGear.hat,
        armor: shape.equippedGear.armor === gone ? null : shape.equippedGear.armor,
        boots: shape.equippedGear.boots === gone ? null : shape.equippedGear.boots,
      },
    };
    const step1 = apply(prev, without);

    expect(step1.items[oldUid]).toBeUndefined();
    expect(step1.nextItemSeq).toBe(prev.nextItemSeq);

    const step2 = apply(step1, shape);
    const newUid = uidOf(step2, 'gear', gone) as string;

    expect(newUid).not.toBe(oldUid);
    expect(newUid).toBe(`g${step1.nextItemSeq.toString(36)}`);
    expect(step2.nextItemSeq).toBe(step1.nextItemSeq + 1);
    expect(step2.items[oldUid]).toBeUndefined();
  });
});

describe('(4) đổi level/socket/thứ tự bag/ô trang bị', () => {
  it('phản ánh đúng và giữ uid', () => {
    const prev = toV8('ranger', build('ranger', 5));
    const shape = v8ToV7Shape(prev);
    const gear = [...shape.gearInventory].reverse();
    const weapons = [...shape.inventory].reverse();
    const target = gear[0];
    const next: CharacterSave = {
      ...shape,
      inventory: weapons,
      gearInventory: gear,
      equipped: [weapons[weapons.length - 1], null],
      gearLevels: { ...shape.gearLevels, [target]: 7 },
      gearSockets: { ...shape.gearSockets, [target]: ['damage', null] },
    };
    const save = apply(prev, next);

    expect(save.bag.map((uid) => save.items[uid].defId)).toEqual([
      ...weapons,
      ...gear,
    ]);

    for (const uid of prev.bag) {
      expect(save.items[uid].defId).toBe(prev.items[uid].defId);
    }

    const item = save.items[uidOf(save, 'gear', target) as string];

    expect(item).toMatchObject({ level: 7, sockets: ['damage', null] });
    expect(save.equippedWeapons[1]).toBeNull();
    expect(save.items[save.equippedWeapons[0] as string].defId).toBe(
      weapons[weapons.length - 1],
    );
    expect(save.nextItemSeq).toBe(prev.nextItemSeq);
  });

  it('level kẹp [1, MAX], sockets cắt MAX_SOCKETS, socket món lạ bị bỏ', () => {
    const prev = toV8('knight', createDefaultSave('knight'));
    const shape = v8ToV7Shape(prev);
    const g = shape.gearInventory[0];
    const stranger = GEAR_IDS.find((x) => !shape.gearInventory.includes(x)) as GearId;
    const long: (GemId | null)[] = Array.from(
      { length: MAX_SOCKETS + 2 },
      () => 'damage',
    );
    const save = apply(prev, {
      ...shape,
      gearLevels: { [g]: 9999, [stranger]: 5 },
      gearSockets: { [g]: long, [stranger]: ['damage'] },
    });
    const item = save.items[uidOf(save, 'gear', g) as string];

    expect(item).toMatchObject({ level: MAX_GEAR_LEVEL });
    expect(item.kind === 'gear' && item.sockets.length).toBe(MAX_SOCKETS);
    expect(uidOf(save, 'gear', stranger)).toBeUndefined();

    const low = apply(prev, { ...shape, gearLevels: { [g]: -4 } });

    expect(low.items[uidOf(low, 'gear', g) as string].level).toBe(1);
  });

  it('sockets là bản sao sâu', () => {
    const prev = toV8('knight', createDefaultSave('knight'));
    const shape = v8ToV7Shape(prev);
    const g = shape.gearInventory[0];
    const sockets: (GemId | null)[] = ['damage'];
    const save = apply(prev, { ...shape, gearSockets: { [g]: sockets } });
    const item = save.items[uidOf(save, 'gear', g) as string];

    sockets.push('thorns');
    expect(item.kind === 'gear' && item.sockets).toEqual(['damage']);
  });
});

describe('(5) v8ToV7Shape(apply(prev, s)) bằng s', () => {
  it('với mọi cặp (prev, s) hợp lệ, kể cả đồ thêm/bớt', () => {
    let checked = 0;

    for (const a of cases) {
      const b = cases[(cases.indexOf(a) * 5 + 3) % cases.length];
      const prev = toV8(a.id, build(a.id, a.variant));
      const s = build(b.id, b.variant);
      const save = apply(prev, s);

      expect(validateSaveV8(save), `${a.id}#${a.variant}`).toEqual([]);
      expect(v8ToV7Shape(save), `${a.id}#${a.variant}`).toEqual(s);
      expect(save.characterUid).toBe(prev.characterUid);
      expect(save.revision).toBe(prev.revision);
      expect(save.nextItemSeq).toBeGreaterThanOrEqual(prev.nextItemSeq);
      checked += 1;
    }

    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it('uid đã bỏ không bao giờ xuất hiện lại qua chuỗi biến đổi', () => {
    let state = toV8('mage', build('mage', 0));
    const everSeen = new Set<string>(Object.keys(state.items));
    const retired = new Set<string>();

    for (let variant = 1; variant < 12; variant += 1) {
      const before = new Set(Object.keys(state.items));

      state = apply(state, build('mage', variant));

      for (const uid of before) {
        if (!(uid in state.items)) {
          retired.add(uid);
        }
      }

      for (const uid of Object.keys(state.items)) {
        expect(retired.has(uid), `variant ${variant} tái dùng ${uid}`).toBe(false);
        everSeen.add(uid);
      }
    }

    expect(retired.size).toBeGreaterThan(0);
  });
});

describe('(6) đầu vào sai', () => {
  const prev = toV8('knight', createDefaultSave('knight'));
  const shape = v8ToV7Shape(prev);
  const missingGear = GEAR_IDS.find((g) => !shape.gearInventory.includes(g)) as GearId;
  const missingWeapon = WEAPON_IDS.find((w) => !shape.inventory.includes(w)) as WeaponId;
  const badCases: [string, CharacterSave][] = [
    [
      'ô vũ khí trỏ đồ không có trong túi',
      { ...shape, equipped: [missingWeapon, null] },
    ],
    [
      'ô trang bị trỏ đồ không có trong túi',
      {
        ...shape,
        equippedGear: { ...shape.equippedGear, hat: missingGear },
      },
    ],
    [
      'defId vũ khí trùng',
      { ...shape, inventory: [...shape.inventory, shape.inventory[0]] },
    ],
    [
      'defId trang bị trùng',
      {
        ...shape,
        gearInventory: [...shape.gearInventory, shape.gearInventory[0]],
      },
    ],
    [
      'defId vũ khí sai',
      { ...shape, inventory: [...shape.inventory, 'khong_co' as WeaponId] },
    ],
    [
      'defId trang bị sai',
      { ...shape, gearInventory: [...shape.gearInventory, 'khong_co' as GearId] },
    ],
    [
      'hai ô vũ khí cùng một món',
      { ...shape, equipped: [shape.inventory[0], shape.inventory[0]] },
    ],
  ];

  for (const [name, next] of badCases) {
    it(`${name}: ok:false + errors, không throw, không sửa prev/next`, () => {
      const prevSnap = clone(prev);
      const nextSnap = clone(next);
      let result: ReturnType<typeof applyV7ShapeToV8> | undefined;

      expect(() => {
        result = applyV7ShapeToV8(prev, next);
      }).not.toThrow();
      expect(result?.ok).toBe(false);

      if (result && !result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }

      expect(prev).toEqual(prevSnap);
      expect(next).toEqual(nextSnap);
    });
  }

  it('prev hỏng bị từ chối, không throw', () => {
    const broken = { ...clone(prev), nextItemSeq: 1 };

    expect(applyV7ShapeToV8(broken, shape).ok).toBe(false);
  });
});

describe('(7) idempotent', () => {
  it('apply(apply(prev, s).save, s) bằng apply(prev, s).save', () => {
    for (const a of cases) {
      const b = cases[(cases.indexOf(a) * 3 + 1) % cases.length];
      const prev = toV8(a.id, build(a.id, a.variant));
      const s = build(b.id, b.variant);
      const once = apply(prev, s);

      expect(apply(once, s), `${a.id}#${a.variant}`).toEqual(once);
    }
  });
});

describe('(9) sao chép sâu, migrationLog, nhân vật khác knight (bổ sung từ QA B2a)', () => {
  it('stats, gems, skillLevels, skillLoadout, extraSkills là bản sao sâu hai chiều; next không bị mutate', () => {
    const prev = toV8('mage', build('mage', 3));
    const next = build('mage', 4);
    const nextSnap = clone(next);
    const save = apply(prev, next);

    // Ca thành công: next không bị mutate.
    expect(next).toEqual(nextSnap);

    const saveSnap = clone(save);

    // Sửa kết quả -> next không đổi.
    (save.stats as unknown as Record<string, unknown>).zzz = 1;
    (save.gems as unknown as Record<string, unknown>).zzz = 1;
    (save.skillLevels as unknown as Record<string, unknown>).zzz = 1;
    save.skillLoadout[0] = 'khong_co' as never;
    save.extraSkills.push('khong_co' as never);
    expect(next).toEqual(nextSnap);

    // Sửa next -> kết quả (bản snapshot) không đổi.
    const again = apply(prev, next);

    expect(again).toEqual(saveSnap);
    (next.stats as unknown as Record<string, unknown>).zzz = 2;
    (next.gems as unknown as Record<string, unknown>).zzz = 2;
    (next.skillLevels as unknown as Record<string, unknown>).zzz = 2;
    next.skillLoadout[1] = 'khong_co' as never;
    next.extraSkills.push('khac' as never);
    expect(again).toEqual(saveSnap);
  });

  it('prev.migrationLog có phần tử thì được giữ nguyên (bản sao), prev không bị đổi', () => {
    const base = toV8('ranger', build('ranger', 2));
    const prev: CharacterSaveV8 = { ...base, migrationLog: ['gearLevels.x: bỏ', 'ghi chú 2'] };
    const prevSnap = clone(prev);
    const save = apply(prev, build('ranger', 5));

    expect(save.migrationLog).toEqual(['gearLevels.x: bỏ', 'ghi chú 2']);
    expect(save.migrationLog).not.toBe(prev.migrationLog);
    save.migrationLog.push('thêm');
    expect(prev).toEqual(prevSnap);
  });

  for (const id of ['mage', 'ranger'] as CharacterId[]) {
    it(`tạo/bỏ/thêm lại đồ trên ${id}: uid mới đúng nextItemSeq, không tái dùng, round-trip đúng`, () => {
      const prev = toV8(id, build(id, 1));
      const shape = v8ToV7Shape(prev);
      const newWeapon = WEAPON_IDS.find((w) => !shape.inventory.includes(w)) as WeaponId;
      const newGear = GEAR_IDS.find((g) => !shape.gearInventory.includes(g)) as GearId;
      const added: CharacterSave = {
        ...shape,
        inventory: [...shape.inventory, newWeapon],
        gearInventory: [...shape.gearInventory, newGear],
      };
      const step1 = apply(prev, added);

      expect(uidOf(step1, 'weapon', newWeapon)).toBe(`w${prev.nextItemSeq.toString(36)}`);
      expect(uidOf(step1, 'gear', newGear)).toBe(`g${(prev.nextItemSeq + 1).toString(36)}`);
      expect(step1.nextItemSeq).toBe(prev.nextItemSeq + 2);
      expect(v8ToV7Shape(step1)).toEqual(added);
      expect(step1.characterUid).toBe(prev.characterUid);

      // Bỏ món mới thêm (gồm bỏ khỏi ô trang bị nếu đang mặc).
      const removed: CharacterSave = {
        ...added,
        inventory: shape.inventory,
        gearInventory: shape.gearInventory,
      };
      const step2 = apply(step1, removed);
      const oldGearUid = uidOf(step1, 'gear', newGear) as string;

      expect(uidOf(step2, 'gear', newGear)).toBeUndefined();
      expect(step2.nextItemSeq).toBe(step1.nextItemSeq);
      expect(v8ToV7Shape(step2)).toEqual(removed);

      // Thêm lại cùng defId: uid MỚI.
      const step3 = apply(step2, added);
      const readdUid = uidOf(step3, 'gear', newGear) as string;

      expect(readdUid).not.toBe(oldGearUid);
      // Vũ khí thêm lại nhận seq trước, trang bị nhận seq kế tiếp.
      expect(readdUid).toBe(`g${(step2.nextItemSeq + 1).toString(36)}`);
      expect(step3.nextItemSeq).toBe(step2.nextItemSeq + 2);
      expect(step3.items[oldGearUid]).toBeUndefined();
      expect(validateSaveV8(step3)).toEqual([]);
    });
  }
});

describe('(8) JSON round-trip', () => {
  it('kết quả ổn định qua JSON và apply lại trên bản đã parse', () => {
    for (const a of cases) {
      const prev = toV8(a.id, build(a.id, a.variant));
      const s = build(a.id, (a.variant + 2) % 7);
      const save = apply(prev, s);
      const parsed = JSON.parse(JSON.stringify(save)) as CharacterSaveV8;

      expect(parsed).toEqual(save);
      expect(apply(parsed, s)).toEqual(save);
    }
  });
});
