/**
 * Theo dõi vùng hiện tại của người chơi để quyết định KHI NÀO hiện biển tên (Gói W3, D9). THUẦN: không Phaser,
 * không đọc thời gian hệ thống (thời gian `now` do nơi gọi đưa vào), không ngẫu nhiên.
 *
 * Quy tắc:
 *  - Vùng mới chỉ được công nhận khi người chơi ở đó LIÊN TỤC >= stableMs (chống nhấp nháy khi đứng sát biên).
 *  - Một vùng vừa được hiện biển thì không hiện lại trong cooldownMs.
 *  - Lần đầu công nhận một vùng (đầu lượt) cũng hiện biển như bình thường.
 */
import type { ZoneId } from './worldGraph';

export interface ZoneTrackerOptions {
  /** Thời gian (ms) vùng mới phải ổn định. */
  readonly stableMs: number;
  /** Thời gian chờ (ms) trước khi cùng một vùng được hiện biển lại. */
  readonly cooldownMs: number;
}

export interface ZoneTracker {
  /**
   * Gọi mỗi khung hình với vùng hiện tại (null = không vùng nào có biển) và đồng hồ đơn điệu `now` (ms).
   * Trả id vùng cần HIỆN BIỂN ngay lúc này; ngược lại null.
   */
  update(zoneId: ZoneId | null, now: number): ZoneId | null;
  /** Vùng đã được công nhận gần nhất (kể cả khi biển bị chặn bởi thời gian chờ). */
  getCurrent(): ZoneId | null;
}

export function createZoneTracker(options: ZoneTrackerOptions): ZoneTracker {
  let current: ZoneId | null = null;
  let candidate: ZoneId | null = null;
  let candidateSince = 0;
  const lastShownAt = new Map<ZoneId, number>();

  return {
    update(zoneId, now) {
      if (zoneId === null || zoneId === current) {
        candidate = null;

        return null;
      }

      if (zoneId !== candidate) {
        candidate = zoneId;
        candidateSince = now;
      }

      if (now - candidateSince < options.stableMs) {
        return null;
      }

      current = zoneId;
      candidate = null;

      const last = lastShownAt.get(zoneId);

      if (last !== undefined && now - last < options.cooldownMs) {
        return null;
      }

      lastShownAt.set(zoneId, now);

      return zoneId;
    },
    getCurrent() {
      return current;
    },
  };
}

/** Chuỗi mức nguy hiểm trên biển tên: 0 → "AN TOÀN", n → n ký tự ◆. */
export function formatZoneDanger(danger: number): string {
  return danger <= 0 ? 'AN TOÀN' : '◆'.repeat(danger);
}
