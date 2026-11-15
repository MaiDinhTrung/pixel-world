import {
  GEAR_INFO,
  GEAR_SLOTS,
  MAX_GEAR_LEVEL,
  isGearId,
  type GearSlot,
} from '../config/gearConfig';
import { MAX_SOCKETS, isGemId } from '../config/gemConfig';
import { SAVE_VERSION_V8 } from '../config/progressConfig';
import { isWeaponId } from '../config/weaponInfo';
import type { CharacterSave } from './CharacterProgress';
import { parseItemUid } from './ItemIds';
import type { ItemInstance } from './ItemInstance';

/** Save v8: các trường v7 giữ nguyên + Item Instance, uid nhân vật, revision. */
export type CharacterSaveV8 = Omit<
  CharacterSave,
  | 'version'
  | 'inventory'
  | 'equipped'
  | 'gearInventory'
  | 'equippedGear'
  | 'gearLevels'
  | 'gearSockets'
> & {
  version: typeof SAVE_VERSION_V8;
  /** 'ch_<CharacterId>_1'. */
  characterUid: string;
  /** Migration đặt 1; B2 mới dùng để kiểm xung đột. */
  revision: number;
  /** Số thứ tự kế tiếp cho uid. */
  nextItemSeq: number;
  items: Record<string, ItemInstance>;
  /** uid; vũ khí rồi đến trang bị, giữ đúng thứ tự mảng v7. */
  bag: string[];
  equippedWeapons: [string | null, string | null];
  equippedGear: Record<GearSlot, string | null>;
  /** Rỗng nếu không có gì bị loại khi migrate. */
  migrationLog: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const MAX_JSON_DEPTH = 40;

/** Thu lỗi nếu giá trị không JSON-hóa nguyên vẹn được (undefined, Map, NaN, hàm...). */
function collectJsonErrors(
  value: unknown,
  path: string,
  errors: string[],
  depth: number,
): void {
  if (depth > MAX_JSON_DEPTH) {
    errors.push(`${path}: lồng quá sâu`);
    return;
  }

  if (value === null) {
    return;
  }

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return;
    case 'number':
      if (!Number.isFinite(value)) {
        errors.push(`${path}: số không hữu hạn`);
      }
      return;
    case 'object':
      break;
    default:
      errors.push(`${path}: kiểu ${typeof value} không JSON-hóa được`);
      return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      if (!(i in value)) {
        errors.push(`${path}[${i}]: ô trống`);
        continue;
      }

      collectJsonErrors(value[i], `${path}[${i}]`, errors, depth + 1);
    }
    return;
  }

  const proto = Object.getPrototypeOf(value);

  if (proto !== Object.prototype && proto !== null) {
    errors.push(`${path}: đối tượng không phải dạng thuần`);
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    collectJsonErrors(child, `${path}.${key}`, errors, depth + 1);
  }
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Kiểm bất biến của save v8. Trả danh sách lỗi (rỗng = hợp lệ).
 * Nhận `unknown` để dùng được cho dữ liệu đọc thô; không throw.
 */
export function validateSaveV8(save: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(save)) {
    return ['save không phải đối tượng'];
  }

  if (save.version !== SAVE_VERSION_V8) {
    errors.push(`version phải là ${SAVE_VERSION_V8}`);
  }

  if (typeof save.characterUid !== 'string' || save.characterUid === '') {
    errors.push('characterUid thiếu hoặc rỗng');
  }

  if (!isPositiveInt(save.revision)) {
    errors.push('revision phải là số nguyên >= 1');
  }

  if (!Array.isArray(save.migrationLog)) {
    errors.push('migrationLog phải là mảng');
  } else if (save.migrationLog.some((entry) => typeof entry !== 'string')) {
    errors.push('migrationLog chỉ chứa chuỗi');
  }

  // Các trường v7 giữ nguyên: chỉ kiểm hình dạng cơ bản.
  for (const key of ['level', 'xp', 'xpToNext', 'statPoints', 'gold'] as const) {
    if (!isFiniteNumber(save[key])) {
      errors.push(`${key} phải là số hữu hạn`);
    }
  }

  for (const key of ['stats', 'gems', 'skillLevels'] as const) {
    if (!isRecord(save[key])) {
      errors.push(`${key} phải là đối tượng`);
    }
  }

  if (!Array.isArray(save.skillLoadout) || save.skillLoadout.length !== 3) {
    errors.push('skillLoadout phải là mảng 3 phần tử');
  }

  if (!Array.isArray(save.extraSkills)) {
    errors.push('extraSkills phải là mảng');
  }

  const itemsValue = save.items;
  const items = new Map<string, ItemInstance>();

  if (!isRecord(itemsValue)) {
    errors.push('items thiếu hoặc không phải đối tượng');
  } else {
    const seenDef = new Set<string>();
    let maxSeq = 0;

    for (const [key, raw] of Object.entries(itemsValue)) {
      if (!isRecord(raw)) {
        errors.push(`items.${key} không phải đối tượng`);
        continue;
      }

      const parsed = parseItemUid(key);

      if (raw.uid !== key) {
        errors.push(`items.${key}: uid không khớp khóa`);
      }

      if (raw.kind !== 'weapon' && raw.kind !== 'gear') {
        errors.push(`items.${key}: kind không hợp lệ`);
        continue;
      }

      if (!parsed || parsed.kind !== raw.kind) {
        errors.push(`items.${key}: uid không khớp tiền tố/kind`);
      } else {
        maxSeq = Math.max(maxSeq, parsed.seq);
      }

      if (raw.kind === 'weapon') {
        if (!isWeaponId(raw.defId)) {
          errors.push(`items.${key}: defId vũ khí không hợp lệ`);
        }

        if (raw.level !== 1) {
          errors.push(`items.${key}: level vũ khí phải là 1`);
        }

        if ('sockets' in raw) {
          errors.push(`items.${key}: vũ khí không có sockets`);
        }
      } else {
        if (!isGearId(raw.defId)) {
          errors.push(`items.${key}: defId trang bị không hợp lệ`);
        }

        if (
          typeof raw.level !== 'number' ||
          !Number.isInteger(raw.level) ||
          raw.level < 1 ||
          raw.level > MAX_GEAR_LEVEL
        ) {
          errors.push(`items.${key}: level ngoài [1, ${MAX_GEAR_LEVEL}]`);
        }

        if (!Array.isArray(raw.sockets)) {
          errors.push(`items.${key}: sockets phải là mảng`);
        } else {
          if (raw.sockets.length > MAX_SOCKETS) {
            errors.push(`items.${key}: quá ${MAX_SOCKETS} lỗ ngọc`);
          }

          if (raw.sockets.some((s) => s !== null && !isGemId(s))) {
            errors.push(`items.${key}: lỗ ngọc chứa giá trị sai`);
          }
        }
      }

      const defKey = `${raw.kind}:${String(raw.defId)}`;

      if (seenDef.has(defKey)) {
        errors.push(`items.${key}: defId ${String(raw.defId)} bị trùng`);
      }

      seenDef.add(defKey);
      items.set(key, raw as unknown as ItemInstance);
    }

    if (!isPositiveInt(save.nextItemSeq)) {
      errors.push('nextItemSeq phải là số nguyên >= 1');
    } else if (save.nextItemSeq <= maxSeq) {
      errors.push('nextItemSeq phải lớn hơn mọi seq đang dùng');
    }
  }

  // bag: mỗi item nằm trong bag đúng một lần, mọi uid trong bag tồn tại.
  if (!Array.isArray(save.bag)) {
    errors.push('bag thiếu hoặc không phải mảng');
  } else {
    const inBag = new Set<string>();

    for (const uid of save.bag) {
      if (typeof uid !== 'string' || !items.has(uid)) {
        errors.push(`bag chứa uid không tồn tại: ${String(uid)}`);
        continue;
      }

      if (inBag.has(uid)) {
        errors.push(`bag chứa uid lặp: ${uid}`);
      }

      inBag.add(uid);
    }

    for (const uid of items.keys()) {
      if (!inBag.has(uid)) {
        errors.push(`item ${uid} không nằm trong bag`);
      }
    }
  }

  // equippedWeapons
  const weapons = save.equippedWeapons;

  if (!Array.isArray(weapons) || weapons.length !== 2) {
    errors.push('equippedWeapons phải là mảng 2 phần tử');
  } else {
    for (let i = 0; i < 2; i += 1) {
      const uid = weapons[i];

      if (uid === null) {
        continue;
      }

      const item = typeof uid === 'string' ? items.get(uid) : undefined;

      if (!item) {
        errors.push(`equippedWeapons[${i}] trỏ uid không tồn tại`);
      } else if (item.kind !== 'weapon') {
        errors.push(`equippedWeapons[${i}] không phải vũ khí`);
      }
    }

    if (weapons[0] !== null && weapons[0] === weapons[1]) {
      errors.push('equippedWeapons: hai ô trùng uid');
    }
  }

  // equippedGear
  if (!isRecord(save.equippedGear)) {
    errors.push('equippedGear thiếu hoặc không phải đối tượng');
  } else {
    for (const slot of GEAR_SLOTS) {
      const uid = save.equippedGear[slot];

      if (uid === null) {
        continue;
      }

      const item = typeof uid === 'string' ? items.get(uid) : undefined;

      if (!item) {
        errors.push(`equippedGear.${slot} trỏ uid không tồn tại`);
      } else if (item.kind !== 'gear') {
        errors.push(`equippedGear.${slot} không phải trang bị`);
      } else if (isGearId(item.defId) && GEAR_INFO[item.defId].slot !== slot) {
        errors.push(`equippedGear.${slot} sai ô trang bị`);
      }
    }
  }

  collectJsonErrors(save, 'save', errors, 0);

  return errors;
}
