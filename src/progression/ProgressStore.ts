import { CHARACTERS, type CharacterId } from '../config/characters';
import {
  normalizeCharacterSave,
  type CharacterSave,
  type ProgressData,
} from './CharacterProgress';
import { LocalStorageRepository } from './LocalStorageRepository';
import type { ProgressRepository, SaveResult } from './ProgressRepository';

export type ProgressStoreState = 'idle' | 'loading' | 'ready' | 'degraded';

export class ProgressNotReadyError extends Error {
  constructor(operation: string) {
    super(`ProgressStore chưa nạp xong dữ liệu (gọi ${operation} quá sớm).`);
    this.name = 'ProgressNotReadyError';
  }
}

export type ProgressErrorListener = (message: string, id?: CharacterId) => void;

const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

/**
 * Cache tiến trình trong bộ nhớ + hàng đợi ghi nối tiếp xuống repository.
 * Scene chỉ làm việc với cache (đồng bộ); việc ghi chạy nền, không chồng nhau.
 */
export class ProgressStore {
  private state: ProgressStoreState = 'idle';
  private cache: ProgressData = {};
  private hydratePromise: Promise<void> | null = null;
  private readonly pending = new Map<CharacterId, CharacterSave>();
  private readonly failed = new Set<CharacterId>();
  private writing = false;
  private flushWaiters: Array<() => void> = [];
  private readonly listeners = new Set<ProgressErrorListener>();

  /** false khi lưu trữ hỏng/bị chặn hoặc lần ghi gần nhất lỗi. */
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

    const cache: ProgressData = {};

    for (const id of CHARACTER_IDS) {
      cache[id] = normalizeCharacterSave(id, failedLoad ? undefined : raw[id]);
    }

    this.cache = cache;
    this.state = failedLoad ? 'degraded' : 'ready';
  }

  private assertReady(operation: string): void {
    if (this.state !== 'ready' && this.state !== 'degraded') {
      throw new ProgressNotReadyError(operation);
    }
  }

  get(id: CharacterId): CharacterSave {
    this.assertReady('get');

    return structuredClone(this.cache[id] as CharacterSave);
  }

  getAll(): ProgressData {
    this.assertReady('getAll');

    return structuredClone(this.cache);
  }

  commit(id: CharacterId, save: CharacterSave): void {
    this.assertReady('commit');

    const copy = structuredClone(save);

    this.cache[id] = copy;

    // Thử ghi lại các bản từng lỗi (bản mới nhất trong cache).
    for (const failedId of this.failed) {
      if (failedId !== id && !this.pending.has(failedId)) {
        this.pending.set(failedId, this.cache[failedId] as CharacterSave);
      }
    }

    this.failed.clear();
    this.pending.set(id, copy);
    this.pump();
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
    this.writing = true;

    let result: Promise<SaveResult>;

    try {
      result = this.repo.save(id, save);
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
          this.failed.delete(id);

          if (this.failed.size === 0) {
            this.persistent = this.state === 'ready';
          }
        } else {
          this.persistent = false;
          this.lastError = outcome.message;
          this.failed.add(id);

          for (const listener of this.listeners) {
            try {
              listener(outcome.message, id);
            } catch (listenerError) {
              console.warn('ProgressStore: listener onError ném lỗi', listenerError);
            }
          }
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
