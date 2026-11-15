import type { CharacterId } from '../config/characters';
import type { CharacterSave } from './CharacterProgress';

/** Dữ liệu thô theo nhân vật, chưa chuẩn hóa. */
export type RawProgress = Partial<Record<CharacterId, unknown>>;

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'io' | 'conflict' | 'readonly'; message: string };

/** Kho lưu tiến trình (bộ nhớ trình duyệt hôm nay, server về sau). */
export interface ProgressRepository {
  loadAll(): Promise<RawProgress>;
  save(id: CharacterId, data: CharacterSave): Promise<SaveResult>;
}
