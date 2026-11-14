import Phaser from 'phaser';

import { HP_BAR_POINTS_PER_CELL } from '../config/combatConfig';
import type { Player } from '../entities/Player';

const BAR_WIDTH = 51;
const BAR_HEIGHT = 6;
const MANA_WIDTH = BAR_WIDTH;
const MANA_HEIGHT = 2;
const GAP = 1;
/** Khoảng cách từ đỉnh sprite tới đáy cụm thanh. */
const HEAD_MARGIN = 6;

const COLOR_BACK = 0x05060a;
const COLOR_TRACK = 0x1b1c24;
const COLOR_HP = 0xe8434f;
const COLOR_SHIELD = 0xc9ccd6;
const COLOR_MANA = 0x3d8bfd;

/**
 * Thanh trên đầu nhân vật: một thanh chung máu (đỏ) + máu ảo (trắng xám, nằm bên phải máu)
 * và thanh mana (xanh) cùng chiều dài nhưng mỏng hơn bên dưới.
 * Thanh máu chia ô đều nhau, mỗi ô `HP_BAR_POINTS_PER_CELL` điểm. Sát thương trừ máu ảo trước (từ mép phải), hết mới
 * tới máu thật (logic ở `Player.takeDamage`).
 */
export class PlayerBars {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private signature = '';

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(4900);
  }

  update(player: Player): void {
    const visible = !player.isDead();

    this.gfx.setVisible(visible);

    if (!visible) {
      return;
    }

    const maxHp = player.getMaxHealth();
    const maxShield = Math.max(0, player.getMaxArmor());
    const total = Math.max(1, maxHp + maxShield);
    const hpPx = Math.ceil(BAR_WIDTH * Phaser.Math.Clamp(player.getHealth() / total, 0, 1));
    const shieldPx = Math.ceil(
      BAR_WIDTH * Phaser.Math.Clamp(Math.max(0, player.getArmor()) / total, 0, 1),
    );
    const mana = ratio(player.getEnergy(), player.getMaxEnergy());
    const manaPx = Math.ceil(MANA_WIDTH * mana);

    const top = player.y - player.displayHeight / 2 - HEAD_MARGIN;
    const cx = Math.round(player.x);
    const manaY = Math.round(top - MANA_HEIGHT);
    const barY = manaY - GAP - BAR_HEIGHT;
    const signature = [cx, barY, hpPx, shieldPx, manaPx].join('|');

    if (signature === this.signature) {
      return;
    }

    this.signature = signature;

    const g = this.gfx;
    const x = cx - BAR_WIDTH / 2;
    const mx = cx - MANA_WIDTH / 2;

    g.clear();

    g.fillStyle(COLOR_BACK, 0.85);
    g.fillRect(x - 1, barY - 1, BAR_WIDTH + 2, BAR_HEIGHT + 2);
    g.fillStyle(COLOR_TRACK, 1);
    g.fillRect(x, barY, BAR_WIDTH, BAR_HEIGHT);
    g.fillStyle(COLOR_HP, 1);
    g.fillRect(x, barY, hpPx, BAR_HEIGHT);
    g.fillStyle(COLOR_SHIELD, 1);
    g.fillRect(x + hpPx, barY, Math.min(shieldPx, BAR_WIDTH - hpPx), BAR_HEIGHT);

    const cellPx = (BAR_WIDTH * HP_BAR_POINTS_PER_CELL) / total;

    if (cellPx >= 2) {
      g.fillStyle(COLOR_BACK, 0.9);

      for (let cell = 1; cell * HP_BAR_POINTS_PER_CELL < total; cell += 1) {
        g.fillRect(Math.round(x + cell * cellPx), barY, 1, BAR_HEIGHT);
      }
    }

    g.fillStyle(COLOR_BACK, 0.85);
    g.fillRect(mx - 1, manaY - 1, MANA_WIDTH + 2, MANA_HEIGHT + 2);
    g.fillStyle(COLOR_TRACK, 1);
    g.fillRect(mx, manaY, MANA_WIDTH, MANA_HEIGHT);
    g.fillStyle(COLOR_MANA, 1);
    g.fillRect(mx, manaY, manaPx, MANA_HEIGHT);
  }
}

function ratio(value: number, max: number): number {
  return max > 0 ? Phaser.Math.Clamp(value / max, 0, 1) : 0;
}
