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
  SAVE_VERSION,
  createDefaultSave,
  type CharacterSave,
} from '../progression/CharacterProgress';
import { applyV7ShapeToV8 } from '../progression/saveBridge';
import { migrateV7ToV8, v8ToV7Shape } from '../progression/saveMigration';
import { validateSaveV8, type CharacterSaveV8 } from '../progression/saveV8';
import { LevelSystem } from '../progression/LevelSystem';
import { StatSheet } from '../progression/StatSheet';
import {
  STAT_DEFINITIONS,
  STAT_POINTS_PER_LEVEL,
  createEmptyAllocation,
  type StatAllocation,
  type StatId,
} from '../config/statConfig';
import type { SkillId } from '../skills/skills';
import { getClassSkillNodes } from '../skills/tree/skillTreeData';
import {
  FREE_RESPEC_MAX_LEVEL,
  canRespecFree,
  getSpentSkillPoints,
  getTotalSkillPoints,
  learnSkill,
  respecAll,
} from '../skills/tree/skillTreeRules';
import type { SkillLevels, SkillNodeId } from '../skills/tree/skillTreeTypes';
import {
  PlayerState,
  type PlayerEconomy,
  type PlayerRules,
  type SkillRule,
} from './PlayerState';

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Luật kỹ năng thử: SkillDefinition thật nằm trong module nhập Phaser nên test
 * dựng bảng riêng từ id thật của CHARACTERS. Kỹ năng thường mở ở level 1, 3, 5...;
 * kỹ năng cây gắn node thật của lớp (xoay vòng) và mở ở level 1, 2, 3...
 */
function skillRulesOf(id: CharacterId): PlayerRules['skills'] {
  const c = CHARACTERS[id];
  const nodes = getClassSkillNodes(id);
  const out: Partial<Record<SkillId, SkillRule>> = {};

  c.skills.forEach((skill, i) => {
    out[skill] = { unlockLevel: 1 + 2 * i };
  });
  c.treeSkills.forEach((skill, i) => {
    out[skill] = {
      unlockLevel: 1 + i,
      requiresNode: nodes[(i * 3) % nodes.length]!.id,
    };
  });

  return out;
}

function rulesOf(id: CharacterId): PlayerRules {
  const c = CHARACTERS[id];

  return {
    allowedWeapons: c.allowedWeapons,
    startingWeapons: c.startingWeapons,
    startingGear: c.startingGear,
    skills: skillRulesOf(id),
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
  // Tiến trình do PlayerState giữ nên state nạp từ chính `base` (cùng cấp/điểm/kỹ năng với nền của mô hình).
  const state = PlayerState.fromSave(base, rules);
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
        const isNew = !model.gearInventory.includes(g);

        expected = model.rewardGear(g, tier);
        actual = resultOf(state.rewardGear(g, tier));

        if (isNew) {
          coverage.set('rewardGear:new', (coverage.get('rewardGear:new') ?? 0) + 1);
        }

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
  it.each(CHARACTER_IDS)(
    `${SEQUENCE_COUNT} chuỗi thao tác xác định trên save mặc định của %s khớp dạng v7`,
    (id) => {
      const coverage = new Map<string, number>();

      for (let seq = 0; seq < SEQUENCE_COUNT; seq += 1) {
        runSequence(id, seq, coverage);
      }
    },
  );

  // Độc lập thứ tự chạy: tự chạy lại mọi chuỗi (xác định) để lấy độ phủ, không dùng kết quả test khác.
  it('các chuỗi phủ cả nhánh ok lẫn từng lý do từ chối chính', () => {
    const coverage = new Map<string, number>();

    for (const id of CHARACTER_IDS) {
      for (let seq = 0; seq < SEQUENCE_COUNT; seq += 1) {
        runSequence(id, seq, coverage);
      }
    }

    const must = [
      'removeWeapon:not_owned',
      'removeWeapon:equipped',
      'removeGear:not_owned',
      'removeGear:equipped',
      'rewardGear:new',
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
      expect(s.equipGear(g)).toEqual({ ok: false, reason: 'unknown_id' });
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

describe('PlayerState: id không tồn tại -> unknown_id', () => {
  const BAD_IDS: unknown[] = [
    'khong_ton_tai',
    '',
    'toString',
    'constructor',
    '__proto__',
    undefined,
    null,
    42,
  ];
  const helm = K.startingGear.hat;

  type Act = (s: PlayerState, bad: unknown) => { ok: boolean; reason?: string };
  const acts: [string, Act][] = [
    ['addWeapon', (s, b) => s.addWeapon(b as WeaponId)],
    ['addGear', (s, b) => s.addGear(b as GearId)],
    ['rewardGear', (s, b) => s.rewardGear(b as GearId, 3)],
    ['rewardGear (tier NaN)', (s, b) => s.rewardGear(b as GearId, Number.NaN)],
    ['equipGear', (s, b) => s.equipGear(b as GearId)],
  ];

  for (const [name, act] of acts) {
    it(`${name}: ok:false unknown_id, không ném, trạng thái y nguyên, toSave vẫn hợp lệ`, () => {
      for (const bad of BAD_IDS) {
        const s = stateOf('knight');

        s.addWeapon(K_EXTRA);
        s.rewardGear(helm, 3);

        const before = snap(s);
        let result: { ok: boolean; reason?: string } | undefined;

        expect(() => {
          result = act(s, bad);
        }, String(bad)).not.toThrow();
        expect(result, String(bad)).toEqual({ ok: false, reason: 'unknown_id' });
        expect(snap(s), String(bad)).toBe(before);
        expect(() => s.toSave(ECON, makeBase('knight'))).not.toThrow();
        expect(validateSaveV8(s.toSave(ECON, makeBase('knight')))).toEqual([]);
      }
    });
  }

  it('id của loại kia (vũ khí đưa cho hàm trang bị và ngược lại) cũng là unknown_id', () => {
    const s = stateOf('knight');
    const before = snap(s);

    expect(s.addGear(KSW as unknown as GearId)).toEqual({ ok: false, reason: 'unknown_id' });
    expect(s.addWeapon(helm as unknown as WeaponId)).toEqual({
      ok: false,
      reason: 'unknown_id',
    });
    expect(snap(s)).toBe(before);
  });

  it('id hợp lệ không bị nhận nhầm là unknown_id', () => {
    const s = stateOf('knight');

    expect(s.addWeapon(K_EXTRA)).toEqual({ ok: true });
    expect(s.addGear(gearOfSlot('hat', helm))).toEqual({ ok: true });
  });
});

describe('PlayerState.toSave: sao chép sâu, sửa tại chỗ', () => {
  function fixture() {
    const base = makeBase('knight');

    base.stats.power = 5;
    base.skillLevels['x' as never] = 2 as never;
    base.extraSkills[0] = base.skillLoadout[0];

    const econ = makeEconomy();

    econ.gems[GEM_IDS[0]!] = 3;

    return { base, econ };
  }

  it('sửa kết quả tại chỗ không đổi đầu vào lẫn trạng thái nội bộ', () => {
    const { base, econ } = fixture();
    const baseCopy = clone(base);
    const econCopy = clone(econ);
    const s = stateOf('knight');
    const out = s.toSave(econ, base);

    out.stats.power = 99;
    out.skillLoadout[0] = out.skillLoadout[1];
    out.extraSkills[0] = null;
    out.extraSkills.push(null);
    out.skillLevels['x' as never] = 77 as never;
    out.gems[GEM_IDS[0]!] = 99;
    out.bag.length = 0;
    out.equippedWeapons[0] = null;
    Object.values(out.items).forEach((it) => {
      if (it.kind === 'gear') it.sockets.push(null);
    });

    expect(base).toEqual(baseCopy);
    expect(econ).toEqual(econCopy);
    expect(s.toSave(econCopy, baseCopy)).toEqual(
      stateOf('knight').toSave(clone(econCopy), clone(baseCopy)),
    );
    expect(s.getWeapons()).toEqual([KSW, KSH]);
    expect(s.getEquippedWeapons()).toEqual([KSW, KSH]);
  });

  it('sửa đầu vào sau khi toSave không đổi kết quả đã trả', () => {
    const { base, econ } = fixture();
    const s = stateOf('knight');
    const out = s.toSave(econ, base);
    const outCopy = clone(out);

    base.stats.power = 50;
    base.skillLoadout[0] = base.skillLoadout[1];
    base.extraSkills[0] = null;
    base.skillLevels['x' as never] = 40 as never;
    econ.gems[GEM_IDS[0]!] = 40;
    for (const list of Object.values(econ.sockets)) list?.push(null);

    expect(out).toEqual(outCopy);
  });
});

describe('PlayerState: clampLevel (qua setGearLevel / rewardGear)', () => {
  const helm = K.startingGear.hat;
  const otherHat = gearOfSlot('hat', helm);

  it.each([
    [Number.NaN, 1],
    [2.9, 2],
    [1.5, 1],
    [-3, 1],
    [-0.5, 1],
    [0, 1],
    [MAX_GEAR_LEVEL + 0.5, MAX_GEAR_LEVEL],
    [MAX_GEAR_LEVEL + 100, MAX_GEAR_LEVEL],
    [Number.POSITIVE_INFINITY, MAX_GEAR_LEVEL],
    [Number.NEGATIVE_INFINITY, 1],
  ])('setGearLevel(%s) -> cấp %s', (input, expected) => {
    const s = stateOf('knight');

    expect(s.setGearLevel(helm, input)).toEqual({ ok: true });
    expect(s.getGearLevel(helm)).toBe(expected);
  });

  it.each([
    [Number.NaN, 2], // tier NaN coi là 0 -> max(1, 2)
    [2.7, 3], // max(3.7, 2) -> floor
    [-5, 2],
    [Number.NEGATIVE_INFINITY, 2],
    [MAX_GEAR_LEVEL + 10, MAX_GEAR_LEVEL],
    [Number.POSITIVE_INFINITY, MAX_GEAR_LEVEL],
  ])('rewardGear món mới với tier %s -> cấp %s', (tier, expected) => {
    const s = stateOf('knight');

    expect(s.rewardGear(otherHat, tier)).toEqual({ ok: true, level: expected });
    expect(s.getGearLevel(otherHat)).toBe(expected);
  });
});

describe('PlayerState: lý do từ chối của removeWeapon/removeGear/rewardGear (độc lập)', () => {
  const helm = K.startingGear.hat;
  const otherHat = gearOfSlot('hat', helm);

  it('removeWeapon: not_owned, equipped, rồi ok', () => {
    const s = stateOf('knight');

    expect(s.removeWeapon(K_EXTRA)).toEqual({ ok: false, reason: 'not_owned' });
    expect(s.removeWeapon(KSW)).toEqual({ ok: false, reason: 'equipped' });
    s.addWeapon(K_EXTRA);
    expect(s.removeWeapon(K_EXTRA)).toEqual({ ok: true });
    expect(s.ownsWeapon(K_EXTRA)).toBe(false);
  });

  it('removeGear: not_owned, equipped, rồi ok', () => {
    const s = stateOf('knight');

    expect(s.removeGear(otherHat)).toEqual({ ok: false, reason: 'not_owned' });
    expect(s.removeGear(helm)).toEqual({ ok: false, reason: 'equipped' });
    s.addGear(otherHat);
    expect(s.removeGear(otherHat)).toEqual({ ok: true });
    expect(s.ownsGear(otherHat)).toBe(false);
  });

  it('rewardGear món mới: thêm vào cuối túi, chưa mặc, cấp theo tier', () => {
    const s = stateOf('knight');

    expect(s.rewardGear(otherHat, 2)).toEqual({ ok: true, level: 3 });
    expect(s.getGear()[s.getGear().length - 1]).toBe(otherHat);
    expect(s.getEquippedGear().hat).toBe(helm);
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

// ================================================================ GÓI C3: tiến trình

const CHARACTER_PAIRS = CHARACTER_IDS.map((id, i) => [
  id,
  CHARACTER_IDS[(i + 1) % CHARACTER_IDS.length]!,
]) as [CharacterId, CharacterId][];

function progSave(
  id: CharacterId,
  patch: Partial<CharacterSaveV8> = {},
): CharacterSaveV8 {
  return { ...clone(defaultV8(id)), ...clone(patch) };
}

function progState(
  id: CharacterId,
  patch: Partial<CharacterSaveV8> = {},
): PlayerState {
  return PlayerState.fromSave(progSave(id, patch), rulesOf(id));
}

/** Ảnh chụp mọi trường tiến trình qua getter (không qua toSave, nên dùng được với dữ liệu thử chưa hợp lệ). */
function snapP(s: PlayerState): string {
  return JSON.stringify([
    s.getLevelSystem().getState(),
    s.getStatPoints(),
    s.getAllocation(),
    s.getSlotIds(),
    s.getSkillLevels(),
    s.getSkillPointSummary(),
  ]);
}

/** Node cây học được ngay (không đòi nhánh/level) của một lớp, tìm bằng skillTreeRules. */
function learnableNode(id: CharacterId): SkillNodeId {
  const node = getClassSkillNodes(id).find(
    (n) => learnSkill(n.id, 30, {}).ok,
  );

  if (!node) {
    throw new Error(`lớp ${id} không có node học được`);
  }

  return node.id;
}

const KNIGHT_SKILLS = K.skills; // shield_bash(Lv1) dual_guard(3) fortress_stand(5) whirlwind(7) ground_slam(9) iron_will(11)...
const KNIGHT_TREE = K.treeSkills; // living_fortress(Lv1) cyclone(2) sword_tempest(3) grapple_chain(4) titan_roar(5)
const KNIGHT_NODES = getClassSkillNodes('knight');
const KNIGHT_DEFAULT_LOADOUT: [SkillId, SkillId, SkillId] = [
  'shield_bash',
  'whirlwind',
  'ground_slam',
];

describe('PlayerState C3: dữ liệu thử', () => {
  it('giả định của test khớp CHARACTERS, luật điểm và cây kỹ năng thật', () => {
    expect(KNIGHT_SKILLS.slice(0, 6)).toEqual([
      'shield_bash',
      'dual_guard',
      'fortress_stand',
      'whirlwind',
      'ground_slam',
      'iron_will',
    ]);
    expect(K.defaultSkillLoadout).toEqual(KNIGHT_DEFAULT_LOADOUT);
    expect(KNIGHT_TREE.length).toBeGreaterThanOrEqual(3);
    expect(STAT_POINTS_PER_LEVEL).toBe(5);
    expect(FREE_RESPEC_MAX_LEVEL).toBe(10);
    expect(STAT_DEFINITIONS.length).toBe(6);

    for (const id of CHARACTER_IDS) {
      if (getClassSkillNodes(id).length > 0) {
        expect(learnSkill(learnableNode(id), 30, {}).ok).toBe(true);
      }
    }
  });
});

describe('PlayerState C3: nạp từ save', () => {
  it('lấy đúng cấp/XP, điểm chỉ số, bảng điểm, ô kỹ năng, cấp node từ save', () => {
    const node = learnableNode('knight');
    const s = progState('knight', {
      level: 6,
      xp: 7,
      xpToNext: 31,
      statPoints: 9,
      stats: { ...createEmptyAllocation(), power: 3, haste: 1 },
      skillLoadout: ['dual_guard', 'whirlwind', 'iron_will'],
      extraSkills: ['shield_bash', null, 'war_cry', null],
      skillLevels: { [node]: 2 },
    });

    expect(s.getLevelSystem().getState()).toEqual({ level: 6, xp: 7, xpToNext: 31 });
    expect(s.getLevel()).toBe(6);
    expect(s.getStatPoints()).toBe(9);
    expect(s.getAllocation()).toEqual({ ...createEmptyAllocation(), power: 3, haste: 1 });
    expect(s.getSlotIds()).toEqual([
      'dual_guard',
      'whirlwind',
      'iron_will',
      'shield_bash',
      null,
      'war_cry',
      null,
    ]);
    expect(s.getSkillLevels()).toEqual({ [node]: 2 });
    expect(s.getSkillLevel(node)).toBe(2);
  });

  it('StatSheet do PlayerState giữ tính CombatStats từ đúng bảng điểm', () => {
    const alloc = { ...createEmptyAllocation(), vitality: 2, power: 4, agility: 1 };
    const s = progState('knight', { stats: alloc });

    expect(s.getStatSheet().getCombatStats()).toEqual(new StatSheet(alloc).getCombatStats());
  });

  it('không dùng chung tham chiếu với save nạp vào', () => {
    const save = progSave('knight', {
      skillLevels: { [learnableNode('knight')]: 1 },
      extraSkills: ['dual_guard', null, null, null],
    });
    const s = PlayerState.fromSave(save, rulesOf('knight'));
    const before = snapP(s);

    save.stats.power = 99;
    save.skillLevels['x' as never] = 5 as never;
    save.extraSkills[1] = 'war_cry';
    save.skillLoadout[0] = 'iron_will';
    save.level = 50;
    expect(snapP(s)).toBe(before);
  });

  it('getter trả bản sao: sửa kết quả không đổi state', () => {
    const s = progState('knight', { statPoints: 2 });
    const before = snapP(s);

    s.getAllocation().power = 50;
    s.getSkillLevels()['x' as never] = 1 as never;
    s.getSlotIds()[0] = 'iron_will';
    expect(snapP(s)).toBe(before);
  });
});

describe('PlayerState C3: cộng điểm chỉ số (ma trận luật)', () => {
  it('hết điểm -> no_points, không đổi gì', () => {
    const s = progState('knight', { statPoints: 0 });
    const before = snapP(s);

    expect(s.spendStatPoint('power')).toEqual({ ok: false, reason: 'no_points' });
    expect(snapP(s)).toBe(before);
  });

  it.each(STAT_DEFINITIONS.map((d) => d.id))(
    'có điểm: tiêu 1 điểm, cộng đúng 1 vào %s, chỉ số khác giữ nguyên',
    (stat: StatId) => {
      const s = progState('knight', { statPoints: 3 });

      expect(s.spendStatPoint(stat)).toEqual({ ok: true });
      expect(s.getStatPoints()).toBe(2);
      expect(s.getAllocation()).toEqual({ ...createEmptyAllocation(), [stat]: 1 });
    },
  );

  it('tiêu hết điểm rồi lần kế tiếp bị từ chối', () => {
    const s = progState('knight', { statPoints: 2 });

    expect(s.spendStatPoint('guard').ok).toBe(true);
    expect(s.spendStatPoint('guard').ok).toBe(true);
    expect(s.spendStatPoint('guard')).toEqual({ ok: false, reason: 'no_points' });
    expect(s.getAllocation().guard).toBe(2);
    expect(s.getStatPoints()).toBe(0);
  });

  it('CombatStats đổi theo điểm đã cộng (qua StatSheet giữ bên trong)', () => {
    const s = progState('knight', { statPoints: 5 });

    for (let i = 0; i < 5; i += 1) s.spendStatPoint(i % 2 === 0 ? 'vitality' : 'haste');

    const ref = new StatSheet({ ...createEmptyAllocation(), vitality: 3, haste: 2 });

    expect(s.getStatSheet().getCombatStats()).toEqual(ref.getCombatStats());
  });

  it('id chỉ số sai: không throw, không đổi (unknown_stat); hết điểm thì no_points trước', () => {
    const s = progState('knight', { statPoints: 2 });
    const before = snapP(s);

    for (const bad of ['toString', '__proto__', 'x', '', undefined, null, 5]) {
      expect(s.spendStatPoint(bad as never)).toEqual({ ok: false, reason: 'unknown_stat' });
    }

    expect(snapP(s)).toBe(before);
    expect(progState('knight').spendStatPoint('x' as never)).toEqual({
      ok: false,
      reason: 'no_points',
    });
  });

  it('addStatPoints cộng số dương, bỏ qua <= 0 / NaN / vô hạn', () => {
    const s = progState('knight', { statPoints: 1 });

    s.addStatPoints(4);
    expect(s.getStatPoints()).toBe(5);

    for (const bad of [0, -3, Number.NaN, Infinity, -Infinity]) s.addStatPoints(bad);
    expect(s.getStatPoints()).toBe(5);
  });
});

describe('PlayerState C3: kinh nghiệm và lên cấp', () => {
  it('chưa đủ XP: không lên cấp, không cộng điểm', () => {
    const s = progState('knight');
    const r = s.grantExperience(5);

    expect(r).toEqual({ previousLevel: 1, level: 1, levelsGained: 0, statPointsGained: 0 });
    expect(s.getLevelSystem().getState()).toEqual({ level: 1, xp: 5, xpToNext: 20 });
    expect(s.getStatPoints()).toBe(0);
  });

  it('đủ XP một cấp: +STAT_POINTS_PER_LEVEL điểm, XP dư, xpToNext theo LevelSystem', () => {
    const s = progState('knight', { statPoints: 2 });
    const ref = new LevelSystem({ level: 1, xp: 0, xpToNext: 20 });
    const gained = ref.addXp(23);
    const r = s.grantExperience(23);

    expect(gained).toBe(1);
    expect(r).toEqual({ previousLevel: 1, level: 2, levelsGained: 1, statPointsGained: 5 });
    expect(s.getLevelSystem().getState()).toEqual(ref.getState());
    expect(s.getStatPoints()).toBe(2 + 5);
  });

  it('nhiều cấp trong một lần: điểm = số cấp * STAT_POINTS_PER_LEVEL', () => {
    const s = progState('knight');
    const ref = new LevelSystem({ level: 1, xp: 0, xpToNext: 20 });
    const gained = ref.addXp(500);
    const r = s.grantExperience(500);

    expect(gained).toBeGreaterThan(2);
    expect(r.levelsGained).toBe(gained);
    expect(r.previousLevel).toBe(1);
    expect(r.level).toBe(ref.getLevel());
    expect(s.getStatPoints()).toBe(gained * STAT_POINTS_PER_LEVEL);
    expect(s.getLevelSystem().getState()).toEqual(ref.getState());
  });

  it('điểm kỹ năng suy ra từ level: lên cấp tăng earned, không lưu bộ đếm', () => {
    const s = progState('knight');

    expect(s.getSkillPointSummary()).toEqual({ earned: 0, spent: 0, available: 0 });
    s.grantExperience(500);

    const level = s.getLevel();

    expect(s.getSkillPointSummary()).toEqual({
      earned: level - 1,
      spent: 0,
      available: level - 1,
    });
  });

  it('getLevelSystem là đối tượng sống của state (Hud đọc), không phải bản sao', () => {
    const s = progState('knight');
    const ls = s.getLevelSystem();

    s.grantExperience(25);
    expect(ls.getLevel()).toBe(2);
    expect(ls).toBe(s.getLevelSystem());
  });
});

describe('PlayerState C3: học / nâng / hồi điểm kỹ năng', () => {
  it('node không thuộc lớp -> "Kỹ năng không thuộc lớp này", không đổi', () => {
    const foreign = learnableNode('mage');
    const s = progState('knight', { level: 20 });
    const before = snapP(s);

    expect(s.learnSkillNode(foreign, 'knight')).toEqual({
      ok: false,
      reason: 'Kỹ năng không thuộc lớp này',
    });
    expect(snapP(s)).toBe(before);
  });

  it('id node sai/lạ: không throw, báo không thuộc lớp', () => {
    const s = progState('knight', { level: 20 });

    for (const bad of ['toString', '__proto__', 'zzz', '', undefined, null]) {
      expect(s.learnSkillNode(bad as never, 'knight')).toEqual({
        ok: false,
        reason: 'Kỹ năng không thuộc lớp này',
      });
    }
  });

  it('level 1 (0 điểm) -> lý do của skillTreeRules ("Hết điểm kỹ năng")', () => {
    const s = progState('knight');
    const node = learnableNode('knight');

    expect(learnSkill(node, 1, {})).toEqual({ ok: false, reason: 'Hết điểm kỹ năng' });
    expect(s.learnSkillNode(node, 'knight')).toEqual({ ok: false, reason: 'Hết điểm kỹ năng' });
    expect(s.getSkillLevels()).toEqual({});
  });

  it('học thành công: cấp 1, tiêu 1 điểm kỹ năng; nâng tiếp tới cấp tối đa rồi bị từ chối', () => {
    const node = learnableNode('knight');
    const s = progState('knight', { level: 30 });
    const max = KNIGHT_NODES.find((n) => n.id === node)!.maxLevel;

    for (let i = 1; i <= max; i += 1) {
      expect(s.learnSkillNode(node, 'knight')).toEqual({ ok: true });
      expect(s.getSkillLevel(node)).toBe(i);
      expect(s.getSkillPointSummary().spent).toBe(i);
    }

    expect(s.learnSkillNode(node, 'knight')).toEqual({ ok: false, reason: 'Đã đạt cấp tối đa' });
    expect(s.getSkillLevel(node)).toBe(max);
  });

  it('node chưa mở khoá: trả đúng lý do đầu tiên của getUnlockStatus, không đổi', () => {
    const locked = KNIGHT_NODES.find((n) => !learnSkill(n.id, 30, {}).ok);

    if (!locked) return;

    const s = progState('knight', { level: 30 });
    const ref = learnSkill(locked.id, 30, {});
    const before = snapP(s);

    expect(ref.ok).toBe(false);
    expect(s.learnSkillNode(locked.id, 'knight')).toEqual(ref);
    expect(snapP(s)).toBe(before);
  });

  it('khớp skillTreeRules khi học liên tiếp nhiều node (mô hình độc lập)', () => {
    const s = progState('knight', { level: 12 });
    let levels: SkillLevels = {};

    for (let i = 0; i < 40; i += 1) {
      const node = KNIGHT_NODES[(i * 5) % KNIGHT_NODES.length]!.id;
      const ref = learnSkill(node, 12, levels);

      if (ref.ok) levels = { ...ref.levels };

      expect(s.learnSkillNode(node, 'knight')).toEqual(
        ref.ok ? { ok: true } : { ok: false, reason: ref.reason },
      );
      expect(s.getSkillLevels()).toEqual(levels);
    }

    expect(s.getSkillPointSummary().spent).toBe(getSpentSkillPoints(levels));
  });

  it('getSkillPointSummary: earned = level-1, spent = tổng cấp node, available kẹp >= 0', () => {
    const node = learnableNode('knight');
    const s = progState('knight', { level: 4, skillLevels: { [node]: 5 } });

    expect(s.getSkillPointSummary()).toEqual({
      earned: getTotalSkillPoints(4),
      spent: 5,
      available: 0,
    });
    expect(progState('knight', { level: 4, skillLevels: { [node]: 1 } }).getSkillPointSummary()).toEqual({
      earned: 3,
      spent: 1,
      available: 2,
    });
  });

  it('hồi điểm: miễn phí tới đúng Lv10, xóa sạch cấp node', () => {
    const node = learnableNode('knight');

    for (const level of [1, 5, FREE_RESPEC_MAX_LEVEL]) {
      const s = progState('knight', { level, skillLevels: { [node]: 1 } });

      expect(canRespecFree(level)).toBe(true);
      expect(s.respecSkills()).toEqual({ ok: true });
      expect(s.getSkillLevels()).toEqual(respecAll());
    }
  });

  it('hồi điểm từ Lv11: từ chối not_free, không đổi', () => {
    const node = learnableNode('knight');
    const s = progState('knight', {
      level: FREE_RESPEC_MAX_LEVEL + 1,
      skillLevels: { [node]: 2 },
    });
    const before = snapP(s);

    expect(s.respecSkills()).toEqual({ ok: false, reason: 'not_free' });
    expect(snapP(s)).toBe(before);
  });

  it('hồi điểm trả lại điểm: học lại được sau khi hồi', () => {
    const node = learnableNode('knight');
    const s = progState('knight', { level: 3 });

    expect(s.learnSkillNode(node, 'knight').ok).toBe(true);
    expect(s.respecSkills().ok).toBe(true);
    expect(s.getSkillPointSummary().available).toBe(2);
    expect(s.learnSkillNode(node, 'knight').ok).toBe(true);
  });
});

describe('PlayerState C3: ô kỹ năng (ma trận luật)', () => {
  /** Knight Lv20: mọi kỹ năng thường mở; kỹ năng cây cần học node. */
  const hi = (patch: Partial<CharacterSaveV8> = {}): PlayerState =>
    progState('knight', { level: 20, ...patch });

  it('getSlotIds: 3 ô chính rồi 4 ô phụ, là bản sao', () => {
    const s = hi({ extraSkills: [null, 'war_cry', null, null] });

    expect(s.getSlotIds()).toEqual([...KNIGHT_DEFAULT_LOADOUT, null, 'war_cry', null, null]);
    expect(s.getSlotIds().length).toBe(7);
  });

  it('gán kỹ năng chưa có vào ô phụ trống: ok, ô chính giữ nguyên', () => {
    const s = hi();

    expect(s.assignSkill('war_cry', 3)).toEqual({ ok: true });
    expect(s.getSlotIds()).toEqual([...KNIGHT_DEFAULT_LOADOUT, 'war_cry', null, null, null]);
  });

  it('gán kỹ năng mới vào ô chính: kỹ năng cũ rời khỏi ô', () => {
    const s = hi();

    expect(s.assignSkill('war_cry', 1)).toEqual({ ok: true });
    expect(s.getSlotIds().slice(0, 3)).toEqual(['shield_bash', 'war_cry', 'ground_slam']);
    expect(s.getSlotIds()).not.toContain('whirlwind');
  });

  it('hoán đổi hai ô chính', () => {
    const s = hi();

    expect(s.assignSkill('shield_bash', 2)).toEqual({ ok: true });
    expect(s.getSlotIds().slice(0, 3)).toEqual(['ground_slam', 'whirlwind', 'shield_bash']);
  });

  it('chuyển kỹ năng ô phụ vào ô chính: hoán đổi, ô chính nhận kỹ năng phụ', () => {
    const s = hi({ extraSkills: ['war_cry', null, null, null] });

    expect(s.assignSkill('war_cry', 0)).toEqual({ ok: true });
    expect(s.getSlotIds()).toEqual(['war_cry', 'whirlwind', 'ground_slam', 'shield_bash', null, null, null]);
  });

  it('chuyển kỹ năng ô phụ sang ô phụ trống: kỹ năng đổi chỗ, ô cũ thành trống', () => {
    const s = hi({ extraSkills: ['war_cry', null, null, null] });

    expect(s.assignSkill('war_cry', 5)).toEqual({ ok: true });
    expect(s.getSlotIds().slice(3)).toEqual([null, null, 'war_cry', null]);
  });

  it('hoán đổi hai ô phụ đều có kỹ năng', () => {
    const s = hi({ extraSkills: ['war_cry', 'iron_will', null, null] });

    expect(s.assignSkill('war_cry', 4)).toEqual({ ok: true });
    expect(s.getSlotIds().slice(3)).toEqual(['iron_will', 'war_cry', null, null]);
  });

  it('ô chính không được trống: kỹ năng ô chính -> ô phụ trống bị từ chối, không đổi', () => {
    const s = hi();
    const before = snapP(s);

    expect(s.assignSkill('shield_bash', 4)).toEqual({ ok: false, reason: 'main_slot_empty' });
    expect(snapP(s)).toBe(before);
  });

  it('kỹ năng ô chính -> ô phụ đang có kỹ năng: hoán đổi được (ô chính không trống)', () => {
    const s = hi({ extraSkills: [null, null, 'war_cry', null] });

    expect(s.assignSkill('shield_bash', 5)).toEqual({ ok: true });
    expect(s.getSlotIds()).toEqual(['war_cry', 'whirlwind', 'ground_slam', null, null, 'shield_bash', null]);
  });

  it('gán vào chính ô đang giữ nó -> same_slot, không đổi', () => {
    const s = hi({ extraSkills: [null, 'war_cry', null, null] });
    const before = snapP(s);

    expect(s.assignSkill('whirlwind', 1)).toEqual({ ok: false, reason: 'same_slot' });
    expect(s.assignSkill('war_cry', 4)).toEqual({ ok: false, reason: 'same_slot' });
    expect(snapP(s)).toBe(before);
  });

  it('chưa đủ level -> level_locked', () => {
    const s = progState('knight', { level: 5 });
    const before = snapP(s);

    expect(s.assignSkill('iron_will', 3)).toEqual({ ok: false, reason: 'level_locked' });
    expect(snapP(s)).toBe(before);
    expect(progState('knight', { level: 5 }).assignSkill('fortress_stand', 3)).toEqual({ ok: true });
  });

  it('kỹ năng cây chưa học node -> not_learned (kể cả đủ level)', () => {
    const s = hi();
    const before = snapP(s);

    expect(s.assignSkill('living_fortress', 3)).toEqual({ ok: false, reason: 'not_learned' });
    expect(snapP(s)).toBe(before);
  });

  it('vừa thiếu level vừa chưa học node -> not_learned (ưu tiên như toast cũ)', () => {
    const s = progState('knight', { level: 1 });

    expect(s.assignSkill('titan_roar', 3)).toEqual({ ok: false, reason: 'not_learned' });
  });

  it('đã học node nhưng chưa đủ level -> level_locked', () => {
    const table = rulesOf('knight').skills;
    const tree = KNIGHT_TREE.find((t) => table[t]!.unlockLevel >= 3)!;
    const node = table[tree]!.requiresNode!;
    const s = progState('knight', { level: 1, skillLevels: { [node]: 1 } });

    expect(s.assignSkill(tree, 3)).toEqual({ ok: false, reason: 'level_locked' });
  });

  it('học node trong cây xong thì gán được kỹ năng cây', () => {
    const table = rulesOf('knight').skills;
    const tree = KNIGHT_TREE[0]!;
    const node = table[tree]!.requiresNode!;
    const s = progState('knight', { level: 30 });

    expect(s.assignSkill(tree, 3)).toEqual({ ok: false, reason: 'not_learned' });
    expect(s.learnSkillNode(node, 'knight')).toEqual({ ok: true });
    expect(s.assignSkill(tree, 3)).toEqual({ ok: true });
    expect(s.getSlotIds()[3]).toBe(tree);
  });

  it('chỉ số ô sai -> invalid_slot (âm, >= 7, số lẻ, NaN, vô hạn, không phải số)', () => {
    const s = hi();
    const before = snapP(s);

    for (const bad of [-1, 7, 8, 1.5, Number.NaN, Infinity, '2', undefined, null]) {
      expect(s.assignSkill('war_cry', bad as never)).toEqual({ ok: false, reason: 'invalid_slot' });
    }

    expect(snapP(s)).toBe(before);
  });

  it('kỹ năng không thuộc lớp / id lạ -> unknown_skill, không throw', () => {
    const s = hi();
    const before = snapP(s);

    for (const bad of ['arcane_nova', 'toString', '__proto__', 'x', '', undefined, null]) {
      expect(s.assignSkill(bad as never, 3)).toEqual({ ok: false, reason: 'unknown_skill' });
    }

    expect(snapP(s)).toBe(before);
  });

  it('bỏ kỹ năng khỏi ô phụ: ô thành trống, kỹ năng khác giữ nguyên', () => {
    const s = hi({ extraSkills: ['war_cry', 'iron_will', null, null] });

    expect(s.clearSkillSlot(3)).toEqual({ ok: true });
    expect(s.getSlotIds().slice(3)).toEqual([null, 'iron_will', null, null]);
  });

  it('bỏ ô trống -> empty; ô chính (0-2) và ngoài phạm vi -> invalid_slot, không đổi', () => {
    const s = hi({ extraSkills: ['war_cry', null, null, null] });
    const before = snapP(s);

    expect(s.clearSkillSlot(4)).toEqual({ ok: false, reason: 'empty' });

    for (const bad of [0, 1, 2, -1, 7, 99, 3.5, Number.NaN, Infinity, '3', undefined, null]) {
      expect(s.clearSkillSlot(bad as never)).toEqual({ ok: false, reason: 'invalid_slot' });
    }

    expect(snapP(s)).toBe(before);
  });

  it('ô chính luôn đủ 3 kỹ năng sau mọi thao tác hợp lệ', () => {
    const s = hi();

    s.assignSkill('war_cry', 3);
    s.assignSkill('war_cry', 0);
    s.clearSkillSlot(3);
    s.assignSkill('iron_will', 2);
    expect(s.getSlotIds().slice(0, 3).every((id) => id !== null)).toBe(true);
  });
});

// ---------------------------------------------------------------- mô hình tham chiếu tiến trình

/** Dựng lại đúng các phép toán hiện tại của WorldScene (addStatPoint, grantExperience, learnSkillNode, respecSkills, assignSkillToSlot, clearSkillSlot). */
class ProgRef {
  private readonly ls: LevelSystem;
  private sheet: StatSheet;
  statPoints: number;
  alloc: StatAllocation;
  loadout: [SkillId, SkillId, SkillId];
  extra: (SkillId | null)[];
  levels: SkillLevels;
  private readonly characterId: CharacterId;
  private readonly table: Readonly<Partial<Record<SkillId, SkillRule>>>;

  constructor(v7: CharacterSave, characterId: CharacterId, table: PlayerRules['skills']) {
    this.ls = new LevelSystem({ level: v7.level, xp: v7.xp, xpToNext: v7.xpToNext });
    this.statPoints = v7.statPoints;
    this.alloc = { ...v7.stats };
    this.sheet = new StatSheet(this.alloc);
    this.loadout = [v7.skillLoadout[0], v7.skillLoadout[1], v7.skillLoadout[2]];
    this.extra = [...v7.extraSkills];
    this.levels = { ...v7.skillLevels };
    this.characterId = characterId;
    this.table = table;
  }

  level(): number {
    return this.ls.getLevel();
  }

  addStatPoint(statId: StatId): Outcome {
    if (this.statPoints <= 0) return 'no_points';
    this.statPoints -= 1;
    this.sheet.addPoint(statId);
    this.alloc = this.sheet.getAllocation();

    return 'ok';
  }

  grantExperience(amount: number): Outcome {
    const gained = this.ls.addXp(amount);

    if (gained > 0) this.statPoints += gained * STAT_POINTS_PER_LEVEL;

    return 'ok';
  }

  learnSkillNode(id: SkillNodeId): Outcome {
    const node = getClassSkillNodes(this.characterId).find((e) => e.id === id);

    if (!node) return 'Kỹ năng không thuộc lớp này';

    const result = learnSkill(id, this.ls.getLevel(), this.levels);

    if (!result.ok) return result.reason;
    this.levels = { ...result.levels };

    return 'ok';
  }

  respecSkills(): Outcome {
    if (!canRespecFree(this.ls.getLevel())) return 'not_free';
    this.levels = respecAll();

    return 'ok';
  }

  slots(): (SkillId | null)[] {
    return [...this.loadout, ...this.extra];
  }

  assignSkillToSlot(skillId: string, slot: number): Outcome {
    if (!Number.isInteger(slot) || slot < 0 || slot >= 3 + this.extra.length) {
      return 'invalid_slot';
    }

    if (!Object.keys(this.table).includes(skillId)) return 'unknown_skill';

    const rule = this.table[skillId as SkillId]!;
    const learned = !rule.requiresNode || (this.levels[rule.requiresNode] ?? 0) >= 1;

    if (!(this.ls.getLevel() >= rule.unlockLevel && learned)) {
      return rule.requiresNode && !learned ? 'not_learned' : 'level_locked';
    }

    const slots = this.slots();
    const existing = slots.indexOf(skillId as SkillId);

    if (existing === slot) return 'same_slot';

    const replaced = slots[slot]!;

    if (existing !== -1 && existing < 3 && replaced === null) return 'main_slot_empty';

    slots[slot] = skillId as SkillId;

    if (existing !== -1) slots[existing] = replaced;

    this.loadout = [slots[0] as SkillId, slots[1] as SkillId, slots[2] as SkillId];
    this.extra = slots.slice(3, 7);

    return 'ok';
  }

  /** WorldScene.clearSkillSlot chỉ trả true/false; mô hình giữ đúng điều kiện và trả 'ok' | 'rejected'. */
  clearSkillSlot(slot: number): Outcome {
    if (slot < 3 || slot >= 3 + this.extra.length || !this.slots()[slot]) return 'rejected';

    const slots = this.slots();

    slots[slot] = null;
    this.loadout = [slots[0] as SkillId, slots[1] as SkillId, slots[2] as SkillId];
    this.extra = slots.slice(3, 7);

    return 'ok';
  }

  /** Phần tiến trình của dạng v7 mà scene cũ dựng khi lưu. */
  progressV7(): Partial<CharacterSave> {
    const state = this.ls.getState();

    return {
      level: state.level,
      xp: state.xp,
      xpToNext: state.xpToNext,
      statPoints: this.statPoints,
      stats: { ...this.alloc },
      skillLoadout: [this.loadout[0], this.loadout[1], this.loadout[2]],
      extraSkills: [...this.extra],
      skillLevels: { ...this.levels },
    };
  }
}

const PROG_OPS = [
  'spend',
  'xp',
  'learn',
  'assign',
  'assign',
  'clear',
  'learn',
  'respec',
  'xp',
  'assign',
] as const;
const PROG_SEQUENCES = 36;
const PROG_STEPS = 64;
const STAT_IDS = STAT_DEFINITIONS.map((d) => d.id);
const SLOT_POOL = [0, 1, 2, 3, 4, 5, 6, 3, 4, 5, 6, -1, 7, 1.5, Number.NaN];

function mapClear(r: { ok: true } | { ok: false; reason: string }): Outcome {
  return r.ok ? 'ok' : 'rejected';
}

function runProgSequence(
  id: CharacterId,
  foreign: CharacterId,
  seq: number,
  coverage: Map<string, number>,
): void {
  const rules = rulesOf(id);
  const ids = Object.keys(rules.skills) as SkillId[];
  const start = [1, 3, 8, 10][seq % 4]!;
  const loadout = CHARACTERS[id].defaultSkillLoadout;
  const spare = ids.filter((s) => !loadout.includes(s));
  const extraStart: (SkillId | null)[] =
    seq % 3 === 0
      ? [null, null, null, null]
      : seq % 3 === 1
        ? [spare[0] ?? null, null, spare[1] ?? null, null]
        : [null, spare[2] ?? null, null, spare[3] ?? null];
  const base = progSave(id, {
    level: start,
    xp: (seq * 3) % 15,
    statPoints: [0, 3, 6, 1][seq % 4]!,
    extraSkills: extraStart,
  });
  const state = PlayerState.fromSave(base, rules);
  const model = new ProgRef(v8ToV7Shape(base), id, rules.skills);
  const fresh = PlayerState.fromSave(base, rules);
  const itemsOnly = v8ToV7Shape(fresh.toSave(ECON, base));
  const ownNodes = getClassSkillNodes(id);
  const nodePool = ownNodes.length > 0 ? ownNodes : getClassSkillNodes(foreign);
  const foreignNodes = getClassSkillNodes(foreign);

  for (let t = 0; t < PROG_STEPS; t += 1) {
    const op = PROG_OPS[(seq * 5 + t * 7 + ((t * t) % 11)) % PROG_OPS.length]!;
    const slot = SLOT_POOL[(seq * 3 + t * 5 + (t >> 1)) % SLOT_POOL.length]!;
    const pickSkill = (): string => {
      if (t % 9 === 4) return 'not_a_skill';
      if (t % 6 === 5) return model.loadout[(seq + t) % 3]!;
      if (t % 7 === 3) return model.slots()[Math.abs(Math.trunc(slot)) % 7] ?? ids[0]!;

      return ids[(seq * 7 + t * 3) % ids.length]!;
    };
    const before = snapP(state);
    let expected: Outcome;
    let actual: Outcome;

    switch (op) {
      case 'spend': {
        const stat = STAT_IDS[(seq + t * 2) % STAT_IDS.length]!;

        expected = model.addStatPoint(stat);
        actual = resultOf(state.spendStatPoint(stat));
        break;
      }
      case 'xp': {
        const amount = (seq * 13 + t * 29) % 97;

        expected = model.grantExperience(amount);
        state.grantExperience(amount);
        actual = 'ok';
        break;
      }
      case 'learn': {
        const useForeign = t % 8 === 7 && foreignNodes.length > 0;
        const pool = useForeign ? foreignNodes : nodePool;
        const node = pool[(seq * 3 + t * 5) % pool.length]!.id;

        expected = model.learnSkillNode(node);
        actual = resultOf(state.learnSkillNode(node, id));
        break;
      }
      case 'respec':
        expected = model.respecSkills();
        actual = resultOf(state.respecSkills());
        break;
      case 'assign': {
        const skill = pickSkill();

        expected = model.assignSkillToSlot(skill, slot);
        actual = resultOf(state.assignSkill(skill as SkillId, slot));
        break;
      }
      default:
        expected = model.clearSkillSlot(slot);
        actual = mapClear(state.clearSkillSlot(slot));
        break;
    }

    const label = `${id} chuỗi ${seq} bước ${t} (${op})`;

    expect(actual, label).toBe(expected);
    coverage.set(`${op}:${actual}`, (coverage.get(`${op}:${actual}`) ?? 0) + 1);

    if (actual !== 'ok') {
      expect(snapP(state), `${label}: ok:false không đổi trạng thái`).toBe(before);
    }

    const saved = state.toSave(ECON, base);

    expect(validateSaveV8(saved), label).toEqual([]);
    expect(v8ToV7Shape(saved), label).toEqual({ ...itemsOnly, ...model.progressV7() });
    expect(state.getStatPoints(), label).toBe(model.statPoints);
    expect(state.getAllocation(), label).toEqual(model.alloc);
    expect(state.getSlotIds(), label).toEqual(model.slots());
    expect(state.getSkillLevels(), label).toEqual(model.levels);
    expect(state.getLevel(), label).toBe(model.level());
  }
}

describe('PlayerState C3: đối chiếu mô hình tham chiếu (logic cũ của WorldScene)', () => {
  it.each(CHARACTER_PAIRS)(
    `${PROG_SEQUENCES} chuỗi thao tác tiến trình trên save của %s khớp dạng v7`,
    (id, foreign) => {
      const coverage = new Map<string, number>();

      for (let seq = 0; seq < PROG_SEQUENCES; seq += 1) {
        runProgSequence(id, foreign, seq, coverage);
      }
    },
  );

  it('các chuỗi phủ nhánh ok lẫn từng lý do từ chối chính (mọi lớp)', () => {
    const coverage = new Map<string, number>();

    for (const [id, foreign] of CHARACTER_PAIRS) {
      for (let seq = 0; seq < PROG_SEQUENCES; seq += 1) {
        runProgSequence(id, foreign, seq, coverage);
      }
    }

    const must = [
      'spend:ok',
      'spend:no_points',
      'xp:ok',
      'learn:ok',
      'learn:Hết điểm kỹ năng',
      'learn:Kỹ năng không thuộc lớp này',
      'respec:ok',
      'respec:not_free',
      'assign:ok',
      'assign:invalid_slot',
      'assign:unknown_skill',
      'assign:level_locked',
      'assign:not_learned',
      'assign:same_slot',
      'assign:main_slot_empty',
      'clear:ok',
      'clear:rejected',
    ];

    for (const key of must) {
      expect(coverage.get(key) ?? 0, key).toBeGreaterThan(0);
    }
  });

  it('có ít nhất 30 chuỗi mỗi nhân vật', () => {
    expect(PROG_SEQUENCES).toBeGreaterThanOrEqual(30);
  });
});

describe('PlayerState C3: toSave / fromSave của tiến trình', () => {
  it('toSave ghi tiến trình từ state, bỏ qua giá trị tiến trình trong base', () => {
    const node = learnableNode('knight');
    const s = progState('knight', {
      level: 5,
      statPoints: 2,
      skillLevels: { [node]: 1 },
    });
    const base = progSave('knight', {
      level: 99,
      xp: 5,
      xpToNext: 77,
      statPoints: 55,
      stats: { ...createEmptyAllocation(), guard: 9 },
      skillLoadout: ['iron_will', 'war_cry', 'blade_storm'],
      extraSkills: ['dual_guard', null, null, null],
      skillLevels: {},
    });
    const out = s.toSave(ECON, base);

    expect(out.level).toBe(5);
    expect(out.xp).toBe(0);
    expect(out.xpToNext).toBe(20);
    expect(out.statPoints).toBe(2);
    expect(out.stats).toEqual(createEmptyAllocation());
    expect(out.skillLoadout).toEqual(KNIGHT_DEFAULT_LOADOUT);
    expect(out.extraSkills).toEqual([null, null, null, null]);
    expect(out.skillLevels).toEqual({ [node]: 1 });
    expect(validateSaveV8(out)).toEqual([]);
  });

  it.each(CHARACTER_IDS)(
    'toSave(fromSave(x)) = x và idempotent sau chuỗi thao tác (%s)',
    (id) => {
      const rules = rulesOf(id);
      const base = progSave(id, { level: 4, statPoints: 7 });
      const s = PlayerState.fromSave(base, rules);
      const nodes = getClassSkillNodes(id);

      s.grantExperience(300);
      s.spendStatPoint('power');
      s.spendStatPoint('agility');

      if (nodes.length > 0) s.learnSkillNode(learnableNode(id), id);

      const ids = Object.keys(rules.skills) as SkillId[];

      s.assignSkill(ids[0]!, 3);
      s.assignSkill(ids[1]!, 5);

      const econ: PlayerEconomy = {
        gold: base.gold,
        gems: clone(base.gems),
        sockets: v8ToV7Shape(base).gearSockets,
      };
      const x = s.toSave(econ, base);
      const again = PlayerState.fromSave(x, rules);

      expect(validateSaveV8(x)).toEqual([]);
      expect(again.toSave(econ, x)).toEqual(x);
      expect(s.toSave(econ, base)).toEqual(x);
      expect(s.toSave(econ, x)).toEqual(x);
      expect(snapP(again)).toBe(snapP(s));
    },
  );

  it('toSave không chia sẻ tham chiếu với state: sửa kết quả không đổi state', () => {
    const s = progState('knight', { statPoints: 3, level: 6 });
    const before = snapP(s);
    const out = s.toSave(ECON, defaultV8('knight'));

    out.stats.power = 77;
    out.skillLoadout[0] = 'iron_will';
    out.extraSkills.push('war_cry');
    out.skillLevels['x' as never] = 3 as never;
    out.level = 40;
    expect(snapP(s)).toBe(before);
  });

  it('thao tác tiến trình không đụng kho đồ: phần items/bag/trang bị của toSave không đổi', () => {
    const base = defaultV8('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));
    const items = (v: CharacterSaveV8) => [v.items, v.bag, v.equippedWeapons, v.equippedGear, v.nextItemSeq];
    const before = items(s.toSave(ECON, base));

    s.grantExperience(200);
    s.spendStatPoint('guard');
    s.assignSkill('war_cry', 3);
    s.respecSkills();
    expect(items(s.toSave(ECON, base))).toEqual(before);
  });
});

describe('PlayerState C3: id sai không throw, không đổi', () => {
  it('mọi thao tác tiến trình với đối số lạ không ném lỗi và ok:false không đổi trạng thái', () => {
    const s = progState('knight', { level: 12, statPoints: 4 });
    const before = snapP(s);
    const junk: unknown[] = [undefined, null, 'toString', '__proto__', '', -1, 1.5, Number.NaN, {}, []];

    for (const bad of junk) {
      expect(() => s.spendStatPoint(bad as never)).not.toThrow();
      expect(() => s.learnSkillNode(bad as never, 'knight')).not.toThrow();
      expect(() => s.assignSkill(bad as never, bad as never)).not.toThrow();
      expect(() => s.clearSkillSlot(bad as never)).not.toThrow();
    }

    expect(snapP(s)).toBe(before);
  });
});

// ---------------------------------------------------------------- C4: toSave thay cầu nối

/** Dựng dạng v7 đúng như WorldScene.saveProgress trước C4 (đường cầu nối cũ). */
function oldBridgeShape(state: PlayerState, econ: PlayerEconomy): CharacterSave {
  const slotIds = state.getSlotIds();

  return {
    ...state.getLevelSystem().getState(),
    version: SAVE_VERSION,
    statPoints: state.getStatPoints(),
    stats: state.getAllocation(),
    inventory: state.getWeapons(),
    equipped: state.getEquippedWeapons(),
    gearInventory: state.getGear(),
    equippedGear: state.getEquippedGear(),
    gearLevels: state.getGearLevels(),
    gold: econ.gold,
    gems: { ...econ.gems },
    gearSockets: clone(econ.sockets),
    skillLoadout: [
      slotIds[0] as SkillId,
      slotIds[1] as SkillId,
      slotIds[2] as SkillId,
    ],
    extraSkills: slotIds.slice(3),
    skillLevels: state.getSkillLevels(),
  };
}

/**
 * Khác biệt có chủ đích duy nhất về thứ tự: cầu nối cũ luôn xếp vũ khí trước rồi mới
 * trang bị trong `bag`; PlayerState giữ thứ tự thêm (xen kẽ). Thứ tự tương đối trong
 * từng loại giống hệt nhau, nên getWeapons()/getGear() không đổi.
 */
function weaponsFirst(save: CharacterSaveV8): CharacterSaveV8 {
  const kindOf = (uid: string) => save.items[uid]!.kind;

  return {
    ...save,
    bag: [
      ...save.bag.filter((uid) => kindOf(uid) === 'weapon'),
      ...save.bag.filter((uid) => kindOf(uid) === 'gear'),
    ],
  };
}

/** Đổi uid thành "kind:defId" để so hai save chỉ khác cách đánh số uid. */
function uidNeutral(raw: CharacterSaveV8): unknown {
  const save = weaponsFirst(raw);

  const key = (uid: string | null): string | null =>
    uid === null ? null : `${save.items[uid]!.kind}:${save.items[uid]!.defId}`;
  const items: Record<string, unknown> = {};

  for (const uid of save.bag) {
    items[key(uid)!] = { ...save.items[uid]!, uid: key(uid) };
  }

  return {
    ...save,
    nextItemSeq: 0,
    items,
    bag: save.bag.map(key),
    equippedWeapons: save.equippedWeapons.map(key),
    equippedGear: {
      hat: key(save.equippedGear.hat),
      armor: key(save.equippedGear.armor),
      boots: key(save.equippedGear.boots),
    },
  };
}

function runBridgeEquivalence(
  id: CharacterId,
  seq: number,
  commitEvery: number,
): void {
  const rules = rulesOf(id);
  const allowed = CHARACTERS[id].allowedWeapons;
  const skillIds = Object.keys(rules.skills) as SkillId[];
  let base = progSave(id, { level: 1 + (seq % 6), statPoints: seq % 4 });
  const state = PlayerState.fromSave(base, rules);
  const econ = makeEconomy();
  let rng = (seq + 1) * 2654435761 + id.length * 97;
  const rand = (n: number): number => {
    rng = (rng * 1664525 + 1013904223) % 4294967296;

    return Math.floor((rng / 4294967296) * n);
  };
  const removed = new Set<string>();
  const seen = new Set<string>();
  let lastSeq = base.nextItemSeq;

  for (let t = 0; t < 45; t += 1) {
    const weapon = allowed[rand(allowed.length)]!;
    const gear = GEAR_IDS[rand(GEAR_IDS.length)]!;
    const econBefore = clone(econ);
    const before = JSON.stringify(state.toSave(econBefore, base));
    let ok = true;

    switch (rand(15)) {
      case 0: ok = state.addWeapon(weapon).ok; break;
      case 1: ok = state.removeWeapon(weapon).ok; break;
      case 2: ok = state.equipWeapon(weapon, rand(2) as 0 | 1).ok; break;
      case 3: ok = state.unequipWeapon(rand(2) as 0 | 1).ok; break;
      case 4: ok = state.addGear(gear).ok; break;
      case 5: ok = state.rewardGear(gear, rand(4)).ok; break;
      case 6: ok = state.removeGear(gear).ok; break;
      case 7: ok = state.equipGear(gear).ok; break;
      case 8: ok = state.unequipGear(GEAR_SLOTS[rand(3)]!).ok; break;
      case 9: ok = state.discardGear(gear).ok; break;
      case 10: state.grantExperience(rand(120)); break;
      case 11: ok = state.spendStatPoint(STAT_DEFINITIONS[rand(STAT_DEFINITIONS.length)]!.id).ok; break;
      case 12: ok = state.assignSkill(skillIds[rand(skillIds.length)]!, rand(8) - 1).ok; break;
      case 13: ok = state.clearSkillSlot(3 + rand(4)).ok; break;
      default: ok = state.discardWeapon(weapon).ok; break;
    }

    const label = `${id} chuỗi ${seq} bước ${t}`;

    if (!ok) {
      expect(JSON.stringify(state.toSave(econBefore, base)), `${label}: ok:false đổi trạng thái`).toBe(before);
    }

    // Kinh tế đổi theo thời gian (vàng, ngọc, ổ ngọc), như VillageService.
    econ.gold += rand(50);
    econ.gems[GEM_IDS[rand(GEM_IDS.length)]!] += rand(3);

    if (rand(4) === 0) {
      econ.sockets[gear] = [GEM_IDS[rand(GEM_IDS.length)]!, null];
    }

    if (t % commitEvery !== commitEvery - 1) {
      continue;
    }

    const bridged = applyV7ShapeToV8(base, oldBridgeShape(state, econ));
    const saved = state.toSave(econ, base);

    expect(bridged.ok, label).toBe(true);
    expect(validateSaveV8(saved), label).toEqual([]);

    if (!bridged.ok) {
      return;
    }

    if (commitEvery === 1) {
      // Commit mỗi bước: giống hệt từng chữ, kể cả uid và nextItemSeq.
      expect(weaponsFirst(saved), label).toEqual(bridged.save);
    } else {
      // Dồn nhiều thao tác: chỉ khác cách đánh số uid / nextItemSeq (xem báo cáo C4).
      expect(uidNeutral(saved), label).toEqual(uidNeutral(bridged.save));
      expect(saved.nextItemSeq, label).toBeGreaterThanOrEqual(bridged.save.nextItemSeq);
    }

    // uid không đổi chủ, không tái dùng sau khi bị bỏ; nextItemSeq không giảm.
    for (const uid of Object.keys(saved.items)) {
      expect(removed.has(uid), `${label}: uid ${uid} bị tái dùng`).toBe(false);
      seen.add(uid);
    }

    for (const uid of seen) {
      if (!(uid in saved.items)) {
        removed.add(uid);
      }
    }

    expect(saved.nextItemSeq, label).toBeGreaterThanOrEqual(lastSeq);
    lastSeq = saved.nextItemSeq;
    expect(saved.gold, label).toBe(econ.gold);
    expect(saved.gems, label).toEqual(econ.gems);
    base = saved;
  }
}

describe('PlayerState C4: toSave(economy, base) thay đường cầu nối cũ', () => {
  it.each(CHARACTER_IDS)(
    'commit mỗi bước: giống hệt applyV7ShapeToV8(base, shape cũ) (%s)',
    (id) => {
      for (let seq = 0; seq < 30; seq += 1) {
        runBridgeEquivalence(id, seq, 1);
      }
    },
  );

  it.each(CHARACTER_IDS)(
    'dồn 6 thao tác rồi lưu: khác bridge chỉ ở số uid/nextItemSeq (%s)',
    (id) => {
      for (let seq = 0; seq < 30; seq += 1) {
        runBridgeEquivalence(id, seq + 100, 6);
      }
    },
  );

  it('vàng, ngọc, ổ ngọc đi qua economy; ổ của món không có trong túi bị bỏ', () => {
    const base = defaultV8('knight');
    const s = PlayerState.fromSave(base, rulesOf('knight'));
    const econ = makeEconomy();
    const out = s.toSave({ ...econ, gold: 777 }, base);

    expect(out.gold).toBe(777);
    expect(out.gems).toEqual(econ.gems);

    for (const item of Object.values(out.items)) {
      if (item.kind === 'gear') {
        expect(item.sockets).toEqual((econ.sockets[item.defId] ?? []).slice(0, MAX_SOCKETS));
      }
    }
  });
});

describe('PlayerState C3: thuần', () => {
  it('nguồn PlayerState.ts không dùng phaser/window/localStorage/Math.random/Date', () => {
    const files = import.meta.glob('./PlayerState.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const source = Object.values(files)[0] ?? '';

    expect(source.length).toBeGreaterThan(1000);
    expect(source).not.toMatch(/phaser|window|localStorage|Math\.random|Date\./i);
  });
});
