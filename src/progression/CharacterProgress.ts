import type { WeaponId } from '../combat/Weapon';
import { CHARACTERS, type CharacterId } from '../config/characters';
import {
  GEAR_INFO,
  GEAR_SLOTS,
  MAX_GEAR_LEVEL,
  isGearId,
  type GearId,
  type GearLevels,
  type GearSlot,
} from '../config/gearConfig';
import { STARTING_GOLD } from '../config/economyConfig';
import {
  GEM_IDS,
  MAX_SOCKETS,
  createEmptyGemCounts,
  isGemId,
  type GearSockets,
  type GemCounts,
} from '../config/gemConfig';
import {
  createEmptyAllocation,
  isStatAllocation,
  type StatAllocation,
} from '../config/statConfig';
import { isWeaponId } from '../config/weaponInfo';
import type { SkillId } from '../skills/skills';
import { normalizeSkillLevels } from '../skills/tree/skillTreeRules';
import type { SkillLevels } from '../skills/tree/skillTreeTypes';
import type { LevelState } from './LevelSystem';
import { XP_BASE } from './progressionConfig';

const STORAGE_KEY = 'pixel-world:progress:v1';

/** Phiên bản save hiện tại. */
export const SAVE_VERSION = 7;

/** Số ô kỹ năng phụ (ô 4–7), có thể để trống. */
export const EXTRA_SKILL_SLOTS = 4;

export interface CharacterSave extends LevelState {
  version: number;
  statPoints: number;
  stats: StatAllocation;
  inventory: WeaponId[];
  equipped: [WeaponId | null, WeaponId | null];
  gearInventory: GearId[];
  equippedGear: Record<GearSlot, GearId | null>;
  gearLevels: GearLevels;
  /** Vàng đang có. */
  gold: number;
  /** Ngọc trong túi theo loại. */
  gems: GemCounts;
  /** Lỗ ngọc từng món trang bị (null = lỗ trống). */
  gearSockets: GearSockets;
  skillLoadout: [SkillId, SkillId, SkillId];
  /** 4 ô kỹ năng phụ; null = trống. */
  extraSkills: (SkillId | null)[];
  /** Cấp đã học của từng node trong Skill Tree. SP chưa dùng được suy ra từ level. */
  skillLevels: SkillLevels;
}

export type ProgressData = Partial<Record<CharacterId, CharacterSave>>;

function readData(): ProgressData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as ProgressData;
  } catch {
    return {};
  }
}

function validNumber(value: unknown, minimum: number): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum
  ) {
    return null;
  }

  return value;
}

function normalizeInventory(
  value: unknown,
  startingWeapons: readonly WeaponId[],
  mergeDefaults: boolean,
): WeaponId[] {
  const inventory: WeaponId[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isWeaponId(entry) && !inventory.includes(entry)) {
        inventory.push(entry);
      }
    }
  }

  if (mergeDefaults) {
    for (const weapon of startingWeapons) {
      if (!inventory.includes(weapon)) {
        inventory.push(weapon);
      }
    }
  }

  return inventory;
}

function readEquippedWeapon(value: unknown): WeaponId | null | undefined {
  if (value === null) {
    return null;
  }

  return isWeaponId(value) ? value : undefined;
}

function normalizeEquipped(
  value: unknown,
  inventory: readonly WeaponId[],
  startingWeapons: readonly [WeaponId | null, WeaponId | null],
): [WeaponId | null, WeaponId | null] {
  if (Array.isArray(value) && value.length === 2) {
    const first = readEquippedWeapon(value[0]);
    const second = readEquippedWeapon(value[1]);

    const firstValid =
      first !== undefined && (first === null || inventory.includes(first));
    const secondValid =
      second !== undefined && (second === null || inventory.includes(second));
    const notSame =
      first === null || second === null || first !== second;

    if (firstValid && secondValid && notSame) {
      return [first, second];
    }
  }

  const [defaultFirst, defaultSecond] = startingWeapons;

  if (
    defaultFirst &&
    defaultSecond &&
    inventory.includes(defaultFirst) &&
    inventory.includes(defaultSecond)
  ) {
    return [defaultFirst, defaultSecond];
  }

  return [inventory[0] ?? defaultFirst ?? null, inventory[1] ?? null];
}

function normalizeGearInventory(
  value: unknown,
  startingGear: readonly GearId[],
  mergeDefaults: boolean,
): GearId[] {
  const inventory: GearId[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isGearId(entry) && !inventory.includes(entry)) {
        inventory.push(entry);
      }
    }
  }

  if (mergeDefaults) {
    for (const gearId of startingGear) {
      if (!inventory.includes(gearId)) {
        inventory.push(gearId);
      }
    }
  }

  return inventory;
}

function normalizeGearLevels(value: unknown): GearLevels {
  const result: GearLevels = {};

  if (!value || typeof value !== 'object') {
    return result;
  }

  for (const [gearId, rawLevel] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!isGearId(gearId)) {
      continue;
    }

    if (typeof rawLevel !== 'number' || !Number.isFinite(rawLevel)) {
      continue;
    }

    const level = Math.floor(rawLevel);

    if (level > 1) {
      result[gearId] = Math.min(MAX_GEAR_LEVEL, level);
    }
  }

  return result;
}

function normalizeGold(value: unknown): number {
  const gold = validNumber(value, 0);

  return gold === null ? STARTING_GOLD : Math.floor(gold);
}

function normalizeGemCounts(value: unknown): GemCounts {
  const result = createEmptyGemCounts();

  if (!value || typeof value !== 'object') {
    return result;
  }

  const saved = value as Record<string, unknown>;

  for (const gemId of GEM_IDS) {
    const count = validNumber(saved[gemId], 0);

    result[gemId] = count === null ? 0 : Math.floor(count);
  }

  return result;
}

function normalizeGearSockets(
  value: unknown,
  inventory: readonly GearId[],
): GearSockets {
  const result: GearSockets = {};

  if (!value || typeof value !== 'object') {
    return result;
  }

  for (const [gearId, rawSockets] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (
      !isGearId(gearId) ||
      !inventory.includes(gearId) ||
      !Array.isArray(rawSockets)
    ) {
      continue;
    }

    const sockets = rawSockets
      .slice(0, MAX_SOCKETS)
      .map((entry) => (isGemId(entry) ? entry : null));

    if (sockets.length > 0) {
      result[gearId] = sockets;
    }
  }

  return result;
}

function normalizeEquippedGear(
  value: unknown,
  inventory: readonly GearId[],
  defaults: Readonly<Record<GearSlot, GearId | null>>,
): Record<GearSlot, GearId | null> {
  const result = { ...defaults };

  if (!value || typeof value !== 'object') {
    return result;
  }

  const saved = value as Record<string, unknown>;

  for (const slot of GEAR_SLOTS) {
    const entry = saved[slot];

    if (entry === null) {
      result[slot] = null;
      continue;
    }

    if (
      isGearId(entry) &&
      GEAR_INFO[entry].slot === slot &&
      inventory.includes(entry)
    ) {
      result[slot] = entry;
    }
  }

  return result;
}

function normalizeExtraSkills(
  value: unknown,
  loadout: readonly SkillId[],
  available: readonly SkillId[],
): (SkillId | null)[] {
  const result: (SkillId | null)[] = [];
  const used = new Set<SkillId>(loadout);

  for (let i = 0; i < EXTRA_SKILL_SLOTS; i += 1) {
    const entry = Array.isArray(value) ? (value[i] as SkillId | null) : null;

    if (entry && available.includes(entry) && !used.has(entry)) {
      result.push(entry);
      used.add(entry);
    } else {
      result.push(null);
    }
  }

  return result;
}

function normalizeSkillLoadout(
  value: unknown,
  defaults: readonly [SkillId, SkillId, SkillId],
  available: readonly SkillId[],
): [SkillId, SkillId, SkillId] {
  if (Array.isArray(value) && value.length === 3) {
    const loadout: SkillId[] = [];

    for (const entry of value) {
      const skillId = entry as SkillId;

      if (
        available.includes(skillId) &&
        !loadout.includes(skillId)
      ) {
        loadout.push(skillId);
      }
    }

    if (loadout.length === 3) {
      return [loadout[0], loadout[1], loadout[2]];
    }
  }

  return [defaults[0], defaults[1], defaults[2]];
}

export function createDefaultSave(
  characterId: CharacterId,
): CharacterSave {
  const character = CHARACTERS[characterId];
  const startingWeapons: [WeaponId, WeaponId] = [
    character.startingWeapons[0],
    character.startingWeapons[1],
  ];

  return {
    version: SAVE_VERSION,
    level: 1,
    xp: 0,
    xpToNext: XP_BASE,
    statPoints: 0,
    stats: createEmptyAllocation(),
    inventory: [...startingWeapons],
    equipped: startingWeapons,
    gearInventory: [
      character.startingGear.hat,
      character.startingGear.armor,
      character.startingGear.boots,
    ],
    equippedGear: { ...character.startingGear },
    gearLevels: {},
    gold: STARTING_GOLD,
    gems: createEmptyGemCounts(),
    gearSockets: {},
    skillLoadout: [
      character.defaultSkillLoadout[0],
      character.defaultSkillLoadout[1],
      character.defaultSkillLoadout[2],
    ],
    extraSkills: Array.from({ length: EXTRA_SKILL_SLOTS }, () => null),
    skillLevels: {},
  };
}

export function getCharacterSave(
  characterId: CharacterId,
): CharacterSave {
  const defaults = createDefaultSave(characterId);
  const raw = readData()[characterId] as unknown;

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const saved = raw as Partial<CharacterSave>;
  const character = CHARACTERS[characterId];
  const savedVersion =
    typeof saved.version === 'number' ? saved.version : 0;
  // Chỉ các save trước v2 mới cần thêm lại item khởi đầu.
  const mergeDefaults = savedVersion < 2;
  const level = validNumber(saved.level, 1);
  const xp = validNumber(saved.xp, 0);
  const xpToNext = validNumber(saved.xpToNext, 1);
  const statPoints = validNumber(saved.statPoints, 0);
  const stats = isStatAllocation(saved.stats)
    ? { ...saved.stats }
    : createEmptyAllocation();
  const inventory = normalizeInventory(
    saved.inventory,
    defaults.inventory,
    mergeDefaults,
  );
  const equipped = normalizeEquipped(
    saved.equipped,
    inventory,
    defaults.equipped,
  );
  const gearInventory = normalizeGearInventory(
    saved.gearInventory,
    defaults.gearInventory,
    mergeDefaults,
  );
  const equippedGear = normalizeEquippedGear(
    saved.equippedGear,
    gearInventory,
    defaults.equippedGear,
  );
  const gearLevels = normalizeGearLevels(saved.gearLevels);
  const gold = normalizeGold(saved.gold);
  const gems = normalizeGemCounts(saved.gems);
  const gearSockets = normalizeGearSockets(saved.gearSockets, gearInventory);
  const skillLoadout = normalizeSkillLoadout(
    saved.skillLoadout,
    defaults.skillLoadout,
    [...character.skills, ...character.treeSkills],
  );
  const extraSkills = normalizeExtraSkills(
    saved.extraSkills,
    skillLoadout,
    [...character.skills, ...character.treeSkills],
  );
  const resolvedLevel = level === null ? defaults.level : Math.floor(level);
  const skillLevels = normalizeSkillLevels(
    saved.skillLevels,
    characterId,
    resolvedLevel,
  );

  return {
    version: SAVE_VERSION,
    level: resolvedLevel,
    xp: xp === null ? defaults.xp : xp,
    xpToNext:
      xpToNext === null ? defaults.xpToNext : Math.floor(xpToNext),
    statPoints:
      statPoints === null ? defaults.statPoints : Math.floor(statPoints),
    stats,
    inventory,
    equipped,
    gearInventory,
    equippedGear,
    gearLevels,
    gold,
    gems,
    gearSockets,
    skillLoadout,
    extraSkills,
    skillLevels,
  };
}

export function saveCharacterSave(
  characterId: CharacterId,
  save: CharacterSave,
): void {
  try {
    const data = readData();

    data[characterId] = save;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage có thể bị chặn; bỏ qua để game vẫn chạy.
  }
}

export function getAllCharacterSaves(): ProgressData {
  const saves: ProgressData = {};

  for (const characterId of Object.keys(CHARACTERS) as CharacterId[]) {
    saves[characterId] = getCharacterSave(characterId);
  }

  return saves;
}
