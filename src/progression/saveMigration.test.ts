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
  SAVE_VERSION,
  type CharacterSave,
} from './CharacterProgress';
import {
  migrateToLatest,
  migrateV7ToV8,
  v8ToV7Shape,
  type MigrationResult,
} from './saveMigration';
import { validateSaveV8, type CharacterSaveV8 } from './saveV8';

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

function mustMigrate(id: CharacterId, v7: CharacterSave): CharacterSaveV8 {
  const result = migrateV7ToV8(id, v7);

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.save;
}

function mustOk(result: MigrationResult): CharacterSaveV8 {
  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.save;
}

describe('SAVE_VERSION runtime', () => {
  it('B1 chưa đổi SAVE_VERSION', () => {
    expect(SAVE_VERSION).toBe(7);
  });
});

describe('migrate save mặc định từng nhân vật', () => {
  for (const id of CHARACTER_IDS) {
    it(`${id}: hợp lệ và round-trip đúng v7 gốc`, () => {
      const v7 = createDefaultSave(id);
      const save = mustMigrate(id, v7);

      expect(validateSaveV8(save)).toEqual([]);
      expect(save.version).toBe(8);
      expect(save.characterUid).toBe(`ch_${id}_1`);
      expect(save.revision).toBe(1);
      expect(save.migrationLog).toEqual([]);
      expect(save.nextItemSeq).toBe(6);
      expect(save.bag).toEqual(['w1', 'w2', 'g3', 'g4', 'g5']);
      expect(v8ToV7Shape(save)).toEqual(v7);
    });
  }
});

describe('bảng toàn bộ id', () => {
  it('mỗi WeaponId và GearId thành đúng một instance đúng kind', () => {
    const v7 = normalizeCharacterSave('knight', {
      ...createDefaultSave('knight'),
      inventory: [...WEAPON_IDS],
      gearInventory: [...GEAR_IDS],
    });
    const save = mustMigrate('knight', v7);
    const items = Object.values(save.items);

    expect(items.length).toBe(WEAPON_IDS.length + GEAR_IDS.length);
    expect(save.bag.length).toBe(items.length);

    for (const id of WEAPON_IDS) {
      const found = items.filter((it) => it.kind === 'weapon' && it.defId === id);

      expect(found.length).toBe(1);
      expect(found[0].level).toBe(1);
    }

    for (const id of GEAR_IDS) {
      const found = items.filter((it) => it.kind === 'gear' && it.defId === id);

      expect(found.length).toBe(1);
    }

    expect(v8ToV7Shape(save)).toEqual(v7);
  });
});

describe('nhân vật đầy đủ', () => {
  const raw = {
    ...createDefaultSave('ranger'),
    level: 12,
    xp: 33,
    xpToNext: 140,
    statPoints: 4,
    gold: 777,
    gems: { damage: 3, vitality: 2 },
    inventory: ['blaster', 'bow', 'dragon_bow', 'dual_blades'],
    equipped: ['dragon_bow', 'bow'],
    gearInventory: [
      'cloth_hood',
      'dragon_crown',
      'cloth_robe',
      'dragon_plate',
      'swift_greaves',
      'void_treads',
    ],
    equippedGear: {
      hat: 'dragon_crown',
      armor: 'dragon_plate',
      boots: 'void_treads',
    },
    gearLevels: { dragon_crown: 5, dragon_plate: 12, cloth_robe: 99 },
    gearSockets: {
      dragon_crown: ['damage', null, 'thorns'],
      dragon_plate: [null],
      cloth_hood: ['evasion'],
    },
  };
  const v7 = normalizeCharacterSave('ranger', raw);
  const save = mustMigrate('ranger', v7);

  it('mỗi trường khớp bảng ánh xạ và bag giữ thứ tự v7', () => {
    expect(save.level).toBe(12);
    expect(save.gold).toBe(777);
    expect(save.gems).toEqual(v7.gems);
    expect(save.skillLoadout).toEqual(v7.skillLoadout);
    expect(save.extraSkills).toEqual(v7.extraSkills);
    expect(save.skillLevels).toEqual(v7.skillLevels);
    expect(save.stats).toEqual(v7.stats);

    const order = save.bag.map((uid) => save.items[uid].defId);

    expect(order).toEqual([...v7.inventory, ...v7.gearInventory]);
    expect(save.bag.slice(0, 4)).toEqual(['w1', 'w2', 'w3', 'w4']);

    const byDef = (id: GearId) =>
      Object.values(save.items).find((it) => it.kind === 'gear' && it.defId === id);

    expect(byDef('dragon_crown')).toMatchObject({
      level: 5,
      sockets: ['damage', null, 'thorns'],
    });
    expect(byDef('dragon_plate')).toMatchObject({ level: 12, sockets: [null] });
    expect(byDef('cloth_robe')).toMatchObject({ level: MAX_GEAR_LEVEL, sockets: [] });
    expect(byDef('cloth_hood')).toMatchObject({ level: 1, sockets: ['evasion'] });
    expect(byDef('void_treads')).toMatchObject({ level: 1, sockets: [] });
  });

  it('equipped/equippedGear trỏ đúng instance', () => {
    const def = (uid: string | null) => (uid ? save.items[uid].defId : null);

    expect(save.equippedWeapons.map(def)).toEqual(['dragon_bow', 'bow']);

    for (const slot of GEAR_SLOTS) {
      expect(def(save.equippedGear[slot])).toBe(v7.equippedGear[slot]);
      expect(save.items[save.equippedGear[slot] as string].kind).toBe('gear');
    }
  });

  it('round-trip đúng v7 chuẩn và sockets là bản sao sâu', () => {
    expect(v8ToV7Shape(save)).toEqual(v7);

    const crown = Object.values(save.items).find(
      (it) => it.kind === 'gear' && it.defId === 'dragon_crown',
    );

    if (crown?.kind === 'gear') {
      expect(crown.sockets).not.toBe(v7.gearSockets.dragon_crown);
    }

    expect(v7.gearSockets.dragon_crown).toEqual(['damage', null, 'thorns']);
  });

  it('một ô vũ khí null', () => {
    const v7null = normalizeCharacterSave('ranger', {
      ...raw,
      equipped: [null, 'bow'],
    });

    expect(v7null.equipped).toEqual([null, 'bow']);

    const s = mustMigrate('ranger', v7null);

    expect(s.equippedWeapons[0]).toBeNull();
    expect(s.items[s.equippedWeapons[1] as string].defId).toBe('bow');
    expect(v8ToV7Shape(s)).toEqual(v7null);
  });
});

describe('đầu vào raw xấu', () => {
  const rawCases: [string, unknown][] = [
    ['undefined', undefined],
    ['null', null],
    ['{}', {}],
    ['chuỗi', 'abc'],
    ['số', 42],
    ['mảng', [1, 2, 3]],
    ['version 0', { version: 0, level: 5 }],
    ['version 1', { version: 1, inventory: ['sword'] }],
    ['version 2', { version: 2, inventory: ['sword', 'shield'] }],
    ['version 3', { version: 3, gearInventory: ['iron_helm'] }],
    ['version 4', { version: 4, gold: 50 }],
    ['version 5', { version: 5, gearLevels: { iron_helm: 4 } }],
    ['version 6', { version: 6, gems: { damage: 2 } }],
    [
      'sai kiểu',
      {
        version: 7,
        level: 'x',
        xp: -3,
        inventory: 'sword',
        equipped: 5,
        gearInventory: { a: 1 },
        gearLevels: [],
        gold: 'nhiều',
        gems: 7,
        gearSockets: 'no',
        skillLoadout: 3,
        extraSkills: {},
        skillLevels: 'x',
      },
    ],
    [
      'gearSockets của món không có trong túi',
      {
        version: 7,
        gearInventory: ['iron_helm'],
        gearSockets: { iron_cuirass: ['damage'], iron_helm: ['thorns', 'sai'] },
      },
    ],
  ];

  for (const [name, raw] of rawCases) {
    it(`${name}: bằng normalize rồi migrate, không throw`, () => {
      const expected = migrateV7ToV8(
        'knight',
        normalizeCharacterSave('knight', raw),
      );
      let actual: MigrationResult | undefined;

      expect(() => {
        actual = migrateToLatest('knight', raw);
      }).not.toThrow();
      expect(actual).toEqual(expected);
      expect(actual?.ok).toBe(true);
    });
  }

  it('đồ mồ côi bị loại được ghi vào migrationLog', () => {
    // version 3: không nạp lại đồ khởi đầu, nên ô trang bị mặc định trỏ món không có trong túi.
    const save = mustOk(
      migrateToLatest('knight', { version: 3, gearInventory: ['iron_helm'] }),
    );

    expect(save.migrationLog.length).toBeGreaterThan(0);
    expect(save.migrationLog.some((l) => l.includes('equippedGear.armor'))).toBe(
      true,
    );
    expect(save.equippedGear.armor).toBeNull();
    expect(validateSaveV8(save)).toEqual([]);
  });

  it('gearSockets mồ côi bị normalizer v7 loại', () => {
    const save = mustOk(
      migrateToLatest('knight', {
        version: 7,
        gearInventory: ['iron_helm'],
        gearSockets: { iron_cuirass: ['damage'] },
      }),
    );
    const items = Object.values(save.items);

    expect(items.some((it) => it.kind === 'gear' && it.defId === 'iron_cuirass')).toBe(
      false,
    );
  });
});

describe('idempotent, xác định, JSON', () => {
  const samples: unknown[] = [
    undefined,
    {},
    { version: 7, inventory: ['sword'], gold: 9 },
    createDefaultSave('mage'),
  ];

  for (const [index, raw] of samples.entries()) {
    it(`mẫu ${index}`, () => {
      const first = mustOk(migrateToLatest('mage', raw));
      const again = mustOk(migrateToLatest('mage', first));

      expect(again).toEqual(first);
      expect(mustOk(migrateToLatest('mage', raw))).toEqual(first);
      expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    });
  }

  it('không đổi đầu vào v8 và trả bản sao', () => {
    const first = mustOk(migrateToLatest('knight', undefined));
    const snapshot = JSON.parse(JSON.stringify(first));
    const again = mustOk(migrateToLatest('knight', first));

    expect(first).toEqual(snapshot);
    expect(again).not.toBe(first);
  });
});

describe('v8 hỏng', () => {
  function broken(mutate: (s: any) => void): MigrationResult {
    const s = JSON.parse(
      JSON.stringify(mustOk(migrateToLatest('knight', undefined))),
    );

    mutate(s);

    return migrateToLatest('knight', s);
  }

  const cases: [string, (s: any) => void][] = [
    ['thiếu items', (s) => delete s.items],
    ['uid mồ côi trong bag', (s) => s.bag.push('w99')],
    ['equippedWeapons trỏ uid mồ côi', (s) => (s.equippedWeapons[0] = 'w77')],
    ['thiếu revision', (s) => delete s.revision],
    ['revision 0', (s) => (s.revision = 0)],
    ['nextItemSeq thấp', (s) => (s.nextItemSeq = 1)],
  ];

  for (const [name, mutate] of cases) {
    it(`${name}: ok:false, không throw`, () => {
      let result: MigrationResult | undefined;

      expect(() => {
        result = broken(mutate);
      }).not.toThrow();
      expect(result?.ok).toBe(false);

      if (result && !result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  }

  it('không tự sửa đầu vào hỏng', () => {
    const s: any = JSON.parse(
      JSON.stringify(mustOk(migrateToLatest('knight', undefined))),
    );

    delete s.items;

    const snapshot = JSON.parse(JSON.stringify(s));

    migrateToLatest('knight', s);
    expect(s).toEqual(snapshot);
  });

  it('version > 8 cũng bị từ chối', () => {
    expect(broken((s) => (s.version = 9)).ok).toBe(false);
  });
});

describe('round-trip v8ToV7Shape(migrate(s)) bằng s trên save sinh theo bảng', () => {
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

  function build(
    id: CharacterId,
    variant: number,
  ): { raw: Record<string, unknown>; v7: CharacterSave } {
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

    const raw = {
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
    };

    return { raw, v7: normalizeCharacterSave(id, raw) };
  }

  const cases: { id: CharacterId; variant: number }[] = [];

  for (const id of CHARACTER_IDS) {
    for (let variant = 0; variant < 7; variant += 1) {
      cases.push({ id, variant });
    }
  }

  it('có ít nhất 20 save sinh theo bảng', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
  });

  it('mọi save: validate sạch, round-trip bằng v7 chuẩn, migrationLog rỗng', () => {
    for (const { id, variant } of cases) {
      const { v7 } = build(id, variant);
      const result = migrateV7ToV8(id, v7);

      expect(result.ok, `${id}#${variant}`).toBe(true);

      if (result.ok) {
        expect(validateSaveV8(result.save), `${id}#${variant}`).toEqual([]);
        expect(v8ToV7Shape(result.save), `${id}#${variant}`).toEqual(v7);
        expect(result.save.migrationLog, `${id}#${variant}`).toEqual([]);
        expect(migrateV7ToV8(id, v7), `${id}#${variant}`).toEqual(result);
      }
    }
  });

  it('bảng thực sự đa dạng (level/lỗ ngọc/ô trang bị)', () => {
    const levels = new Set<number>();
    const socketShapes = new Set<string>();
    const hats = new Set<string>();

    for (const { id, variant } of cases) {
      const { v7 } = build(id, variant);

      Object.values(v7.gearLevels).forEach((l) => levels.add(l as number));
      Object.values(v7.gearSockets).forEach((s) =>
        socketShapes.add(JSON.stringify(s)),
      );
      hats.add(String(v7.equippedGear.hat));
    }

    expect(levels.size).toBeGreaterThan(4);
    expect(socketShapes.size).toBeGreaterThan(3);
    expect(hats.size).toBeGreaterThan(1);
  });
});
