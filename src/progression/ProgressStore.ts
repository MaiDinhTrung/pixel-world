import { CHARACTERS, type CharacterId } from '../config/characters';
import type { ProgressRepository, SaveResult } from './ProgressRepository';
import { LocalStorageRepository } from './LocalStorageRepository';
import { makeCharacterUid, migrateToLatest } from './saveMigration';
import type { CharacterSaveV8, ProgressDataV8 } from './saveV8';

export type ProgressStoreState = 'idle' | 'loading' | 'ready' | 'degraded';

export class ProgressNotReadyError extends Error {
  constructor(operation: string) {
    super(`ProgressStore chưa nạp xong dữ liệu (gọi ${operation} quá sớm).`);
    this.name = 'ProgressNotReadyError';
  }
}

/** Lý do lỗi: io = ghi lỗi (thử lại được); conflict/readonly = nhân vật bị khóa chỉ-đọc. */
export type ProgressErrorReason = 'io' | 'conflict' | 'readonly';

export type ProgressErrorListener = (
  message: string,
  id?: CharacterId,
  reason?: ProgressErrorReason,
) => void;

/**
 * Nguyên nhân nhân vật bị khóa chỉ-đọc:
 * conflict = đĩa đã đổi ở nơi khác; readonly = repo từ chối ghi; corrupt = save hỏng/sai uid/version >= 9;
 * load-failed = không nạp được kho lúc hydrate.
 */
export type ProgressLockReason = 'conflict' | 'readonly' | 'corrupt' | 'load-failed';

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

/**
 * Cache tiến trình (save v8) trong bộ nhớ + hàng đợi ghi nối tiếp xuống repository.
 * Scene chỉ làm việc với cache (đồng bộ); việc ghi chạy nền, không chồng nhau.
 *
 * Migration lười: hydrate KHÔNG ghi gì; nhân vật v7 chỉ được ghi v8 ở commit đầu tiên.
 * Nhân vật bị khóa (locked) không bao giờ được ghi: không có đường tự ghi đè dữ liệu trên đĩa.
 */
export class ProgressStore {
  private state: ProgressStoreState = 'idle';
  private cache: ProgressDataV8 = {};
  private hydratePromise: Promise<void> | null = null;
  private readonly pending = new Map<CharacterId, CharacterSaveV8>();
  private readonly failed = new Set<CharacterId>();
  /** revision đang nằm trên đĩa theo nhân vật (0 nếu đĩa chưa có revision). */
  private readonly diskRevision = new Map<CharacterId, number>();
  /** Nhân vật chỉ-đọc, kèm thông điệp lỗi. */
  private readonly locked = new Map<CharacterId, string>();
  /** Nguyên nhân khóa theo nhân vật. */
  private readonly lockKind = new Map<CharacterId, ProgressLockReason>();
  /** Nhân vật đã phát lỗi khóa (mỗi nhân vật một lần). */
  private readonly lockNotified = new Set<CharacterId>();
  private writing = false;
  private flushWaiters: Array<() => void> = [];
  private readonly listeners = new Set<ProgressErrorListener>();

  /** false khi lưu trữ hỏng/bị chặn, lần ghi gần nhất lỗi hoặc có nhân vật bị khóa. */
  persistent = true;
  lastError: string | null = null;

  private readonly repo: ProgressRepository;

  constructor(repo: ProgressRepository) {
    this.repo = repo;
  }

  getState(): ProgressStoreState {
    return this.state;
  }

  onError(listener: ProgressErrorListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Nhân vật có đang bị khóa chỉ-đọc không (đồng bộ). */
  isLocked(id: CharacterId): boolean {
    return this.locked.has(id);
  }

  /** Nguyên nhân khóa, hoặc null nếu nhân vật không bị khóa. */
  getLockReason(id: CharacterId): ProgressLockReason | null {
    return this.lockKind.get(id) ?? null;
  }

  hydrate(): Promise<void> {
    if (this.hydratePromise) {
      return this.hydratePromise;
    }

    this.state = 'loading';
    this.hydratePromise = this.doHydrate();

    return this.hydratePromise;
  }

  private async doHydrate(): Promise<void> {
    let raw: Partial<Record<CharacterId, unknown>> = {};
    let failedLoad = false;

    try {
      raw = (await this.repo.loadAll()) ?? {};
    } catch (error) {
      failedLoad = true;
      this.persistent = false;
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    const cache: ProgressDataV8 = {};

    for (const id of CHARACTER_IDS) {
      const rawValue = failedLoad ? undefined : raw[id];
      const migrated = migrateToLatest(id, rawValue);
      let problem: string | null = null;

      if (!migrated.ok) {
        problem = migrated.errors.join('; ');
      } else if (migrated.save.characterUid !== makeCharacterUid(id)) {
        problem = `characterUid ${migrated.save.characterUid} không khớp ${makeCharacterUid(id)}`;
      }

      if (failedLoad) {
        // Không đọc được kho: không biết trên đĩa có gì -> khóa chỉ-đọc, tuyệt đối không ghi.
        const fallback = migrateToLatest(id, undefined);

        if (!fallback.ok) {
          throw new Error(`Không dựng được save mặc định cho ${id}`);
        }

        cache[id] = fallback.save;
        this.locked.set(
          id,
          `Không nạp được kho tiến trình (${this.lastError ?? 'không rõ'}); ${id} chuyển sang chỉ-đọc, không ghi.`,
        );
        this.lockKind.set(id, 'load-failed');
      } else if (migrated.ok && problem === null) {
        cache[id] = migrated.save;
      } else {
        // Save v8 hỏng / version >= 9 / sai uid: hiển thị bằng save mặc định, khóa chỉ-đọc.
        const fallback = migrateToLatest(id, undefined);

        if (!fallback.ok) {
          throw new Error(`Không dựng được save mặc định cho ${id}`);
        }

        cache[id] = fallback.save;
        this.lockKind.set(id, 'corrupt');
        this.locked.set(
          id,
          `Save của ${id} không đọc được (${problem ?? 'không rõ'}); chuyển sang chỉ-đọc, không ghi đè.`,
        );
        this.persistent = false;
        this.lastError = this.locked.get(id) ?? null;
      }

      const diskRev =
        typeof rawValue === 'object' && rawValue !== null
          ? (rawValue as { revision?: unknown }).revision
          : undefined;

      this.diskRevision.set(
        id,
        typeof diskRev === 'number' && Number.isInteger(diskRev) ? diskRev : 0,
      );
    }

    this.cache = cache;
    this.state = failedLoad ? 'degraded' : 'ready';
  }

  private assertReady(operation: string): void {
    if (this.state !== 'ready' && this.state !== 'degraded') {
      throw new ProgressNotReadyError(operation);
    }
  }

  get(id: CharacterId): CharacterSaveV8 {
    this.assertReady('get');

    return structuredClone(this.cache[id] as CharacterSaveV8);
  }

  getAll(): ProgressDataV8 {
    this.assertReady('getAll');

    return structuredClone(this.cache);
  }

  commit(id: CharacterId, save: CharacterSaveV8): void {
    this.assertReady('commit');

    const copy = structuredClone(save);

    // revision do store quản lý: luôn tăng so với bản đang ở cache.
    copy.revision = (this.cache[id]?.revision ?? 0) + 1;
    this.cache[id] = copy;

    const lockMessage = this.locked.get(id);

    if (lockMessage !== undefined) {
      // Chỉ-đọc: cập nhật cache cho phiên hiện tại, KHÔNG ghi; báo một lần.
      this.notifyLocked(id, 'readonly', lockMessage);

      return;
    }

    // Thử ghi lại các bản từng lỗi (bản mới nhất trong cache).
    for (const failedId of this.failed) {
      if (failedId !== id && !this.pending.has(failedId) && !this.locked.has(failedId)) {
        this.pending.set(failedId, this.cache[failedId] as CharacterSaveV8);
      }
    }

    this.failed.clear();
    this.pending.set(id, copy);
    this.pump();
  }

  private emit(message: string, id: CharacterId, reason: ProgressErrorReason): void {
    for (const listener of this.listeners) {
      try {
        listener(message, id, reason);
      } catch (listenerError) {
        console.warn('ProgressStore: listener onError ném lỗi', listenerError);
      }
    }
  }

  /** Phát lỗi khóa đúng một lần cho mỗi nhân vật. */
  private notifyLocked(
    id: CharacterId,
    reason: 'conflict' | 'readonly',
    message: string,
  ): void {
    if (this.lockNotified.has(id)) {
      return;
    }

    this.lockNotified.add(id);
    this.persistent = false;
    this.lastError = message;
    this.emit(message, id, reason);
  }

  private pump(): void {
    if (this.writing) {
      return;
    }

    const next = this.pending.entries().next();

    if (next.done) {
      this.resolveFlush();

      return;
    }

    const [id, save] = next.value;

    this.pending.delete(id);

    if (this.locked.has(id)) {
      // Bị khóa trong lúc chờ: bỏ, không ghi.
      this.pump();

      return;
    }

    this.writing = true;

    const expectedRevision = this.diskRevision.get(id) ?? 0;
    let result: Promise<SaveResult>;

    try {
      result = this.repo.save(id, save, expectedRevision);
    } catch (error) {
      result = Promise.resolve({
        ok: false,
        reason: 'io',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    void result
      .catch(
        (error: unknown): SaveResult => ({
          ok: false,
          reason: 'io',
          message: error instanceof Error ? error.message : String(error),
        }),
      )
      .then((outcome) => {
        if (outcome.ok) {
          this.diskRevision.set(id, save.revision);
          this.failed.delete(id);

          if (this.failed.size === 0 && this.locked.size === 0) {
            this.persistent = this.state === 'ready';
          }
        } else if (outcome.reason === 'conflict' || outcome.reason === 'readonly') {
          this.locked.set(id, outcome.message);
          this.lockKind.set(id, outcome.reason);
          this.pending.delete(id);
          this.failed.delete(id);
          this.notifyLocked(id, outcome.reason, outcome.message);
        } else {
          this.persistent = false;
          this.lastError = outcome.message;
          this.failed.add(id);
          this.emit(outcome.message, id, 'io');
        }

        this.writing = false;
        this.pump();
      });
  }

  private resolveFlush(): void {
    const waiters = this.flushWaiters;

    this.flushWaiters = [];

    for (const resolve of waiters) {
      resolve();
    }
  }

  /** Resolve khi hàng đợi ghi rỗng và không còn lệnh ghi đang chạy. */
  flush(): Promise<void> {
    if (!this.writing && this.pending.size === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.flushWaiters.push(resolve);
    });
  }
}

/** Store dùng chung; localStorage lấy lười để import được trong môi trường Node. */
export const progressStore = new ProgressStore(
  new LocalStorageRepository(() => window.localStorage),
);
