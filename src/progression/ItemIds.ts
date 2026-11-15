import {
  FIRST_ITEM_SEQ,
  GEAR_UID_PREFIX,
  WEAPON_UID_PREFIX,
} from '../config/progressConfig';
import type { ItemKind } from './ItemInstance';

/** Tiền tố uid theo loại đồ. */
export function uidPrefixOf(kind: ItemKind): string {
  return kind === 'weapon' ? WEAPON_UID_PREFIX : GEAR_UID_PREFIX;
}

function isValidSeq(seq: number): boolean {
  return Number.isInteger(seq) && seq >= FIRST_ITEM_SEQ;
}

/** Dựng uid = tiền tố + seq (base36). Thuần, xác định. */
export function formatItemUid(kind: ItemKind, seq: number): string {
  if (!isValidSeq(seq)) {
    throw new RangeError(`seq không hợp lệ: ${seq}`);
  }

  return uidPrefixOf(kind) + seq.toString(36);
}

/** Tách uid thành loại + seq; trả null nếu không đúng dạng chuẩn. */
export function parseItemUid(
  uid: unknown,
): { kind: ItemKind; seq: number } | null {
  if (typeof uid !== 'string' || uid.length < 2) {
    return null;
  }

  const prefix = uid[0];
  let kind: ItemKind;

  if (prefix === WEAPON_UID_PREFIX) {
    kind = 'weapon';
  } else if (prefix === GEAR_UID_PREFIX) {
    kind = 'gear';
  } else {
    return null;
  }

  const body = uid.slice(1);

  if (!/^[0-9a-z]+$/.test(body)) {
    return null;
  }

  const seq = parseInt(body, 36);

  // Chỉ nhận dạng chuẩn (không có số 0 đứng đầu).
  if (!isValidSeq(seq) || seq.toString(36) !== body) {
    return null;
  }

  return { kind, seq };
}

/**
 * Cấp một uid từ nextItemSeq. Trả uid và nextItemSeq mới (không đổi tham số vào).
 */
export function allocateItemUid(
  kind: ItemKind,
  nextItemSeq: number,
): { uid: string; nextItemSeq: number } {
  return {
    uid: formatItemUid(kind, nextItemSeq),
    nextItemSeq: nextItemSeq + 1,
  };
}
