import type { WeaponId } from '../combat/Weapon';
import {
  GEAR_SLOTS,
  MAX_GEAR_LEVEL,
  isGearId,
  type GearId,
  type GearSlot,
} from '../config/gearConfig';
import { MAX_SOCKETS } from '../config/gemConfig';
import { isWeaponId } from '../config/weaponInfo';
import type { CharacterSave } from './CharacterProgress';
import { allocateItemUid } from './ItemIds';
import type { ItemInstance } from './ItemInstance';
import { validateSaveV8, type CharacterSaveV8 } from './saveV8';

/**
 * Cầu nối v7 -> v8 ở biên lưu trữ (B2a). CHƯA nối vào game, dùng cho B2b.
 * Module thuần: chỉ nhập kiểu và hàm thuần, không phụ thuộc môi trường chạy hay thời gian/ngẫu nhiên.
 */
export type BridgeResult =
  | { ok: true; save: CharacterSaveV8 }
  | { ok: false; errors: string[] };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Áp save dạng v7 do scene dựng (`next`) lên save v8 hiện có (`prev`):
 * giữ uid của item cùng kind+defId, cấp uid mới từ prev.nextItemSeq cho item mới,
 * không bao giờ cấp lại uid đã bỏ. Không throw, không sửa prev/next.
 */
export function applyV7ShapeToV8(
  prev: CharacterSaveV8,
  next: CharacterSave,
): BridgeResult {
  try {
    const prevErrors = validateSaveV8(prev);

    if (prevErrors.length > 0) {
      return {
        ok: false,
        errors: prevErrors.map((e) => `prev không hợp lệ: ${e}`),
      };
    }

    const errors: string[] = [];
    const prevWeaponUid = new Map<string, string>();
    const prevGearUid = new Map<string, string>();

    for (const item of Object.values(prev.items)) {
      (item.kind === 'weapon' ? prevWeaponUid : prevGearUid).set(
        item.defId,
        item.uid,
      );
    }

    const items: Record<string, ItemInstance> = {};
    const bag: string[] = [];
    const weaponUidByDef = new Map<WeaponId, string>();
    const gearUidByDef = new Map<GearId, string>();
    let nextItemSeq = prev.nextItemSeq;

    for (const defId of next.inventory) {
      if (!isWeaponId(defId)) {
        errors.push(`inventory: defId vũ khí sai: ${String(defId)}`);
        continue;
      }

      if (weaponUidByDef.has(defId)) {
        errors.push(`inventory: defId vũ khí trùng: ${defId}`);
        continue;
      }

      let uid = prevWeaponUid.get(defId);

      if (uid === undefined) {
        const allocated = allocateItemUid('weapon', nextItemSeq);

        uid = allocated.uid;
        nextItemSeq = allocated.nextItemSeq;
      }

      items[uid] = { uid, kind: 'weapon', defId, level: 1 };
      bag.push(uid);
      weaponUidByDef.set(defId, uid);
    }

    for (const defId of next.gearInventory) {
      if (!isGearId(defId)) {
        errors.push(`gearInventory: defId trang bị sai: ${String(defId)}`);
        continue;
      }

      if (gearUidByDef.has(defId)) {
        errors.push(`gearInventory: defId trang bị trùng: ${defId}`);
        continue;
      }

      let uid = prevGearUid.get(defId);

      if (uid === undefined) {
        const allocated = allocateItemUid('gear', nextItemSeq);

        uid = allocated.uid;
        nextItemSeq = allocated.nextItemSeq;
      }

      items[uid] = {
        uid,
        kind: 'gear',
        defId,
        level: clamp(next.gearLevels[defId] ?? 1, 1, MAX_GEAR_LEVEL),
        sockets: cloneJson((next.gearSockets[defId] ?? []).slice(0, MAX_SOCKETS)),
      };
      bag.push(uid);
      gearUidByDef.set(defId, uid);
    }

    const equippedWeapons: [string | null, string | null] = [null, null];

    for (let i = 0; i < 2; i += 1) {
      const defId = next.equipped[i];

      if (defId === null || defId === undefined) {
        continue;
      }

      const uid = weaponUidByDef.get(defId);

      if (uid === undefined) {
        errors.push(`equipped[${i}]: ${String(defId)} không có trong túi`);
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
      const defId = next.equippedGear[slot];

      if (defId === null || defId === undefined) {
        continue;
      }

      const uid = gearUidByDef.get(defId);

      if (uid === undefined) {
        errors.push(`equippedGear.${slot}: ${String(defId)} không có trong túi`);
      } else {
        equippedGear[slot] = uid;
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const save: CharacterSaveV8 = {
      version: 8,
      level: next.level,
      xp: next.xp,
      xpToNext: next.xpToNext,
      statPoints: next.statPoints,
      stats: cloneJson(next.stats),
      gold: next.gold,
      gems: cloneJson(next.gems),
      skillLoadout: [
        next.skillLoadout[0],
        next.skillLoadout[1],
        next.skillLoadout[2],
      ],
      extraSkills: [...next.extraSkills],
      skillLevels: cloneJson(next.skillLevels),
      characterUid: prev.characterUid,
      revision: prev.revision,
      nextItemSeq,
      items,
      bag,
      equippedWeapons,
      equippedGear,
      migrationLog: [...prev.migrationLog],
    };

    const finalErrors = validateSaveV8(save);

    if (finalErrors.length > 0) {
      return { ok: false, errors: finalErrors };
    }

    return { ok: true, save };
  } catch (error) {
    return {
      ok: false,
      errors: [`applyV7ShapeToV8: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
