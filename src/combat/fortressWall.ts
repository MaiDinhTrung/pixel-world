import { FORTRESS_HP_MULT } from '../config/combatConfig';

/**
 * Bức tường của Bất Động Thành Lũy, tách riêng (không import Phaser) để `Player.takeDamage`
 * kiểm tra chặn đòn mà không tạo vòng import, và để test logic thuần.
 * Hình ảnh/vòng đời ở `skills/fortressStand.ts`.
 */
export interface FortressWall {
  /** Tâm cung (vị trí người chơi lúc dựng, đứng yên suốt thời gian duy trì). */
  readonly x: number;
  readonly y: number;
  /** Hướng chắn (rad), khóa lúc dựng. */
  readonly angle: number;
  /** Nửa góc cung chắn (rad). */
  readonly halfArc: number;
  readonly maxHp: number;
  hp: number;
  /** Đòn bị chặn: `amount` là sát thương tường nhận, (fromX, fromY) là nguồn đòn. */
  onHit(amount: number, fromX: number, fromY: number): void;
  /** Gọi đúng một lần khi HP về 0. */
  onBreak(): void;
}

/** HP tường theo máu tối đa của người chơi tại thời điểm kích hoạt. */
export function fortressMaxHp(maxHealth: number): number {
  return Math.round(maxHealth * FORTRESS_HP_MULT);
}

/** Góc lệch có dấu nhỏ nhất giữa hai góc (rad), trong [-π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);

  if (d > Math.PI) {
    d -= Math.PI * 2;
  } else if (d < -Math.PI) {
    d += Math.PI * 2;
  }

  return d;
}

/** true nếu nguồn đòn nằm trong cung chắn phía trước tường. */
export function isSourceInFront(
  wall: FortressWall,
  sourceX: number,
  sourceY: number,
): boolean {
  const toSource = Math.atan2(sourceY - wall.y, sourceX - wall.x);

  return Math.abs(angleDiff(toSource, wall.angle)) <= wall.halfArc;
}

/**
 * Thử đỡ một đòn bằng tường. true = đòn bị hấp thụ hoàn toàn (trừ HP tường, người chơi không mất máu);
 * false = đòn xuyên qua (tường đã vỡ, không biết nguồn, hoặc nguồn ngoài cung chắn).
 * Phần sát thương dư khi tường vỡ không chuyển sang người chơi.
 */
export function absorbHit(
  wall: FortressWall,
  sourceX: number | undefined,
  sourceY: number | undefined,
  amount: number,
): boolean {
  if (
    wall.hp <= 0 ||
    sourceX === undefined ||
    sourceY === undefined ||
    !isSourceInFront(wall, sourceX, sourceY)
  ) {
    return false;
  }

  damageWall(wall, amount, sourceX, sourceY);

  return true;
}

/** Trừ HP tường (không xét hướng): dùng khi đòn chạm thẳng vào thân tường (đạn). Gọi onBreak đúng một lần. */
export function damageWall(
  wall: FortressWall,
  amount: number,
  fromX: number,
  fromY: number,
): void {
  if (wall.hp <= 0) {
    return;
  }

  wall.hp = Math.max(0, wall.hp - amount);
  wall.onHit(amount, fromX, fromY);

  if (wall.hp <= 0) {
    wall.onBreak();
  }
}

let activeWall: FortressWall | null = null;

export function setFortressWall(wall: FortressWall | null): void {
  activeWall = wall;
}

export function getFortressWall(): FortressWall | null {
  return activeWall;
}

/** Cổng dùng trong `Player.takeDamage`: có tường đang dựng thì thử đỡ đòn. */
export function tryAbsorbHit(
  sourceX: number | undefined,
  sourceY: number | undefined,
  amount: number,
): boolean {
  return activeWall !== null && absorbHit(activeWall, sourceX, sourceY, amount);
}
