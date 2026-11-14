import Phaser from 'phaser';

import {
  DROP_LIFETIME_MS,
  DROP_MAGNET_RADIUS,
  DROP_MAGNET_SPEED,
  DROP_PICKUP_RADIUS,
} from '../config/economyConfig';
import { createPixelTexture } from '../utils/pixelTexture';

const COIN_KEY = 'loot-coin';
const GEM_KEY = 'loot-gem';

const COIN_ROWS: readonly string[] = [
  '..oooo..',
  '.oyyyyo.',
  'oyywwyyo',
  'oywyyyyo',
  'oyyyyyyo',
  'oyyyyyyo',
  '.oyyyyo.',
  '..oooo..',
];

// Ngọc vẽ bằng màu trắng/xám rồi nhuộm theo loại ngọc bằng tint.
const GEM_ROWS: readonly string[] = [
  '...wwww...',
  '..wwwwww..',
  '.wwgwwwww.',
  'wwgwwwwwdw',
  '.wwwwwwdw.',
  '..wwwwdw..',
  '...wwdw...',
  '....dd....',
];

export type LootKind = 'gold' | 'gem';

/** Vàng/ngọc rơi trên đất: hút về người chơi khi lại gần, tự biến mất sau một lúc. */
export class LootDrop extends Phaser.GameObjects.Image {
  readonly kind: LootKind;
  /** Số vàng (kind = gold) hoặc mã ngọc (kind = gem). */
  readonly payload: number | string;
  private readonly expiresAt: number;
  private baseY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: LootKind,
    payload: number | string,
    tint = 0xffffff,
  ) {
    LootDrop.ensureTextures(scene);
    super(scene, x, y, kind === 'gold' ? COIN_KEY : GEM_KEY);

    this.kind = kind;
    this.payload = payload;
    this.expiresAt = scene.time.now + DROP_LIFETIME_MS;
    this.baseY = y;
    this.setScale(kind === 'gold' ? 2 : 2.2);

    if (kind === 'gem') {
      this.setTint(tint);
    }

    this.setDepth(y);
    scene.add.existing(this);

    // Bật nhẹ ra khỏi xác quái rồi nằm lại.
    const dx = Phaser.Math.Between(-26, 26);

    scene.tweens.add({
      targets: this,
      x: x + dx,
      duration: 260,
      ease: 'Quad.easeOut',
    });
    scene.tweens.add({
      targets: this,
      y: { from: y - 18, to: y },
      duration: 260,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.baseY = this.y;
      },
    });
  }

  private static ensureTextures(scene: Phaser.Scene): void {
    createPixelTexture(scene, COIN_KEY, COIN_ROWS, {
      o: '#b8860b',
      y: '#ffd24a',
      w: '#fff4b0',
    });
    createPixelTexture(scene, GEM_KEY, GEM_ROWS, {
      w: '#ffffff',
      g: '#f4f4ff',
      d: '#b9bccf',
    });
  }

  /**
   * Cập nhật mỗi frame. Trả về true khi đã được nhặt hoặc hết hạn (caller sẽ hủy).
   * `onCollect` chỉ được gọi khi nhặt thật.
   */
  step(
    time: number,
    deltaMs: number,
    playerX: number,
    playerY: number,
    onCollect: () => void,
  ): boolean {
    if (time >= this.expiresAt) {
      return true;
    }

    // Nhấp nháy khi sắp hết hạn.
    this.setAlpha(this.expiresAt - time < 4000 && Math.floor(time / 150) % 2 === 0 ? 0.35 : 1);

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );

    if (distance <= DROP_PICKUP_RADIUS) {
      onCollect();
      return true;
    }

    if (distance <= DROP_MAGNET_RADIUS) {
      const step = Math.min(distance, (DROP_MAGNET_SPEED * deltaMs) / 1000);

      this.x += ((playerX - this.x) / distance) * step;
      this.y += ((playerY - this.y) / distance) * step;
      this.setDepth(this.y + 1);
    } else {
      this.setDepth(this.baseY);
    }

    return false;
  }
}
