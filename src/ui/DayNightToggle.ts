import Phaser from 'phaser';

import { DESIGN_WIDTH } from '../config/constants';
import { isTouchDevice } from '../utils/device';
import {
  getCurrentNightFactor,
  getTimeMode,
  isAtmosphereEnabled,
  setTimeMode,
  type TimeMode,
} from '../vfx/atmosphere';

const BUTTON_WIDTH = 232;
const BUTTON_HEIGHT = 28;
const BUTTON_X = DESIGN_WIDTH - 16;
const BUTTON_Y = 112;
const BUTTON_DEPTH = 5003;

/** Thứ tự xoay vòng khi bấm: tự động → ép ngày → ép đêm → tự động. */
const NEXT_MODE: Record<TimeMode, TimeMode> = {
  auto: 'day',
  day: 'night',
  night: 'auto',
};

function describe(mode: TimeMode, night: number): string {
  if (mode === 'day') {
    return '[N] ÉP BAN NGÀY';
  }

  if (mode === 'night') {
    return '[N] ÉP BAN ĐÊM';
  }

  return `[N] TỰ ĐỘNG · ĐÊM ${Math.round(night * 100)}%`;
}

/**
 * Nút thử chuyển ngày/đêm (góc phải, dưới cụm thông tin vũ khí); phím N làm tương tự.
 * Chỉ để kiểm tra giao diện: không ảnh hưởng gameplay. Không tạo khi đã tắt không khí (?atmo=off).
 */
export function createDayNightToggle(scene: Phaser.Scene): void {
  if (!isAtmosphereEnabled()) {
    return;
  }

  const background = scene.add
    .rectangle(BUTTON_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, 0x0b0c12, 0.75)
    .setOrigin(1, 0)
    .setStrokeStyle(1, 0x5a6a78, 0.9)
    .setScrollFactor(0)
    .setDepth(BUTTON_DEPTH)
    .setInteractive({ useHandCursor: true });

  // Cảm ứng: nới vùng chạm cho dễ bấm.
  if (isTouchDevice()) {
    const pad = 8;

    background.setInteractive(
      new Phaser.Geom.Rectangle(
        -pad,
        -pad,
        BUTTON_WIDTH + pad * 2,
        BUTTON_HEIGHT + pad * 2,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
  }

  const label = scene.add
    .text(BUTTON_X - BUTTON_WIDTH / 2, BUTTON_Y + BUTTON_HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8ecf5',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(BUTTON_DEPTH + 1);

  const toggle = (): void => {
    setTimeMode(NEXT_MODE[getTimeMode()]);
  };

  background.on('pointerdown', toggle);
  scene.input.keyboard?.on('keydown-N', (event: KeyboardEvent) => {
    if (!event.repeat) {
      toggle();
    }
  });

  let shown = '';
  const refresh = (): void => {
    const text = describe(getTimeMode(), getCurrentNightFactor());

    if (text !== shown) {
      shown = text;
      label.setText(text);
    }
  };

  refresh();
  scene.events.on(Phaser.Scenes.Events.UPDATE, refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, refresh);
  });
}
