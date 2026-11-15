import { describe, expect, it } from 'vitest';
import {
  PROGRESS_CORRUPT_BACKUP_PREFIX,
  PROGRESS_STORAGE_KEY,
} from '../config/progressConfig';
import { CHARACTERS, type CharacterId } from '../config/characters';
import { createDefaultSave } from './CharacterProgress';
import { LocalStorageRepository } from './LocalStorageRepository';

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
    const result = await repo.save(ids[0], createDefaultSave(ids[0]));

    expect(result).toEqual({ ok: true });

    const blob = JSON.parse(storage.data.get(PROGRESS_STORAGE_KEY) ?? '{}');

    expect(blob[ids[1]]).toEqual(other);
    expect(blob[ids[0]]).toEqual(createDefaultSave(ids[0]));
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
    const result = await repo.save(ids[0], createDefaultSave(ids[0]));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('io');
    }
  });

  it('save gọi setItem đồng bộ trong lời gọi', () => {
    const storage = new FakeStorage();
    const repo = new LocalStorageRepository(() => storage);

    void repo.save(ids[0], createDefaultSave(ids[0]));

    expect(storage.data.has(PROGRESS_STORAGE_KEY)).toBe(true);
  });
});
