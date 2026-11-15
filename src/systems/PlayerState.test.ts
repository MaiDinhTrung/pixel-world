import { describe, expect, it } from 'vitest';
import type { WeaponId } from '../combat/Weapon';
import { CHARACTERS, type CharacterId } from '../config/characters';
import {
  GEAR_IDS,
  GEAR_INFO,
  GEAR_SLOTS,
  MAX_GEAR_LEVEL,
  getGearItemLevel,
  type GearId,
  type GearLevels,
  type GearSlot,
} from '../config/gearConfig';
import {
  GEM_IDS,
  MAX_SOCKETS,
  createEmptyGemCounts,
  type GearSockets,
} from '../config/gemConfig';
import { WEAPON_IDS } from '../config/weaponInfo';
import {
  createDefaultSave,
  type CharacterSave,
} from '../progression/CharacterProgress';
import { migrateV7ToV8, v8ToV7Shape } from '../progression/saveMigration';
import { validateSaveV8, type CharacterSaveV8 } from '../progression/saveV8';
import {
  PlayerState,
  type PlayerEconomy,
  type PlayerRules,
} from './PlayerState';

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function rulesOf(id: CharacterId): PlayerRules {
  const c = CHARACTERS[id];

  return {
    allowedWeapons: c.allowedWeapons,
    startingWeapons: c.startingWeapons,
    startingGear: c.startingGear,
  };
}

function toV8(id: CharacterId, v7: CharacterSave): CharacterSaveV8 {
  const result = migrateV7ToV8(id, v7);

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.save;
}

function defaultV8(id: CharacterId): CharacterSaveV8 {
  return toV8(id, createDefaultSave(id));
}

function stateOf(id: CharacterId): PlayerState {
  return PlayerState.fromSave(defaultV8(id), rulesOf(id));
}

/** Kinh tế cố định: lỗ ngọc đủ kiểu (rỗng, có ngọc, có lỗ trống, dài hơn MAX_SOCKETS). */
function makeEconomy(): PlayerEconomy {
  const sockets: GearSockets = {};

  GEAR_IDS.forEach((id, i) => {
    const len = i % 5;

    sockets[id] = Array.from({ length: len }, (_, k) =>
      (k + i) % 2 === 0 ? GEM_IDS[(i + k) % GEM_IDS.length]! : null,
    );
  });

  return { gold: 123, gems: createEmptyGemCounts(), sockets };
}

const ECON = makeEconomy();

/** Save nền có các trường ngoài kho đồ khác mặc định để kiểm "lấy từ base". */
function makeBase(id: CharacterId): CharacterSaveV8 {
  const base = defaultV8(id);

  base.level = 7;
  base.xp = 33;
  base.statPoints = 4;
  base.gold = 5;
  base.revision = 9;
  base.migrationLog = ['ghi chú'];

  return base;
}

function snap(state: PlayerState, id: CharacterId = 'knight'): string {
  return JSON.stringify([
    state.toSave(ECON, makeBase(id)),
    state.getWeapons(),
    state.getEquippedWeapons(),
    state.getGear(),
    state.getEquippedGear(),
    state.getGearLevels(),
    state.getLoadedSockets(),
  ]);
}

function gearOfSlot(slot: GearSlot, exclude: GearId): GearId {
  const found = GEAR_IDS.find(
    (g) => GEAR_INFO[g].slot === slot && g !== exclude,
  );

  if (!found) {
    throw new Error('thiếu món thử');
  }

  return found;
}

const K = CHARACTERS.knight;
const [KSW, KSH] = K.startingWeapons; // sword, shield
const K_EXTRA: WeaponId = 'scythe'; // knight dùng được, không phải khởi đầu
const NOT_ALLOWED: WeaponId = 'bow'; // knight không dùng được

describe('PlayerState: dữ liệu thử hợp lệ', () => {
  it('giả định của test khớp CHARACTERS', () => {
    expect(K.allowedWeapons).toContain(K_EXTRA);
    expect(K.allowedWeapons).not.toContain(NOT_ALLOWED);
    expect(K.startingWeapons).toEqual(['sword', 'shield']);
  });
});

// ---------------------------------------------------------------- ma trận luật

describe('PlayerState: vũ khí (ma trận luật)', () => {
  it('ownsWeapon/getWeapons/getEquippedWeapons theo save mặc định', () => {
    const s = stateOf('knight');

    expect(s.ownsWeapon(KSW)).toBe(true);
    expect(s.ownsWeapon(K_EXTRA)).toBe(false);
    expect(s.getWeapons()).toEqual([KSW, KSH]);
    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
  });

  it('addWeapon: vũ khí mới thêm vào cuối túi', () => {
    const s = stateOf('knight');

    expect(s.addWeapon(K_EXTRA)).toEqual({ ok: true });
    expect(s.getWeapons()).toEqual([KSW, KSH, K_EXTRA]);
  });

  it('addWeapon: trùng -> owned', () => {
    const s = stateOf('knight');

    expect(s.addWeapon(KSW)).toEqual({ ok: false, reason: 'owned' });
  });

  it('removeWeapon: chưa có -> not_owned', () => {
    expect(stateOf('knight').removeWeapon(K_EXTRA)).toEqual({
      ok: false,
      reason: 'not_owned',
    });
  });

  it('removeWeapon: đang cầm -> equipped (chốt chặn)', () => {
    expect(stateOf('knight').removeWeapon(KSW)).toEqual({
      ok: false,
      reason: 'equipped',
    });
  });

  it('removeWeapon: có và không cầm -> ok, mất khỏi túi', () => {
    const s = stateOf('knight');

    s.addWeapon(K_EXTRA);
    expect(s.removeWeapon(K_EXTRA)).toEqual({ ok: true });
    expect(s.ownsWeapon(K_EXTRA)).toBe(false);
  });

  it('equipWeapon: không thuộc lớp -> not_allowed (kiểm trước cả not_owned)', () => {
    const s = stateOf('knight');

    expect(s.equipWeapon(NOT_ALLOWED, 0)).toEqual({
      ok: false,
      reason: 'not_allowed',
    });
  });

  it('equipWeapon: thuộc lớp nhưng chưa có -> not_owned', () => {
    expect(stateOf('knight').equipWeapon(K_EXTRA, 0)).toEqual({
      ok: false,
      reason: 'not_owned',
    });
  });

  it('equipWeapon: đang ở ô kia -> in_other_slot', () => {
    const s = stateOf('knight');

    expect(s.equipWeapon(KSH, 0)).toEqual({
      ok: false,
      reason: 'in_other_slot',
    });
    expect(s.equipWeapon(KSW, 1)).toEqual({
      ok: false,
      reason: 'in_other_slot',
    });
  });

  it('equipWeapon: không thuộc lớp và chưa có -> vẫn not_allowed (thứ tự kiểm)', () => {
    expect(stateOf('knight').equipWeapon('dragon_bow', 1).ok).toBe(false);
    expect(stateOf('knight').equipWeapon('dragon_bow', 1)).toEqual({
      ok: false,
      reason: 'not_allowed',
    });
  });

  it('equipWeapon: thay vũ khí ô đang có', () => {
    const s = stateOf('knight');

    s.addWeapon(K_EXTRA);
    expect(s.equipWeapon(K_EXTRA, 1)).toEqual({ ok: true });
    expect(s.getEquippedWeapons()).toEqual([KSW, K_EXTRA]);
  });

  it('equipWeapon: trang bị lại đúng ô đang giữ nó vẫn ok', () => {
    const s = stateOf('knight');

    expect(s.equipWeapon(KSW, 0)).toEqual({ ok: true });
    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
  });

  it('equipWeapon: vào ô trống', () => {
    const s = stateOf('knight');

    s.unequipWeapon(1);
    s.addWeapon(K_EXTRA);
    expect(s.equipWeapon(K_EXTRA, 1)).toEqual({ ok: true });
    expect(s.getEquippedWeapons()[1]).toBe(K_EXTRA);
  });

  it('unequipWeapon: ô có vũ khí -> ok kèm id, ô trống sau đó', () => {
    const s = stateOf('knight');

    expect(s.unequipWeapon(0)).toEqual({ ok: true, id: KSW });
    expect(s.getEquippedWeapons()).toEqual([null, KSH]);
    expect(s.ownsWeapon(KSW)).toBe(true);
  });

  it('unequipWeapon: ô trống -> empty', () => {
    const s = stateOf('knight');

    s.unequipWeapon(1);
    expect(s.unequipWeapon(1)).toEqual({ ok: false, reason: 'empty' });
  });

  it('discardWeapon: chưa có -> not_owned', () => {
    expect(stateOf('knight').discardWeapon(K_EXTRA)).toEqual({
      ok: false,
      reason: 'not_owned',
    });
  });

  it('discardWeapon: đang cầm -> equipped', () => {
    expect(stateOf('knight').discardWeapon(KSH)).toEqual({
      ok: false,
      reason: 'equipped',
    });
  });

  it('discardWeapon: đã tháo -> ok, mất khỏi túi', () => {
    const s = stateOf('knight');

    s.unequipWeapon(1);
    expect(s.discardWeapon(KSH)).toEqual({ ok: true });
    expect(s.ownsWeapon(KSH)).toBe(false);
  });
});

describe('PlayerState: trang bị và cấp (ma trận luật)', () => {
  const helm = K.startingGear.hat;
  const otherHat = gearOfSlot('hat', helm);

  it('ownsGear/getGear/getEquippedGear theo save mặc định', () => {
    const s = stateOf('knight');

    expect(s.ownsGear(helm)).toBe(true);
    expect(s.ownsGear(otherHat)).toBe(false);
    expect(s.getGear()).toEqual([
      K.startingGear.hat,
      K.startingGear.armor,
      K.startingGear.boots,
    ]);
    expect(s.getEquippedGear()).toEqual({ ...K.startingGear });
  });

  it('getGearLevel mặc định 1, kể cả món không có; getGearLevels rỗng', () => {
    const s = stateOf('knight');

    expect(s.getGearLevel(helm)).toBe(1);
    expect(s.getGearLevel(otherHat)).toBe(1);
    expect(s.getGearLevels()).toEqual({});
    expect(getGearItemLevel(s.getGearLevels(), helm)).toBe(1);
  });

  it('addGear: thêm vào cuối; trùng -> owned', () => {
    const s = stateOf('knight');

    expect(s.addGear(otherHat)).toEqual({ ok: true });
    expect(s.getGear()[3]).toBe(otherHat);
    expect(s.addGear(otherHat)).toEqual({ ok: false, reason: 'owned' });
    expect(s.addGear(helm)).toEqual({ ok: false, reason: 'owned' });
  });

  it('setGearLevel: kẹp [1, MAX]; chỉ mục > 1 xuất hiện ở getGearLevels', () => {
    const s = stateOf('knight');

    expect(s.setGearLevel(helm, 5)).toEqual({ ok: true });
    expect(s.getGearLevel(helm)).toBe(5);
    expect(s.getGearLevels()).toEqual({ [helm]: 5 });
    s.setGearLevel(helm, 0);
    expect(s.getGearLevel(helm)).toBe(1);
    expect(s.getGearLevels()).toEqual({});
    s.setGearLevel(helm, -10);
    expect(s.getGearLevel(helm)).toBe(1);
    s.setGearLevel(helm, MAX_GEAR_LEVEL + 50);
    expect(s.getGearLevel(helm)).toBe(MAX_GEAR_LEVEL);
  });

  it('setGearLevel: món không có -> not_owned', () => {
    expect(stateOf('knight').setGearLevel(otherHat, 3)).toEqual({
      ok: false,
      reason: 'not_owned',
    });
  });

  it('rewardGear: món đã có lên max(tier+1, cấp+1)', () => {
    const s = stateOf('knight');

    expect(s.rewardGear(helm, 1)).toEqual({ ok: true, level: 2 }); // max(2, 2)
    expect(s.rewardGear(helm, 5)).toEqual({ ok: true, level: 6 }); // max(6, 3)
    expect(s.rewardGear(helm, 2)).toEqual({ ok: true, level: 7 }); // max(3, 7)
    expect(s.getGearLevel(helm)).toBe(7);
  });

  it('rewardGear: kẹp MAX_GEAR_LEVEL', () => {
    const s = stateOf('knight');

    s.setGearLevel(helm, MAX_GEAR_LEVEL);
    expect(s.rewardGear(helm, 3)).toEqual({
      ok: true,
      level: MAX_GEAR_LEVEL,
    });
    expect(s.rewardGear(helm, 500)).toEqual({
      ok: true,
      level: MAX_GEAR_LEVEL,
    });
  });

  it('rewardGear: món chưa có -> thêm vào túi, cấp max(tier+1, 2)', () => {
    const s = stateOf('knight');

    expect(s.rewardGear(otherHat, 3)).toEqual({ ok: true, level: 4 });
    expect(s.ownsGear(otherHat)).toBe(true);
    expect(s.getGearLevel(otherHat)).toBe(4);
    expect(s.getEquippedGear().hat).toBe(helm);
  });

  it('removeGear: chưa có -> not_owned; đang mặc -> equipped', () => {
    const s = stateOf('knight');

    expect(s.removeGear(otherHat)).toEqual({ ok: false, reason: 'not_owned' });
    expect(s.removeGear(helm)).toEqual({ ok: false, reason: 'equipped' });
  });

  it('removeGear: ok xóa cả cấp (thêm lại về cấp 1)', () => {
    const s = stateOf('knight');

    s.rewardGear(otherHat, 4);
    expect(s.removeGear(otherHat)).toEqual({ ok: true });
    expect(s.ownsGear(otherHat)).toBe(false);
    expect(s.getGearLevels()).toEqual({});
    s.addGear(otherHat);
    expect(s.getGearLevel(otherHat)).toBe(1);
  });

  it('equipGear: not_owned trước, rồi already_equipped', () => {
    const s = stateOf('knight');

    expect(s.equipGear(otherHat)).toEqual({ ok: false, reason: 'not_owned' });
    expect(s.equipGear(helm)).toEqual({
      ok: false,
      reason: 'already_equipped',
    });
  });

  it('equipGear: ô theo GEAR_INFO[id].slot, thay món cũ trong ô', () => {
    const s = stateOf('knight');

    s.addGear(otherHat);
    expect(s.equipGear(otherHat)).toEqual({
      ok: true,
      slot: GEAR_INFO[otherHat].slot,
    });
    expect(s.getEquippedGear().hat).toBe(otherHat);
    expect(s.ownsGear(helm)).toBe(true);
  });

  it('unequipGear: ô có -> ok kèm id; ô trống -> empty', () => {
    const s = stateOf('knight');

    expect(s.unequipGear('hat')).toEqual({ ok: true, id: helm });
    expect(s.getEquippedGear().hat).toBeNull();
    expect(s.ownsGear(helm)).toBe(true);
    expect(s.unequipGear('hat')).toEqual({ ok: false, reason: 'empty' });
  });

  it('discardGear: not_owned -> equipped (đang mặc) -> ok xóa cả cấp', () => {
    const s = stateOf('knight');

    expect(s.discardGear(otherHat)).toEqual({ ok: false, reason: 'not_owned' });
    expect(s.discardGear(helm)).toEqual({ ok: false, reason: 'equipped' });
    s.rewardGear(helm, 3);
    s.unequipGear('hat');
    expect(s.discardGear(helm)).toEqual({ ok: true });
    expect(s.ownsGear(helm)).toBe(false);
    expect(s.getGearLevels()).toEqual({});
  });

  it('getGearLevels/getEquippedGear/getWeapons trả bản sao', () => {
    const s = stateOf('knight');

    s.setGearLevel(helm, 3);
    s.getGearLevels()[helm] = 50;
    s.getEquippedGear().hat = null;
    s.getWeapons().push('hammer');
    s.getEquippedWeapons()[0] = null;
    expect(s.getGearLevel(helm)).toBe(3);
    expect(s.getEquippedGear().hat).toBe(helm);
    expect(s.getWeapons()).toEqual([KSW, KSH]);
    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
  });
});

// ---------------------------------------------------------------- fromSave

describe('PlayerState.fromSave: các ca nạp (dữ liệu CHARACTERS thật)', () => {
  function v7Knight(patch: Partial<CharacterSave>): CharacterSaveV8 {
    return toV8('knight', { ...createDefaultSave('knight'), ...patch });
  }

  function load(save: CharacterSaveV8): PlayerState {
    return PlayerState.fromSave(save, rulesOf('knight'));
  }

  it('save nhất quán: giữ nguyên túi, ô vũ khí, trang bị', () => {
    const s = load(defaultV8('knight'));

    expect(s.getWeapons()).toEqual([KSW, KSH]);
    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
    expect(s.getEquippedGear()).toEqual({ ...K.startingGear });
  });

  it('lọc vũ khí ngoài lớp ra khỏi túi', () => {
    const s = load(
      v7Knight({
        inventory: [KSW, KSH, NOT_ALLOWED, K_EXTRA],
        equipped: [KSW, KSH],
      }),
    );

    expect(s.getWeapons()).toEqual([KSW, KSH, K_EXTRA]);
    expect(s.ownsWeapon(NOT_ALLOWED)).toBe(false);
  });

  it('thêm vũ khí khởi đầu còn thiếu vào cuối, cấp uid mới từ nextItemSeq', () => {
    const save = v7Knight({
      inventory: [KSW],
      equipped: [KSW, null],
    });
    const before = save.nextItemSeq;
    const s = load(save);

    expect(s.getWeapons()).toEqual([KSW, KSH]);
    const out = s.toSave(ECON, save);
    const uid = out.bag[out.bag.length - 1]!;

    expect(out.items[uid]).toMatchObject({ kind: 'weapon', defId: KSH });
    expect(uid).toBe(`w${before.toString(36)}`);
    expect(out.nextItemSeq).toBe(before + 1);
    expect(out.equippedWeapons).toEqual([save.equippedWeapons[0], null]);
  });

  it('thêm cả hai vũ khí khởi đầu khi túi rỗng vũ khí (theo thứ tự startingWeapons)', () => {
    const save = v7Knight({ inventory: [K_EXTRA], equipped: [K_EXTRA, null] });
    const s = load(save);

    expect(s.getWeapons()).toEqual([K_EXTRA, KSW, KSH]);
    expect(s.getEquippedWeapons()).toEqual([K_EXTRA, null]);
  });

  it('giữ uid trên đĩa của mọi đồ còn lại', () => {
    const save = v7Knight({
      inventory: [KSW, KSH, K_EXTRA],
      equipped: [K_EXTRA, KSH],
    });
    const out = load(save).toSave(ECON, save);

    expect(out.items).toEqual(
      Object.fromEntries(
        Object.entries(save.items).map(([uid, it]) => [
          uid,
          it.kind === 'gear'
            ? { ...it, sockets: (ECON.sockets[it.defId] ?? []).slice(0, MAX_SOCKETS) }
            : it,
        ]),
      ),
    );
    expect(out.bag).toEqual(save.bag);
    expect(out.equippedWeapons).toEqual(save.equippedWeapons);
  });

  it('ô 1 bị lọc (vũ khí ngoài lớp), ô 2 là vũ khí khởi đầu thứ 2 -> ô 1 = khởi đầu đầu tiên', () => {
    const s = load(
      v7Knight({ inventory: [NOT_ALLOWED, KSW, KSH], equipped: [NOT_ALLOWED, KSH] }),
    );

    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
  });

  it('ô 1 bị lọc, ô 2 là vũ khí khởi đầu đầu tiên -> ô 1 = khởi đầu thứ hai, ô 2 giữ', () => {
    const s = load(
      v7Knight({ inventory: [NOT_ALLOWED, KSW, KSH], equipped: [NOT_ALLOWED, KSW] }),
    );

    expect(s.getEquippedWeapons()).toEqual([KSH, KSW]);
  });

  it('ô 1 bị lọc, ô 2 là vũ khí thường khác -> ô 1 = khởi đầu đầu tiên', () => {
    const s = load(
      v7Knight({
        inventory: [NOT_ALLOWED, KSW, KSH, K_EXTRA],
        equipped: [NOT_ALLOWED, K_EXTRA],
      }),
    );

    expect(s.getEquippedWeapons()).toEqual([KSW, K_EXTRA]);
  });

  it('ô 1 trống (null), ô 2 là vũ khí khởi đầu đầu tiên', () => {
    const s = load(v7Knight({ equipped: [null, KSW] }));

    expect(s.getEquippedWeapons()).toEqual([KSH, KSW]);
  });

  it('ô 1 trống, ô 2 trống -> ô 1 = khởi đầu đầu tiên, ô 2 trống', () => {
    const s = load(v7Knight({ equipped: [null, null] }));

    expect(s.getEquippedWeapons()).toEqual([KSW, null]);
  });

  it('ô 1 hợp lệ, ô 2 bị lọc -> ô 2 trống', () => {
    const s = load(
      v7Knight({
        inventory: [KSW, KSH, NOT_ALLOWED],
        equipped: [KSW, NOT_ALLOWED],
      }),
    );

    expect(s.getEquippedWeapons()).toEqual([KSW, null]);
  });

  it('ô 2 trùng ô 1 (save v8 dựng tay, hai ô cùng uid) -> ô 2 trống', () => {
    const save = defaultV8('knight');

    save.equippedWeapons = [save.equippedWeapons[0], save.equippedWeapons[0]];
    const s = load(save);

    expect(s.getEquippedWeapons()).toEqual([KSW, null]);
  });

  it('ô 1 trống, ô 2 là vũ khí thường -> ô 1 = khởi đầu đầu tiên, ô 2 giữ', () => {
    const s = load(
      v7Knight({ inventory: [KSW, KSH, K_EXTRA], equipped: [null, K_EXTRA] }),
    );

    expect(s.getEquippedWeapons()).toEqual([KSW, K_EXTRA]);
  });

  it('ô 1 trống, ô 2 là vũ khí khởi đầu thứ hai -> ô 1 = khởi đầu đầu tiên', () => {
    const s = load(v7Knight({ equipped: [null, KSH] }));

    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
  });

  it('trang bị giữ nguyên như save, không lọc, kể cả cấp', () => {
    const save = v7Knight({
      gearInventory: ['dragon_crown', 'cloth_robe', 'void_treads'],
      equippedGear: { hat: 'dragon_crown', armor: null, boots: 'void_treads' },
      gearLevels: { dragon_crown: 6 },
    });
    const s = load(save);

    expect(s.getGear()).toEqual(['dragon_crown', 'cloth_robe', 'void_treads']);
    expect(s.getEquippedGear()).toEqual({
      hat: 'dragon_crown',
      armor: null,
      boots: 'void_treads',
    });
    expect(s.getGearLevels()).toEqual({ dragon_crown: 6 });
  });

  it('getLoadedSockets: chỉ mục không rỗng, đúng giá trị save, bản sao sâu', () => {
    const save = v7Knight({
      gearSockets: {
        iron_helm: [GEM_IDS[0]!, null],
        worn_boots: [null],
      },
    });
    const s = load(save);
    const got = s.getLoadedSockets();

    expect(got).toEqual({ iron_helm: [GEM_IDS[0], null], worn_boots: [null] });
    got.iron_helm![0] = null;
    expect(s.getLoadedSockets().iron_helm![0]).toBe(GEM_IDS[0]);
    expect(load(defaultV8('knight')).getLoadedSockets()).toEqual({});
  });

  it('không sửa save đầu vào', () => {
    const save = v7Knight({
      inventory: [NOT_ALLOWED, KSW],
      equipped: [NOT_ALLOWED, null],
    });
    const copy = clone(save);
    const s = load(save);

    s.addWeapon(K_EXTRA);
    s.rewardGear('dragon_crown', 3);
    expect(save).toEqual(copy);
  });

  it.each(CHARACTER_IDS)('save mặc định của %s nạp ra đúng ô và túi', (id) => {
    const s = stateOf(id);
    const c = CHARACTERS[id];

    expect(s.getWeapons()).toEqual([...c.startingWeapons]);
    expect(s.getEquippedWeapons()).toEqual([...c.startingWeapons]);
    expect(s.getEquippedGear()).toEqual({ ...c.startingGear });
  });
});

// ---------------------------------------------------------------- mô hình tham chiếu

type Outcome = string;

/** Dựng lại đúng các phép toán hiện tại của WorldScene trên mảng/Record dạng v7. */
class RefModel {
  inventory: WeaponId[];
  equipped: [WeaponId | null, WeaponId | null];
  gearInventory: GearId[];
  equippedGear: Record<GearSlot, GearId | null>;
  gearLevels: GearLevels;
  private readonly allowed: readonly WeaponId[];

  constructor(v7: CharacterSave, rules: PlayerRules) {
    this.inventory = [...v7.inventory];
    this.equipped = [v7.equipped[0], v7.equipped[1]];
    this.gearInventory = [...v7.gearInventory];
    this.equippedGear = { ...v7.equippedGear };
    this.gearLevels = { ...v7.gearLevels };
    this.allowed = rules.allowedWeapons;
  }

  equipWeapon(id: WeaponId, slot: 0 | 1): Outcome {
    if (!this.allowed.includes(id)) return 'not_allowed';
    if (!this.inventory.includes(id)) return 'not_owned';
    const other: 0 | 1 = slot === 0 ? 1 : 0;

    if (this.equipped[other] === id) return 'in_other_slot';
    this.equipped[slot] = id;

    return 'ok';
  }

  unequipWeapon(slot: 0 | 1): Outcome {
    if (this.equipped[slot] === null) return 'empty';
    this.equipped[slot] = null;

    return 'ok';
  }

  /** Hòm vũ khí (pickUpChest). */
  addWeapon(id: WeaponId): Outcome {
    if (this.inventory.includes(id)) return 'owned';
    this.inventory.push(id);

    return 'ok';
  }

  /** discardWeapon của scene; bán ở làng (host.removeWeapon) cùng phép lọc, điều kiện do VillageService chặn. */
  discardWeapon(id: WeaponId): Outcome {
    if (!this.inventory.includes(id)) return 'not_owned';
    if (this.equipped.includes(id)) return 'equipped';
    this.inventory = this.inventory.filter((x) => x !== id);

    return 'ok';
  }

  equipGear(id: GearId): Outcome {
    if (!this.gearInventory.includes(id)) return 'not_owned';
    const slot = GEAR_INFO[id].slot;

    if (this.equippedGear[slot] === id) return 'already_equipped';
    this.equippedGear[slot] = id;

    return 'ok';
  }

  unequipGear(slot: GearSlot): Outcome {
    if (!this.equippedGear[slot]) return 'empty';
    this.equippedGear[slot] = null;

    return 'ok';
  }

  /** Hòm trang bị (pickUpChest). */
  addGear(id: GearId): Outcome {
    if (this.gearInventory.includes(id)) return 'owned';
    this.gearInventory.push(id);

    return 'ok';
  }

  /** grantBossLoot với id đã chọn sẵn. */
  rewardGear(id: GearId, tier: number): Outcome {
    const current = getGearItemLevel(this.gearLevels, id);

    this.gearLevels[id] = Math.min(
      MAX_GEAR_LEVEL,
      Math.max(tier + 1, current + 1),
    );
    if (!this.gearInventory.includes(id)) this.gearInventory.push(id);

    return 'ok';
  }

  discardGear(id: GearId): Outcome {
    if (!this.gearInventory.includes(id)) return 'not_owned';
    if (Object.values(this.equippedGear).includes(id)) return 'equipped';
    this.gearInventory = this.gearInventory.filter((x) => x !== id);
    delete this.gearLevels[id];

    return 'ok';
  }

  /** host.setGearLevel; VillageService chỉ gọi với món đã có nên món lạ bị bỏ qua. */
  setGearLevel(id: GearId, level: number): Outcome {
    if (!this.gearInventory.includes(id)) return 'not_owned';
    this.gearLevels[id] = Math.min(MAX_GEAR_LEVEL, Math.max(1, level));

    return 'ok';
  }

  /** Dạng v7 mà cầu nối sẽ ghi (gearLevels > 1 của món có trong túi, lỗ ngọc từ economy). */
  toV7(economy: PlayerEconomy, base: CharacterSaveV8): CharacterSave {
    const gearLevels: GearLevels = {};
    const gearSockets: GearSockets = {};

    for (const id of this.gearInventory) {
      const level = getGearItemLevel(this.gearLevels, id);

      if (level > 1) gearLevels[id] = level;

      const sockets = (economy.sockets[id] ?? []).slice(0, MAX_SOCKETS);

      if (sockets.length > 0) gearSockets[id] = [...sockets];
    }

    return {
      ...v8ToV7Shape(base),
      inventory: [...this.inventory],
      equipped: [this.equipped[0], this.equipped[1]],
      gearInventory: [...this.gearInventory],
      equippedGear: { ...this.equippedGear },
      gearLevels,
      gold: economy.gold,
      gems: clone(economy.gems),
      gearSockets,
    };
  }
}

function resultOf(
  r: { ok: true } | { ok: false; reason: string },
): Outcome {
  return r.ok ? 'ok' : r.reason;
}

const OP_NAMES = [
  'equipWeapon',
  'unequipWeapon',
  'addWeapon',
  'discardWeapon',
  'removeWeapon',
  'equipGear',
  'unequipGear',
  'addGear',
  'discardGear',
  'removeGear',
  'rewardGear',
  'setGearLevel',
] as const;

const SEQUENCE_COUNT = 36;
const STEPS = 48;

/** Chạy một chuỗi xác định (số học, không ngẫu nhiên) và so từng bước với mô hình. */
function runSequence(
  id: CharacterId,
  seq: number,
  coverage: Map<string, number>,
): void {
  const rules = rulesOf(id);
  const v7 = createDefaultSave(id);
  const base = makeBase(id);
  const state = PlayerState.fromSave(defaultV8(id), rules);
  const model = new RefModel(v7, rules);

  for (let t = 0; t < STEPS; t += 1) {
    const op = OP_NAMES[(seq * 5 + t * 7 + ((t * t) % 11)) % OP_NAMES.length]!;
    const slot = ((seq + (t >> 1)) % 2) as 0 | 1;
    const gslot = GEAR_SLOTS[(seq + t) % GEAR_SLOTS.length]!;
    const tier = (seq + t) % 6;
    const level = ((seq * 13 + t * 17) % 120) - 5;
    const pickW = (): WeaponId => {
      const n = seq * 3 + t * 5 + t * t;

      if (t % 3 === 0) return rules.allowedWeapons[n % rules.allowedWeapons.length]!;
      if (t % 3 === 1 && model.inventory.length > 0) return model.inventory[n % model.inventory.length]!;

      return WEAPON_IDS[n % WEAPON_IDS.length]!;
    };
    const pickG = (): GearId => {
      const n = seq * 7 + t * 3 + (t >> 1);

      if (t % 2 === 1 && model.gearInventory.length > 0) return model.gearInventory[n % model.gearInventory.length]!;

      return GEAR_IDS[n % GEAR_IDS.length]!;
    };

    let actual: Outcome;
    let expected: Outcome;

    switch (op) {
      case 'equipWeapon': {
        const w = pickW();

        expected = model.equipWeapon(w, slot);
        actual = resultOf(state.equipWeapon(w, slot));
        break;
      }
      case 'unequipWeapon':
        expected = model.unequipWeapon(slot);
        actual = resultOf(state.unequipWeapon(slot));
        break;
      case 'addWeapon': {
        const w = pickW();

        expected = model.addWeapon(w);
        actual = resultOf(state.addWeapon(w));
        break;
      }
      case 'discardWeapon': {
        const w = pickW();

        expected = model.discardWeapon(w);
        actual = resultOf(state.discardWeapon(w));
        break;
      }
      case 'removeWeapon': {
        const w = pickW();

        expected = model.discardWeapon(w);
        actual = resultOf(state.removeWeapon(w));
        break;
      }
      case 'equipGear': {
        const g = pickG();

        expected = model.equipGear(g);
        actual = resultOf(state.equipGear(g));
        break;
      }
      case 'unequipGear':
        expected = model.unequipGear(gslot);
        actual = resultOf(state.unequipGear(gslot));
        break;
      case 'addGear': {
        const g = pickG();

        expected = model.addGear(g);
        actual = resultOf(state.addGear(g));
        break;
      }
      case 'discardGear': {
        const g = pickG();

        expected = model.discardGear(g);
        actual = resultOf(state.discardGear(g));
        break;
      }
      case 'removeGear': {
        const g = pickG();

        expected = model.discardGear(g);
        actual = resultOf(state.removeGear(g));
        break;
      }
      case 'rewardGear': {
        const g = pickG();

        expected = model.rewardGear(g, tier);
        actual = resultOf(state.rewardGear(g, tier));
        break;
      }
      default: {
        const g = pickG();

        expected = model.setGearLevel(g, level);
        actual = resultOf(state.setGearLevel(g, level));
        break;
      }
    }

    const label = `${id} chuỗi ${seq} bước ${t} (${op})`;

    expect(actual, label).toBe(expected);
    coverage.set(`${op}:${actual}`, (coverage.get(`${op}:${actual}`) ?? 0) + 1);

    const saved = state.toSave(ECON, base);

    expect(validateSaveV8(saved), label).toEqual([]);
    expect(v8ToV7Shape(saved), label).toEqual(model.toV7(ECON, base));
    expect(state.getWeapons(), label).toEqual(model.inventory);
    expect(state.getEquippedWeapons(), label).toEqual(model.equipped);
    expect(state.getGear(), label).toEqual(model.gearInventory);
    expect(state.getEquippedGear(), label).toEqual(model.equippedGear);
  }
}

describe('PlayerState: đối chiếu mô hình tham chiếu (logic cũ của WorldScene)', () => {
  const coverage = new Map<string, number>();

  it.each(CHARACTER_IDS)(
    `${SEQUENCE_COUNT} chuỗi thao tác xác định trên save mặc định của %s khớp dạng v7`,
    (id) => {
      for (let seq = 0; seq < SEQUENCE_COUNT; seq += 1) {
        runSequence(id, seq, coverage);
      }
    },
  );

  it('các chuỗi phủ cả nhánh ok lẫn từng lý do từ chối chính', () => {
    const must = [
      'equipWeapon:ok',
      'equipWeapon:not_allowed',
      'equipWeapon:not_owned',
      'equipWeapon:in_other_slot',
      'unequipWeapon:ok',
      'unequipWeapon:empty',
      'addWeapon:ok',
      'addWeapon:owned',
      'discardWeapon:ok',
      'discardWeapon:equipped',
      'discardWeapon:not_owned',
      'removeWeapon:ok',
      'equipGear:ok',
      'equipGear:already_equipped',
      'equipGear:not_owned',
      'unequipGear:ok',
      'unequipGear:empty',
      'addGear:ok',
      'addGear:owned',
      'discardGear:ok',
      'discardGear:equipped',
      'discardGear:not_owned',
      'removeGear:ok',
      'rewardGear:ok',
      'setGearLevel:ok',
      'setGearLevel:not_owned',
    ];

    for (const key of must) {
      expect(coverage.get(key) ?? 0, key).toBeGreaterThan(0);
    }
  });

  it('có ít nhất 30 chuỗi mỗi nhân vật', () => {
    expect(SEQUENCE_COUNT).toBeGreaterThanOrEqual(30);
  });
});

// ---------------------------------------------------------------- toSave / fromSave

describe('PlayerState.toSave', () => {
  it('lấy trường ngoài kho đồ từ base, gold/gems từ economy', () => {
    const base = makeBase('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));
    const economy = {
      ...ECON,
      gold: 777,
      gems: { ...createEmptyGemCounts(), [GEM_IDS[0]!]: 4 },
    };
    const out = s.toSave(economy, base);

    expect(out.level).toBe(7);
    expect(out.xp).toBe(33);
    expect(out.statPoints).toBe(4);
    expect(out.revision).toBe(9);
    expect(out.characterUid).toBe(base.characterUid);
    expect(out.migrationLog).toEqual(['ghi chú']);
    expect(out.gold).toBe(777);
    expect(out.gems).toEqual(economy.gems);
    expect(out.skillLoadout).toEqual(base.skillLoadout);
    expect(out.skillLevels).toEqual(base.skillLevels);
    expect(out.version).toBe(8);
  });

  it('sao chép sâu: sửa kết quả không đổi base, state hay economy', () => {
    const base = makeBase('knight');
    const s = stateOf('knight');
    const baseCopy = clone(base);
    const out = s.toSave(ECON, base);

    out.stats = { ...out.stats };
    out.skillLevels['x' as never] = 1 as never;
    out.migrationLog.push('x');
    out.bag.push('zz');
    out.gems = { ...out.gems };
    Object.values(out.items).forEach((it) => {
      if (it.kind === 'gear') it.sockets.push(null);
    });
    expect(base).toEqual(baseCopy);
    expect(s.toSave(ECON, base)).toEqual(
      stateOf('knight').toSave(makeEconomy(), baseCopy),
    );
  });

  it('lỗ ngọc từng instance = economy.sockets cắt MAX_SOCKETS, món vắng -> []', () => {
    const base = defaultV8('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));
    const hat = K.startingGear.hat;
    const out = s.toSave(
      {
        gold: 1,
        gems: createEmptyGemCounts(),
        sockets: {
          [hat]: [GEM_IDS[0]!, null, GEM_IDS[1]!, GEM_IDS[0]!],
          dragon_crown: [GEM_IDS[0]!],
        },
      },
      base,
    );
    const hatItem = Object.values(out.items).find(
      (it) => it.kind === 'gear' && it.defId === hat,
    );
    const armorItem = Object.values(out.items).find(
      (it) => it.kind === 'gear' && it.defId === K.startingGear.armor,
    );

    expect(hatItem).toMatchObject({
      sockets: [GEM_IDS[0], null, GEM_IDS[1]],
    });
    expect(armorItem).toMatchObject({ sockets: [] });
    // socket của món không có trong túi bị bỏ
    expect(JSON.stringify(out)).not.toContain('dragon_crown');
  });

  it('bag giữ thứ tự thêm; vũ khí/trang bị mới nối cuối', () => {
    const base = defaultV8('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));

    s.addWeapon(K_EXTRA);
    s.addGear('dragon_crown');
    const out = s.toSave(ECON, base);
    const defs = out.bag.map((uid) => out.items[uid]!.defId);

    expect(defs).toEqual([
      ...K.startingWeapons,
      K.startingGear.hat,
      K.startingGear.armor,
      K.startingGear.boots,
      K_EXTRA,
      'dragon_crown',
    ]);
  });

  it('economy không hợp lệ -> ném Error có thông điệp rõ', () => {
    const base = defaultV8('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));

    expect(() =>
      s.toSave(
        {
          gold: Number.NaN,
          gems: createEmptyGemCounts(),
          sockets: {},
        },
        base,
      ),
    ).toThrow(/PlayerState\.toSave/);
  });

  it('save hợp lệ theo validateSaveV8 sau mọi thao tác', () => {
    const base = defaultV8('mage');
    const s = PlayerState.fromSave(base, rulesOf('mage'));

    s.addWeapon('void_staff');
    s.equipWeapon('void_staff', 1);
    s.rewardGear('dragon_plate', 4);
    s.equipGear('dragon_plate');
    expect(validateSaveV8(s.toSave(ECON, base))).toEqual([]);
  });
});

describe('PlayerState: round-trip, idempotent, uid', () => {
  function fullSave(): CharacterSaveV8 {
    return toV8('knight', {
      ...createDefaultSave('knight'),
      level: 12,
      xp: 5,
      gold: 321,
      inventory: [KSW, KSH, K_EXTRA, 'hammer'],
      equipped: [K_EXTRA, KSH],
      gearInventory: ['iron_helm', 'dragon_crown', 'iron_cuirass', 'worn_boots', 'void_treads'],
      equippedGear: { hat: 'dragon_crown', armor: 'iron_cuirass', boots: null },
      gearLevels: { dragon_crown: 8, iron_cuirass: 2 },
      gearSockets: {
        dragon_crown: [GEM_IDS[0]!, null, GEM_IDS[1]!],
        iron_cuirass: [null],
      },
    });
  }

  function economyOf(save: CharacterSaveV8): PlayerEconomy {
    const v7 = v8ToV7Shape(save);

    return { gold: v7.gold, gems: v7.gems, sockets: v7.gearSockets };
  }

  it('toSave(fromSave(x)) deepEqual x (x nhất quán, nhiều kiểu)', () => {
    const inputs = [
      ...CHARACTER_IDS.map(defaultV8),
      fullSave(),
      makeBase('ranger'),
    ];

    for (const x of inputs) {
      const rules = rulesOf(x.characterUid.split('_')[1] as CharacterId);

      expect(
        PlayerState.fromSave(x, rules).toSave(economyOf(x), x),
      ).toEqual(x);
    }
  });

  it('idempotent: nạp lại kết quả toSave rồi lưu cho đúng cùng kết quả', () => {
    const x = fullSave();
    const rules = rulesOf('knight');
    const once = PlayerState.fromSave(x, rules).toSave(economyOf(x), x);
    const twice = PlayerState.fromSave(once, rules).toSave(economyOf(once), once);

    expect(twice).toEqual(once);
    // gọi toSave hai lần liên tiếp cũng như nhau, không đổi trạng thái
    const s = PlayerState.fromSave(x, rules);

    expect(s.toSave(economyOf(x), x)).toEqual(s.toSave(economyOf(x), x));
  });

  it('uid xác định: hai lần chạy cùng thao tác cho cùng save', () => {
    function run(): CharacterSaveV8 {
      const base = defaultV8('knight');
      const s = PlayerState.fromSave(base, rulesOf('knight'));

      s.addWeapon(K_EXTRA);
      s.rewardGear('dragon_crown', 2);
      s.addWeapon('hammer');

      return s.toSave(ECON, base);
    }

    expect(run()).toEqual(run());
  });

  it('uid cấp từ nextItemSeq theo kind: w/g + base36', () => {
    const base = defaultV8('knight'); // 5 món đã dùng seq 1..5
    const s = PlayerState.fromSave(base, rulesOf('knight'));

    s.addWeapon(K_EXTRA);
    s.addGear('dragon_crown');
    const out = s.toSave(ECON, base);

    expect(out.items['w6']).toMatchObject({ defId: K_EXTRA });
    expect(out.items['g7']).toMatchObject({ defId: 'dragon_crown' });
    expect(out.nextItemSeq).toBe(8);
  });

  it('uid đã bỏ không tái dùng: bỏ rồi thêm lại ra uid mới, nextItemSeq chỉ tăng', () => {
    const base = defaultV8('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));

    s.addWeapon(K_EXTRA);
    const first = s.toSave(ECON, base);
    const firstUid = Object.values(first.items).find(
      (it) => it.defId === K_EXTRA,
    )!.uid;

    s.discardWeapon(K_EXTRA);
    const mid = s.toSave(ECON, base);

    expect(mid.items[firstUid]).toBeUndefined();
    expect(mid.nextItemSeq).toBe(first.nextItemSeq);
    s.addWeapon(K_EXTRA);
    const again = s.toSave(ECON, base);
    const secondUid = Object.values(again.items).find(
      (it) => it.defId === K_EXTRA,
    )!.uid;

    expect(secondUid).not.toBe(firstUid);
    expect(again.nextItemSeq).toBe(first.nextItemSeq + 1);
  });

  it('uid bỏ khi lọc lúc nạp cũng không bị cấp lại', () => {
    const base = toV8('knight', {
      ...createDefaultSave('knight'),
      inventory: [NOT_ALLOWED, KSW],
      equipped: [NOT_ALLOWED, null],
    });
    const s = PlayerState.fromSave(base, rulesOf('knight'));
    const out = s.toSave(ECON, base);
    const filteredUid = Object.values(base.items).find(
      (it) => it.defId === NOT_ALLOWED,
    )!.uid;

    expect(out.items[filteredUid]).toBeUndefined();
    expect(Object.keys(out.items)).not.toContain(filteredUid);
    expect(out.nextItemSeq).toBeGreaterThan(base.nextItemSeq - 1);
    expect(
      Object.values(out.items).every((it) => it.uid !== filteredUid),
    ).toBe(true);
    // vũ khí khởi đầu thiếu (shield) được cấp uid mới, khác uid đã lọc
    const shield = Object.values(out.items).find((it) => it.defId === KSH)!;

    expect(shield.uid).not.toBe(filteredUid);
  });
});

// ---------------------------------------------------------------- ok:false không đổi trạng thái

describe('PlayerState: ok:false không đổi trạng thái, không throw với id sai', () => {
  const helm = K.startingGear.hat;
  const otherHat = gearOfSlot('hat', helm);
  const BAD = 'khong_ton_tai';

  type Case = [string, (s: PlayerState) => void, (s: PlayerState) => { ok: boolean }];
  const noop = (): void => {};
  const failing: Case[] = [
    ['addWeapon owned', noop, (s) => s.addWeapon(KSW)],
    ['removeWeapon not_owned', noop, (s) => s.removeWeapon('hammer')],
    ['removeWeapon equipped', noop, (s) => s.removeWeapon(KSW)],
    ['equipWeapon not_allowed', noop, (s) => s.equipWeapon(NOT_ALLOWED, 0)],
    ['equipWeapon not_owned', noop, (s) => s.equipWeapon('hammer', 0)],
    ['equipWeapon in_other_slot', noop, (s) => s.equipWeapon(KSH, 0)],
    ['unequipWeapon empty', (s) => void s.unequipWeapon(1), (s) => s.unequipWeapon(1)],
    ['discardWeapon not_owned', noop, (s) => s.discardWeapon('hammer')],
    ['discardWeapon equipped', noop, (s) => s.discardWeapon(KSW)],
    ['addGear owned', noop, (s) => s.addGear(helm)],
    ['setGearLevel not_owned', noop, (s) => s.setGearLevel(otherHat, 9)],
    ['removeGear not_owned', noop, (s) => s.removeGear(otherHat)],
    ['removeGear equipped', noop, (s) => s.removeGear(helm)],
    ['equipGear not_owned', noop, (s) => s.equipGear(otherHat)],
    ['equipGear already_equipped', noop, (s) => s.equipGear(helm)],
    ['unequipGear empty', (s) => void s.unequipGear('hat'), (s) => s.unequipGear('hat')],
    ['discardGear not_owned', noop, (s) => s.discardGear(otherHat)],
    ['discardGear equipped', noop, (s) => s.discardGear(helm)],
  ];

  it.each(failing)('%s: ok=false và trạng thái y nguyên', (_name, setup, act) => {
    const s = stateOf('knight');

    s.addWeapon(K_EXTRA);
    s.rewardGear(helm, 3);
    setup(s);

    const before = snap(s);
    const r = act(s);

    expect(r.ok).toBe(false);
    expect(snap(s)).toBe(before);
  });

  it('id sai không throw, trả ok:false và không đổi trạng thái', () => {
    const s = stateOf('knight');
    const before = snap(s);
    const w = BAD as unknown as WeaponId;
    const g = BAD as unknown as GearId;

    expect(() => {
      expect(s.ownsWeapon(w)).toBe(false);
      expect(s.ownsGear(g)).toBe(false);
      expect(s.getGearLevel(g)).toBe(1);
      expect(s.removeWeapon(w)).toEqual({ ok: false, reason: 'not_owned' });
      expect(s.discardWeapon(w)).toEqual({ ok: false, reason: 'not_owned' });
      expect(s.equipWeapon(w, 0)).toEqual({ ok: false, reason: 'not_allowed' });
      expect(s.equipWeapon(w, 1)).toEqual({ ok: false, reason: 'not_allowed' });
      expect(s.setGearLevel(g, 3)).toEqual({ ok: false, reason: 'not_owned' });
      expect(s.removeGear(g)).toEqual({ ok: false, reason: 'not_owned' });
      expect(s.equipGear(g)).toEqual({ ok: false, reason: 'not_owned' });
      expect(s.discardGear(g)).toEqual({ ok: false, reason: 'not_owned' });
      expect(s.unequipWeapon(5 as unknown as 0)).toEqual({ ok: false, reason: 'empty' });
      expect(s.unequipGear('xx' as unknown as GearSlot)).toEqual({
        ok: false,
        reason: 'empty',
      });
    }).not.toThrow();
    expect(snap(s)).toBe(before);
  });

  it('thao tác thành công đổi trạng thái (đối chứng cho phép so snapshot)', () => {
    const s = stateOf('knight');
    const before = snap(s);

    s.addWeapon(K_EXTRA);
    expect(snap(s)).not.toBe(before);
  });
});

describe('PlayerState: thuần', () => {
  it('đọc kết quả toSave của cùng state hai lần không đổi trạng thái', () => {
    const s = stateOf('necromancer');
    const a = snap(s, 'necromancer');
    const b = snap(s, 'necromancer');

    expect(a).toBe(b);
  });
});
