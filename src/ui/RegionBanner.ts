import type Phaser from 'phaser';

import { ZONE_BANNER } from '../config/worldConfig';
import { setTextValue } from '../utils/textCache';
import { formatZoneDanger } from '../world/regionTracker';
import type { ZoneDisplay } from '../world/worldGraph';

/**
 * Biển tên vùng (Gói W3, D9): tên + mức ◆ + mô tả, phía trên giữa màn hình. Hiện dần, giữ, mờ dần; không nhấp nháy.
 * Hai Text được tạo MỘT lần và dùng lại (setTextValue), tiến trình theo `update(now)` nên không tạo tween/đối tượng
 * mỗi lần hiện hay mỗi khung hình. Đây là lớp hiển thị duy nhất của hệ biển tên (logic ở world/regionTracker.ts).
 */
export class ZoneBanner {
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly subText: Phaser.GameObjects.Text;
  private shownAt = -1;
  private alpha = 0;
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    const style = {
      fontFamily: 'monospace',
      stroke: ZONE_BANNER.strokeColor,
      strokeThickness: ZONE_BANNER.strokeThickness,
    };

    this.nameText = scene.add
      .text(ZONE_BANNER.centerX, ZONE_BANNER.nameY, '', {
        ...style,
        fontSize: `${ZONE_BANNER.nameFontPx}px`,
        fontStyle: 'bold',
        color: ZONE_BANNER.nameColor,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(ZONE_BANNER.depth)
      .setAlpha(0)
      .setVisible(false);

    this.subText = scene.add
      .text(ZONE_BANNER.centerX, ZONE_BANNER.subY, '', {
        ...style,
        fontSize: `${ZONE_BANNER.subFontPx}px`,
        color: ZONE_BANNER.subColor,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(ZONE_BANNER.depth)
      .setAlpha(0)
      .setVisible(false);
  }

  /** Bắt đầu hiện biển (thay biển đang hiện nếu có). `now` cùng đồng hồ với `update`. */
  show(display: ZoneDisplay, now: number): void {
    if (this.destroyed) {
      return;
    }

    setTextValue(this.nameText, display.name);
    setTextValue(this.subText, `${formatZoneDanger(display.danger)}  ·  ${display.description}`);
    this.shownAt = now;
    this.alpha = -1;
    this.update(now);
  }

  /** Cập nhật độ mờ theo thời gian; không làm gì khi không có biển. */
  update(now: number): void {
    if (this.destroyed || this.shownAt < 0) {
      return;
    }

    const { fadeInMs, holdMs, fadeOutMs } = ZONE_BANNER;
    const elapsed = now - this.shownAt;
    let alpha: number;

    if (elapsed >= fadeInMs + holdMs + fadeOutMs) {
      this.hide();

      return;
    }

    if (elapsed < fadeInMs) {
      alpha = Math.max(0, elapsed) / fadeInMs;
    } else if (elapsed < fadeInMs + holdMs) {
      alpha = 1;
    } else {
      alpha = 1 - (elapsed - fadeInMs - holdMs) / fadeOutMs;
    }

    if (alpha !== this.alpha) {
      this.alpha = alpha;
      this.nameText.setAlpha(alpha).setVisible(true);
      this.subText.setAlpha(alpha).setVisible(true);
    }
  }

  /** Ẩn ngay (người chơi chết, mở panel...). */
  hide(): void {
    if (this.destroyed) {
      return;
    }

    this.shownAt = -1;

    if (this.alpha !== 0) {
      this.alpha = 0;
      this.nameText.setAlpha(0).setVisible(false);
      this.subText.setAlpha(0).setVisible(false);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.nameText.destroy();
    this.subText.destroy();
  }
}
