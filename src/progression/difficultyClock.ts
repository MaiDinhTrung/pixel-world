/**
 * Đồng hồ độ khó và lịch Boss của một lượt chơi. Logic thuần (không phụ thuộc Phaser, không đọc giờ hệ thống):
 * mọi mốc thời gian do bên gọi truyền vào (`game.loop.time` hoặc `scene.time.now` như trước).
 * Cài đặt hiện tại `createRunSessionClock` giữ trạng thái trong bộ nhớ scene và mang qua `RunSession`.
 */

import { timeThreatTier } from '../world/worldGraph';

export interface RunClockState {
  runStartedAt: number;
  nextBossAt: number;
  bossNumber: number;
  bossReady: boolean;
  bossWarningShown: boolean;
}

export interface DifficultyClock {
  readonly runStartedAt: number;
  readonly nextBossAt: number;
  readonly bossNumber: number;
  readonly bossReady: boolean;
  readonly bossWarningShown: boolean;
  /** = now - runStartedAt */
  elapsedMs(now: number): number;
  /** = timeThreatTier(elapsedMs(now)) */
  timeTier(now: number): number;
  markBossReady(): void;
  markWarningShown(): void;
  onBossSpawned(): void;
  onBossDefeated(now: number, respawnMs: number): void;
  /** Bản sao độc lập, dùng cho captureRunSession. */
  snapshot(): RunClockState;
}

/** Lượt chơi mới: đồng hồ bắt đầu từ `now`. */
export function newRunClockState(
  now: number,
  firstBossDelayMs: number,
): RunClockState {
  return {
    runStartedAt: now,
    nextBossAt: now + firstBossDelayMs,
    bossNumber: 0,
    bossReady: false,
    bossWarningShown: false,
  };
}

/** Đồng hồ lưu trong bộ nhớ; sao chép `initial`, không giữ tham chiếu. */
export function createRunSessionClock(initial: RunClockState): DifficultyClock {
  const state: RunClockState = {
    runStartedAt: initial.runStartedAt,
    nextBossAt: initial.nextBossAt,
    bossNumber: initial.bossNumber,
    bossReady: initial.bossReady,
    bossWarningShown: initial.bossWarningShown,
  };

  return {
    get runStartedAt() {
      return state.runStartedAt;
    },
    get nextBossAt() {
      return state.nextBossAt;
    },
    get bossNumber() {
      return state.bossNumber;
    },
    get bossReady() {
      return state.bossReady;
    },
    get bossWarningShown() {
      return state.bossWarningShown;
    },
    elapsedMs(now: number): number {
      return now - state.runStartedAt;
    },
    timeTier(now: number): number {
      return timeThreatTier(now - state.runStartedAt);
    },
    markBossReady(): void {
      state.bossReady = true;
    },
    markWarningShown(): void {
      state.bossWarningShown = true;
    },
    onBossSpawned(): void {
      state.bossReady = false;
      state.bossNumber += 1;
    },
    onBossDefeated(now: number, respawnMs: number): void {
      state.nextBossAt = now + respawnMs;
      state.bossWarningShown = false;
    },
    snapshot(): RunClockState {
      return { ...state };
    },
  };
}
