import Phaser from 'phaser';

import { SCENE_KEYS } from '../config/constants';
import { isTouchDevice } from '../utils/device';

/** Màn hình chính tối giản: tiêu đề và hướng dẫn bắt đầu. */
export class MainMenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super(SCENE_KEYS.menu);
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.cameras.main.setBackgroundColor('#0b0b12');

    this.add
      .text(centerX, centerY - 84, 'THẾ GIỚI PIXEL', {
        fontFamily: 'monospace',
        fontSize: '60px',
        color: '#e8e6f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(centerX, centerY + 12, isTouchDevice() ? 'CHẠM ĐỂ CHỌN ANH HÙNG' : 'NHẤN ENTER ĐỂ CHỌN ANH HÙNG', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffe066',
      })
      .setOrigin(0.5);

    this.add
      .text(
        centerX,
        centerY + 68,
        '3 ANH HÙNG · 18 KỸ NĂNG · CẤP ĐỘ ĐƯỢC LƯU',
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#8b8fa3',
        },
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.35,
      duration: 750,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once('keydown-ENTER', this.startGame, this);
    this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);
  }

  private startGame(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    // Điện thoại: vào toàn màn hình + khoá ngang (cần cử chỉ người dùng).
    if (isTouchDevice()) {
      try {
        if (!this.scale.isFullscreen) {
          this.scale.startFullscreen();
        }

        void (
          screen.orientation as ScreenOrientation & {
            lock?: (orientation: string) => Promise<void>;
          }
        )
          .lock?.('landscape')
          ?.catch(() => undefined);
      } catch {
        // Trình duyệt không hỗ trợ: bỏ qua.
      }
    }

    this.scene.start(SCENE_KEYS.characterSelect);
  }
}
