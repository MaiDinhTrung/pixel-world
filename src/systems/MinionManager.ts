import Phaser from 'phaser';

import type { EnemyBase } from '../entities/EnemyBase';
import { Minion, type MinionSpec } from '../entities/Minion';
import {
  MINION_AGGRO_RANGE,
  MINION_CONTACT_RANGE,
} from '../config/necromancerConfig';
import { spawnBurst, spawnRing } from '../utils/effects';

/** Quản lý đồng minh của người chơi; trần số lượng tính riêng theo từng loại (kỹ năng). */
export class MinionManager {
  private readonly scene: Phaser.Scene;
  private minions: Minion[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getCount(): number {
    return this.minions.length;
  }

  /** Đồng minh còn sống (chỉ đọc; dùng cho kết giới Lĩnh Vực Thần Minh). */
  getActive(): readonly Minion[] {
    return this.minions.filter((minion) => !minion.isGone());
  }

  getCountOf(kind: MinionSpec['kind']): number {
    return this.minions.filter((minion) => minion.spec.kind === kind).length;
  }

  /**
   * Triệu hồi; khi loại này đã đủ `maxOfKind` thì thay con cũ nhất cùng loại.
   * Trả về đồng minh mới.
   */
  spawn(x: number, y: number, spec: MinionSpec, maxOfKind: number): Minion {
    const sameKind = this.minions.filter(
      (minion) => minion.spec.kind === spec.kind && !minion.isGone(),
    );

    for (let i = 0; i <= sameKind.length - maxOfKind; i += 1) {
      sameKind[i].expire();
    }

    this.minions = this.minions.filter((minion) => !minion.isGone());

    const minion = new Minion(this.scene, x, y, spec);

    this.minions.push(minion);
    spawnRing(this.scene, x, y, 40, spec.color, 300);
    spawnBurst(this.scene, x, y, spec.color, 8, 100);

    return minion;
  }

  update(
    time: number,
    player: { x: number; y: number },
    enemies: readonly EnemyBase[],
    damageMult: number,
  ): void {
    for (const minion of this.minions) {
      minion.tick(time, player, enemies, damageMult);

      if (minion.isGone()) {
        continue;
      }

      for (const enemy of enemies) {
        if (
          enemy.isAlive() &&
          Phaser.Math.Distance.Between(minion.x, minion.y, enemy.x, enemy.y) <=
            MINION_CONTACT_RANGE
        ) {
          minion.takeHit(enemy.getContactDamage(), time);
          break;
        }
      }
    }

    this.minions = this.minions.filter((minion) => !minion.isGone());
  }

  /**
   * Mục tiêu cho AI quái: đồng minh gần nhất nếu nằm trong tầm và gần hơn
   * người chơi, ngược lại là người chơi.
   */
  getAggroTarget(
    enemy: { x: number; y: number },
    player: { x: number; y: number },
  ): { x: number; y: number } {
    let best: { x: number; y: number } = player;
    let bestDistance = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      player.x,
      player.y,
    );

    for (const minion of this.minions) {
      if (minion.isGone()) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        minion.x,
        minion.y,
      );

      if (distance <= MINION_AGGRO_RANGE && distance < bestDistance) {
        best = minion;
        bestDistance = distance;
      }
    }

    return best;
  }

  clear(): void {
    for (const minion of this.minions) {
      minion.expire();
    }

    this.minions = [];
  }
}
