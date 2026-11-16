import Phaser from 'phaser';

import type { EliteAffixId } from '../config/enemyConfig';
import { ELITE_AFFIX_ICON_ROWS, ELITE_VISUAL } from '../config/enemyVisualConfig';
import type { EnemyBase } from './EnemyBase';

const FULL_CIRCLE = Math.PI * 2;

/**
 * Lớp phủ báo hiệu Elite (Gói M3, docs/GAMEPLAY_LOOP_M.md §3b V3-V4, §3c E6): vòng chân ngà dưới sprite (hình theo affix),
 * thanh máu nhỏ và biểu tượng affix 9x9 phía trên đầu. Số liệu ở `ELITE_VISUAL` (`config/enemyVisualConfig.ts`).
 *
 * Không dùng màu phủ lên sprite (nó bị xóa sau mỗi lần quái chớp trắng). Ba đối tượng Graphics tạo MỘT lần; mỗi frame chỉ `setPosition`,
 * thanh máu chỉ vẽ lại khi số pixel phần máu đổi. Không nhấp nháy. Tự dọn khi quái `died`, khi quái bị `destroy`
 * (kể cả `despawn()`) hoặc khi scene tắt; dọn nhiều lần vẫn an toàn.
 */
export class EliteMarker {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Graphics;
  private readonly ringOffsetY: number;
  private readonly barOffsetY: number;
  private readonly iconOffsetY: number;
  private readonly innerWidth = ELITE_VISUAL.bar.width;
  private drawnFillPx = -1;
  private destroyed = false;

  private readonly scene: Phaser.Scene;
  private readonly enemy: EnemyBase;

  constructor(scene: Phaser.Scene, enemy: EnemyBase, affix: EliteAffixId) {
    const { ring, bar, icon, overlayDepth, ringDepth } = ELITE_VISUAL;

    this.scene = scene;
    this.enemy = enemy;
    const halfHeight = enemy.displayHeight / 2;
    const barBorder = bar.border;

    this.ringOffsetY = enemy.displayHeight * ring.footOffsetScale;
    this.barOffsetY = -(halfHeight + bar.gapAboveSprite + bar.height / 2 + barBorder);
    this.iconOffsetY =
      this.barOffsetY - (bar.height / 2 + barBorder + icon.gapAboveBar + icon.size / 2);

    this.ring = scene.add.graphics().setDepth(ringDepth);
    this.bar = scene.add.graphics().setDepth(overlayDepth);
    this.icon = scene.add.graphics().setDepth(overlayDepth);

    this.drawRing(affix, enemy.displayWidth * ring.radiusScale);
    this.drawIcon(affix);
    this.drawBar(this.healthRatio());
    this.follow();

    enemy.once('died', this.destroy, this);
    enemy.once(Phaser.GameObjects.Events.DESTROY, this.destroy, this);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Dọn toàn bộ: gỡ mọi listener và hủy ba Graphics. Gọi nhiều lần không sao. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.enemy.off('died', this.destroy, this);
    this.enemy.off(Phaser.GameObjects.Events.DESTROY, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.ring.destroy();
    this.bar.destroy();
    this.icon.destroy();
  }

  private healthRatio(): number {
    const max = this.enemy.getMaxHealth();

    return max > 0 ? Phaser.Math.Clamp(this.enemy.getHealth() / max, 0, 1) : 0;
  }

  /** Mỗi frame (POST_UPDATE, sau vật lý): chỉ đặt vị trí; vẽ lại thanh máu khi phần máu đổi. */
  private follow(): void {
    if (this.destroyed) {
      return;
    }

    if (!this.enemy.scene) {
      // Quái đã bị hủy mà chưa kịp báo (phòng thủ): dọn luôn.
      this.destroy();

      return;
    }

    const x = this.enemy.x;
    const y = this.enemy.y;

    this.ring.setPosition(x, y + this.ringOffsetY);
    this.bar.setPosition(Math.round(x), Math.round(y + this.barOffsetY));
    this.icon.setPosition(Math.round(x), Math.round(y + this.iconOffsetY));
    this.drawBar(this.healthRatio());
  }

  private drawBar(ratio: number): void {
    const { bar, color, backColor } = ELITE_VISUAL;
    const fillPx = Math.ceil(ratio * this.innerWidth);

    if (fillPx === this.drawnFillPx) {
      return;
    }

    this.drawnFillPx = fillPx;

    const left = -bar.width / 2;
    const top = -bar.height / 2;

    this.bar.clear();
    this.bar.fillStyle(backColor, bar.backAlpha);
    this.bar.fillRect(
      left - bar.border,
      top - bar.border,
      bar.width + bar.border * 2,
      bar.height + bar.border * 2,
    );

    if (fillPx > 0) {
      this.bar.fillStyle(color, 1);
      this.bar.fillRect(left, top, fillPx, bar.height);
    }
  }

  private drawIcon(affix: EliteAffixId): void {
    const { icon, color, backColor } = ELITE_VISUAL;
    const half = Math.floor(icon.size / 2);
    const rows = ELITE_AFFIX_ICON_ROWS[affix];

    this.icon.fillStyle(backColor, icon.backAlpha);
    this.icon.fillRect(-half, -half, icon.size, icon.size);
    this.icon.fillStyle(color, 1);

    for (let row = 0; row < rows.length; row += 1) {
      for (let col = 0; col < rows[row].length; col += 1) {
        if (rows[row][col] === '#') {
          this.icon.fillRect(col - half, row - half, 1, 1);
        }
      }
    }
  }

  /** Vòng chân, vẽ quanh gốc (0, 0): swift đứt nét, armored vòng đôi có khía, escorted vòng kèm ba chấm. */
  private drawRing(affix: EliteAffixId, radiusX: number): void {
    const { ring, color, backColor } = ELITE_VISUAL;
    const radiusY = radiusX * ring.squash;
    const steps = ring.ellipseSteps;
    const g = this.ring;

    // Nét viền tối rộng hơn nét ngà để vòng đọc được trên nền sáng.
    const strokeBoth = (draw: (width: number, tint: number, alpha: number) => void): void => {
      draw(ring.lineWidth + 2, backColor, 0.55);
      draw(ring.lineWidth, color, ring.alpha);
    };

    const strokeArc = (rx: number, ry: number, from: number, to: number, count: number): void => {
      strokeBoth((width, tint, alpha) => {
        g.lineStyle(width, tint, alpha);
        g.beginPath();

        for (let i = 0; i <= count; i += 1) {
          const angle = from + ((to - from) * i) / count;
          const px = Math.cos(angle) * rx;
          const py = Math.sin(angle) * ry;

          if (i === 0) {
            g.moveTo(px, py);
          } else {
            g.lineTo(px, py);
          }
        }

        g.strokePath();
      });
    };

    if (affix === 'swift') {
      const segments = ring.dashSegments;
      const perSegment = Math.max(1, Math.round(steps / segments));

      for (let i = 0; i < segments; i += 2) {
        strokeArc(radiusX, radiusY, (i * FULL_CIRCLE) / segments, ((i + 1) * FULL_CIRCLE) / segments, perSegment);
      }

      return;
    }

    strokeArc(radiusX, radiusY, 0, FULL_CIRCLE, steps);

    if (affix === 'armored') {
      strokeArc(radiusX - ring.innerGap, radiusY - ring.innerGap * ring.squash, 0, FULL_CIRCLE, steps);

      // Khía ngắn hướng ra ngoài trên vòng ngoài.
      for (let i = 0; i < ring.notchCount; i += 1) {
        const angle = (i * FULL_CIRCLE) / ring.notchCount;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        strokeBoth((width, tint, alpha) => {
          g.lineStyle(width, tint, alpha);
          g.beginPath();
          g.moveTo(cos * radiusX, sin * radiusY);
          g.lineTo(cos * (radiusX + ring.notchLength), sin * (radiusY + ring.notchLength * ring.squash));
          g.strokePath();
        });
      }

      return;
    }

    // escorted: ba chấm cách đều 120 độ trên vòng.
    g.fillStyle(backColor, 0.55);

    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + (i * FULL_CIRCLE) / 3;

      g.fillCircle(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, ring.dotRadius + 1);
    }

    g.fillStyle(color, 1);

    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + (i * FULL_CIRCLE) / 3;

      g.fillCircle(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, ring.dotRadius);
    }
  }
}
