import { describe, expect, it } from 'vitest';
import {
  PROGRESS_BACKUP_V7_KEY,
  PROGRESS_CORRUPT_BACKUP_PREFIX,
  PROGRESS_STORAGE_KEY,
} from '../config/progressConfig';
import { CHARACTERS, type CharacterId } from '../config/characters';
import { createDefaultSave } from './CharacterProgress';
import { LocalStorageRepository } from './LocalStorageRepository';
import { migrateToLatest } from './saveMigration';
import type { CharacterSaveV8 } from './saveV8';

function v8Default(characterId: CharacterId, revision = 1): CharacterSaveV8 {
  const result = migrateToLatest(characterId, undefined);

  if (!result.ok) {
    throw new Error(result.errors.join('; '));
  }

  return { ...result.save, revision };
}

class FakeStorage implements Storage {
  data = new Map<string, string>();
  throwOnGet = false;
  throwOnSet = false;
  setCalls = 0;

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    if (this.throwOnGet) {
      throw new Error('blocked');
    }

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

    if (this.throwOnSet) {
      throw new Error('quota');
    }

    this.data.set(key, value);
  }
}

const ids = Object.keys(CHARACTERS) as CharacterId[];

function corruptKeys(storage: FakeStorage): string[] {
  return [...storage.data.keys()].filter((key) =>
    key.startsWith(PROGRESS_CORRUPT_BACKUP_PREFIX),
  );
}

describe('LocalStorageRepository', () => {
  it('giữ nguyên văn khóa nhân vật khác khi save', async () => {
    const storage = new FakeStorage();
    const other = { weird: 'giữ nguyên', n: [1, 2, 3] };

    storage.data.set(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [ids[1]]: other }),
    );

    const repo = new LocalStorageRepository(() => storage);
    const result = await repo.save(ids[0], v8Default(ids[0]), 0);

    expect(result).toEqual({ ok: true });

    const blob = JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}');

    expect(blob[ids[1]]).toEqual(other);
    expect(blob[ids[0]]).toEqual(v8Default(ids[0]));
  });

  it('JSON hỏng trả {} và chép sang khóa corrupt một lần, không ghi đè', async () => {
    const storage = new FakeStorage();

    storage.data.set(PROGRESS_STORAGE_KEY, '{hỏng');

    const repo = new LocalStorageRepository(() => storage);

    expect(await repo.loadAll()).toEqual({});

    const keys = corruptKeys(storage);

    expect(keys).toHaveLength(1);
    expect(storage.data.get(keys[0])).toBe('{hỏng');

    await repo.loadAll();
    expect(corruptKeys(storage)).toEqual(keys);
    expect(storage.data.get(keys[0])).toBe('{hỏng');
  });

  it('getItem ném thì loadAll reject', async () => {
    const storage = new FakeStorage();

    storage.throwOnGet = true;

    const repo = new LocalStorageRepository(() => storage);

    await expect(repo.loadAll()).rejects.toThrow('blocked');
  });

  it('setItem ném thì save trả ok:false reason io', async () => {
    const storage = new FakeStorage();

    storage.throwOnSet = true;

    const repo = new LocalStorageRepository(() => storage);
    const result = await repo.save(ids[0], v8Default(ids[0]), 0);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('io');
    }
  });

  it('save gọi setItem đồng bộ trong lời gọi', () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageRepository(() => storage);

    void repo.save(ids[0], v8Default(ids[0]), 0);

    expect(storage.data.has(PROGRESS_STORAGE_KEY)).toBe(true);
  });
});

describe('LocalStorageRepository: revision và sao lưu v7', () => {
  function seed(storage: FakeStorage, blob: Record<string, unknown>): string {
    const text = JSON.stringify(blob);

    storage.data.set(PROGRESS_STORAGE_KEY, text);

    return text;
  }

  it('expectedRevision khớp (v8 trên đĩa) thì ghi, không tạo sao lưu', async () => {
    const storage = new FakeStorage();

    seed(storage, { [ids[0]]: v8Default(ids[0], 3) });

    const repo = new LocalStorageRepository(() => storage);
    const next = v8Default(ids[0], 4);

    next.gold = 999;

    expect(await repo.save(ids[0], next, 3)).toEqual({ ok: true });
    expect(JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}')[ids[0]]).toEqual(next);
    expect(storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
  });

  it('expectedRevision lệch -> conflict, blob không đổi một byte, không setItem', async () => {
    const storage = new FakeStorage();
    const text = seed(storage, { [ids[0]]: v8Default(ids[0], 3) });
    const repo = new LocalStorageRepository(() => storage);
    const result = await repo.save(ids[0], v8Default(ids[0], 4), 2);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('conflict');
    }

    expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(text);
    expect(storage.setCalls).toBe(0);

    // v7 trên đĩa (revision 0) mà đòi expected 1 cũng là conflict.
    const v7Storage = new FakeStorage();
    const v7Text = seed(v7Storage, { [ids[0]]: createDefaultSave(ids[0]) });
    const v7Repo = new LocalStorageRepository(() => v7Storage);
    const v7Result = await v7Repo.save(ids[0], v8Default(ids[0], 2), 1);

    expect(v7Result.ok).toBe(false);
    expect(v7Storage.data.get(PROGRESS_STORAGE_KEY)).toBe(v7Text);
    expect(v7Storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
    expect(v7Storage.setCalls).toBe(0);
  });

  it('v7 trên đĩa + ghi v8 đầu tiên: backup-v7 bằng đúng chuỗi blob trước đó, nhân vật khác không đổi', async () => {
    const storage = new FakeStorage();
    const other = { weird: 'giữ nguyên', n: [1, 2, 3] };
    const text = seed(storage, {
      [ids[0]]: createDefaultSave(ids[0]),
      [ids[1]]: other,
    });
    const repo = new LocalStorageRepository(() => storage);

    expect(await repo.save(ids[0], v8Default(ids[0], 2), 0)).toEqual({ ok: true });
    expect(storage.data.get(PROGRESS_BACKUP_V7_KEY)).toBe(text);

    const blob = JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}');

    expect(blob[ids[0]]).toEqual(v8Default(ids[0], 2));
    expect(blob[ids[1]]).toEqual(other);
  });

  it('ghi lần hai không đổi backup-v7; nhân vật v7 thứ hai ghi sau không ghi đè sao lưu', async () => {
    const storage = new FakeStorage();
    const text = seed(storage, {
      [ids[0]]: createDefaultSave(ids[0]),
      [ids[1]]: createDefaultSave(ids[1]),
    });
    const repo = new LocalStorageRepository(() => storage);

    await repo.save(ids[0], v8Default(ids[0], 2), 0);
    expect(storage.data.get(PROGRESS_BACKUP_V7_KEY)).toBe(text);

    await repo.save(ids[0], v8Default(ids[0], 3), 2);
    expect(storage.data.get(PROGRESS_BACKUP_V7_KEY)).toBe(text);

    expect(await repo.save(ids[1], v8Default(ids[1], 2), 0)).toEqual({ ok: true });
    expect(storage.data.get(PROGRESS_BACKUP_V7_KEY)).toBe(text);

    const blob = JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}');

    expect(blob[ids[0]].revision).toBe(3);
    expect(blob[ids[1]].revision).toBe(2);
  });

  it('setItem sao lưu ném -> readonly, blob vẫn là v7, không ghi v8', async () => {
    const storage = new FakeStorage();
    const text = seed(storage, { [ids[0]]: createDefaultSave(ids[0]) });
    const realSet = storage.setItem.bind(storage);

    storage.setItem = (key: string, value: string) => {
      if (key === PROGRESS_BACKUP_V7_KEY) {
        throw new Error('quota');
      }

      realSet(key, value);
    };

    const repo = new LocalStorageRepository(() => storage);
    const result = await repo.save(ids[0], v8Default(ids[0], 2), 0);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('readonly');
    }

    expect(storage.data.get(PROGRESS_STORAGE_KEY)).toBe(text);
    expect(storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
  });

  it('đĩa trống: ghi lần đầu không tạo sao lưu', async () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageRepository(() => storage);

    expect(await repo.save(ids[0], v8Default(ids[0], 2), 0)).toEqual({ ok: true });
    expect(storage.data.has(PROGRESS_BACKUP_V7_KEY)).toBe(false);
  });

  it('getItem ném trong save: không ghi, trả lỗi io', async () => {
    const storage = new FakeStorage();

    storage.throwOnGet = true;

    const repo = new LocalStorageRepository(() => storage);
    const result = await repo.save(ids[0], v8Default(ids[0], 2), 0);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('io');
    }

    expect(storage.setCalls).toBe(0);
  });
});
