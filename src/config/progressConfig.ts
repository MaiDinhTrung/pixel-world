/** Khóa localStorage chứa toàn bộ tiến trình (một blob JSON theo CharacterId). Không đổi: đổi sẽ mất save cũ. */
export const PROGRESS_STORAGE_KEY = 'pixel-world:progress:v1';

/** Tiền tố khóa sao lưu chuỗi JSON hỏng; khóa đầy đủ = tiền tố + timestamp. Không bao giờ bị ghi đè/xóa. */
export const PROGRESS_CORRUPT_BACKUP_PREFIX = `${PROGRESS_STORAGE_KEY}:corrupt-`;
