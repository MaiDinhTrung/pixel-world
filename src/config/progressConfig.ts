/** Khóa localStorage chứa toàn bộ tiến trình (một blob JSON theo CharacterId). Không đổi: đổi sẽ mất save cũ. */
export const PROGRESS_STORAGE_KEY = 'pixel-world:progress:v1';

/** Tiền tố khóa sao lưu chuỗi JSON hỏng; khóa đầy đủ = tiền tố + timestamp. Không bao giờ bị ghi đè/xóa. */
export const PROGRESS_CORRUPT_BACKUP_PREFIX = `${PROGRESS_STORAGE_KEY}:corrupt-`;

/** Phiên bản save v8 (Item Instance + uid + revision). Chưa dùng ở runtime: SAVE_VERSION thật vẫn là 7 (B1 chỉ thêm module thuần). */
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
