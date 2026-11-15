import type { CharacterId } from '../config/characters';
import {
  PROGRESS_CORRUPT_BACKUP_PREFIX,
  PROGRESS_STORAGE_KEY,
} from '../config/progressConfig';
import type { CharacterSave } from './CharacterProgress';
import type {
  ProgressRepository,
  RawProgress,
  SaveResult,
} from './ProgressRepository';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class LocalStorageRepository implements ProgressRepository {
  private corruptBackedUp = false;

  private readonly getStorage: () => Storage;

  constructor(getStorage: () => Storage) {
    this.getStorage = getStorage;
  }

  /** Đọc blob đồng bộ. Ném nếu getItem ném; JSON hỏng -> sao lưu rồi trả {}. */
  private readBlob(): Record<string, unknown> {
    const storage = this.getStorage();
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // rơi xuống nhánh sao lưu bên dưới
    }

    this.backupCorrupt(storage, raw);

    return {};
  }

  private backupCorrupt(storage: Storage, raw: string): void {
    if (this.corruptBackedUp) {
      return;
    }

    this.corruptBackedUp = true;

    try {
      storage.setItem(`${PROGRESS_CORRUPT_BACKUP_PREFIX}${Date.now()}`, raw);
    } catch {
      // không sao lưu được thì thôi; không được làm hỏng luồng chính
    }
  }

  loadAll(): Promise<RawProgress> {
    try {
      return Promise.resolve(this.readBlob() as RawProgress);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  save(id: CharacterId, data: CharacterSave): Promise<SaveResult> {
    // Đọc-sửa-ghi hoàn toàn đồng bộ, không await giữa getItem và setItem.
    try {
      const blob = this.readBlob();

      blob[id] = data;
      this.getStorage().setItem(PROGRESS_STORAGE_KEY, JSON.stringify(blob));

      return Promise.resolve({ ok: true });
    } catch (error) {
      return Promise.resolve({
        ok: false,
        reason: 'io',
        message: errorMessage(error),
      });
    }
  }
}
