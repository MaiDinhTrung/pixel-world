import { describe, expect, it } from 'vitest';
import { CHARACTERS, type CharacterId } from '../config/characters';
import { createDefaultSave, type CharacterSave } from './CharacterProgress';
import { ProgressNotReadyError, ProgressStore } from './ProgressStore';
import type {
  ProgressRepository,
  RawProgress,
  SaveResult,
} from './ProgressRepository';

const ids = Object.keys(CHARACTERS) as CharacterId[];
const id = ids[0];

class FakeRepo implements ProgressRepository {
  raw: RawProgress = {};
  failLoad = false;
  failSave = false;
  delayMs = 0;
  loadCalls = 0;
  running = 0;
  overlapped = false;
  saved: Array<{ id: CharacterId; gold: number }> = [];

  loadAll(): Promise<RawProgress> {
    this.loadCalls += 1;

    return this.failLoad
      ? Promise.reject(new Error('read fail'))
      : Promise.resolve(this.raw);
  }

  async save(saveId: CharacterId, data: CharacterSave): Promise<SaveResult> {
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
    expect(() => store.commit(id, createDefaultSave(id))).toThrow(
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
    expect(store.get(id)).toEqual(createDefaultSave(id));
  });

  it('get trả bản sao: sửa kết quả không đổi cache', async () => {
    const { store } = await readyStore();
    const first = store.get(id);

    first.gold = 987654;
    expect(store.get(id).gold).not.toBe(987654);
  });

  it('commit rồi get thấy ngay', async () => {
    const { store } = await readyStore();
    const save = createDefaultSave(id);

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
      const save = createDefaultSave(id);

      save.gold = gold;
      store.commit(id, save);
    }

    await store.flush();

    expect(repo.overlapped).toBe(false);

    const golds = repo.saved.map((entry) => entry.gold);

    expect(golds).toEqual([...golds].sort((x, y) => x - y));
    expect(golds[golds.length - 1]).toBe(5);
  });

  it('save lỗi: cache giữ nguyên, onError kêu, commit kế tiếp ghi lại được', async () => {
    const repo = new FakeRepo();
    const { store } = await readyStore(repo);
    const errors: string[] = [];

    store.onError((message) => errors.push(message));
    repo.failSave = true;

    const save = createDefaultSave(id);

    save.gold = 77;
    store.commit(id, save);
    await store.flush();

    expect(errors).toEqual(['write fail']);
    expect(store.persistent).toBe(false);
    expect(store.get(id).gold).toBe(77);

    repo.failSave = false;

    const next = createDefaultSave(id);

    next.gold = 88;
    store.commit(id, next);
    await store.flush();

    expect(repo.saved).toEqual([{ id, gold: 88 }]);
    expect(store.persistent).toBe(true);
  });

  it('flush chỉ resolve khi hàng đợi rỗng', async () => {
    const repo = new FakeRepo();

    repo.delayMs = 5;

    const { store } = await readyStore(repo);
    const save = createDefaultSave(id);

    save.gold = 9;
    store.commit(id, save);

    let done = false;
    const flushed = store.flush().then(() => {
      done = true;
    });

    expect(done).toBe(false);
    await flushed;
    expect(repo.saved).toHaveLength(1);
    expect(repo.running).toBe(0);
  });
});
