import type { CharacterId } from '../config/characters';
import type { CharacterSaveV8 } from './saveV8';

/** Dữ liệu thô theo nhân vật, chưa chuẩn hóa. */
export type RawProgress = Partial<Record<CharacterId, unknown>>;

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'io' | 'conflict' | 'readonly'; message: string };

/** Kho lưu tiến trình (bộ nhớ trình duyệt hôm nay, server về sau). */
export interface ProgressRepository {
  loadAll(): Promise<RawProgress>;
  /**
   * Ghi một nhân vật. `expectedRevision` = revision đang nằm trên đĩa (0 nếu
   * đĩa chưa có revision, ví dụ v7); lệch thì trả conflict và không ghi.
   */
  save(
    id: CharacterId,
    data: CharacterSaveV8,
    expectedRevision: number,
  ): Promise<SaveResult>;
}
