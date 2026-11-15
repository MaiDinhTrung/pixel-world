/** Khóa localStorage chứa toàn bộ tiến trình (một blob JSON theo CharacterId). Không đổi: đổi sẽ mất save cũ. */
export const PROGRESS_STORAGE_KEY = 'pixel-world:progress:v1';

/** Tiền tố khóa sao lưu chuỗi JSON hỏng; khóa đầy đủ = tiền tố + timestamp. Không bao giờ bị ghi đè/xóa. */
export const PROGRESS_CORRUPT_BACKUP_PREFIX = `${PROGRESS_STORAGE_KEY}:corrupt-`;

/**
 * Khóa sao lưu NGUYÊN VĂN chuỗi blob v7 trước lần ghi v8 đầu tiên (B2b).
 * Chỉ ghi khi khóa chưa tồn tại; không bao giờ bị ghi đè hay xóa.
 */
export const PROGRESS_BACKUP_V7_KEY = 'pixel-world:progress:v1:backup-v7';

/** Phiên bản save v8 (Item Instance + uid + revision). Đĩa ghi v8 qua cầu nối ở biên lưu trữ (B2b); SAVE_VERSION trong CharacterProgress vẫn là 7 (dạng cầu nối của scene). */
export const SAVE_VERSION_V8 = 8;

/** Tiền tố định danh nhân vật v8: characterUid = tiền tố + CharacterId + '_1'. */
export const CHARACTER_UID_PREFIX = 'ch_';

/** Tiền tố uid của vũ khí (ví dụ 'w1'). */
export const WEAPON_UID_PREFIX = 'w';

/** Tiền tố uid của trang bị (ví dụ 'g1'). */
export const GEAR_UID_PREFIX = 'g';

/** Số thứ tự uid đầu tiên của mỗi nhân vật (nextItemSeq khởi đầu). */
export const FIRST_ITEM_SEQ = 1;

/** revision khởi đầu của save v8 sau migration. */
export const INITIAL_REVISION = 1;
