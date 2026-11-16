import { describe, expect, it } from 'vitest';

import {
  REGION_BANNER,
  REGION_TRACKER,
  REGION_VILLAGE,
  REGION_WILDS_FAR,
  REGION_WILDS_NEAR,
} from '../config/worldConfig';
import { createRegionTracker, formatRegionDanger } from './regionTracker';

const OPTIONS = { stableMs: 400, cooldownMs: 10000 } as const;

describe('createRegionTracker', () => {
  it('lần đầu: chỉ công nhận sau khi ổn định >= stableMs, rồi phát đúng một sự kiện', () => {
    const tracker = createRegionTracker(OPTIONS);

    expect(tracker.update(REGION_VILLAGE, 0)).toBeNull();
    expect(tracker.update(REGION_VILLAGE, 399)).toBeNull();
    expect(tracker.getCurrent()).toBeNull();
    expect(tracker.update(REGION_VILLAGE, 400)).toBe(REGION_VILLAGE);
    expect(tracker.getCurrent()).toBe(REGION_VILLAGE);
    expect(tracker.update(REGION_VILLAGE, 401)).toBeNull();
    expect(tracker.update(REGION_VILLAGE, 99999)).toBeNull();
  });

  it('đổi vùng đúng: gần → xa phát sự kiện vùng xa sau stableMs', () => {
    const tracker = createRegionTracker(OPTIONS);

    tracker.update(REGION_WILDS_NEAR, 0);
    expect(tracker.update(REGION_WILDS_NEAR, 400)).toBe(REGION_WILDS_NEAR);
    expect(tracker.update(REGION_WILDS_FAR, 1000)).toBeNull();
    expect(tracker.update(REGION_WILDS_FAR, 1399)).toBeNull();
    expect(tracker.getCurrent()).toBe(REGION_WILDS_NEAR);
    expect(tracker.update(REGION_WILDS_FAR, 1400)).toBe(REGION_WILDS_FAR);
    expect(tracker.getCurrent()).toBe(REGION_WILDS_FAR);
  });

  it('chống nhấp nháy ở biên: bước sang vùng khác rồi về trước stableMs → không sự kiện nào', () => {
    const tracker = createRegionTracker(OPTIONS);

    tracker.update(REGION_WILDS_NEAR, 0);
    tracker.update(REGION_WILDS_NEAR, 400);

    for (let t = 1000; t < 5000; t += 100) {
      // Đứng sát biên: luân phiên 300 ms ở vùng xa rồi 100 ms ở vùng gần (không bao giờ đủ 400 ms liên tục).
      const region = t % 400 === 0 ? REGION_WILDS_NEAR : REGION_WILDS_FAR;

      expect(tracker.update(region, t)).toBeNull();
    }

    expect(tracker.getCurrent()).toBe(REGION_WILDS_NEAR);
  });

  it('đồng hồ ứng viên bị đặt lại khi đổi ứng viên (không cộng dồn thời gian ở vùng cũ)', () => {
    const tracker = createRegionTracker(OPTIONS);

    expect(tracker.update(REGION_WILDS_NEAR, 0)).toBeNull();
    expect(tracker.update(REGION_WILDS_FAR, 300)).toBeNull();
    expect(tracker.update(REGION_WILDS_FAR, 600)).toBeNull(); // mới 300 ms ở vùng xa
    expect(tracker.update(REGION_WILDS_FAR, 700)).toBe(REGION_WILDS_FAR);
  });

  it('thời gian chờ: không hiện lại cùng vùng trong cooldownMs, hết chờ thì hiện lại', () => {
    const tracker = createRegionTracker(OPTIONS);

    tracker.update(REGION_VILLAGE, 0);
    expect(tracker.update(REGION_VILLAGE, 400)).toBe(REGION_VILLAGE); // hiện lúc 400

    tracker.update(REGION_WILDS_NEAR, 1000);
    expect(tracker.update(REGION_WILDS_NEAR, 1400)).toBe(REGION_WILDS_NEAR);

    // Quay lại làng khi còn trong thời gian chờ của làng (400 + 10000): vùng được công nhận nhưng không hiện biển.
    tracker.update(REGION_VILLAGE, 2000);
    expect(tracker.update(REGION_VILLAGE, 2400)).toBeNull();
    expect(tracker.getCurrent()).toBe(REGION_VILLAGE);

    // Ra rồi vào lại sau khi hết chờ.
    tracker.update(REGION_WILDS_FAR, 20000);
    expect(tracker.update(REGION_WILDS_FAR, 20400)).toBe(REGION_WILDS_FAR);
    tracker.update(REGION_VILLAGE, 30000);
    expect(tracker.update(REGION_VILLAGE, 30400)).toBe(REGION_VILLAGE); // 30400 - 400 >= 10000
  });

  it('thời gian chờ tính tại từng vùng riêng, mốc chờ là lúc hiện biển trước đó', () => {
    const tracker = createRegionTracker(OPTIONS);

    tracker.update(REGION_WILDS_NEAR, 0);
    tracker.update(REGION_WILDS_NEAR, 400); // near hiện lúc 400
    tracker.update(REGION_WILDS_FAR, 500);
    expect(tracker.update(REGION_WILDS_FAR, 900)).toBe(REGION_WILDS_FAR); // far hiện lúc 900
    tracker.update(REGION_WILDS_NEAR, 1000);
    expect(tracker.update(REGION_WILDS_NEAR, 1400)).toBeNull(); // near còn chờ tới 10400
    tracker.update(REGION_WILDS_FAR, 1500);
    expect(tracker.update(REGION_WILDS_FAR, 1900)).toBeNull(); // far còn chờ tới 10900
    tracker.update(REGION_WILDS_NEAR, 11000);
    expect(tracker.update(REGION_WILDS_NEAR, 11400)).toBe(REGION_WILDS_NEAR);
  });

  it('vùng null (không có biển) hủy ứng viên đang chờ nhưng không đổi vùng hiện tại', () => {
    const tracker = createRegionTracker(OPTIONS);

    tracker.update(REGION_WILDS_NEAR, 0);
    tracker.update(REGION_WILDS_NEAR, 400);
    tracker.update(REGION_WILDS_FAR, 500);
    expect(tracker.update(null, 700)).toBeNull();
    expect(tracker.update(REGION_WILDS_FAR, 800)).toBeNull(); // đếm lại từ 800
    expect(tracker.update(REGION_WILDS_FAR, 1100)).toBeNull();
    expect(tracker.update(REGION_WILDS_FAR, 1200)).toBe(REGION_WILDS_FAR);
  });

  it('hai tracker độc lập; tham số thật trong worldConfig hợp lệ', () => {
    const a = createRegionTracker(REGION_TRACKER);
    const b = createRegionTracker(REGION_TRACKER);

    a.update(REGION_VILLAGE, 0);
    a.update(REGION_VILLAGE, REGION_TRACKER.stableMs);
    expect(a.getCurrent()).toBe(REGION_VILLAGE);
    expect(b.getCurrent()).toBeNull();
    expect(REGION_TRACKER.stableMs).toBeGreaterThan(0);
    expect(REGION_TRACKER.cooldownMs).toBeGreaterThan(REGION_TRACKER.stableMs);
  });
});

describe('formatRegionDanger', () => {
  it('0 → AN TOÀN; n → n ký tự ◆', () => {
    expect(formatRegionDanger(0)).toBe('AN TOÀN');
    expect(formatRegionDanger(1)).toBe('◆');
    expect(formatRegionDanger(2)).toBe('◆◆');
    expect(formatRegionDanger(3)).toBe('◆◆◆');
  });
});

describe('cấu hình biển tên', () => {
  it('lớp UI >= 5000, dưới toast/lời nhắc (5050), cỡ chữ >= nhãn cổng 15 px, không dùng đỏ/cam', () => {
    expect(REGION_BANNER.depth).toBeGreaterThanOrEqual(5000);
    expect(REGION_BANNER.depth).toBeLessThan(5050);
    expect(REGION_BANNER.nameFontPx).toBeGreaterThanOrEqual(15);
    expect(REGION_BANNER.subFontPx).toBeGreaterThanOrEqual(15);

    for (const css of [REGION_BANNER.nameColor, REGION_BANNER.subColor]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16));

      // Đỏ/cam bão hòa: kênh đỏ áp đảo rõ rệt so với xanh dương.
      expect(r - b < 90 || r < 200, css).toBe(true);
      expect(g).toBeGreaterThan(0);
    }

    expect(REGION_BANNER.holdMs).toBeGreaterThanOrEqual(2000);
    expect(REGION_BANNER.holdMs).toBeLessThanOrEqual(3000);
  });
});
