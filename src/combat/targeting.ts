import Phaser from 'phaser';

import type { EnemyBase } from '../entities/EnemyBase';

/** Cách chọn mục tiêu cho auto-aim và kỹ năng loại `target`. */
export type TargetSelect = 'nearest' | 'lowestHealth';

/** Quái còn sống gần nhất trong `range` quanh (x, y); null nếu không có. */
export function findNearestEnemy(
  enemies: readonly EnemyBase[],
  x: number,
  y: number,
  range: number,
): EnemyBase | null {
  let best: EnemyBase | null = null;
  let bestDistance = range;

  for (const enemy of enemies) {
    if (!enemy.isAlive()) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

    if (distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * Giữ nguyên `current` nếu còn hợp lệ (sống, nằm trong danh sách, trong `range`); ngược lại chọn quái gần nhất.
 * Dùng để auto-aim không nhảy qua lại giữa các quái trong lúc đánh combo.
 */
export function findStickyTarget(
  current: EnemyBase | null,
  enemies: readonly EnemyBase[],
  x: number,
  y: number,
  range: number,
): EnemyBase | null {
  if (
    current &&
    current.isAlive() &&
    enemies.includes(current) &&
    Phaser.Math.Distance.Between(x, y, current.x, current.y) <= range
  ) {
    return current;
  }

  return findNearestEnemy(enemies, x, y, range);
}

/** Quái còn sống có máu thấp nhất trong `range` quanh (x, y); hoà thì chọn gần hơn. */
export function findLowestHealthEnemy(
  enemies: readonly EnemyBase[],
  x: number,
  y: number,
  range: number,
): EnemyBase | null {
  let best: EnemyBase | null = null;
  let bestHealth = Infinity;
  let bestDistance = Infinity;

  for (const enemy of enemies) {
    if (!enemy.isAlive()) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

    if (distance > range) {
      continue;
    }

    const health = enemy.getHealth();

    if (health < bestHealth || (health === bestHealth && distance < bestDistance)) {
      best = enemy;
      bestHealth = health;
      bestDistance = distance;
    }
  }

  return best;
}

export function selectTarget(
  select: TargetSelect,
  enemies: readonly EnemyBase[],
  x: number,
  y: number,
  range: number,
): EnemyBase | null {
  return select === 'lowestHealth'
    ? findLowestHealthEnemy(enemies, x, y, range)
    : findNearestEnemy(enemies, x, y, range);
}
