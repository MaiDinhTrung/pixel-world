import type { WeaponId } from '../combat/Weapon';
import type { CharacterId } from '../config/characters';
import {
  GEAR_SLOTS,
  type GearId,
  type GearLevels,
  type GearSlot,
} from '../config/gearConfig';
import type { GearSockets } from '../config/gemConfig';
import {
  CHARACTER_UID_PREFIX,
  FIRST_ITEM_SEQ,
  INITIAL_REVISION,
  SAVE_VERSION_V8,
} from '../config/progressConfig';
import {
  normalizeCharacterSave,
  type CharacterSave,
} from './CharacterProgress';
import { allocateItemUid } from './ItemIds';
import type { ItemInstance } from './ItemInstance';
import { validateSaveV8, type CharacterSaveV8 } from './saveV8';

export type MigrationResult =
  | { ok: true; save: CharacterSaveV8 }
  | { ok: false; errors: string[] };

/** Sao chép sâu dữ liệu JSON thuần (dữ liệu tiến trình luôn JSON-hóa được). */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** characterUid xác định theo CharacterId. */
export function makeCharacterUid(characterId: CharacterId): string {
  return `${CHARACTER_UID_PREFIX}${characterId}_1`;
}

/**
 * Migrate save v7 ĐÃ chuẩn hóa (đầu ra của normalizeCharacterSave) sang v8.
 * Thuần, xác định. Kết quả luôn được validateSaveV8 kiểm; lỗi thì ok:false.
 */
export function migrateV7ToV8(
  characterId: CharacterId,
  v7: CharacterSave,
): MigrationResult {
  const items: Record<string, ItemInstance> = {};
  const bag: string[] = [];
  const weaponUidByDef = new Map<WeaponId, string>();
  const gearUidByDef = new Map<GearId, string>();
  const migrationLog: string[] = [];
  let nextItemSeq = FIRST_ITEM_SEQ;

  for (const defId of v7.inventory) {
    const allocated = allocateItemUid('weapon', nextItemSeq);

    nextItemSeq = allocated.nextItemSeq;
    items[allocated.uid] = {
      uid: allocated.uid,
      kind: 'weapon',
      defId,
      level: 1,
    };
    bag.push(allocated.uid);
    weaponUidByDef.set(defId, allocated.uid);
  }

  for (const defId of v7.gearInventory) {
    const allocated = allocateItemUid('gear', nextItemSeq);

    nextItemSeq = allocated.nextItemSeq;
    items[allocated.uid] = {
      uid: allocated.uid,
      kind: 'gear',
      defId,
      level: v7.gearLevels[defId] ?? 1,
      sockets: [...(v7.gearSockets[defId] ?? [])],
    };
    bag.push(allocated.uid);
    gearUidByDef.set(defId, allocated.uid);
  }

  // Dữ liệu mồ côi (không có trong túi) bị loại và ghi lại, không mất âm thầm.
  for (const id of Object.keys(v7.gearLevels)) {
    if (!gearUidByDef.has(id as GearId)) {
      migrationLog.push(`gearLevels.${id}: món không có trong túi, bỏ`);
    }
  }

  const equippedWeapons: [string | null, string | null] = [null, null];

  for (let i = 0; i < 2; i += 1) {
    const defId = v7.equipped[i];

    if (defId === null) {
      continue;
    }

    const uid = weaponUidByDef.get(defId);

    if (uid === undefined) {
      migrationLog.push(`equipped[${i}]: ${defId} không có trong túi, bỏ`);
    } else {
      equippedWeapons[i] = uid;
    }
  }

  const equippedGear: Record<GearSlot, string | null> = {
    hat: null,
    armor: null,
    boots: null,
  };

  for (const slot of GEAR_SLOTS) {
    const defId = v7.equippedGear[slot];

    if (defId === null) {
      continue;
    }

    const uid = gearUidByDef.get(defId);

    if (uid === undefined) {
      migrationLog.push(`equippedGear.${slot}: ${defId} không có trong túi, bỏ`);
    } else {
      equippedGear[slot] = uid;
    }
  }

  const save: CharacterSaveV8 = {
    version: SAVE_VERSION_V8,
    level: v7.level,
    xp: v7.xp,
    xpToNext: v7.xpToNext,
    statPoints: v7.statPoints,
    stats: cloneJson(v7.stats),
    gold: v7.gold,
    gems: cloneJson(v7.gems),
    skillLoadout: [
      v7.skillLoadout[0],
      v7.skillLoadout[1],
      v7.skillLoadout[2],
    ],
    extraSkills: [...v7.extraSkills],
    skillLevels: cloneJson(v7.skillLevels),
    characterUid: makeCharacterUid(characterId),
    revision: INITIAL_REVISION,
    nextItemSeq,
    items,
    bag,
    equippedWeapons,
    equippedGear,
    migrationLog,
  };

  const errors = validateSaveV8(save);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, save };
}

/**
 * Đưa dữ liệu thô về v8. version >= 8: chỉ kiểm, không tự sửa. Còn lại:
 * normalizeCharacterSave (v7 chuẩn) rồi migrateV7ToV8. Không throw.
 */
export function migrateToLatest(
  characterId: CharacterId,
  raw: unknown,
): MigrationResult {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as { version?: unknown }).version === 'number' &&
    (raw as { version: number }).version >= SAVE_VERSION_V8
  ) {
    const errors = validateSaveV8(raw);

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return { ok: true, save: cloneJson(raw as CharacterSaveV8) };
  }

  return migrateV7ToV8(characterId, normalizeCharacterSave(characterId, raw));
}

/**
 * Dựng lại dạng v7 (version 7) từ save v8, theo đúng quy ước của normalizer v7:
 * gearLevels chỉ ghi khi level > 1, gearSockets chỉ ghi khi mảng không rỗng.
 * Dùng cho test round-trip và làm cầu nối ở B2.
 */
export function v8ToV7Shape(save: CharacterSaveV8): CharacterSave {
  const inventory: WeaponId[] = [];
  const gearInventory: GearId[] = [];
  const gearLevels: GearLevels = {};
  const gearSockets: GearSockets = {};

  for (const uid of save.bag) {
    const item = save.items[uid];

    if (!item) {
      continue;
    }

    if (item.kind === 'weapon') {
      inventory.push(item.defId);
    } else {
      gearInventory.push(item.defId);

      if (item.level > 1) {
        gearLevels[item.defId] = item.level;
      }

      if (item.sockets.length > 0) {
        gearSockets[item.defId] = [...item.sockets];
      }
    }
  }

  const weaponDef = (uid: string | null): WeaponId | null => {
    const item = uid === null ? undefined : save.items[uid];

    return item && item.kind === 'weapon' ? item.defId : null;
  };
  const gearDef = (uid: string | null): GearId | null => {
    const item = uid === null ? undefined : save.items[uid];

    return item && item.kind === 'gear' ? item.defId : null;
  };

  return {
    version: 7,
    level: save.level,
    xp: save.xp,
    xpToNext: save.xpToNext,
    statPoints: save.statPoints,
    stats: cloneJson(save.stats),
    inventory,
    equipped: [
      weaponDef(save.equippedWeapons[0]),
      weaponDef(save.equippedWeapons[1]),
    ],
    gearInventory,
    equippedGear: {
      hat: gearDef(save.equippedGear.hat),
      armor: gearDef(save.equippedGear.armor),
      boots: gearDef(save.equippedGear.boots),
    },
    gearLevels,
    gold: save.gold,
    gems: cloneJson(save.gems),
    gearSockets,
    skillLoadout: [
      save.skillLoadout[0],
      save.skillLoadout[1],
      save.skillLoadout[2],
    ],
    extraSkills: [...save.extraSkills],
    skillLevels: cloneJson(save.skillLevels),
  };
}
