import { describe, expect, it, vi } from 'vitest';
import { CHARACTERS, type CharacterId } from '../config/characters';
import {
  PROGRESS_BACKUP_V7_KEY,
  PROGRESS_STORAGE_KEY,
} from '../config/progressConfig';
import { createDefaultSave } from './CharacterProgress';
import { LocalStorageRepository } from './LocalStorageRepository';
import { ProgressNotReadyError, ProgressStore } from './ProgressStore';
import type {
  ProgressRepository,
  RawProgress,
  SaveResult,
} from './ProgressRepository';
import { migrateToLatest } from './saveMigration';
import type { CharacterSaveV8 } from './saveV8';

const ids = Object.keys(CHARACTERS) as CharacterId[];
const id = ids[0];

/** Save v8 mặc định của một nhân vật (revision 1). */
function v8Default(characterId: CharacterId): CharacterSaveV8 {
  const result = migrateToLatest(characterId, undefined);

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return result.save;
}

class FakeRepo implements ProgressRepository {
  raw: RawProgress = {};
  failLoad = false;
  failSave = false;
  delayMs = 0;
  loadCalls = 0;
  running = 0;
  overlapped = false;
  saved: Array<{ id: CharacterId; gold: number }> = [];
  calls: Array<{ id: CharacterId; expected: number; revision: number }> = [];

  loadAll(): Promise<RawProgress> {
    this.loadCalls += 1;

    return this.failLoad
      ? Promise.reject(new Error('read fail'))
      : Promise.resolve(this.raw);
  }

  async save(
    saveId: CharacterId,
    data: CharacterSaveV8,
    expectedRevision: number,
  ): Promise<SaveResult> {
    this.calls.push({
      id: saveId,
      expected: expectedRevision,
      revision: data.revision,
    });
    this.running += 1;

    if (this.running > 1) {
      this.overlapped = true;
    }

    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    this.running -= 1;

    if (this.failSave) {
      return { ok: false, reason: 'io', message: 'write fail' };
    }

    this.saved.push({ id: saveId, gold: data.gold });

    return { ok: true };
  }
}

async function readyStore(repo = new FakeRepo()) {
  const store = new ProgressStore(repo);

  await store.hydrate();

  return { store, repo };
}

describe('ProgressStore', () => {
  it('get/commit trước hydrate ném ProgressNotReadyError', () => {
    const store = new ProgressStore(new FakeRepo());

    expect(() => store.get(id)).toThrow(ProgressNotReadyError);
    expect(() => store.getAll()).toThrow(ProgressNotReadyError);
    expect(() => store.commit(id, v8Default(id))).toThrow(
      ProgressNotReadyError,
    );
  });

  it('hydrate idempotent và đồng thời dùng chung một lần nạp', async () => {
    const repo = new FakeRepo();
    const store = new ProgressStore(repo);
    const a = store.hydrate();
    const b = store.hydrate();

    expect(a).toBe(b);
    await Promise.all([a, b]);
    await store.hydrate();
    expect(repo.loadCalls).toBe(1);
    expect(store.getState()).toBe('ready');
    expect(Object.keys(store.getAll())).toHaveLength(ids.length);
  });

  it('hydrate lỗi -> degraded, cache mặc định, không reject', async () => {
    const repo = new FakeRepo();

    repo.failLoad = true;

    const store = new ProgressStore(repo);

    await expect(store.hydrate()).resolves.toBeUndefined();
    expect(store.getState()).toBe('degraded');
    expect(store.persistent).toBe(false);
    expect(store.lastError).toBe('read fail');
    expect(store.get(id)).toEqual(v8Default(id));
  });

  it('get trả bản sao: sửa kết quả không đổi cache', async () => {
    const { store } = await readyStore();
    const first = store.get(id);

    first.gold = 987654;
    expect(store.get(id).gold).not.toBe(987654);
  });

  it('commit rồi get thấy ngay', async () => {
    const { store } = await readyStore();
    const save = v8Default(id);

    save.gold = 4321;
    store.commit(id, save);
    expect(store.get(id).gold).toBe(4321);
    expect(store.getAll()[id]?.gold).toBe(4321);
  });

  it('nhiều commit khi repo chậm: đúng thứ tự, không chồng, bản cuối thắng', async () => {
    const repo = new FakeRepo();

    repo.delayMs = 5;

    const { store } = await readyStore(repo);

    for (let gold = 1; gold <= 5; gold += 1) {
      const save = v8Default(id);

      save.gold = gold;
      store.commit(id, save);
    }

    await store.flush();

    expect(repo.overlapped).toBe(false);

    const golds = repo.saved.map((entry) => entry.gold);

    expect(golds).toEqual([...golds].sort((x, y) => x - y));
    expect(golds[golds.length - 1]).toBe(5);
  });

  it('nhiều commit liên tiếp khi repo chậm được gộp: ít lần save hơn số commit, bản cuối là mới nhất', async () => {
    const repo = new FakeRepo();

    repo.delayMs = 5;

    const { store } = await readyStore(repo);
    const commits = 6;

    for (let gold = 1; gold <= commits; gold += 1) {
      const save = v8Default(id);

      save.gold = gold;
      store.commit(id, save);
    }

    await store.flush();

    const forId = repo.saved.filter((entry) => entry.id === id);

    expect(forId.length).toBeLessThan(commits);
    expect(forId[forId.length - 1]?.gold).toBe(commits);
  });

  it('repo.save ném đồng bộ: cache giữ, onError phát, persistent=false, hàng đợi vẫn chạy', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);
    const errors: string[] = [];

    repo.save = () => {
      throw new Error('sync boom');
    };
    store.onError((message) => errors.push(message));

    const save = v8Default(id);

    save.gold = 31;
    store.commit(id, save);
    await store.flush();

    expect(errors).toEqual(['sync boom']);
    expect(store.persistent).toBe(false);
    expect(store.lastError).toBe('sync boom');
    expect(store.get(id).gold).toBe(31);
  });

  it('repo.save reject: cache giữ, onError phát, persistent=false', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);
    const errors: string[] = [];

    repo.save = () => Promise.reject(new Error('async boom'));
    store.onError((message) => errors.push(message));

    const save = v8Default(id);

    save.gold = 32;
    store.commit(id, save);
    await store.flush();

    expect(errors).toEqual(['async boom']);
    expect(store.persistent).toBe(false);
    expect(store.get(id).gold).toBe(32);
  });

  it('commit id B ghi lại bản id A từng lỗi', async () => {
    const idB = ids[1];

    expect(idB).toBeDefined();

    const repo = new FakeRepo();
    const { store } = await readyStore(repo);

    repo.failSave = true;

    const a = v8Default(id);

    a.gold = 10;
    store.commit(id, a);
    await store.flush();
    expect(store.persistent).toBe(false);

    repo.failSave = false;

    const b = v8Default(idB);

    b.gold = 20;
    store.commit(idB, b);
    await store.flush();

    expect(repo.saved).toContainEqual({ id, gold: 10 });
    expect(repo.saved).toContainEqual({ id: idB, gold: 20 });
    expect(store.persistent).toBe(true);
  });

  it('persistent về true sau khi id từng lỗi được ghi thành công (không cần commit id khác)', async () => {
    const repo = new FakeRepo();

    repo.delayMs = 5;

    const { store } = await readyStore(repo);
    let failures = 1;
    const originalSave = repo.save.bind(repo);

    repo.save = async (saveId, data) => {
      if (failures > 0) {
        failures -= 1;
        await new Promise((resolve) => setTimeout(resolve, 5));

        return { ok: false, reason: 'io', message: 'first fail' };
      }

      return originalSave(saveId, data);
    };

    const first = v8Default(id);

    first.gold = 1;
    store.commit(id, first); // đang ghi, sẽ lỗi

    const second = v8Default(id);

    second.gold = 2;
    store.commit(id, second); // vào hàng đợi trong lúc lần 1 còn chạy

    await store.flush();

    expect(repo.saved).toEqual([{ id, gold: 2 }]);
    expect(store.persistent).toBe(true);
  });

  it('listener onError ném lỗi: hàng đợi không kẹt, flush resolve, listener sau vẫn được gọi, ghi sau vẫn chạy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const repo = new FakeRepo();
      const { store } = await readyStore(repo);
      const later: string[] = [];

      store.onError(() => {
        throw new Error('listener boom');
      });
      store.onError((message) => later.push(message));
      repo.failSave = true;

      const save = v8Default(id);

      save.gold = 5;
      store.commit(id, save);
      await store.flush();

      expect(later).toEqual(['write fail']);

      repo.failSave = false;

      const next = v8Default(id);

      next.gold = 6;
      store.commit(id, next);
      await store.flush();

      expect(repo.saved).toContainEqual({ id, gold: 6 });
      expect(store.persistent).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it('save lỗi: cache giữ nguyên, onError kêu, commit kế tiếp ghi lại được', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);
    const errors: string[] = [];

    store.onError((message) => errors.push(message));
    repo.failSave = true;

    const save = v8Default(id);

    save.gold = 77;
    store.commit(id, save);
    await store.flush();

    expect(errors).toEqual(['write fail']);
    expect(store.persistent).toBe(false);
    expect(store.get(id).gold).toBe(77);

    repo.failSave = false;

    const next = v8Default(id);

    next.gold = 88;
    store.commit(id, next);
    await store.flush();

    expect(repo.saved).toEqual([{ id, gold: 88 }]);
    expect(store.persistent).toBe(true);
  });

  it('flush chỉ resolve khi hàng đợi rỗng', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    repo.save = async (saveId, data) => {
      await gate;
      repo.saved.push({ id: saveId, gold: data.gold });

      return { ok: true };
    };

    const save = v8Default(id);

    save.gold = 9;
    store.commit(id, save);

    let done = false;
    const flushed = store.flush().then(() => {
      done = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(done).toBe(false); // repo còn đang chờ
    expect(repo.saved).toHaveLength(0);

    release();
    await flushed;
    expect(done).toBe(true);
    expect(repo.saved).toEqual([{ id, gold: 9 }]);
  });
});

class FakeStorage implements Storage {
  data = new Map<string, string>();
  setCalls = 0;

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.setCalls += 1;
    this.data.set(key, value);
  }
}

function storeOn(storage: FakeStorage): ProgressStore {
  return new ProgressStore(new LocalStorageRepository(() => storage));
}

function seed(storage: FakeStorage, blob: Record<string, unknown>): string {
  const text = JSON.stringify(blob);

  storage.data.set(PROGRESS_STORAGE_KEY, text);

  return text;
}

describe('ProgressStore v8: hydrate lười, revision, khóa chỉ-đọc', () => {
  it('hydrate v7 -> cache v8 revision 1, không save nào được gọi, không sao lưu', async () => {
    const repo = new FakeRepo();
    const v7 = createDefaultSave(id);

    v7.gold = 55;
    repo.raw = { [id]: v7 };

    const { store } = await readyStore(repo);

    expect(store.get(id)).toMatchObject({ version: 8, revision: 1, gold: 55 });
    expect(repo.calls).toHaveLength(0);

    const storage = new FakeStorage();
    const text = seed(storage, { [id]: v7 });
    const real = storeOn(storage);

    await real.hydrate();
    expect(real.get(id).revision).toBe(1);
    expect(storage.setCalls).toBe(0);
    expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(text);
    expect(storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
  });

  it('commit đầu: save(expected = 0), revision ghi = 2', async () => {
    const repo = new FakeRepo();

    repo.raw = { [id]: createDefaultSave(id) };

    const { store } = await readyStore(repo);

    store.commit(id, store.get(id));
    await store.flush();

    expect(repo.calls).toEqual([{ id, expected: 0, revision: 2 }]);
    expect(store.get(id).revision).toBe(2);
  });

  it('nhiều commit gộp: expected khớp revision đã ghi trước đó, revision tăng đơn điệu', async () => {
    const repo = new FakeRepo();

    repo.delayMs = 5;

    const { store } = await readyStore(repo);

    for (let n = 0; n < 6; n += 1) {
      const save = store.get(id);

      save.gold = n + 1;
      store.commit(id, save);
    }

    await store.flush();

    expect(repo.calls.length).toBeLessThan(6);
    expect(repo.calls[0]?.expected).toBe(0);

    for (let i = 1; i < repo.calls.length; i += 1) {
      expect(repo.calls[i].expected).toBe(repo.calls[i - 1].revision);
      expect(repo.calls[i].revision).toBeGreaterThan(repo.calls[i - 1].revision);
    }

    expect(repo.calls[repo.calls.length - 1]?.revision).toBe(7);
    expect(store.get(id).gold).toBe(6);
  });

  it('lỗi io rồi thử lại: expected không đổi', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);

    repo.failSave = true;
    store.commit(id, store.get(id));
    await store.flush();
    repo.failSave = false;
    store.commit(id, store.get(id));
    await store.flush();
    store.commit(id, store.get(id));
    await store.flush();

    expect(repo.calls.map((c) => c.expected)).toEqual([0, 0, 3]);
    expect(repo.calls.map((c) => c.revision)).toEqual([2, 3, 4]);
  });

  it('hai store dùng chung Storage: B commit sau A -> conflict, B khóa, đĩa chỉ còn của A, lỗi đúng một lần', async () => {
    const storage = new FakeStorage();

    seed(storage, { [id]: createDefaultSave(id) });

    const a = storeOn(storage);
    const b = storeOn(storage);

    await a.hydrate();
    await b.hydrate();

    const errors: Array<[string | undefined, string | undefined]> = [];

    b.onError((_m, errId, reason) => errors.push([errId, reason]));

    const saveA = a.get(id);

    saveA.gold = 111;
    a.commit(id, saveA);
    await a.flush();

    const afterA = storage.data.get(PROGRESS_STORAGE_KEY);

    const saveB = b.get(id);

    saveB.gold = 222;
    b.commit(id, saveB);
    await b.flush();

    expect(errors).toEqual([[id, 'conflict']]);
    expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(afterA);
    expect(JSON.parse(afterA ?? '{}')[id].gold).toBe(111);

    const setsBefore = storage.setCalls;

    saveB.gold = 333;
    b.commit(id, saveB);
    await b.flush();

    expect(storage.setCalls).toBe(setsBefore);
    expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(afterA);
    expect(errors).toHaveLength(1);
    expect(b.get(id).gold).toBe(333);

    // Nhân vật khác của B vẫn ghi bình thường.
    const other = ids[1];
    const otherSave = b.get(other);

    otherSave.gold = 77;
    b.commit(other, otherSave);
    await b.flush();
    expect(JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}')[other].gold).toBe(77);
    expect(errors).toHaveLength(1);
  });

  const brokenCases: Array<[string, (valid: CharacterSaveV8) => unknown]> = [
    ['v8 hỏng (thiếu items)', (v) => ({ ...v, items: undefined })],
    ['characterUid không khớp', (v) => ({ ...v, characterUid: 'ch_nguoi_la_1' })],
    ['version 9', (v) => ({ ...v, version: 9 })],
  ];

  for (const [name, make] of brokenCases) {
    it(`${name}: khóa, đĩa không bị ghi, get vẫn trả cache hiển thị được`, async () => {
      const storage = new FakeStorage();
      const text = seed(storage, { [id]: make(v8Default(id)) });
      const store = storeOn(storage);
      const errors: Array<[string | undefined, string | undefined]> = [];

      store.onError((_m, errId, reason) => errors.push([errId, reason]));
      await store.hydrate();

      expect(store.get(id)).toEqual(v8Default(id));

      const save = store.get(id);

      save.gold = 9;
      store.commit(id, save);
      store.commit(id, save);
      await store.flush();

      expect(storage.setCalls).toBe(0);
      expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(text);
      expect(storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
      expect(errors).toEqual([[id, 'readonly']]);
      expect(store.get(id).gold).toBe(9);

      // Nhân vật khác vẫn ghi bình thường.
      const other = ids[1];

      store.commit(other, store.get(other));
      await store.flush();
      expect(
        JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}')[other],
      ).toBeDefined();
      expect(JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}')[id]).toEqual(
        JSON.parse(text)[id],
      );
    });
  }

  it('repo trả readonly: nhân vật bị khóa, commit sau không gọi repo', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);
    let calls = 0;
    const errors: Array<string | undefined> = [];

    repo.save = () => {
      calls += 1;

      return Promise.resolve({ ok: false, reason: 'readonly', message: 'không sao lưu được' });
    };
    store.onError((_m, _id, reason) => errors.push(reason));

    store.commit(id, store.get(id));
    await store.flush();
    store.commit(id, store.get(id));
    await store.flush();

    expect(calls).toBe(1);
    expect(errors).toEqual(['readonly']);
    expect(store.isLocked(id)).toBe(true);
    expect(store.getLockReason(id)).toBe('readonly');
  });

  it('hydrate lỗi (loadAll reject): mọi nhân vật khóa, commit không gọi repo.save, lỗi readonly đúng một lần mỗi nhân vật', async () => {
    const repo = new FakeRepo();

    repo.failLoad = true;

    const store = new ProgressStore(repo);
    const errors: Array<[string | undefined, string | undefined]> = [];

    store.onError((_m, errId, reason) => errors.push([errId, reason]));
    await store.hydrate();

    expect(store.getState()).toBe('degraded');
    expect(store.persistent).toBe(false);
    expect(store.lastError).toBe('read fail');

    for (const each of ids) {
      expect(store.isLocked(each)).toBe(true);
      expect(store.getLockReason(each)).toBe('load-failed');

      const save = store.get(each);

      save.gold = 123;
      store.commit(each, save);
      store.commit(each, save);
      expect(store.get(each).gold).toBe(123);
    }

    await store.flush();

    expect(repo.calls).toHaveLength(0);
    expect(errors).toEqual(ids.map((each) => [each, 'readonly']));
    expect(store.persistent).toBe(false);
  });

  it('getItem lỗi lúc hydrate rồi hết lỗi, đĩa có v7: blob và khóa đĩa không đổi một byte sau nhiều commit', async () => {
    class FlakyStorage extends FakeStorage {
      failGet = true;

      getItem(key: string): string | null {
        if (this.failGet) {
          throw new Error('getItem fail');
        }

        return super.getItem(key);
      }
    }

    const storage = new FlakyStorage();
    const v7 = createDefaultSave(id);

    v7.gold = 77;

    const text = seed(storage, { [id]: v7 });
    const store = storeOn(storage);

    await store.hydrate();
    expect(store.getState()).toBe('degraded');

    storage.failGet = false;

    for (let n = 0; n < 4; n += 1) {
      const save = store.get(id);

      save.gold = 1000 + n;
      store.commit(id, save);
    }

    await store.flush();

    expect(storage.setCalls).toBe(0);
    expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(text);
    expect(storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
    expect([...storage.data.keys()]).toEqual([PROGRESS_STORAGE_KEY]);
  });

  it('phiên hydrate thành công vẫn ghi bình thường (không hồi quy), isLocked false', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);

    for (const each of ids) {
      expect(store.isLocked(each)).toBe(false);
      expect(store.getLockReason(each)).toBeNull();
    }

    store.commit(id, store.get(id));
    await store.flush();
    expect(repo.calls).toHaveLength(1);
  });

  it('getLockReason: conflict', async () => {
    const storage = new FakeStorage();

    seed(storage, { [id]: createDefaultSave(id) });

    const a = storeOn(storage);
    const b = storeOn(storage);

    await a.hydrate();
    await b.hydrate();
    a.commit(id, a.get(id));
    await a.flush();
    expect(b.isLocked(id)).toBe(false);
    b.commit(id, b.get(id));
    await b.flush();
    expect(b.isLocked(id)).toBe(true);
    expect(b.getLockReason(id)).toBe('conflict');
    expect(b.isLocked(ids[1])).toBe(false);
  });

  for (const [name, make] of brokenCases) {
    it(`getLockReason: ${name} -> corrupt, khóa ngay sau hydrate`, async () => {
      const storage = new FakeStorage();

      seed(storage, { [id]: make(v8Default(id)) });

      const store = storeOn(storage);

      await store.hydrate();
      expect(store.isLocked(id)).toBe(true);
      expect(store.getLockReason(id)).toBe('corrupt');
      expect(store.isLocked(ids[1])).toBe(false);
    });
  }
});
