/**
 * Trạng thái lượt chơi KHÔNG nằm trong save, mang qua cổng bằng dữ liệu của `scene.start`.
 * Logic thuần (không phụ thuộc Phaser): scene chụp vào đây trước khi chuyển, scene đích áp lại.
 * Tách hai phần: `carry` (HP/giáp/năng lượng, hồi chiêu, dash) và `clock` (đồng hồ Boss).
 * Mọi mốc thời gian là thời gian TUYỆT ĐỐI của game (`game.loop.time`), không phải đồng hồ riêng của scene.
 */

import type { CharacterCarry } from '../world/instance';
import type { RunClockState } from './difficultyClock';

export interface RunVitals {
  health: number;
  armor: number;
  energy: number;
}

export interface RunSession {
  carry: CharacterCarry;
  clock: RunClockState;
}

/** Phía nguồn: những gì cần đọc từ Player. */
export interface RunVitalsSource {
  getVitals(): RunVitals;
  getDashChargeReadyAt(): number[];
  getDashReadyAt(): number;
}

/** Phía đích: những gì cần ghi vào Player. */
export interface RunVitalsTarget {
  setVitals(vitals: RunVitals): void;
  setDashChargeReadyAt(readyAt: readonly number[]): void;
  setDashReadyAt(readyAt: number): void;
}

/** Chụp trạng thái trước khi chuyển scene. Trả về bản sao độc lập (không giữ tham chiếu vào scene). */
export function captureRunSession(
  player: RunVitalsSource,
  input: {
    skillCooldownUntil: Readonly<Record<string, number | undefined>>;
    clock: RunClockState;
  },
): RunSession {
  const cooldowns: Record<string, number> = {};

  for (const [id, until] of Object.entries(input.skillCooldownUntil)) {
    if (typeof until === 'number') {
      cooldowns[id] = until;
    }
  }

  return {
    carry: {
      vitals: { ...player.getVitals() },
      skillCooldownUntil: cooldowns,
      dashChargeReadyAt: [...player.getDashChargeReadyAt()],
      dashReadyAt: player.getDashReadyAt(),
    },
    clock: {
      runStartedAt: input.clock.runStartedAt,
      nextBossAt: input.clock.nextBossAt,
      bossNumber: input.clock.bossNumber,
      bossReady: input.clock.bossReady,
      bossWarningShown: input.clock.bossWarningShown,
    },
  };
}

/** Áp phần thuộc Player (gọi SAU khi scene đích đã áp chỉ số/trang bị để kẹp theo tối đa đúng). */
export function applyRunSessionToPlayer(
  session: RunSession,
  player: RunVitalsTarget,
): void {
  const { carry } = session;

  if (carry.vitals) {
    player.setVitals({ ...carry.vitals });
  }

  player.setDashChargeReadyAt(carry.dashChargeReadyAt);
  player.setDashReadyAt(carry.dashReadyAt);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Kiểm cấu trúc và kiểu mọi trường (dữ liệu `scene.start` là `unknown`). */
export function isRunSession(value: unknown): value is RunSession {
  if (!isObject(value)) {
    return false;
  }

  const { carry, clock } = value;

  if (!isObject(carry) || !isObject(clock)) {
    return false;
  }

  const { vitals, skillCooldownUntil, dashChargeReadyAt, dashReadyAt } = carry;

  if (vitals !== null) {
    if (
      !isObject(vitals) ||
      !isNum(vitals.health) ||
      !isNum(vitals.armor) ||
      !isNum(vitals.energy)
    ) {
      return false;
    }
  }

  if (!isObject(skillCooldownUntil)) {
    return false;
  }

  for (const until of Object.values(skillCooldownUntil)) {
    if (!isNum(until)) {
      return false;
    }
  }

  if (!Array.isArray(dashChargeReadyAt) || !dashChargeReadyAt.every(isNum)) {
    return false;
  }

  if (!isNum(dashReadyAt)) {
    return false;
  }

  return (
    isNum(clock.runStartedAt) &&
    isNum(clock.nextBossAt) &&
    isNum(clock.bossNumber) &&
    typeof clock.bossReady === 'boolean' &&
    typeof clock.bossWarningShown === 'boolean'
  );
}
