import Phaser from 'phaser';

import type { AimPreview } from '../../input/SkillAimingController';

const DEPTH = 4500;
const CANCEL_COLOR = 0x8b8fa3;

/** Vẽ đường ngắm / vùng ảnh hưởng trong world, quanh người chơi. Một Graphics tái sử dụng. */
export class AimIndicator {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private drawn = false;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(DEPTH);
  }

  update(x: number, y: number, preview: AimPreview | null): void {
    if (!preview) {
      if (this.drawn) {
        this.graphics.clear();
        this.drawn = false;
      }

      return;
    }

    const g = this.graphics;
    const color = preview.cancelled ? CANCEL_COLOR : preview.color;
    const alpha = preview.cancelled ? 0.18 : 0.3;
    const control = preview.control;
    const angle = Math.atan2(preview.dirY, preview.dirX);

    g.clear();
    this.drawn = true;

    if (control.kind === 'directional') {
      if (control.shape === 'cone') {
        const half = Phaser.Math.DegToRad(control.size / 2);

        g.fillStyle(color, alpha);
        g.slice(x, y, control.range, angle - half, angle + half, false);
        g.fillPath();
      } else if (control.shape === 'circle') {
        g.fillStyle(color, alpha);
        g.fillCircle(x, y, control.size);
      } else {
        g.lineStyle(control.size, color, alpha);
        g.lineBetween(
          x,
          y,
          x + preview.dirX * control.range,
          y + preview.dirY * control.range,
        );
      }
    } else if (control.kind === 'point') {
      const px = x + preview.dirX * control.range * preview.reach;
      const py = y + preview.dirY * control.range * preview.reach;

      g.lineStyle(2, color, alpha + 0.2);
      g.strokeCircle(x, y, control.range);
      g.lineBetween(x, y, px, py);
      g.fillStyle(color, alpha);
      g.fillCircle(px, py, control.radius);
      g.lineStyle(2, color, 0.7);
      g.strokeCircle(px, py, control.radius);
    }
  }
}
