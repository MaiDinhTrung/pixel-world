import type { CharacterId } from '../config/characters';
import {
  PROGRESS_BACKUP_V7_KEY,
  PROGRESS_CORRUPT_BACKUP_PREFIX,
  PROGRESS_STORAGE_KEY,
} from '../config/progressConfig';
import type {
  ProgressRepository,
  RawProgress,
  SaveResult,
} from './ProgressRepository';
import type { CharacterSaveV8 } from './saveV8';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** revision nguyên của bản đang lưu; thiếu/không nguyên (v7) -> 0. */
function readRevision(stored: unknown): number {
  if (typeof stored === 'object' && stored !== null) {
    const revision = (stored as { revision?: unknown }).revision;

    if (typeof revision === 'number' && Number.isInteger(revision)) {
      return revision;
    }
  }

  return 0;
}

/** Bản đang lưu đã là v8 (có revision nguyên và version >= 8). */
function isV8Shape(stored: unknown): boolean {
  if (typeof stored !== 'object' || stored === null) {
    return false;
  }

  const { version, revision } = stored as { version?: unknown; revision?: unknown };

  return (
    typeof version === 'number' &&
    version >= 8 &&
    typeof revision === 'number' &&
    Number.isInteger(revision)
  );
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

    return this.parseBlob(storage, storage.getItem(PROGRESS_STORAGE_KEY));
  }

  /** Phân tích chuỗi blob đã đọc; JSON hỏng -> sao lưu rồi trả {}. */
  private parseBlob(storage: Storage, raw: string | null): Record<string, unknown> {
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

  save(
    id: CharacterId,
    data: CharacterSaveV8,
    expectedRevision: number,
  ): Promise<SaveResult> {
    // Đọc-sửa-ghi hoàn toàn đồng bộ, không await giữa getItem và setItem.
    try {
      const storage = this.getStorage();
      const rawBlob = storage.getItem(PROGRESS_STORAGE_KEY);
      const blob = this.parseBlob(storage, rawBlob);
      const stored = blob[id];
      const storedRevision = readRevision(stored);

      if (storedRevision !== expectedRevision) {
        return Promise.resolve({
          ok: false,
          reason: 'conflict',
          message: `revision trên đĩa (${storedRevision}) khác revision mong đợi (${expectedRevision})`,
        });
      }

      // Nhân vật đang là v7 trên đĩa: sao lưu nguyên văn chuỗi blob trước khi ghi v8.
      if (rawBlob !== null && stored !== undefined && stored !== null && !isV8Shape(stored)) {
        const backupExists = storage.getItem(PROGRESS_BACKUP_V7_KEY) !== null;

        try {
          if (!backupExists) {
            storage.setItem(PROGRESS_BACKUP_V7_KEY, rawBlob);
          }
        } catch (backupError) {
          return Promise.resolve({
            ok: false,
            reason: 'readonly',
            message: `không sao lưu được save v7: ${errorMessage(backupError)}`,
          });
        }
      }

      blob[id] = data;
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(blob));

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
